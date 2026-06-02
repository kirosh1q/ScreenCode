const { detectRepeatingBlocks } = require('../utils/layoutAnalyzer')
const { processImageForAI, processImageForAnalysis, createMultiCrop, addGridOverlay } = require('../utils/imageProcessor')
const { getStackRules } = require('../utils/stackRules')
const { parseFiles } = require('../utils/fileParser')
const express = require('express')
const router = express.Router()
const multer = require('multer')
const { callAIJson, callAICode } = require('../utils/aiClient')
const copyPrompt = require('./prompts/copyMode')
const templatePrompt = require('./prompts/templateMode')
const lastGenerationDebug = require('../debugStore')
const upload = multer({ storage: multer.memoryStorage() })
const authMiddleware = require('../middleware/authMiddleware')

router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })

        console.log('Обработка изображения через Sharp...')

        const { buffer: processedBuffer, mimeType } = await processImageForAI(req.file.buffer)
        const base64Image = processedBuffer.toString('base64')

        const gridResult = await addGridOverlay(processedBuffer, {
            targetCellSize: 120
        })
        const { buffer: gridBuffer, colW, rowH, cols, rows, gridSpec } = gridResult
        const base64GridImage = gridBuffer.toString('base64')
        const gridImageContent = {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64GridImage}` }
        }
        const { rawPixels, info: imgInfo } = await processImageForAnalysis(req.file.buffer)

        const hasRepeatingBlocks = detectRepeatingBlocks(rawPixels, imgInfo.width, imgInfo.height)

        console.log('Программный анализ:')
        console.log('  Повторяющиеся блоки:', hasRepeatingBlocks)

        const { stack, mode, apiKey, model } = req.body
        console.log('=== ПОЛУЧЕННЫЕ ДАННЫЕ ===')
        console.log('stack:', stack)
        console.log('mode:', mode)
        console.log('apiKey:', apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined')
        console.log('model:', model)
        console.log('========================')
        if (!apiKey) {
            return res.status(400).json({ error: 'Не указан API ключ OpenRouter' })
        }

        const finalModel = model || 'qwen/qwen3.6-plus'

        console.log('\n=== НОВАЯ ГЕНЕРАЦИЯ ===')
        console.log('Стек:', stack, '| Mode:', mode, '| Model:', finalModel)

        const imageContent = {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` }
        }

        // ── PASS 1: анализ структуры ──────────────────────────
        console.log('Pass 1: анализ структуры...')

        const pass1PromptText = `Analyze this UI screenshot in detail.
The image has a coordinate grid overlay:
Columns: A to ${String.fromCharCode(64 + cols)} (left→right), each column ≈ ${colW}px wide
Rows: 1 to ${rows} (top→bottom), each row ≈ ${rowH}px tall
Grid spec: ${gridSpec}
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
1. Use grid coordinates (A1:L9) for EVERY element position
2. Describe ALL sections — not just the main ones
3. Identify ALL repeating patterns with their data fields
4. List ALL z-index layers from bottom to top
5. Be precise with percentages (top_percent, height_percent)
6. For repeating patterns, specify exact count if visible
7. Include EVERY visible element in section descriptions`

        console.log('🤖 Вызываю Pass 1 с моделью:', finalModel)
        const analysisRaw = await callAIJson([{
            role: 'user',
            content: [gridImageContent, { type: 'text', text: pass1PromptText }]
        }], apiKey, finalModel)
        console.log('✅ Pass 1 завершен, длина ответа:', analysisRaw?.length)

        console.log('═══════════════════PASS 1: Анализ══════════════════════════\n')
        let analysis = { layout: '', sections: [], static_elements: [], dynamic_elements: [], exact_colors: {} }
        try {
            analysis = JSON.parse(analysisRaw)
            console.log(' JSON распарсился успешно')
            console.log(` Секций найдено: ${analysis.sections?.length || 0}`)
            console.log(` Цветов найдено: ${Object.keys(analysis.exact_colors || {}).length}`)

            if (analysis.sections?.length > 0) {
                console.log('\n Секции:')
                analysis.sections.forEach((s, i) => {
                    console.log(`   ${i + 1}. ${s.name} (${s.type}) — ${s.grid_area || s.position}`)
                })
            }

            console.log('\n Статичные элементы:')
            console.log(`   ${analysis.static_elements?.slice(0, 5).join(', ') || 'не указаны'}${analysis.static_elements?.length > 5 ? '...' : ''}`)

            console.log('\n Динамичные элементы:')
            console.log(`   ${analysis.dynamic_elements?.slice(0, 5).join(', ') || 'не указаны'}${analysis.dynamic_elements?.length > 5 ? '...' : ''}`)

            if (analysis.exact_colors) {
                console.log('\n Цветовая палитра:')
                Object.entries(analysis.exact_colors).forEach(([key, val]) => {
                    console.log(`   ${key}: ${val}`)
                })
            }

        } catch (e) {
            console.log('JSON не распарсился')
            console.log('Сырой ответ модели (первые 500 символов):')
            console.log(analysisRaw?.slice(0, 500) + '...')
            console.log('Продолжаем без анализа структуры')
        }
        console.log('═══════════════════════════════════════════════════════════\n')

        // ── PASS 2: генерация кода ────────────────────────────
        console.log('\nPass 2: генерация кода...')

        const sectionsDesc = analysis.sections
            ?.map(s => `  - ${s.name} (${s.type}, ${s.position}): ${s.description}`)
            .join('\n') || ''

        const modeInstruction = mode === 'copy'
            ? copyPrompt(stack, hasRepeatingBlocks)
            : templatePrompt(hasRepeatingBlocks, analysis, stack)

        const crops = await createMultiCrop(req.file.buffer)

        const imagesForPass2 = [gridImageContent]

        if (crops.top && crops.middle && crops.bottom) {
            const topImageContent = {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${crops.top.toString('base64')}` }
            }
            const middleImageContent = {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${crops.middle.toString('base64')}` }
            }
            const bottomImageContent = {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${crops.bottom.toString('base64')}` }
            }

            imagesForPass2.push(topImageContent, middleImageContent, bottomImageContent)

            lastGenerationDebug.images = {
                base64Grid: base64GridImage,
                base64Image,
                base64Top: crops.top.toString('base64'),
                base64Middle: crops.middle.toString('base64'),
                base64Bottom: crops.bottom.toString('base64')
            }
        } else {
            console.log('Широкое изображение, используем только оригинал с сеткой')

            lastGenerationDebug.images = {
                base64Grid: base64GridImage,
                base64Image,
                base64Top: null,
                base64Middle: null,
                base64Bottom: null
            }
        }

        const pass2PromptText = `
Generate code for this UI screenshot.
You are receiving 4 images of the SAME page:
- Image 1: full screenshot WITH coordinate grid (columns A-${String.fromCharCode(64 + cols)}, rows 1-${rows}, each cell = ${colW}x${rowH}px)
- Image 2: top section (0-30% of page height) — header details
- Image 3: middle section (30-60% of page height) — main content
- Image 4: bottom section (60-100% of page height) — footer, panels

CRITICAL: Use ALL 4 images together. Image 1 shows true proportions and positions.

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

        console.log('🤖 Вызываю Pass 2 с моделью:', finalModel)
        const generatedHTML = await callAICode([{
            role: 'user',
            content: [...imagesForPass2, { type: 'text', text: pass2PromptText }]
        }], apiKey, finalModel)
        console.log('✅ Pass 2 завершен, длина ответа:', generatedHTML?.length)

        let fixedHTML = generatedHTML
            .replace(/src="\/(?!\/)[^"]+"/g, 'src="https://placehold.co/400x300/111111/39d353?text=Image"')
            .replace(/src='\/(?!'\/)[^']+'/g, "src='https://placehold.co/400x300/111111/39d353?text=Image'")

        console.log('Pass 2 готов. HTML длина:', generatedHTML.length)
        console.log('Pass 2 готов. HTML длина:', fixedHTML.length)
        console.log('======================\n')

        const files = (() => {
            if (stack.includes('React')) {
                const parsed = parseFiles(fixedHTML)
                if (parsed.length > 0) {
                    console.log('Найдено файлов:', parsed.map(f => f.name).join(', '))
                    return parsed
                }
            }
            return [{ name: stack.includes('React') ? 'App.jsx' : 'index.html', content: fixedHTML }]
        })()

        lastGenerationDebug.pass1Prompt = pass1PromptText
        lastGenerationDebug.pass1Result = analysisRaw
        lastGenerationDebug.pass1Parsed = analysis
        lastGenerationDebug.pass2Prompt = pass2PromptText
        lastGenerationDebug.images = {
            base64Grid: base64GridImage,
            base64Image,
            base64Top: crops.top?.toString('base64') || null,
            base64Middle: crops.middle?.toString('base64') || null,
            base64Bottom: crops.bottom?.toString('base64') || null
        }

        res.json({
            success: true,
            data: {
                layout: analysis.layout,
                sections: analysis.sections,
                static_elements: analysis.static_elements,
                dynamic_elements: analysis.dynamic_elements,
                colors: analysis.exact_colors
                    ? Object.values(analysis.exact_colors).filter(Boolean)
                    : [],
                fixedHTML,
                files
            }
        })

    } catch (error) {
        console.error('Ошибка:', error.message)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router