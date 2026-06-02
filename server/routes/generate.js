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

/**
 * Главный маршрут генерации фронтенд-кода по скриншоту интерфейса
 *
 * Реализует двухэтапный конвейер (Chain-of-Thought prompting):
 *
 * ═══ ЭТАП 0: Предобработка изображения ═══
 * - Масштабирование до 1280px (оптимизация токенов)
 * - Повышение резкости (sharpen)
 * - Нормализация яркости и контраста
 * - Усиление насыщенности (+10%)
 * - Наложение координатной сетки 12×9 для Pass 1
 * - Мульти-кроп на 3 зоны (0-30%, 30-60%, 60-100%) для Pass 2
 *
 * ═══ ЭТАП 1: Структурный анализ (Pass 1) ═══
 * - Модель получает изображение с координатной сеткой
 * - Возвращает JSON с описанием секций, цветов, типов элементов
 * - Результат используется для формирования точного промпта Pass 2
 *
 * ═══ ЭТАП 2: Генерация кода (Pass 2) ═══
 * - Модель получает 4 изображения (сетка + 3 кропа) + структурированный промпт
 * - Возвращает готовый код в выбранном стеке (HTML/React)
 * - Код парсится на файлы по маркерам // @@FILE:Name.jsx
 *
 * Архитектурные решения:
 * - Координатная сетка: формализует описание позиций (A1:L9 вместо "слева сверху")
 * - Двухэтапность: разделяет задачи "понять" и "написать" — повышает точность
 * - Мульти-кроп: модель видит детали без роста общего количества токенов
 * - BYOK (Bring Your Own Key): пользователь вводит свой API-ключ OpenRouter
 *
 * @module routes/generate
 */

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: POST / — Запуск процесса генерации кода
// ═══════════════════════════════════════════════════════════════

