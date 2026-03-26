import { useState } from 'react'
import { stacks, models } from '../components/LeftPanel.jsx'

export default function DebugPage() {
    const [file, setFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [selectedStack, setSelectedStack] = useState(stacks[0])
    const [selectedMode, setSelectedMode] = useState('copy')
    const [dryRun, setDryRun] = useState(true)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [debugMode, setDebugMode] = useState('manual') // 'manual' | 'last'

    function handleFile(e) {
        const f = e.target.files[0]
        if (!f) return
        setFile(f)
        setPreviewUrl(URL.createObjectURL(f))
        setResult(null)
        setError(null)
    }

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
            const res = await fetch('http://localhost:3001/api/debug', {
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

    async function loadLastGeneration() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('http://localhost:3001/api/last-debug')
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

    // Показывать настройки только в ручном режиме
    const showSettings = debugMode === 'manual' && !result
    const showImages = result?.base64Grid || previewUrl

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#f8f9fa', padding: 24 }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>

                {/* Шапка */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <h1 style={{ fontSize: 18, fontWeight: 600 }}>Debug</h1>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setDebugMode('manual'); setResult(null) }}
                                style={debugMode === 'manual' ? activeBtn : btn}>
                            Ручной запуск
                        </button>
                        <button onClick={loadLastGeneration}
                                style={debugMode === 'last' ? activeBtn : btn}>
                            Последняя генерация
                        </button>
                    </div>
                    <a href="/" style={{ fontSize: 12, color: '#6b7280' }}>← Назад</a>
                </div>

                {/* Настройки — только в ручном режиме и если нет результата */}
                {showSettings && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end' }}>
                        <div>
                            <div style={labelStyle}>Изображение</div>
                            <input type="file" accept="image/*" onChange={handleFile} />
                        </div>
                        <div>
                            <div style={labelStyle}>Стек</div>
                            <select value={selectedStack} onChange={e => setSelectedStack(e.target.value)} style={selectStyle}>
                                {stacks.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <div style={labelStyle}>Режим</div>
                            <select value={selectedMode} onChange={e => setSelectedMode(e.target.value)} style={selectStyle}>
                                <option value="copy">Копия</option>
                                <option value="template">Шаблон</option>
                            </select>
                        </div>
                        <button
                            onClick={runDebug}
                            disabled={!file || loading}
                            style={{ padding: '8px 20px', background: loading || !file ? '#d1d5db' : '#111', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, cursor: loading || !file ? 'not-allowed' : 'pointer' }}
                        >
                            {loading ? 'Анализирую...' : 'Запустить'}
                        </button>
                    </div>
                )}

                {/* Dry run чекбокс */}
                {showSettings && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <input type="checkbox" id="dryRun" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
                        <label htmlFor="dryRun" style={{ fontSize: 13, cursor: 'pointer' }}>Dry run (без AI)</label>
                    </div>
                )}

                {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px 14px', borderRadius: 7, marginBottom: 16, fontSize: 13 }}>{error}</div>}

                {/* Изображения */}
                {showImages && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                        {previewUrl && (
                            <div style={cardStyle}>
                                <div style={cardLabel}>Оригинал</div>
                                <img src={previewUrl} style={{ width: '100%', borderRadius: 6 }} />
                            </div>
                        )}
                        {result?.base64Image && (
                            <div style={cardStyle}>
                                <div style={cardLabel}>Обработанное (Sharp)</div>
                                <img src={result.base64Image} style={{ width: '100%', borderRadius: 6 }} />
                            </div>
                        )}
                        {result?.base64Grid && (
                            <div style={cardStyle}>
                                <div style={cardLabel}>С сеткой (Pass 1)</div>
                                <img src={result.base64Grid} style={{ width: '100%', borderRadius: 6 }} />
                                {result.gridInfo && (
                                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                                        Ячейка: {result.gridInfo.colW}×{result.gridInfo.rowH}px
                                    </div>
                                )}
                            </div>
                        )}
                        {result?.base64Top && (
                            <div style={cardStyle}>
                                <div style={cardLabel}>Кроп верха (0-30%)</div>
                                <img src={result.base64Top} style={{ width: '100%', borderRadius: 6 }} />
                            </div>
                        )}
                        {result?.base64Middle && (
                            <div style={cardStyle}>
                                <div style={cardLabel}>Кроп центра (30-60%)</div>
                                <img src={result.base64Middle} style={{ width: '100%', borderRadius: 6 }} />
                            </div>
                        )}
                        {result?.base64Bottom && (
                            <div style={cardStyle}>
                                <div style={cardLabel}>Кроп низа (60-100%)</div>
                                <img src={result.base64Bottom} style={{ width: '100%', borderRadius: 6 }} />
                            </div>
                        )}
                    </div>
                )}

                {/* Результаты — промпты и анализ */}
                {result && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div style={cardStyle}>
                            <div style={cardLabel}>Pass 1 — промпт</div>
                            <textarea value={result.pass1Prompt} readOnly style={textareaStyle} />
                        </div>
                        <div style={cardStyle}>
                            <div style={cardLabel}>Pass 1 — ответ модели (JSON)</div>
                            <textarea value={JSON.stringify(result.pass1Parsed, null, 2)} readOnly style={textareaStyle} />
                        </div>
                        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                            <div style={cardLabel}>Pass 2 — промпт</div>
                            <textarea value={result.pass2Prompt} readOnly style={{ ...textareaStyle, height: 300 }} />
                        </div>
                        <div style={cardStyle}>
                            <div style={cardLabel}>Секции из Pass 1</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {result.pass1Parsed?.sections?.map((s, i) => (
                                    <div key={i} style={{ padding: '8px 10px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}>
                                        <div style={{ fontWeight: 500, marginBottom: 3 }}>{s.name} <span style={{ color: s.type === 'dynamic' ? '#ef4444' : '#6b7280', fontWeight: 400 }}>({s.type})</span></div>
                                        <div style={{ color: '#6b7280' }}>{s.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={cardStyle}>
                            <div style={cardLabel}>Цвета из Pass 1</div>
                            {result.pass1Parsed?.exact_colors && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {Object.entries(result.pass1Parsed.exact_colors).map(([key, val]) => (
                                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 5, background: val, border: '1px solid #e5e7eb', flexShrink: 0 }} />
                                            <span style={{ color: '#6b7280' }}>{key}:</span>
                                            <span style={{ fontFamily: 'monospace' }}>{val}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// Стили
const labelStyle = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 6 }
const selectStyle = { padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff' }
const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }
const cardLabel = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 12 }
const textareaStyle = { width: '100%', height: 200, fontFamily: 'Menlo, monospace', fontSize: 11, lineHeight: 1.6, border: '1px solid #e5e7eb', borderRadius: 6, padding: 10, resize: 'vertical', background: '#fafafa', boxSizing: 'border-box' }
const btn = { padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#374151' }
const activeBtn = { ...btn, background: '#111', color: '#fff', borderColor: '#111' }