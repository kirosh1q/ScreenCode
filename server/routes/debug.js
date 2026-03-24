const express = require('express')
const router = express.Router()
const multer = require('multer')
const { processImageForAI, processImageForAnalysis, createMultiCrop, addGridOverlay } = require('../utils/imageProcessor')
const { callAIJson } = require('../utils/aiClient')
const { getStackRules } = require('../utils/stackRules')
const copyPrompt = require('./prompts/copyMode')
const templatePrompt = require('./prompts/templateMode')

const upload = multer({ storage: multer.memoryStorage() })

router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })

        const stack = req.body.stack || 'React + Tailwind'
        const mode = req.body.mode || 'copy'
        const dryRun = req.body.dryRun === 'true'

        const { buffer: processedBuffer, mimeType } = await processImageForAI(req.file.buffer)
        const base64Image = processedBuffer.toString('base64')

        const { rawPixels, info: imgInfo } = await processImageForAnalysis(req.file.buffer)

        const { top, middle, bottom } = await createMultiCrop(req.file.buffer, imgInfo)
        const { buffer: gridBuffer, colW, rowH } = await addGridOverlay(processedBuffer)
        const base64Grid = gridBuffer.toString('base64')
        const gridImageContent = {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64Grid}` }
        }
        const imageContent = {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` }
        }

        const pass1Prompt = `Analyze this UI screenshot in detail.
The image has a coordinate grid: columns A-L (left→right), rows 1-9 (top→bottom), each cell = ${colW}x${rowH}px.
Use grid coordinates to describe where elements are located.

Return ONLY valid JSON, no markdown:
{
  "layout": "one sentence description",
  "background_type": "photo or solid or gradient",
  "background_description": "description",
  "background_coverage": "percentage",
  "sections": [
    {
      "name": "section name",
      "type": "static or dynamic",
      "position": "top/bottom/left/right/center",
      "top_percent": 0,
      "height_percent": 20,
      "grid_area": "e.g. A1:L2",
      "description": "list EVERY visible element"
    }
  ],
  "static_elements": [...],
  "dynamic_elements": [...],
  "exact_colors": { "background": "#hex", "surface": "#hex", "text": "#hex", "accent": "#hex" }
}`

        let analysisRaw = ''
        let analysis = {}

        if (!dryRun) {
            analysisRaw = await callAIJson([{
                role: 'user',
                content: [gridImageContent, { type: 'text', text: pass1Prompt }]
            }])
            try { analysis = JSON.parse(analysisRaw) } catch {}
        } else {
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

        const pass2Prompt = `Generate code for this UI screenshot.
You are receiving 4 images of the SAME page:
- Image 1: full screenshot — overall layout and structure
- Image 2: top section (0-30%) — header details, navigation, search
- Image 3: middle section (30-60%) — main content details
- Image 4: bottom section (60-100%) — footer, panels, widgets
Use all 4 images together for maximum accuracy.
Stack: ${stack}

UI Structure from analysis:
Layout: ${analysis.layout}
Background: ${analysis.background_type === 'photo'
            ? `Photo covering ${analysis.background_coverage} of screen: ${analysis.background_description}`
            : analysis.background_description || 'none'}
Sections:
${sectionsDesc}

${modeInstruction}

RULES FOR ${stack.toUpperCase()}:
${getStackRules(stack, mode)}
- Return ONLY the code, no markdown, no backticks, no explanations`

        res.json({
            success: true,
            dryRun,
            base64Image: `data:${mimeType};base64,${base64Image}`,
            base64Grid: `data:image/png;base64,${base64Grid}`,
            gridInfo: { colW, rowH, cols: 12, rows: 9 },
            base64Top: `data:image/png;base64,${top.toString('base64')}`,
            base64Middle: `data:image/png;base64,${middle.toString('base64')}`,
            base64Bottom: `data:image/png;base64,${bottom.toString('base64')}`,
            pass1Prompt,
            pass1Result: analysisRaw,
            pass1Parsed: analysis,
            pass2Prompt,
            stack,
            mode
        })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router