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

const upload = multer({ storage: multer.memoryStorage() })

router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })

        console.log('Обработка изображения через Sharp...')

        const { buffer: processedBuffer, mimeType } = await processImageForAI(req.file.buffer)
        const base64Image = processedBuffer.toString('base64')

        const { buffer: gridBuffer, colW, rowH } = await addGridOverlay(processedBuffer)
        const base64GridImage = gridBuffer.toString('base64')
        const gridImageContent = {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64GridImage}` }
        }
        const { rawPixels, info: imgInfo } = await processImageForAnalysis(req.file.buffer)
        const hasRepeatingBlocks = detectRepeatingBlocks(rawPixels, imgInfo.width, imgInfo.height)

        console.log('Программный анализ:')
        console.log('  Повторяющиеся блоки:', hasRepeatingBlocks)

        const stack = req.body.stack || 'HTML + Tailwind'
        const mode = req.body.mode || 'copy'
        console.log('\n=== НОВАЯ ГЕНЕРАЦИЯ ===')
        console.log('Стек:', stack, '| Mode:', mode)

        const imageContent = {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` }
        }

        // ── PASS 1: анализ структуры ──────────────────────────
        console.log('Pass 1: анализ структуры...')

        const analysisRaw = await callAIJson([{
            role: 'user',
            content: [
                gridImageContent,
                {
                    type: 'text',
                    text: `Analyze this UI screenshot in detail.
The image has a coordinate grid overlay:
- Columns: A to L (left to right), each column = ${colW}px wide
- Rows: 1 to 9 (top to bottom), each row = ${rowH}px tall
Use grid coordinates to describe element positions precisely.

Return ONLY valid JSON, no markdown:
{
  "layout": "one sentence description",
  "background_type": "photo or solid or gradient",
  "background_description": "if photo: describe the scene in detail. if solid: hex color. if gradient: colors and direction",
  "background_coverage": "percentage of screen height the background takes (e.g. 65%)",
  "sections": [
    {
      "name": "section name",
      "type": "static or dynamic",
      "position": "top/bottom/left/right/center",
      "top_percent": 0,
      "height_percent": 20,
      "grid_area": "e.g. A1:L2",
      "description": "list EVERY visible element: inputs, buttons, icons, text, images"
    }
  ],
  "static_elements": ["elements that never change"],
  "dynamic_elements": ["elements with changing data"],
  "exact_colors": {
    "background": "#hex",
    "surface": "#hex",
    "text": "#hex",
    "accent": "#hex"
  }
}`
                }
            ]
        }])

        let analysis = { layout: '', sections: [], static_elements: [], dynamic_elements: [], exact_colors: {} }
        try {
            analysis = JSON.parse(analysisRaw)
            console.log('Pass 1 готов:')
            console.log('  Секций:', analysis.sections?.length)
            console.log('  Статичные:', analysis.static_elements?.join(', '))
            console.log('  Динамичные:', analysis.dynamic_elements?.join(', '))
            console.log('  Цвета:', JSON.stringify(analysis.exact_colors))
        } catch (e) {
            console.log('Pass 1: JSON не распарсился, продолжаем без анализа')
        }

        // ── PASS 2: генерация кода ────────────────────────────
        console.log('\nPass 2: генерация кода...')

        const sectionsDesc = analysis.sections
            ?.map(s => `  - ${s.name} (${s.type}, ${s.position}): ${s.description}`)
            .join('\n') || ''

        const modeInstruction = mode === 'copy'
            ? copyPrompt()
            : templatePrompt(hasRepeatingBlocks, analysis)

        // Кроп нижней части для детализации
        const { top, middle, bottom } = await createMultiCrop(req.file.buffer, imgInfo)

        const topImageContent = {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${top.toString('base64')}` }
        }
        const middleImageContent = {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${middle.toString('base64')}` }
        }
        const bottomImageContent = {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${bottom.toString('base64')}` }
        }

        const generatedHTML = await callAICode([{
            role: 'user',
            content: [
                gridImageContent,
                topImageContent,
                middleImageContent,
                bottomImageContent,
                {
                    type: 'text',
                    text: `Generate code for this UI screenshot.
You are receiving 4 images of the SAME page:
- Image 1: full screenshot WITH coordinate grid (columns A-L, rows 1-9, each cell = ${colW}x${rowH}px)
- Image 2: top section — covers 0-30% of page height
- Image 3: middle section — covers 30-60% of page height  
- Image 4: bottom section — covers 60-100% of page height
When implementing, scale elements proportionally to their actual position on the full page.
The actual dimensions are shown only in the first image, the rest of the images are given to highlight inconspicuous elements.
Use all 4 images together for maximum accuracy.
Stack: ${stack}

UI Structure from analysis:
Layout: ${analysis.layout}
Background: ${analysis.background_type === 'photo'
                        ? `Photo covering ${analysis.background_coverage || '60%'} of screen: ${analysis.background_description}`
                        : analysis.background_description || 'none'}
Sections:
${sectionsDesc}

${modeInstruction}

RULES FOR ${stack.toUpperCase()}:
${getStackRules(stack, mode)}
- Return ONLY the code, no markdown, no backticks, no explanations`
                }
            ]
        }])

        console.log('Pass 2 готов. HTML длина:', generatedHTML.length)
        console.log('======================\n')

        const files = (() => {
            if (stack.includes('React') && mode === 'template') {
                const parsed = parseFiles(generatedHTML)
                console.log('Найдено файлов:', parsed.map(f => f.name).join(', '))
                if (parsed.length > 0) return parsed
            }
            return [{ name: stack.includes('React') ? 'App.jsx' : 'index.html', content: generatedHTML }]
        })()

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
                generatedHTML,
                files
            }
        })

    } catch (error) {
        console.error('Ошибка:', error.message)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router