/**
 * HTTP-клиент для взаимодействия с OpenRouter API
 *
 * Предоставляет две функции для вызова мультимодальных AI-моделей:
 * - callAIJson: для получения структурированного JSON-ответа (Pass 1 — анализ)
 * - callAICode: для получения сырого кода (Pass 2 — генерация)
 *
 * Архитектурные решения:
 * - Две отдельные функции вместо одной с флагом: разные температуры и response_format
 *   - callAIJson: temperature=0.2 (детерминированность) + response_format=json_object
 *   - callAICode: temperature=0.4 (креативность) + свободный формат
 * - BYOK (Bring Your Own Key): API-ключ передаётся пользователем, не хранится на сервере
 * - Используется нативный fetch вместо axios — меньше зависимостей, одинаковый API с браузером
 *
 * Почему не используется в edit.js:
 * Маршрут edit.js имеет специфичный формат промпта и парсинга ответа,
 * поэтому использует прямой fetch. Объединение усложнило бы оба модуля.
 *
 * @module utils/aiClient
 */

// ═══════════════════════════════════════════════════════════════
// КОНСТАНТЫ
// ═══════════════════════════════════════════════════════════════

/** Базовый URL OpenRouter API (единая точка для всех запросов) */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * HTTP-Referer для идентификации приложения в статистике OpenRouter
 *
 * OpenRouter использует этот заголовок для:
 * - Статистики использования по приложениям
 * - Рейтинга приложений в каталоге
 * - Защиты от злоупотреблений
 *
 * В продакшене заменить на реальный URL развёрнутого приложения.
 */
const APP_REFERER = 'http://localhost:5173'

// ═══════════════════════════════════════════════════════════════
// ФУНКЦИЯ: callAIJson — Запрос с ожиданием JSON-ответа
// ═══════════════════════════════════════════════════════════════

/**
 * Вызывает AI-модель с ожиданием структурированного JSON-ответа
 *
 * Используется в Pass 1 (структурный анализ), где модель должна вернуть
 * валидный JSON с описанием секций, цветов, типов элементов и т.д.
 *
 * Отличия от callAICode:
 * - temperature: 0.2 (низкая — для детерминированного, предсказуемого ответа)
 * - response_format: json_object (принудительный JSON-формат от модели)
 *
 * @param {Array<Object>} messages - Массив сообщений в формате OpenAI Chat API
 *   Пример: [{ role: 'user', content: [imageContent, { type: 'text', text: prompt }] }]
 * @param {string} apiKey - API-ключ OpenRouter (пользовательский, BYOK)
 * @param {string} model - Имя модели (например, 'qwen/qwen3.6-plus')
 *
 * @returns {Promise<string>} Строка с JSON-ответом модели (нужно распарсить через JSON.parse)
 *
 * @throws {Error} Если OpenRouter вернул ошибку (неверный ключ, лимиты, недоступность)
 *
 * @example
 * const jsonStr = await callAIJson(
 *     [{ role: 'user', content: [imageContent, { type: 'text', text: prompt }] }],
 *     'sk-or-v1-...',
 *     'qwen/qwen3.6-plus'
 * )
 * const analysis = JSON.parse(jsonStr)
 */
async function callAIJson(messages, apiKey, model) {
    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': APP_REFERER,
        },
        body: JSON.stringify({
            model,
            messages,
            // Низкая температура для детерминированного JSON-ответа
            temperature: 0.2,
            // Принудительный JSON-формат — модель гарантированно вернёт валидный JSON
            response_format: { type: 'json_object' }
        })
    })

    if (!response.ok) {
        const err = await response.json()
        throw new Error(`OpenRouter API error: ${err.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
}

// ═══════════════════════════════════════════════════════════════
// ФУНКЦИЯ: callAICode — Запрос с ожиданием сырого кода
// ═══════════════════════════════════════════════════════════════

/**
 * Вызывает AI-модель с ожиданием сырого кода (HTML/JSX)
 *
 * Используется в Pass 2 (генерация кода), где модель возвращает
 * готовый код интерфейса в выбранном стеке.
 *
 * Отличия от callAIJson:
 * - temperature: 0.4 (выше — для более креативных решений в коде)
 * - Без response_format — модель свободна в формате ответа
 * - Без HTTP-Referer (не критично для генерации кода)
 *
 * @param {Array<Object>} messages - Массив сообщений в формате OpenAI Chat API
 *   Обычно содержит несколько изображений (сетка + кропы) и текстовый промпт
 * @param {string} apiKey - API-ключ OpenRouter (пользовательский, BYOK)
 * @param {string} model - Имя модели (например, 'qwen/qwen3.6-plus')
 *
 * @returns {Promise<string>} Строка с сгенерированным кодом
 *
 * @throws {Error} Если OpenRouter вернул ошибку
 *
 * @example
 * const code = await callAICode(
 *     [{ role: 'user', content: [...images, { type: 'text', text: prompt }] }],
 *     'sk-or-v1-...',
 *     'qwen/qwen3.6-plus'
 * )
 * // code = "<div class='container'>...</div>"
 */
async function callAICode(messages, apiKey, model) {
    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages,
            // Средняя температура — баланс между точностью и креативностью
            temperature: 0.4
        })
    })

    if (!response.ok) {
        const err = await response.json()
        throw new Error(`OpenRouter API error: ${err.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
}

module.exports = { callAIJson, callAICode }