/**
 * Запускает полный конвейер генерации фронтенд-кода
 *
 * Принимает изображение скриншота и настройки, возвращает сгенерированный код
 * и метаданные анализа (секции, цвета, описание макета).
 *
 * @param {Object} req - Express request
 * @param {File} req.file - Загруженный файл изображения (через multer)
 * @param {Object} req.body
 * @param {string} req.body.stack - Технологический стек ('HTML + Tailwind' | 'HTML + CSS' | 'React + Tailwind')
 * @param {string} req.body.mode - Режим генерации ('copy' | 'template')
 * @param {string} req.body.apiKey - API-ключ OpenRouter (пользовательский, BYOK)
 * @param {string} [req.body.model='qwen/qwen3.6-plus'] - Имя модели для генерации
 *
 * @returns {Object} {
 *   success: true,
 *   data: {
 *     layout: string,              // Описание макета из Pass 1
 *     sections: Array,             // Массив секций интерфейса
 *     static_elements: string[],   // Статичные элементы
 *     dynamic_elements: string[],  // Динамичные элементы
 *     colors: string[],            // HEX-цвета палитры
 *     fixedHTML: string,           // Сгенерированный код (с заменёнными src)
 *     files: Array<{name, content}> // Массив файлов (для React-стека)
 *   }
 * }
 *
 * @throws {400} Если файл не загружен или API-ключ отсутствует
 * @throws {401} Если токен невалиден (проверяется authMiddleware)
 * @throws {500} При ошибке предобработки, AI API или парсинга
 *
 * Пример запроса:
 * POST /api/generate
 * Content-Type: multipart/form-data
 * Authorization: Bearer <jwt>
 *
 * image: <файл>, stack: 'React + Tailwind', mode: 'copy',
 * apiKey: 'sk-or-v1-...', model: 'qwen/qwen3.6-plus'
 */
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        // ═══════════ Валидация входных данных ═══════════
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' })
        }

        const { stack, mode, apiKey, model } = req.body

        // Проверка API-ключа — защита от неавторизованного использования OpenRouter
        if (!apiKey) {
            return res.status(400).json({ error: 'Не указан API ключ OpenRouter' })
        }

        // Fallback на модель по умолчанию, если клиент не указал свою
        const finalModel = model || 'qwen/qwen3.6-plus'

        console.log('\n=== НОВАЯ ГЕНЕРАЦИЯ ===')
        console.log(`Стек: ${stack} | Mode: ${mode} | Model: ${finalModel}`)
        console.log(`API Key: ${apiKey.substring(0, 10)}...`)

        // ═══════════ ЭТАП 0: Предобработка изображения ═══════════
        console.log('Обработка изображения через Sharp...')

        // Базовая обработка: resize, sharpen, normalize, modulate
        const { buffer: processedBuffer, mimeType } = await processImageForAI(req.file.buffer)
        const base64Image = processedBuffer.toString('base64')

        // Наложение координатной сетки для Pass 1 (формализация позиций)
        const gridResult = await addGridOverlay(processedBuffer, { targetCellSize: 120 })
        const { buffer: gridBuffer, colW, rowH, cols, rows, gridSpec } = gridResult
        const base64GridImage = gridBuffer.toString('base64')

        // Формат изображения для мультимодальной модели
        const gridImageContent = {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64GridImage}` }
        }

        // Программный анализ изображения (без AI) — определение повторяющихся блоков
        const { rawPixels, info: imgInfo } = await processImageForAnalysis(req.file.buffer)
        const hasRepeatingBlocks = detectRepeatingBlocks(rawPixels, imgInfo.width, imgInfo.height)

        console.log(`Программный анализ: повторяющиеся блоки = ${hasRepeatingBlocks}`)

        const imageContent = {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` }
        }

        // ═══════════ ЭТАП 1: Структурный анализ (Pass 1) ═══════════
        // Модель получает изображение с координатной сеткой и возвращает JSON
        // с описанием структуры интерфейса. Это позволяет отделить задачу
        // "понять что нарисовано" от задачи "написать код".
        console.log('\nPass 1: анализ структуры...')

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

        console.log(`🤖 Вызываю Pass 1 с моделью: ${finalModel}`)
        const analysisRaw = await callAIJson(
            [{ role: 'user', content: [gridImageContent, { type: 'text', text: pass1PromptText }] }],
            apiKey,
            finalModel
        )
        console.log(`✅ Pass 1 завершен, длина ответа: ${analysisRaw?.length}`)

        console.log('═══════════════════PASS 1: Анализ══════════════════════════\n')

        // Парсим JSON-ответ модели. Если парсинг упал — продолжаем без анализа структуры,
        // используя дефолтные значения. Это повышает отказоустойчивость системы.
        let analysis = {
            layout: '',
            sections: [],
            static_elements: [],
            dynamic_elements: [],
            exact_colors: {}
        }
        try {
            analysis = JSON.parse(analysisRaw)
            console.log('✅ JSON распарсился успешно')
            console.log(`   Секций найдено: ${analysis.sections?.length || 0}`)
            console.log(`   Цветов найдено: ${Object.keys(analysis.exact_colors || {}).length}`)

            if (analysis.sections?.length > 0) {
                console.log('\n   Секции:')
                analysis.sections.forEach((s, i) => {
                    console.log(`     ${i + 1}. ${s.name} (${s.type}) — ${s.grid_area || s.position}`)
                })
            }

            console.log(`\n   Статичные элементы: ${analysis.static_elements?.slice(0, 5).join(', ') || 'не указаны'}`)
            console.log(`   Динамичные элементы: ${analysis.dynamic_elements?.slice(0, 5).join(', ') || 'не указаны'}`)

            if (analysis.exact_colors) {
                console.log('\n   Цветовая палитра:')
                Object.entries(analysis.exact_colors).forEach(([key, val]) => {
                    console.log(`     ${key}: ${val}`)
                })
            }
        } catch (e) {
            console.log('❌ JSON не распарсился')
            console.log('Сырой ответ модели (первые 500 символов):')
            console.log(analysisRaw?.slice(0, 500) + '...')
            console.log('Продолжаем без анализа структуры')
        }
        console.log('═══════════════════════════════════════════════════════════\n')

        // ═══════════ ЭТАП 2: Генерация кода (Pass 2) ═══════════
        // Модель получает 4 изображения (сетка + 3 кропа) и структурированный промпт,
        // сформированный на основе результата Pass 1. Это позволяет модели точно
        // воспроизвести структуру, цвета и расположение элементов.
        console.log('\nPass 2: генерация кода...')

        // Формируем текстовое описание секций из Pass 1
        const sectionsDesc = analysis.sections
            ?.map(s => `  - ${s.name} (${s.type}, ${s.position}): ${s.description}`)
            .join('\n') || ''

        // Выбираем инструкции режима (copy/template) из модульных промптов
        const modeInstruction = mode === 'copy'
            ? copyPrompt(stack, hasRepeatingBlocks)
            : templatePrompt(hasRepeatingBlocks, analysis, stack)

        // Создаём 3 кропа изображения для детализации зон
        const crops = await createMultiCrop(req.file.buffer)

        // Формируем массив изображений для Pass 2: сетка + 3 кропа
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

            // Сохраняем изображения для отладки (доступны через /api/last-debug)
            lastGenerationDebug.images = {
                base64Grid: base64GridImage,
                base64Image,
                base64Top: crops.top.toString('base64'),
                base64Middle: crops.middle.toString('base64'),
                base64Bottom: crops.bottom.toString('base64')
            }
        } else {
            // Для очень широких изображений кропы не создаются — используем только сетку
            console.log('Широкое изображение, используем только оригинал с сеткой')

            lastGenerationDebug.images = {
                base64Grid: base64GridImage,
                base64Image,
                base64Top: null,
                base64Middle: null,
                base64Bottom: null
            }
        }

        // Формируем промпт Pass 2 с полной структурой из Pass 1
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

