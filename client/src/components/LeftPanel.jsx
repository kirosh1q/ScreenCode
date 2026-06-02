
export const stacks = ['HTML + Tailwind', 'HTML + CSS', 'React + Tailwind']

export default function LeftPanel({
                                      previewUrl, onFile, loading,
                                      selectedStack, setSelectedStack,
                                      selectedMode, setSelectedMode,
                                      onGenerate, error, user,
                                      apiKey, setApiKey, customModel, setCustomModel // ← ДОБАВИТЬ
                                  }) {
    // УБРАТЬ локальное состояние:
    // const [apiKey, setApiKey] = useState('')
    // const [customModel, setCustomModel] = useState('qwen/qwen3.6-plus')

    function handleChange(e) {
        const f = e.target.files[0]
        if (f) onFile(f)
    }

    function handleDrop(e) {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
    }

    function handleGenerateClick() {
        onGenerate(selectedStack, selectedMode, apiKey, customModel)
    }

    return (
        <div style={{ background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Скриншот */}
            <div style={block}>
                <div style={label}>Скриншот</div>
                {!user ? (
                    <div style={{
                        border: '1.5px dashed #d1d5db',
                        borderRadius: 8,
                        padding: '24px 16px',
                        textAlign: 'center',
                        background: '#fafafa',
                        color: '#9ca3af'
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}></div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>Войдите в аккаунт</div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>чтобы загрузить скриншот</div>
                    </div>
                ) : (
                    <>
                        {previewUrl ? (
                            <img src={previewUrl} style={{ width: '100%', borderRadius: 8, maxHeight: 160, objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                        ) : (
                            <label
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleDrop}
                                style={{ display: 'block', border: '1.5px dashed #d1d5db', borderRadius: 8, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}
                            >
                                <input type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
                                <div style={{ fontSize: 24, marginBottom: 6 }}></div>
                                <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>Выбор файла</div>
                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>PNG, JPG, WEBP</div>
                            </label>
                        )}
                        {previewUrl && (
                            <button onClick={() => onFile(null)} style={{ marginTop: 6, fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                ✕ убрать
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Стек */}
            <div style={block}>
                <div style={label}>Стек</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {stacks.map(s => (
                        <div key={s} onClick={() => setSelectedStack(s)} style={{
                            border: `1.5px solid ${selectedStack === s ? '#111' : '#e5e7eb'}`,
                            borderRadius: 7, padding: '8px 12px', cursor: 'pointer',
                            background: selectedStack === s ? '#f9f9f9' : '#fff',
                            fontSize: 12, fontWeight: selectedStack === s ? 500 : 400,
                            color: selectedStack === s ? '#111' : '#374151'
                        }}>
                            {s}
                        </div>
                    ))}
                </div>
            </div>

            {/* API Ключ и Модель */}
            <div style={block}>
                <div style={label}>Настройки AI (OpenRouter)</div>
                <input
                    type="text"
                    placeholder="sk-or-v1-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, marginBottom: 8, outline: 'none', boxSizing: 'border-box' }}
                />
                <input
                    type="text"
                    placeholder="qwen/qwen3.6-plus"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
                    Ключ не сохраняется на сервере.
                </div>
            </div>

            {/* Режим */}
            <div style={block}>
                <div style={label}>Режим</div>
                <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 7, padding: 3, gap: 2 }}>
                    {[['copy', 'Копия'], ['template', 'Шаблон']].map(([val, name]) => (
                        <button key={val} onClick={() => setSelectedMode(val)} style={{
                            flex: 1, padding: '6px 8px', border: 'none', borderRadius: 5,
                            background: selectedMode === val ? '#fff' : 'none',
                            color: selectedMode === val ? '#111' : '#6b7280',
                            fontWeight: selectedMode === val ? 500 : 400,
                            fontSize: 11, cursor: 'pointer',
                            boxShadow: selectedMode === val ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                        }}>
                            {name}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8, lineHeight: 1.5 }}>
                    {selectedMode === 'copy'
                        ? 'Точное воспроизведение.'
                        : 'Компонентный шаблон с пропсами для подключения данных.'}
                </div>
            </div>

            {/* Кнопка */}
            <div style={{ padding: 16, marginTop: 'auto' }}>
                {error && (
                    <div style={{ fontSize: 11, color: '#ef4444', background: '#fef2f2', padding: '8px 12px', borderRadius: 6, marginBottom: 10 }}>
                        {error}
                    </div>
                )}
                <button
                    onClick={handleGenerateClick}
                    disabled={loading || !previewUrl || !user || !apiKey}
                    style={{
                        width: '100%', padding: 11,
                        background: (loading || !previewUrl || !user || !apiKey) ? '#d1d5db' : '#111',
                        border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500,
                        cursor: (loading || !previewUrl || !user || !apiKey) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Генерирую...' : 'Сгенерировать'}
                </button>
            </div>
        </div>
    )
}

const block = { padding: 16, borderBottom: '1px solid #f0f0f0' }
const label = { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }