const express = require('express')
const router = express.Router()
const multer = require('multer')
const sharp = require('sharp')
const { processImageForAI, processImageForAnalysis, createMultiCrop, addGridOverlay } = require('../utils/imageProcessor')
const { callAIJson } = require('../utils/aiClient')
const { getStackRules } = require('../utils/stackRules')
const copyPrompt = require('./prompts/copyMode')
const templatePrompt = require('./prompts/templateMode')

const upload = multer({ storage: multer.memoryStorage() })

// === POST: Основной эндпоинт (с поддержкой тестов через query-параметр) ===
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })

        const stack = req.body.stack || 'React + Tailwind'
        const mode = req.body.mode || 'copy'
        const dryRun = req.body.dryRun === 'true'
        const useMock = req.body.useMock === 'true' // Новый флаг для моков

        // Обработка изображения
        const { buffer: processedBuffer, mimeType } = await processImageForAI(req.file.buffer)
        const base64Image = processedBuffer.toString('base64')

        const { rawPixels, info: imgInfo } = await processImageForAnalysis(req.file.buffer)
        const originalInfo = await sharp(req.file.buffer).metadata() // ← метаданные из оригинала
        const aspectRatio = imgInfo.width / imgInfo.height

        // Создаем кропы
        const crops = await createMultiCrop(req.file.buffer)
        const hasCrops = crops.top && crops.middle && crops.bottom

        const { buffer: gridBuffer, colW, rowH, cols, rows } = await addGridOverlay(processedBuffer)
        const base64Grid = gridBuffer.toString('base64')

        const gridImageContent = {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64Grid}` }
        }

        const imageContent = {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` }
        }

        // Формируем промпт Pass 1
        const pass1Prompt = `Analyze this UI screenshot in detail.
The image has a coordinate grid overlay:
Columns: A to L (left→right), each column = ${colW}px wide
Rows: 1 to ${rows} (top→bottom), each row = ${rowH}px tall
Use grid coordinates to describe element positions precisely.
Return ONLY valid JSON, no markdown. Follow this structure EXACTLY:
{
  "layout": "one sentence describing the overall page structure",
  "background_type": "photo | solid | gradient",
  "background_description": "if photo: describe scene in detail. if solid: hex color. if gradient: colors and direction",
  "background_coverage": "percentage of screen height (e.g., '65%', 'full height')",
  "z_index_layers": [
    {"layer": 1, "elements": ["background elements"]},
    {"layer": 2, "elements": ["navigation", "sidebar"]}
  ],
  "layout_structure": {
    "type": "flex row | flex column | grid",
    "children": [
      {"name": "Sidebar", "width": "240px | 20% | fixed", "position": "left | right", "grid_area": "A1:A9"},
      {"name": "MainContent", "flex": "1 | auto", "position": "center", "grid_area": "B1:L9", "margin_left": "240px"}
    ]
  },
  "repeating_patterns": [
    {
      "name": "ComponentName",
      "location": "where it appears",
      "count": number_of_instances,
      "layout": "vertical list | horizontal scroll | responsive grid (N columns)",
      "data_fields": ["field1", "field2", "field3"]
    }
  ],
  "sections": [
    {
      "name": "Section name",
      "type": "static | dynamic",
      "position": "top | bottom | left | right | center",
      "top_percent": 0,
      "height_percent": 20,
      "grid_area": "A1:L2",
      "description": "list EVERY visible element: inputs, buttons, icons, text labels, images, badges"
    }
  ],
  "static_elements": [],
  "dynamic_elements": [],
  "exact_colors": {
    "background": "#hex",
    "surface": "#hex",
    "text": "#hex",
    "accent": "#hex",
    "secondary_text": "#hex"
  }
}
CRITICAL RULES:
1. Use grid coordinates (A1:L${rows}) for EVERY element position
2. Describe ALL sections — not just the main ones
3. Identify ALL repeating patterns with their data fields
4. List ALL z-index layers from bottom to top
5. Be precise with percentages (top_percent, height_percent)
6. For repeating patterns, specify exact count if visible
7. Include EVERY visible element in section descriptions`

        let analysisRaw = ''
        let analysis = {}

        if (useMock) {
            // Используем мок-ответ
            analysis = MOCK_RESPONSES.pass1
            analysisRaw = JSON.stringify(analysis, null, 2)
        } else if (!dryRun) {
            // Реальный вызов AI
            analysisRaw = await callAIJson([{
                role: 'user',
                content: [gridImageContent, { type: 'text', text: pass1Prompt }]
            }])
            try { analysis = JSON.parse(analysisRaw) } catch {}
        } else {
            // Dry run — фейковые данные
            analysis = {
                layout: '[dry run — AI не вызывался]',
                background_type: 'photo',
                background_description: '[описание фона]',
                background_coverage: '60%',
                sections: [
                    { name: 'Header', type: 'static', position: 'top', top_percent: 0, height_percent: 10, description: '[элементы хедера]' },
                    { name: 'Content', type: 'dynamic', position: 'center', top_percent: 10, height_percent: 70, description: '[основной контент]' },
                    { name: 'Footer', type: 'static', position: 'bottom', top_percent: 80, height_percent: 20, description: '[элементы футера]' }
                ],
                static_elements: ['[статичные элементы появятся после AI анализа]'],
                dynamic_elements: ['[динамичные элементы появятся после AI анализа]'],
                exact_colors: { background: '#0a0a0a', surface: '#1a1a1a', text: '#ffffff', accent: '#0078d4' }
            }
            analysisRaw = JSON.stringify(analysis, null, 2)
        }

        const sectionsDesc = analysis.sections
            ?.map(s => `  - ${s.name} (${s.type}, ${s.position}): ${s.description}`)
            .join('\n') || ''

        const modeInstruction = mode === 'copy'
            ? copyPrompt()
            : templatePrompt(true, analysis)

        // Формируем Pass 2 промпт
        const pass2Prompt = `Generate code for this UI screenshot.
${hasCrops
            ? `You are receiving 4 images of the SAME page:
