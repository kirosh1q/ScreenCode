import { useState } from 'react'
import { apiFetch } from '../api'
import { stacks } from '../constants/constants.js'

/**
 * Отладочная страница для разработчиков
 *
 * Предоставляет инструменты для анализа работы конвейера генерации:
 * - Ручной запуск с произвольным изображением и настройками
 * - Просмотр последней генерации с сервера
 * - Режим "Dry run" — проверка промптов без расходования токенов AI
 * - Визуализация всех этапов предобработки (оригинал, Sharp, сетка, кропы)
 * - Просмотр промптов Pass 1 / Pass 2 и ответа модели
 *
 * Доступна по маршруту /debug
 */
export default function DebugPage() {
    // ═══════════ Состояние формы запуска ═══════════
    const [file, setFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [selectedStack, setSelectedStack] = useState(stacks[0])
    const [selectedMode, setSelectedMode] = useState('copy')
    const [dryRun, setDryRun] = useState(true)

    // ═══════════ Состояние результата и загрузки ═══════════
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    // ═══════════ Режим отображения: 'manual' (ручной) | 'last' (последняя) ═══════════
    const [debugMode, setDebugMode] = useState('manual')

    /** Обработчик выбора файла для отладки */
    function handleFile(e) {
        const f = e.target.files[0]
        if (!f) return
        setFile(f)
        setPreviewUrl(URL.createObjectURL(f))
        setResult(null)
        setError(null)
    }

    /**
     * Запускает отладочный конвейер вручную
     * Отправляет изображение и настройки на /api/debug
     */
    async function runDebug() {
        if (!file) return
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const form = new FormData()
            form.append('image', file)
            form.append('stack', selectedStack)
            form.append('mode', selectedMode)
            form.append('dryRun', dryRun.toString())

            const res = await apiFetch('/api/debug', {
                method: 'POST',
                body: form
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setResult(data)
            setDebugMode('manual')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    /** Загружает данные последней генерации с сервера (/api/last-debug) */
    async function loadLastGeneration() {
        setLoading(true)
        setError(null)
        try {
            const res = await apiFetch('/api/last-debug')
            const data = await res.json()
            if (!data.pass1Prompt) {
                setError('Нет данных о последней генерации')
                return
            }
            setResult(data)
            setDebugMode('last')
        } catch (err) {
            setError('Не удалось загрузить: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // ═══════════ Флаги условного рендеринга ═══════════
    const showSettings = debugMode === 'manual' && !result
    const showImages = result?.base64Grid || previewUrl

    return (
        <div className="font-sans min-h-screen bg-gray-50 p-6">
            <div className="max-w-[1400px] mx-auto">

                {/* ═══════════ Шапка с переключателем режимов ═══════════ */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-lg font-semibold text-gray-900">Debug</h1>

                    <div className="flex gap-2">
                        <button
                            onClick={() => { setDebugMode('manual'); setResult(null) }}
                            className={`px-4 py-2 border rounded-md text-xs cursor-pointer transition-colors ${
                                debugMode === 'manual'
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                            Ручной запуск
                        </button>
                        <button
                            onClick={loadLastGeneration}
                            className={`px-4 py-2 border rounded-md text-xs cursor-pointer transition-colors ${
                                debugMode === 'last'
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                            Последняя генерация
                        </button>
                    </div>

                    <a href="/" className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                        ← Назад
                    </a>
                </div>

                {/* ═══════════ Настройки запуска (только в ручном режиме) ═══════════ */}
                {showSettings && (
                    <div className="flex gap-3 mb-5 items-end flex-wrap">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                Изображение
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFile}
                                className="text-xs"
                            />
                        </div>
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                Стек
                            </div>
                            <select
                                value={selectedStack}
                                onChange={e => setSelectedStack(e.target.value)}
                                className="px-2.5 py-[7px] border border-gray-200 rounded-md text-[13px] font-sans bg-white"
                            >
                                {stacks.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                Режим
                            </div>
                            <select
                                value={selectedMode}
                                onChange={e => setSelectedMode(e.target.value)}
                                className="px-2.5 py-[7px] border border-gray-200 rounded-md text-[13px] font-sans bg-white"
                            >
                                <option value="copy">Копия</option>
                                <option value="template">Шаблон</option>
                            </select>
                        </div>
                        <button
                            onClick={runDebug}
                            disabled={!file || loading}
                            className={`px-5 py-2 border-none rounded-md text-[13px] font-medium text-white transition-colors ${
                                (loading || !file)
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-gray-900 hover:bg-gray-800 cursor-pointer'
                            }`}
                        >
                            {loading ? 'Анализирую...' : 'Запустить'}
                        </button>
                    </div>
                )}

                {/* ═══════════ Чекбокс Dry Run ═══════════ */}
                {showSettings && (
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="dryRun"
                            checked={dryRun}
                            onChange={e => setDryRun(e.target.checked)}
                            className="cursor-pointer"
                        />
                        <label htmlFor="dryRun" className="text-[13px] cursor-pointer text-gray-700">
                            Dry run (без AI)
                        </label>
                    </div>
                )}

                {/* ═══════════ Сообщение об ошибке ═══════════ */}
                {error && (
                    <div className="bg-red-50 text-red-500 px-3.5 py-2.5 rounded-md mb-4 text-[13px]">
                        {error}
                    </div>
                )}

                {/* ═══════════ Сетка изображений (этапы предобработки) ═══════════ */}
                {showImages && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

                        {/* Оригинал (blob URL из FileReader) */}
                        {previewUrl && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                    Оригинал
                                </div>
                                <img src={previewUrl} alt="Оригинал" className="w-full rounded-md" />
                            </div>
                        )}

                        {/* Обработанное через Sharp — src уже содержит data URL */}
                        {result?.base64Image && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                    Обработанное (Sharp)
                                </div>
                                <img src={result.base64Image} alt="Обработанное" className="w-full rounded-md" />
                            </div>
                        )}

                        {/* С координатной сеткой — src уже содержит data URL */}
                        {result?.base64Grid && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                    С сеткой (Pass 1)
                                </div>
                                <img src={result.base64Grid} alt="С сеткой" className="w-full rounded-md" />
                                {result.gridInfo && (
                                    <div className="text-[11px] text-gray-500 mt-1.5">
                                        Ячейка: {result.gridInfo.colW}×{result.gridInfo.rowH}px
                                        · Сетка: {result.gridInfo.cols}×{result.gridInfo.rows}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Кроп верха — src уже содержит data URL */}
                        {result?.base64Top && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                    Кроп верха (0-30%)
                                </div>
                                <img src={result.base64Top} alt="Кроп верха" className="w-full rounded-md" />
                            </div>
                        )}

                        {/* Кроп центра — src уже содержит data URL */}
                        {result?.base64Middle && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                    Кроп центра (30-60%)
                                </div>
                                <img src={result.base64Middle} alt="Кроп центра" className="w-full rounded-md" />
                            </div>
                        )}

                        {/* Кроп низа — src уже содержит data URL */}
                        {result?.base64Bottom && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                    Кроп низа (60-100%)
                                </div>
                                <img src={result.base64Bottom} alt="Кроп низа" className="w-full rounded-md" />
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════ Результаты анализа (промпты, JSON, секции, цвета) ═══════════ */}
                {result && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Pass 1 — промпт */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                Pass 1 — промпт
                            </div>
                            <textarea
                                value={result.pass1Prompt}
                                readOnly
                                className="w-full h-[200px] font-mono text-[11px] leading-relaxed border border-gray-200 rounded-md p-2.5 resize-y bg-gray-50"
                            />
                        </div>

                        {/* Pass 1 — ответ модели (JSON) */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                Pass 1 — ответ модели (JSON)
                            </div>
                            <textarea
                                value={typeof result.pass1Parsed === 'string'
                                    ? result.pass1Parsed
                                    : JSON.stringify(result.pass1Parsed, null, 2)}
                                readOnly
                                className="w-full h-[200px] font-mono text-[11px] leading-relaxed border border-gray-200 rounded-md p-2.5 resize-y bg-gray-50"
                            />
                        </div>

                        {/* Pass 2 — промпт (на всю ширину) */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 lg:col-span-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                Pass 2 — промпт
                            </div>
                            <textarea
                                value={result.pass2Prompt}
                                readOnly
                                className="w-full h-[300px] font-mono text-[11px] leading-relaxed border border-gray-200 rounded-md p-2.5 resize-y bg-gray-50"
                            />
                        </div>

                        {/* Секции из Pass 1 */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                Секции из Pass 1
                            </div>
                            <div className="flex flex-col gap-2">
                                {result.pass1Parsed?.sections?.map((s, i) => (
                                    <div
                                        key={i}
                                        className="px-2.5 py-2 bg-gray-50 rounded-md border border-gray-200 text-xs"
                                    >
                                        <div className="font-medium mb-0.5">
                                            {s.name}{' '}
                                            <span className={`font-normal ${
                                                s.type === 'dynamic' ? 'text-red-500' : 'text-gray-500'
                                            }`}>
                                                ({s.type})
                                            </span>
                                        </div>
                                        <div className="text-gray-500">{s.description}</div>
                                    </div>
                                )) || <div className="text-xs text-gray-400">Нет данных</div>}
                            </div>
                        </div>

                        {/* Цвета из Pass 1 */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                Цвета из Pass 1
                            </div>
                            {result.pass1Parsed?.exact_colors ? (
                                <div className="flex flex-col gap-2">
                                    {Object.entries(result.pass1Parsed.exact_colors).map(([key, val]) => (
                                        <div key={key} className="flex items-center gap-2.5 text-[13px]">
                                            <div
                                                className="w-7 h-7 rounded-md border border-gray-200 flex-shrink-0"
                                                style={{ backgroundColor: val }}
                                            />
                                            <span className="text-gray-500">{key}:</span>
                                            <span className="font-mono">{val}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-400">Нет данных</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}