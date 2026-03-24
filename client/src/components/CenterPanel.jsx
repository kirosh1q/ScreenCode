import { useState, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

function buildPreview(result) {
    const firstFile = result.files?.[0]
    const isReact = firstFile?.name?.includes('.jsx')

    if (!isReact) {
        return result.generatedHTML || ''
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
            bodyCode = `${beforeApp}\n\n${appPart}`
        } else {
            bodyCode = code
        }
    } else {
        bodyCode = `${components}\n\n${appCode}`
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
                    <p style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>Загрузи скрин<br /></p>
                </div>
            )}

            {/* КОД */}
            {result && activeTab === 'code' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Тулбар с вкладками файлов */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: 3, overflowX: 'auto' }}>
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
                    </div>

                    {/* Редактор */}
                    <CodeMirror
                        value={currentCode}
                        height="100%"
                        theme={oneDark}
                        extensions={[javascript({ jsx: true })]}
                        onChange={handleCodeEdit}
                        style={{ flex: 1, overflow: 'hidden', fontSize: 12 }}
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

            <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </div>
    )
}