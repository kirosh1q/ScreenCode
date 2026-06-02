import { useState, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { buildPreview } from '../utils/previewBuilder'
import { downloadProject } from '../utils/projectDownloader'

/**
 * @typedef {Object} GeneratedFile
 * @property {string} name - Имя файла (например, "App.jsx")
 * @property {string} content - Содержимое файла
 */

/**
 * @typedef {Object} GenerationResult
 * @property {string} layout - Описание макета из Pass 1
 * @property {Array} sections - Массив секций интерфейса
 * @property {string[]} colors - Массив HEX-цветов палитры
 * @property {GeneratedFile[]} files - Массив сгенерированных файлов
 * @property {string} [generatedHTML] - Сгенерированный HTML (для не-React стеков)
 */

/**
 * Центральная панель рабочей области
 *
 * Отображает сгенерированный код в редакторе CodeMirror
 * и превью результата в изолированном iframe.
 *
 * @param {Object} props
 * @param {boolean} props.loading - Флаг процесса генерации
 * @param {GenerationResult|null} props.result - Результат генерации
 * @param {Function} props.onCodeUpdate - Обработчик редактирования кода
 */
export default function CenterPanel({ loading, result, onCodeUpdate }) {
    const [activeTab, setActiveTab] = useState('code')
    const [activeFile, setActiveFile] = useState(null)

    /**
     * Автоматически выбирает первый файл при получении нового результата.
     * Использует функциональное обновление состояния, чтобы избежать
     * каскадных рендеров и лишних зависимостей в useEffect.
     */
    useEffect(() => {
        if (result?.files?.length > 0) {
            setActiveFile(prev => {
                if (!prev || !result.files.find(f => f.name === prev)) {
                    return result.files[0].name
                }
                return prev
            })
            setActiveTab('code')
        }
    }, [result])

    const currentCode = result?.files?.find(f => f.name === activeFile)?.content || ''

    /** Копирует текущий код в буфер обмена */
    function copyCode() {
        if (currentCode) {
            // Игнорируем ошибку, если буфер обмена недоступен (например, в iframe)
            navigator.clipboard.writeText(currentCode).catch(() => {})
        }
    }

    /** Обновляет содержимое активного файла при редактировании в CodeMirror */
    function handleCodeEdit(newContent) {
        if (!result || !activeFile) return
        const updatedFiles = result.files.map(f =>
            f.name === activeFile ? { ...f, content: newContent } : f
        )
        onCodeUpdate(null, updatedFiles)
    }

    /** Открывает превью в новой вкладке браузера */
    function openFullscreen() {
        const html = buildPreview(result)
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
    }

    return (
        <div className="flex flex-col bg-gray-50 overflow-hidden">

            {/* Индикатор загрузки */}
            {loading && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-900 animate-blink" />
                    Генерирую код...
                </div>
            )}

            {/* Табы: Код / Превью */}
            <div className="flex bg-white border-b border-gray-200 px-4 flex-shrink-0">
                {[['code', 'Код'], ['preview', 'Превью']].map(([id, name]) => (
                    <div
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`px-3.5 py-3 text-xs cursor-pointer border-b-2 transition-colors ${
                            activeTab === id
                                ? 'text-gray-900 border-gray-900 font-medium'
                                : 'text-gray-500 border-transparent font-normal hover:text-gray-700'
                        }`}
                    >
                        {name}
                    </div>
                ))}
            </div>

            {/* Пустое состояние */}
            {!loading && !result && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <p className="text-xs text-center leading-relaxed">
                        Загрузка скрина<br />
                    </p>
                </div>
            )}

            {/* Вкладка "Код" */}
            {result && activeTab === 'code' && (
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Тулбар с вкладками файлов и кнопками действий */}
                    <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
                        <div
                            className="file-tabs flex gap-1 overflow-x-auto scrollbar-none max-w-full"
                            onWheel={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                // Горизонтальный скролл колесом мыши — намеренный UX-хак
                                // eslint-disable-next-line react-hooks/set-state-in-effect
                                e.currentTarget.scrollLeft += e.deltaY
                            }}
                        >
                            {result.files?.map(f => (
                                <button
                                    key={f.name}
                                    onClick={() => setActiveFile(f.name)}
                                    className={`px-2.5 py-1 text-[11px] rounded transition-colors whitespace-nowrap ${
                                        activeFile === f.name
                                            ? 'border border-gray-200 bg-gray-100 text-gray-900'
                                            : 'border border-transparent bg-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {f.name}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={copyCode}
                                className="px-2.5 py-1 text-[11px] border border-gray-200 rounded bg-transparent text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Копировать
                            </button>
                            <button
                                onClick={() => downloadProject(result)}
                                className="px-2.5 py-1 text-[11px] border border-gray-200 rounded bg-transparent text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                ↓ Скачать
                            </button>
                        </div>
                    </div>

                    {/* Редактор CodeMirror */}
                    <CodeMirror
                        value={currentCode}
                        height="95%"
                        theme={oneDark}
                        extensions={[javascript({ jsx: true })]}
                        onChange={handleCodeEdit}
                        className="flex-1 overflow-hidden text-xs"
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

            {/* Вкладка "Превью" */}
            {result && activeTab === 'preview' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-200 text-[10px] text-gray-400">
                        <span>
                            iframe sandbox {result.files?.[0]?.name?.includes('.jsx') ? '· Babel Standalone' : ''}
                        </span>
                        <button
                            onClick={openFullscreen}
                            className="text-[11px] text-gray-500 bg-transparent border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50 transition-colors"
                        >
                            ↗ Открыть
                        </button>
                    </div>
                    <div className="flex-1 p-5 bg-gray-100 overflow-auto">
                        <iframe
                            srcDoc={buildPreview(result)}
                            sandbox="allow-scripts allow-same-origin"
                            className="w-full h-full border-none rounded-lg bg-white shadow-lg"
                        />
                    </div>
                </div>
            )}

            {/* Глобальные стили для анимаций и скрытия скроллбара */}
            <style>{`
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
                .animate-blink { animation: blink 1s infinite; }
                .file-tabs::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    )
}