- Image 1: full screenshot WITH coordinate grid (columns A-L, rows 1-${rows}, each cell = ${colW}x${rowH}px)
- Image 2: top section (0-30% of page height) — header details
- Image 3: middle section (30-60% of page height) — main content
- Image 4: bottom section (60-100% of page height) — footer, panels

CRITICAL: Use ALL 4 images together. Image 1 shows true proportions and positions.`
            : `You are receiving 1 image:
- Image 1: full screenshot WITH coordinate grid (columns A-L, rows 1-${rows}, each cell = ${colW}x${rowH}px)

NOTE: This is a wide/horizontal image (aspect ratio: ${aspectRatio.toFixed(2)}), so zone crops were not created. Focus on the full image for details.`
        }

Stack: ${stack}

═══ UI STRUCTURE FROM ANALYSIS (Pass 1) ═══

Layout: ${analysis.layout}

Background:
${analysis.background_type === 'photo'
            ? `- Type: PHOTO covering ${analysis.background_coverage || '60%'} of screen
- Description: ${analysis.background_description}
- Implementation: Use Unsplash or similar for photo background`
            : `- Type: ${analysis.background_type || 'solid'}
- Color: ${analysis.exact_colors?.background || '#0a0a0a'}
- Description: ${analysis.background_description || 'none'}`}

Z-Index Layers (render in this order):
${analysis.z_index_layers?.map((layer, i) =>
            `  Layer ${layer.layer}: ${layer.elements.join(', ')}`
        ).join('\n') || '  Standard stacking (background → content → header → overlays)'}

Layout Structure:
${analysis.layout_structure?.children?.map(child =>
            `  - ${child.name}: ${child.position || 'relative'}, ${child.width || child.flex || 'auto'}, grid: ${child.grid_area || 'N/A'}`
        ).join('\n') || '  Standard flex layout'}

Sections:
${sectionsDesc}

Repeating Patterns:
${analysis.repeating_patterns?.map(pattern =>
            `  - ${pattern.name}: ${pattern.count} instances, ${pattern.layout}
    Data fields: ${pattern.data_fields?.join(', ') || 'N/A'}`
        ).join('\n') || '  No repeating patterns detected'}

Colors (use these exact values):
${analysis.exact_colors ? Object.entries(analysis.exact_colors).map(([key, val]) =>
            `  - ${key}: ${val}`
        ).join('\n') : '  No colors specified'}

Static Elements (never change): ${analysis.static_elements?.join(', ') || 'N/A'}
Dynamic Elements (change per user/session): ${analysis.dynamic_elements?.join(', ') || 'N/A'}

═══ MODE INSTRUCTIONS ═══
${modeInstruction}

═══ STACK RULES ═══
${getStackRules(stack, mode)}

═══ OUTPUT RULES ═══
- Return ONLY the code, no markdown, no backticks, no explanations
${stack.includes('React') && mode === 'template'
            ? `- Every file must start with: // @@FILE:Name.jsx
- Last file MUST be: // @@FILE:App.jsx
- All components defined BEFORE App`
            : `- Return complete single file`}`

        res.json({
            success: true,
            dryRun,
            useMock,
            // Информация об изображении
            imageInfo: {
                width: imgInfo.width,
                height: imgInfo.height,
                aspectRatio: aspectRatio.toFixed(2),
                isWideImage: aspectRatio > 1.5
            },
            // Base64 изображения
            base64Image: `data:${mimeType};base64,${base64Image}`,
            base64Grid: `data:image/png;base64,${base64Grid}`,
            // Кропы (могут быть null)
            base64Top: hasCrops ? `data:image/png;base64,${crops.top?.toString('base64')}` : null,
            base64Middle: hasCrops ? `data:image/png;base64,${crops.middle?.toString('base64')}` : null,
            base64Bottom: hasCrops ? `data:image/png;base64,${crops.bottom?.toString('base64')}` : null,
            // Информация о сетке
            gridInfo: { colW, rowH, cols, rows },
            // Промпты
            pass1Prompt,
            pass1Result: analysisRaw,
            pass1Parsed: analysis,
            pass2Prompt,
            // Параметры
            stack,
            mode,
            cropsGenerated: hasCrops,
            // Валидация логики кропов
            cropLogicValidation: {
                aspectRatio,
                threshold: 1.5,
                hasCrops,
                expected: aspectRatio <= 1.5,
                correct: hasCrops === (aspectRatio <= 1.5)
            }
        })

    } catch (error) {
        console.error('Debug error:', error)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router