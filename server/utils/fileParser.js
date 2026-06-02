/**
 * Парсер сгенерированного кода на отдельные файлы
 *
 * Извлекает файлы из ответа AI-модели по маркерам формата "// @@FILE:Name.jsx".
 * Используется только для React-стека в режиме template, где модель генерирует
 * несколько компонентов в одном ответе.
 *
 * Формат ответа модели (задаётся в промпте Pass 2):
 * ```
 * // @@FILE:Header.jsx
 * export default function Header() { ... }
 *
 * // @@FILE:Footer.jsx
 * export default function Footer() { ... }
 *
 * // @@FILE:App.jsx
 * import Header from './Header'
 * import Footer from './Footer'
 * export default function App() { ... }
 * ```
 *
 * Архитектурная роль:
 * Вызывается в server/routes/generate.js после получения ответа от Pass 2.
 * Для HTML-стеков не используется (возвращается один файл index.html).
 *
 * @module utils/fileParser
 */

// ═══════════════════════════════════════════════════════════════
// ФУНКЦИЯ: parseFiles — Извлечение файлов из ответа модели
// ═══════════════════════════════════════════════════════════════

/**
 * Парсит ответ AI-модели на массив файлов по маркерам // @@FILE:
 *
 * Алгоритм:
 * 1. Ищет все вхождения маркера "// @@FILE:Name.jsx" через regex
 * 2. Извлекает содержимое между маркерами (до следующего маркера или конца строки)
 * 3. Если файлов несколько, но App.jsx отсутствует — пытается найти его по содержимому
 *    (fallback для случая, когда модель не поставила маркер явно)
 *
 * @param {string} generatedCode - Сырой код из ответа модели (может содержать несколько файлов)
 * @returns {Array<{name: string, content: string}>} Массив извлечённых файлов
 *   - name: имя файла (например, "Header.jsx", "App.jsx")
 *   - content: содержимое файла (код компонента)
 *
 * @example
 * const code = `// @@FILE:Header.jsx
 * export default function Header() { return <div/> }
 *
 * // @@FILE:App.jsx
 * export default function App() { return <Header/> }`
 *
 * const files = parseFiles(code)
 * // [
 * //   { name: 'Header.jsx', content: 'export default function Header()...' },
 * //   { name: 'App.jsx', content: 'export default function App()...' }
 * // ]
 *
 * @example
 * // Если модель не поставила маркер App.jsx, но содержит "function App" — переименуем:
 * const code = `// @@FILE:Header.jsx
 * export default function Header() { ... }
 *
 * function App() { return <Header/> }`
 *
 * const files = parseFiles(code)
 * // Второй файл будет переименован в App.jsx (по содержимому)
 */
function parseFiles(generatedCode) {
    // ═══════════ Шаг 1: Извлечение файлов по маркерам ═══════════
    // Regex разбираем по частям:
    // - \/\/\s*@@FILE:      — маркер начала файла (// @@FILE:)
    // - \s*                  — опциональные пробелы после маркера
    // - (\w+\.jsx)           — ЗАХВАТ 1: имя файла (буквы/цифры + .jsx)
    // - \s*\r?\n             — перевод строки (поддержка Windows \r\n и Unix \n)
    // - ([\s\S]*?)           — ЗАХВАТ 2: содержимое файла (любые символы, ленивый квантификатор)
    // - (?=\/\/\s*@@FILE:|$) — LOOKAHEAD: до следующего маркера или конца строки
    const componentRegex = /\/\/\s*@@FILE:\s*(\w+\.jsx)\s*\r?\n([\s\S]*?)(?=\/\/\s*@@FILE:|$)/g

    const files = []
    let match

    // Итеративно извлекаем все совпадения через exec()
    while ((match = componentRegex.exec(generatedCode)) !== null) {
        const content = match[2].trim()
        // Пропускаем пустые блоки (между маркерами может быть только whitespace)
        if (content.length > 0) {
            files.push({ name: match[1].trim(), content })
        }
    }

    // ═══════════ Шаг 2: Fallback-поиск App.jsx ═══════════
    // Если модель сгенерировала несколько файлов, но забыла поставить маркер
    // "// @@FILE:App.jsx" — пытаемся найти компонент App по содержимому.
    // Это повышает отказоустойчивость: даже если модель не соблюла формат,
    // мы всё равно получим корректную структуру проекта.
    if (files.length > 0 && !files.find(f => f.name === 'App.jsx')) {
        // Ищем файл, содержащий определение компонента App
        const appIndex = files.findIndex(f =>
            f.content.includes('export default App') ||
            f.content.includes('function App') ||
            f.content.includes('const App')
        )

        // Если нашли — переименовываем в App.jsx
        // Если не нашли — переименовываем последний файл (он обычно и есть App)
        const targetIndex = appIndex !== -1 ? appIndex : files.length - 1
        files[targetIndex].name = 'App.jsx'
    }

    return files
}

module.exports = { parseFiles }