═══ CRITICAL: GRID OVERLAY ═══
The coordinate grid (letters A-L on top, numbers 1-9 on left) visible on Image 1 is 
an ANALYSIS OVERLAY for your reference ONLY. It is NOT part of the UI design.

STRICTLY PROHIBITED:
- DO NOT draw grid lines in the generated code
- DO NOT add letter labels (A, B, C...) or number labels (1, 2, 3...)
- DO NOT create any visual element that resembles a grid overlay
- DO NOT use borders or backgrounds to simulate grid cells
- The grid exists ONLY to help you position elements precisely

Use the grid coordinates to determine positions (e.g., "header spans A1:L2" means 
full width at top), but NEVER render the grid itself.

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

        console.log(`🤖 Вызываю Pass 2 с моделью: ${finalModel}`)
        const generatedHTML = await callAICode(
            [{ role: 'user', content: [...imagesForPass2, { type: 'text', text: pass2PromptText }] }],
            apiKey,
            finalModel
        )
        console.log(`✅ Pass 2 завершен, длина ответа: ${generatedHTML?.length}`)

        // ═══════════ Постобработка ответа ═══════════
        let fixedHTML = generatedHTML

// ═══════════ Очистка от markdown-обёрток ═══════════
// Модель часто игнорирует инструкцию "no markdown" и оборачивает код в ```html ... ```
// или ```jsx ... ```. Удаляем все такие обёртки, включая языковые метки.
        fixedHTML = fixedHTML
            .replace(/^```[\w]*\s*\n?/gm, '')   // Убираем открывающие ```html, ```jsx, ```css и т.д.
            .replace(/\n?```\s*$/gm, '')         // Убираем закрывающие ```
            .trim()

// ═══════════ Замена относительных путей изображений ═══════════
// Модель часто генерирует src="/image.png" или src="/assets/...",
// что приводит к 404 в превью. Заменяем на placehold.co.
        fixedHTML = fixedHTML
            .replace(/src="\/(?!\/)[^"]+"/g, 'src="https://placehold.co/400x300/111111/39d353?text=Image"')
            .replace(/src='\/(?!'\/)[^']+'/g, "src='https://placehold.co/400x300/111111/39d353?text=Image'")

        console.log(`Pass 2 готов. HTML длина: ${fixedHTML.length}`)
        console.log('======================\n')

        // ═══════════ Парсинг на файлы ═══════════
        // Для React-стека (template mode) парсим код по маркерам // @@FILE:Name.jsx.
        // Для HTML-стеков возвращаем один файл index.html.
        const files = (() => {
            if (stack.includes('React')) {
                const parsed = parseFiles(fixedHTML)
                if (parsed.length > 0) {
                    console.log(`Найдено файлов: ${parsed.map(f => f.name).join(', ')}`)
                    return parsed
                }
            }
            return [{
                name: stack.includes('React') ? 'App.jsx' : 'index.html',
                content: fixedHTML
            }]
        })()

        // ═══════════ Сохранение для отладки ═══════════
        // Все промпты и изображения сохраняются в памяти сервера
        // и доступны через /api/last-debug для отладки
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

        // ═══════════ Ответ клиенту ═══════════
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
        console.error('Ошибка генерации:', error.message)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router