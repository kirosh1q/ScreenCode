const express = require('express')
const router = express.Router()

/**
 * Маршрут точечного редактирования сгенерированного кода
 *
 * Позволяет пользователю вносить изменения в уже сгенерированный код
 * через текстовые инструкции на естественном языке (чат-интерфейс).
 *
 * Архитектурные особенности:
 * - Использует прямой fetch вместо aiClient.js, так как имеет специфичный
 *   формат промпта и парсинга ответа (отличается от основного пайплайна)
 * - Поддерживает два режима: редактирование одного файла и многофайловое
 * - Передаёт все файлы проекта в модель через маркеры "// FILE: name"
 * - Очищает ответ от блоков рассуждений модели (<think>) и markdown
 *
 * Почему не через aiClient.js:
 * aiClient.js оптимизирован под двухэтапный пайплайн генерации (Pass 1 + Pass 2)
 * с vision-моделью. Edit-маршрут работает только с текстом (уже готовый код),
 * использует другой формат промпта и другой парсер ответа. Объединение
 * усложнило бы оба модуля без реальной выгоды.
 *
 * Для продакшена:
 * - Добавить rate limiting для защиты от злоупотреблений API-ключом
 * - Добавить валидацию длины editPrompt (защита от чрезмерно больших запросов)
 * - Логировать использование API-ключей пользователей для аналитики
 */

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: POST / — Применение текстовой инструкции к коду
// ═══════════════════════════════════════════════════════════════

/**
 * Применяет текстовую инструкцию к сгенерированному коду
 *
 * Принимает текущий код (один файл или массив файлов) и текстовую инструкцию,
 * отправляет их в языковую модель и возвращает обновлённый код.
 *
 * @param {Object} req.body
 * @param {string} [req.body.currentCode] - Код текущего файла (для однофайлового режима)
 * @param {string} req.body.editPrompt - Текстовая инструкция (например, "сделай кнопку красной")
 * @param {Array<{name: string, content: string}>} [req.body.allFiles] - Все файлы проекта (для многофайлового)
 * @param {string} req.body.apiKey - API-ключ OpenRouter (пользовательский, BYOK)
 * @param {string} [req.body.model='qwen/qwen3.6-plus'] - Имя модели для редактирования
 *
 * @returns {Object}
 *   - Для многофайлового режима: { success: true, files: [{name, content}, ...] }
 *   - Для однофайлового режима: { success: true, code: "..." }
 *
 * @throws {400} Если отсутствует инструкция, API-ключ или код
 * @throws {500} При ошибке OpenRouter API или сервера
 *
 * Примеры запросов:
 *
 * Однофайловый режим (HTML):
 * POST /api/edit
 * {
 *   "currentCode": "<button>Click</button>",
 *   "editPrompt": "сделай кнопку синей",
 *   "apiKey": "sk-or-v1-...",
 *   "model": "qwen/qwen3.6-plus"
 * }
 *
 * Многофайловый режим (React):
 * POST /api/edit
 * {
 *   "allFiles": [
 *     { "name": "Header.jsx", "content": "..." },
 *     { "name": "App.jsx", "content": "..." }
 *   ],
 *   "editPrompt": "добавь логотип в хедер",
 *   "apiKey": "sk-or-v1-..."
 * }
 */
router.post('/', async (req, res) => {
    try {
        const { currentCode, editPrompt, allFiles, apiKey, model } = req.body

        // ═══════════ Валидация входных данных ═══════════
        if (!editPrompt) {
            return res.status(400).json({ error: 'Нет инструкции' })
        }

        // Проверка API-ключа — защита от неавторизованного использования OpenRouter
        if (!apiKey) {
            return res.status(400).json({ error: 'Не указан API ключ OpenRouter' })
        }

        // Fallback на модель по умолчанию, если клиент не указал свою
        const finalModel = model || 'qwen/qwen3.6-plus'

        // ═══════════ Формирование контекста кода ═══════════
        // Для многофайловых проектов (React) передаём все файлы с маркерами,
        // чтобы модель понимала структуру проекта и могла обновить нужный файл.
        // Для однофайловых проектов (HTML) передаём код напрямую.
        const codeContext = allFiles?.length > 1
            ? allFiles.map(f => `// FILE: ${f.name}\n${f.content}`).join('\n\n---\n\n')
            : currentCode

        if (!codeContext) {
            return res.status(400).json({ error: 'Нет кода' })
        }

        // ═══════════ Формирование промпта ═══════════
        // Промпт различается для многофайлового и однофайлового режимов:
        // - Многофайловый: модель должна вернуть ВСЕ файлы в том же формате
        // - Однофайловый: модель возвращает только обновлённый код
        const prompt = allFiles?.length > 1
            ? `Here are the current files:\n\n${codeContext}\n\nApply this change: ${editPrompt}\n\nReturn ALL files in the same format:\n// FILE: filename.jsx\n[code]\n\n---\n\n// FILE: App.jsx\n[code]\n\nReturn ONLY the files, no explanations, no markdown backticks.`
            : `Here is the current code:\n\`\`\`\n${codeContext}\n\`\`\`\n\nApply this change: ${editPrompt}\n\nReturn ONLY the complete updated code, no explanations, no markdown backticks.`

        // ═══════════ Запрос к OpenRouter API ═══════════
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                // Используем пользовательский API-ключ (BYOK)
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: finalModel,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        })

        if (!response.ok) {
            const err = await response.json()
            throw new Error(`OpenRouter API error: ${err.error?.message || response.statusText}`)
        }

        const data = await response.json()
        let updatedCode = data.choices[0].message.content

        // ═══════════ Постобработка ответа модели ═══════════

        // Удаляем блоки рассуждений модели (некоторые модели, например Qwen,
        // выводят свои размышления в тегах <think>...</think>)
        updatedCode = updatedCode.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

        // Удаляем markdown-обёртки (```jsx ... ``` или ```html ... ```),
        // так как мы просили модель не использовать markdown, но она всё равно может
        updatedCode = updatedCode.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '').trim()

        console.log('=== EDIT RESPONSE ===')
        console.log('updatedCode length:', updatedCode.length)
        console.log('allFiles count:', allFiles?.length)

        // ═══════════ Парсинг многофайлового ответа ═══════════
        // Если проект многофайловый, парсим ответ по маркерам "// FILE: name"
        // с помощью регулярного выражения. Формат ответа:
        // // FILE: Header.jsx
        // [код Header]
        // ---
        // // FILE: App.jsx
        // [код App]
        if (allFiles?.length > 1) {
            const fileRegex = /\/\/ FILE:\s*(\S+)\s*\n([\s\S]*?)(?=\n\s*---\s*\n\s*\/\/ FILE:|$)/g
            const files = []
            let match
            while ((match = fileRegex.exec(updatedCode)) !== null) {
                const content = match[2].trim()
                if (content.length > 0) {
                    files.push({ name: match[1], content })
                }
            }

            // Если удалось распарсить хотя бы один файл — возвращаем массив
            if (files.length > 0) {
                return res.json({ success: true, files })
            }
            // Иначе fallback на однофайловый режим (модель не соблюдала формат)
        }

        // ═══════════ Ответ клиенту ═══════════
        res.json({ success: true, code: updatedCode })

    } catch (error) {
        console.error('Ошибка edit:', error.message)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router