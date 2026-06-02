/**
 * Модуль правил генерации кода для различных технологических стеков
 *
 * Возвращает текстовые инструкции, которые встраиваются в промпт Pass 2
 * для указания модели, в каком формате и с какими ограничениями генерировать код.
 *
 * Архитектурная роль:
 * Используется в server/routes/generate.js при формировании промпта Pass 2.
 * Позволяет централизованно управлять требованиями к генерируемому коду
 * без изменения самих промптов.
 *
 * Поддерживаемые стеки:
 * - 'HTML + Tailwind' — одностраничный HTML с Tailwind через CDN
 * - 'HTML + CSS' — одностраничный HTML с кастомным CSS (без Tailwind)
 * - 'React + Tailwind' — React-компоненты с Tailwind-классами
 *
 * @module utils/stackRules
 */

// ═══════════════════════════════════════════════════════════════
// ФУНКЦИЯ: getStackRules — Получение правил для стека
// ═══════════════════════════════════════════════════════════════

/**
 * Возвращает текстовые правила генерации кода для указанного стека
 *
 * Правила встраиваются в промпт Pass 2 в секцию "═══ STACK RULES ═══"
 * и указывают модели технологические ограничения и требования к формату.
 *
 * @param {string} stack - Технологический стек ('HTML + Tailwind' | 'HTML + CSS' | 'React + Tailwind')
 * @param {string} mode - Режим генерации ('copy' | 'template') — зарезервирован для будущих расширений
 * @returns {string} Текстовые правила для встраивания в промпт (пустая строка для неизвестного стека)
 *
 * @example
 * const rules = getStackRules('React + Tailwind', 'copy')
 * // rules = "- Return ONLY React functional component(s)..."
 *
 * @example
 * const rules = getStackRules('Unknown Stack', 'copy')
 * // rules = '' (пустая строка — защита от неизвестных стеков)
 */
function getStackRules(stack, mode) {

    // ═══════════ HTML + Tailwind ═══════════
    // Одностраничный HTML с Tailwind CSS через CDN.
    // Модель должна использовать только utility-классы Tailwind,
    // без кастомного CSS и без inline-стилей.
    if (stack === 'HTML + Tailwind') {
        return `
- Include Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Return complete HTML5 starting with <!DOCTYPE html>
- Use ONLY Tailwind utility classes for styling
- For responsive: use md:, lg:, xl: prefixes
`
    }

    // ═══════════ HTML + CSS ═══════════
    // Одностраничный HTML с кастомным CSS.
    // Запрещает использование Tailwind — модель должна писать чистый CSS
    // с семантическими классами, CSS-переменными для цветов и media-запросами.
    if (stack === 'HTML + CSS') {
        return `
- Return complete HTML5 starting with <!DOCTYPE html>
- Put ALL CSS inside <style> tag in <head>
- Use semantic class names (.header, .card, .btn)
- Use CSS variables for colors: :root { --bg: #fff; --text: #000; }
- Use flexbox/grid for layout
- Make responsive with @media queries
- NEVER use Tailwind classes or inline style="..."
`
    }

    // ═══════════ React + Tailwind ═══════════
    // React-компоненты с Tailwind-классами.
    // Модель должна возвращать только функциональные компоненты (без TypeScript),
    // использовать className вместо class, и не генерировать HTML-обёртку
    // (без <html>, <body>, <!DOCTYPE> — это добавляется на клиенте при превью).
    if (stack === 'React + Tailwind') {
        return `
- Return ONLY React functional component(s), export default App
- Use Tailwind className, no CDN needed
- No <html>/<body>/<!DOCTYPE> tags
- You MAY use inline <style> blocks for effects Tailwind cannot express
- For images use <img> tags with real URLs, NOT placeholder divs
- All interactive elements must have: className="... cursor-pointer hover:opacity-80"
- Active/selected tab must have visually distinct style
- Use plain JavaScript (JSX), NOT TypeScript — no type annotations, no React.FC
`
    }

    // Fallback: неизвестный стек — возвращаем пустую строку.
    // Это защищает от падения, если в UI появится новый стек,
    // а правила для него ещё не добавлены.
    return ''
}

module.exports = { getStackRules }