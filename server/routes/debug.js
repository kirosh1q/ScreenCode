const express = require('express')
const router = express.Router()
const multer = require('multer')
const sharp = require('sharp')
const { processImageForAI, processImageForAnalysis, createMultiCrop, addGridOverlay } = require('../utils/imageProcessor')
const { callAIJson } = require('../utils/aiClient')
const { buildPass1Prompt } = require('./prompts/pass1Prompt')
const { buildPass2Prompt } = require('./prompts/pass2Prompt')
const copyPrompt = require('./prompts/copyMode')
const templatePrompt = require('./prompts/templateMode')

const upload = multer({ storage: multer.memoryStorage() })

/**
 * Отладочный эндпоинт для тестирования конвейера генерации
 *
 * Предоставляет расширенную информацию для отладки:
 * - Base64 всех этапов предобработки (оригинал, Sharp, сетка, кропы)
 * - Промпты Pass 1 и Pass 2
 * - Результат анализа Pass 1 (JSON)
 * - Поддержка dry run (без вызова AI)
 * - Поддержка mock-ответов (для тестирования без API)
 *
 * @param {Object} req.body
 * @param {File} req.file - Загруженное изображение
 * @param {string} req.body.stack - Технологический стек
 * @param {string} req.body.mode - Режим генерации
 * @param {string} [req.body.dryRun='false'] - Пропустить вызов AI
 * @param {string} [req.body.useMock='false'] - Использовать мок-ответ
 */
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })

        const stack = req.body.stack || 'React + Tailwind'
        const mode = req.body.mode || 'copy'
        const dryRun = req.body.dryRun === 'true'
        const useMock = req.body.useMock === 'true'

        // ═══════════ Предобработка изображения ═══════════
        const { buffer: processedBuffer, mimeType } = await processImageForAI(req.file.buffer)
        const base64Image = processedBuffer.toString('base64')

        const { rawPixels, info: imgInfo } = await processImageForAnalysis(req.file.buffer)
        const aspectRatio = imgInfo.width / imgInfo.height

        const crops = await createMultiCrop(req.file.buffer)
        const hasCrops = crops.top && crops.middle && crops.bottom

        const { buffer: gridBuffer, colW, rowH, cols, rows } = await addGridOverlay(processedBuffer)
        const base64Grid = gridBuffer.toString('base64')

        const gridInfo = { colW, rowH, cols, rows }
        const gridImageContent = {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64Grid}` }
        }

        // ═══════════ Pass 1: Структурный анализ ═══════════
        const pass1Prompt = buildPass1Prompt(gridInfo)

        let analysisRaw = ''
        let analysis = {}

        if (useMock) {
            // Мок-ответ для тестирования без API
            analysis = {
                layout: '[mock response]',
                background_type: 'solid',
                background_description: '#ffffff',
                sections: [
                    { name: 'Header', type: 'static', position: 'top', top_percent: 0, height_percent: 10, description: '[mock header]' }
                ],
                exact_colors: { background: '#ffffff', text: '#000000' }
            }
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
                sections: [],
                exact_colors: {}
            }
            analysisRaw = JSON.stringify(analysis, null, 2)
        }

        // ═══════════ Pass 2: Формирование промпта (без вызова AI) ═══════════
        const modeInstruction = mode === 'copy'
            ? copyPrompt(stack, false)
            : templatePrompt(false, analysis, stack)

        const pass2Prompt = buildPass2Prompt({
            gridInfo,
            hasCrops,
            aspectRatio,
            stack,
            analysis,
            modeInstruction,
            mode
        })

        // ═══════════ Ответ с отладочной информацией ═══════════
        res.json({
            success: true,
            dryRun,
            useMock,
            imageInfo: {
                width: imgInfo.width,
                height: imgInfo.height,
                aspectRatio: aspectRatio.toFixed(2),
                isWideImage: aspectRatio > 1.5
            },
            base64Image: `data:${mimeType};base64,${base64Image}`,
            base64Grid: `data:image/png;base64,${base64Grid}`,
            base64Top: hasCrops ? `data:image/png;base64,${crops.top?.toString('base64')}` : null,
            base64Middle: hasCrops ? `data:image/png;base64,${crops.middle?.toString('base64')}` : null,
            base64Bottom: hasCrops ? `data:image/png;base64,${crops.bottom?.toString('base64')}` : null,
            gridInfo,
            pass1Prompt,
            pass1Result: analysisRaw,
            pass1Parsed: analysis,
            pass2Prompt,
            stack,
            mode,
            cropsGenerated: hasCrops
        })

    } catch (error) {
        console.error('Debug error:', error)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router