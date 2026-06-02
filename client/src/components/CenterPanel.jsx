import { useState, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import JSZip from 'jszip'

function buildPreview(result) {
    const firstFile = result.files?.[0]
    const isReact = firstFile?.name?.includes('.jsx')

    if (!isReact) {
        return result.generatedHTML || result.files?.[0]?.content || ''
    }

    function stripModules(code) {
        return code
            .replace(/^import\s+.*$/gm, '')
            .replace(/^export\s+default\s+function\s+(\w+)/gm, 'function $1')
            .replace(/^export\s+default\s+/gm, '')
            .replace(/^export\s+/gm, '')
            .trim()
    }

    // Все файлы кроме App — сначала
    const components = (result.files || [])
        .filter(f => f.name !== 'App.jsx')
        .map(f => stripModules(f.content))
        .join('\n\n')

    const appFile = result.files?.find(f => f.name === 'App.jsx')
    const appCode = stripModules(appFile?.content || result.generatedHTML || '')

    // Если это один файл — он может содержать и компоненты и App вместе
    // stripModules уже убрал export, просто рендерим как есть
    const allLucideIcons = new Set()
    for (const file of result.files || []) {
        const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g
        let m
        while ((m = re.exec(file.content)) !== null) {
            m[1].split(',').map(i => i.trim().split(' as ')[0].trim()).filter(Boolean).forEach(i => allLucideIcons.add(i))
        }
    }
    const lucideIconPaths = {
        Search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
        Bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
        MessageSquare: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
        MoreHorizontal: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z',
        MoreVertical: 'M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z',
        ChevronDown: 'M19 9l-7 7-7-7',
        ChevronUp: 'M5 15l7-7 7 7',
        ChevronLeft: 'M15 19l-7-7 7-7',
        ChevronRight: 'M9 18l6-6-6-6',
        X: 'M18 6L6 18M6 6l12 12',
        Menu: 'M4 6h16M4 12h16M4 18h16',
        Settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        User: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
        Play: 'M5 3l14 9-14 9V3z',
        Heart: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
        Star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
        Share2: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
        Bookmark: 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z',
        Plus: 'M12 5v14M5 12h14',
        Mic: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8',
        Volume2: 'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07',
        Eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z',
        Filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
        Grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
        List: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
        Home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
        ArrowLeft: 'M19 12H5M12 19l-7-7 7-7',
        ArrowRight: 'M5 12h14M12 5l7 7-7 7',
        ExternalLink: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
        Copy: 'M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1',
        Trash2: 'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6',
        Edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
        Upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
        Download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
        Image: 'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 21',
        Music: 'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z',
        Video: 'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 012 2v10a2 2 0 01-2 2H1a2 2 0 01-2-2V7a2 2 0 012-2z',
        Globe: 'M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20',
        MapPin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
        Facebook: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
        Instagram: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z',
        Youtube: 'M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58a2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z',
        Twitter: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
        Gamepad2: 'M6 11h4M8 9v4M15 12h.01M18 10h.01M17.32 5H6.68a4 4 0 00-3.978 3.59L2 16.5A4 4 0 006 21h.5a2 2 0 001.8-1.1L9 18h6l.7 1.9A2 2 0 0017.5 21H18a4 4 0 004-4.5l-.71-7.9A4 4 0 0017.32 5z',
        Twitch: 'M21 2H3v16h5v4l4-4h5l4-4V2zM11 11V7M16 11V7',
        Linkedin: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z',
    }

    const lucideLine = allLucideIcons.size > 0
        ? `// Lucide icon stubs with real paths\n` +
        [...allLucideIcons].map(name => {
            const path = lucideIconPaths[name] || 'M12 12h.01'
            return `function ${name}({ size = 24, className = '', color = 'currentColor', strokeWidth = 2, style, ...props }) {
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', className, style, ...props },
    ${path.split(' M').map((p, i) =>
                `React.createElement('path', { d: '${i === 0 ? p : 'M' + p}', strokeLinecap: 'round', strokeLinejoin: 'round' })`
            ).join(',\n    ')}
  );
}`}).join('\n\n') + '\n\n'
        : ''

    const isSingleFile = (result.files || []).length === 1

    let bodyCode
    if (isSingleFile) {
        // Вырезаем App функцию и ставим её в конец
        const code = appCode

        // Находим все const/function определения кроме App
        const appMatch = code.match(/(const App|function App)[\s\S]*$/)
        if (appMatch) {
            const appStart = code.indexOf(appMatch[0])
            const beforeApp = code.slice(0, appStart).trim()
            const appPart = code.slice(appStart).trim()
            bodyCode = `${lucideLine}${beforeApp}\n\n${appPart}`
        } else {
            bodyCode = `${lucideLine}${code}`
        }
    } else {
        bodyCode = `${lucideLine}${components}\n\n${appCode}`
    }
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

export default function CenterPanel({ loading, result, onCodeUpdate }) {
    const [activeTab, setActiveTab] = useState('code')
    const [activeFile, setActiveFile] = useState(null)

    // когда приходит результат — ставим первый файл активным
    useEffect(() => {
        if (result?.files?.length > 0) {
            if (!activeFile || !result.files.find(f => f.name === activeFile)) {
                setActiveFile(result.files[0].name)
                setActiveTab('code')
            }
        }
    }, [result])

    const currentCode = result?.files?.find(f => f.name === activeFile)?.content || ''

    function copyCode() {
        if (currentCode) navigator.clipboard.writeText(currentCode)
    }

    function handleCodeEdit(newContent) {
        if (!result || !activeFile) return
        console.log('editing file:', activeFile, 'files before:', result.files.map(f => f.name))
        const updatedFiles = result.files.map(f =>
            f.name === activeFile ? { ...f, content: newContent } : f
        )
        console.log('files after:', updatedFiles.map(f => f.name))
        onCodeUpdate(null, updatedFiles)
    }

    function openFullscreen() {
        const html = buildPreview(result)
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
    }

    async function downloadProject() {
        const zip = new JSZip()
        const isReact = result.files?.[0]?.name?.includes('.jsx')

        if (!isReact) {
            // HTML — просто скачиваем файл
            const content = result.files[0].content
            const blob = new Blob([content], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = result.files[0].name
            a.click()
            URL.revokeObjectURL(url)
            return
        }

        // React — формируем Vite-проект
        const src = zip.folder('src')

        // Файлы компонентов
        result.files.forEach(f => {
            src.file(f.name, f.content)
        })

        // index.html
        zip.file('index.html', `<!DOCTYPE html>
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
</html>`)

        // main.jsx
        src.file('main.jsx', `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)`)

        // index.css
        src.file('index.css',
            `
            @tailwind base;
            @tailwind components;
            @tailwind utilities;
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { font-family: Inter, sans-serif; }`)

        // package.json
        zip.file('package.json', JSON.stringify({
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
        }, null, 2))

        // vite.config.js
        zip.file('vite.config.js', `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`)

        // tailwind.config.js
        zip.file('tailwind.config.js',
            `/** @type {import('tailwindcss').Config} */
            export default {
            content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}`)

        // postcss.config.js
        zip.file('postcss.config.js', `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`)

        // README
        zip.file('README.md', `# ScreenCode App

Сгенерировано с помощью ScreenCode.

## Запуск

\`\`\`bash
npm install
npm run dev
\`\`\`
`)

        const blob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'screencode-project.zip'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f8f9fa', overflow: 'hidden' }}>

            {/* Стрим-бар */}
            {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#111', animation: 'blink 1s infinite' }} />
                    Генерирую код...
                </div>
            )}

            {/* Табы */}
            <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 16px', flexShrink: 0 }}>
                {[['code', 'Код'], ['preview', 'Превью']].map(([id, name]) => (
                    <div key={id} onClick={() => setActiveTab(id)} style={{
                        padding: '12px 14px', fontSize: 12, cursor: 'pointer',
                        color: activeTab === id ? '#111' : '#6b7280',
                        borderBottom: `2px solid ${activeTab === id ? '#111' : 'transparent'}`,
                        fontWeight: activeTab === id ? 500 : 400
                    }}>
                        {name}
                    </div>
                ))}
            </div>

            {/* Пустое состояние */}
            {!loading && !result && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: 12 }}>
                    <div style={{ width: 52, height: 52, border: '1.5px dashed #d1d5db', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}></div>
                    <p style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>Загрузка скрина<br /></p>
                </div>
            )}

            {/* КОД */}
            {result && activeTab === 'code' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Тулбар с вкладками файлов */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                        <div
                            className="file-tabs"
                            style={{ display: 'flex', gap: 3, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', maxWidth: '100%' }}
                            onWheel={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                e.currentTarget.scrollLeft += e.deltaY
                            }}
                        >
                            {result.files?.map(f => (
                                <button key={f.name} onClick={() => setActiveFile(f.name)} style={{
                                    padding: '4px 10px', fontSize: 11, borderRadius: 5,
                                    border: `1px solid ${activeFile === f.name ? '#e5e7eb' : 'transparent'}`,
                                    background: activeFile === f.name ? '#f3f4f6' : 'none',
                                    color: activeFile === f.name ? '#111' : '#6b7280',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    fontFamily: 'inherit'
                                }}>
                                    {f.name}
                                </button>
                            ))}
                        </div>
                        <button onClick={copyCode} style={{ padding: '4px 10px', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 5, background: 'none', color: '#6b7280', cursor: 'pointer' }}>
                            Копировать
                        </button>
                        {result && (
                            <button onClick={downloadProject}
                                    style={{ padding: '4px 10px', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 5, background: 'none', color: '#6b7280', cursor: 'pointer' }}>
                                ↓ Скачать
                            </button>
                        )}
                    </div>

                    {/* Редактор */}
                    <CodeMirror
                        value={currentCode}
                        height="95%"
                        theme={oneDark}
                        extensions={[javascript({ jsx: true })]}
                        onChange={handleCodeEdit}
                        style={{ flex: 1, overflow: 'hidden', fontSize: 12, maxWidth: '100%' }}
                        basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            highlightActiveLine: true,
                            highlightSelectionMatches: true,
                            autocompletion: true,
                            bracketMatching: true,
                            indentOnInput: true,
                        }}
                    />
                </div>
            )}

            {/* ПРЕВЬЮ */}
            {result && activeTab === 'preview' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb', fontSize: 10, color: '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>iframe sandbox {result.files?.[0]?.name?.includes('.jsx') ? '· Babel Standalone' : ''}</span>
                        <button onClick={openFullscreen} style={{ fontSize: 11, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>
                            ↗ Открыть
                        </button>
                    </div>
                    <div style={{ flex: 1, padding: 20, background: '#f0f0f0', overflow: 'auto' }}>
                        <iframe
                            srcDoc={buildPreview(result)}
                            sandbox="allow-scripts allow-same-origin"
                            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}
                        />
                    </div>
                </div>
            )}
            <style>{`
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .file-tabs::-webkit-scrollbar { display: none; }
`}</style>
            <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </div>
    )
}