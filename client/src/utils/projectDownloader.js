import JSZip from 'jszip'

/**
 * Загрузчик проекта в ZIP-архив
 *
 * Формирует ZIP-архив с полным Vite-проектом для React-стека
 * или просто скачивает HTML-файл для не-React стеков.
 *
 * @param {Object} result - Результат генерации
 * @param {Array} result.files - Массив файлов { name, content }
 */
export async function downloadProject(result) {
    const isReact = result.files?.[0]?.name?.includes('.jsx')

    // Для HTML/CSS — просто скачиваем файл
    if (!isReact) {
        downloadSingleFile(result.files[0])
        return
    }

    // Для React — формируем ZIP с Vite-проектом
    const zip = new JSZip()
    addProjectFiles(zip, result.files)

    const blob = await zip.generateAsync({ type: 'blob' })
    triggerDownload(blob, 'screencode-project.zip')
}

/**
 * Скачивает один HTML-файл
 *
 * @param {Object} file - Файл { name, content }
 */
function downloadSingleFile(file) {
    const blob = new Blob([file.content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, file.name)
    URL.revokeObjectURL(url)
}

/**
 * Добавляет файлы проекта в ZIP-архив
 *
 * @param {JSZip} zip - Экземпляр JSZip
 * @param {Array} files - Массив файлов { name, content }
 */
function addProjectFiles(zip, files) {
    const src = zip.folder('src')

    // Добавляем сгенерированные компоненты
    files.forEach(f => {
        src.file(f.name, f.content)
    })

    // Добавляем конфигурационные файлы проекта
    zip.file('index.html', generateIndexHtml())
    zip.file('package.json', generatePackageJson())
    zip.file('vite.config.js', generateViteConfig())
    zip.file('tailwind.config.js', generateTailwindConfig())
    zip.file('postcss.config.js', generatePostcssConfig())
    zip.file('README.md', generateReadme())

    src.file('main.jsx', generateMainJsx())
    src.file('index.css', generateIndexCss())
}

/**
 * Генерирует index.html для Vite-проекта
 */
function generateIndexHtml() {
    return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ScreenCode App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
}

/**
 * Генерирует main.jsx — точку входа React-приложения
 */
function generateMainJsx() {
    return `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)`
}

/**
 * Генерирует index.css с директивами Tailwind
 */
function generateIndexCss() {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

* { margin: 0; padding: 0; box-sizing: border-box; }

body { font-family: Inter, sans-serif; }`
}

/**
 * Генерирует package.json с зависимостями
 */
function generatePackageJson() {
    return JSON.stringify({
        name: 'screencode-app',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview'
        },
        dependencies: {
            react: '^18.3.1',
            'react-dom': '^18.3.1'
        },
        devDependencies: {
            '@vitejs/plugin-react': '^4.3.1',
            autoprefixer: '^10.4.20',
            postcss: '^8.4.47',
            tailwindcss: '^3.4.14',
            vite: '^5.4.10'
        }
    }, null, 2)
}

/**
 * Генерирует vite.config.js
 */
function generateViteConfig() {
    return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
}

/**
 * Генерирует tailwind.config.js
 */
function generateTailwindConfig() {
    return `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}`
}

/**
 * Генерирует postcss.config.js
 */
function generatePostcssConfig() {
    return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
}

/**
 * Генерирует README.md с инструкциями
 */
function generateReadme() {
    return `# ScreenCode App

Сгенерировано с помощью ScreenCode.

## Запуск

\`\`\`bash
npm install
npm run dev
\`\`\`
`
}

/**
 * Триггерит скачивание файла
 *
 * @param {Blob|string} source - Blob или URL для скачивания
 * @param {string} filename - Имя файла
 */
function triggerDownload(source, filename) {
    const url = typeof source === 'string' ? source : URL.createObjectURL(source)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()

    // Очищаем URL только если это был Blob
    if (typeof source !== 'string') {
        URL.revokeObjectURL(url)
    }
}