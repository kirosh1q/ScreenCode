import { lucideIconPaths } from '../constants/constants.js'

/**
 * Строитель HTML-превью для iframe
 *
 * Формирует автономный HTML-документ, который может рендерить
 * React-компоненты через Babel Standalone без сборки.
 *
 * @param {Object} result - Результат генерации
 * @param {Array} result.files - Массив файлов { name, content }
 * @param {string} result.generatedHTML - Сгенерированный HTML (для не-React стеков)
 * @returns {string} HTML-документ для srcDoc iframe
 */
export function buildPreview(result) {
    const firstFile = result.files?.[0]
    const isReact = firstFile?.name?.includes('.jsx')

    // Для HTML/CSS стеков — просто возвращаем сгенерированный HTML
    if (!isReact) {
        return result.generatedHTML || result.files?.[0]?.content || ''
    }

    // Для React — собираем полноценный HTML-документ
    const bodyCode = buildReactPreviewCode(result)

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
  <script>window.LucideReact = LucideReact;</script>
</head>
<body style="margin:0">
  <style>
    @keyframes twinkle { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.4; } }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  </style>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;

    ${bodyCode}

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`
}

/**
 * Собирает JavaScript-код для превью React-компонентов
 *
 * @param {Object} result - Результат генерации
 * @returns {string} JavaScript-код для вставки в <script type="text/babel">
 */
function buildReactPreviewCode(result) {
    // Удаляем импорты и экспорты, чтобы код работал в глобальной области
    function stripModules(code) {
        return code
            .replace(/^import\s+.*$/gm, '')
            .replace(/^export\s+default\s+function\s+(\w+)/gm, 'function $1')
            .replace(/^export\s+default\s+/gm, '')
            .replace(/^export\s+/gm, '')
            .trim()
    }

    // Собираем все компоненты (кроме App.jsx)
    const components = (result.files || [])
        .filter(f => f.name !== 'App.jsx')
        .map(f => stripModules(f.content))
        .join('\n\n')

    // Находим App.jsx
    const appFile = result.files?.find(f => f.name === 'App.jsx')
    const appCode = stripModules(appFile?.content || result.generatedHTML || '')

    // Собираем все используемые Lucide-иконки
    const lucideLine = generateLucideStubs(result.files || [])

    // Если один файл — он может содержать и компоненты, и App
    const isSingleFile = (result.files || []).length === 1

    if (isSingleFile) {
        const appMatch = appCode.match(/(const App|function App)[\s\S]*$/)
        if (appMatch) {
            const appStart = appCode.indexOf(appMatch[0])
            const beforeApp = appCode.slice(0, appStart).trim()
            const appPart = appCode.slice(appStart).trim()
            return `${lucideLine}${beforeApp}\n\n${appPart}`
        }
        return `${lucideLine}${appCode}`
    }

    return `${lucideLine}${components}\n\n${appCode}`
}

/**
 * Генерирует заглушки для Lucide-иконок
 *
 * Сканирует код на импорты из lucide-react и создает
 * упрощенные SVG-компоненты для превью в iframe.
 *
 * @param {Array} files - Массив файлов для сканирования
 * @returns {string} JavaScript-код с определениями иконок
 */
function generateLucideStubs(files) {
    const allLucideIcons = new Set()

    // Парсим импорты Lucide
    for (const file of files) {
        const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g
        let m
        while ((m = re.exec(file.content)) !== null) {
            m[1].split(',').map(i => i.trim().split(' as ')[0].trim()).filter(Boolean).forEach(i => allLucideIcons.add(i))
        }
    }

    if (allLucideIcons.size === 0) return ''

    // Генерируем stub-функции для каждой иконки
    const stubs = [...allLucideIcons].map(name => {
        const path = lucideIconPaths[name] || 'M12 12h.01' // fallback — точка
        return `function ${name}({ size = 24, className = '', color = 'currentColor', strokeWidth = 2, style, ...props }) {
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', className, style, ...props },
    ${path.split(' M').map((p, i) =>
            `React.createElement('path', { d: '${i === 0 ? p : 'M' + p}', strokeLinecap: 'round', strokeLinejoin: 'round' })`
        ).join(',\n    ')}
  );
}`
    }).join('\n\n')

    return `// Lucide icon stubs with real paths\n${stubs}\n\n`
}