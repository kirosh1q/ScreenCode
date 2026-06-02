import { useState } from 'react'
import { apiFetch } from '../api'

export default function RightPanel({ result, onCodeUpdate, apiKey, model }) {
    const [editText, setEditText] = useState('')
    const [messages, setMessages] = useState([
        { type: 's', text: 'Опишите что изменить.' }
    ])
    const [editLoading, setEditLoading] = useState(false)

    async function sendEdit() {
        const t = editText.trim()
        if (!t || !result || editLoading) return

        setMessages(prev => [...prev, { type: 'u', text: t }])
        setEditText('')
        setEditLoading(true)

        try {
            const currentCode = result.generatedHTML || result.files?.[0]?.content || ''
            const allFiles = result.files || []

            const res = await apiFetch('/api/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentCode,
                    editPrompt: t,
                    allFiles,
                    apiKey,
                    model
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            onCodeUpdate(data.code, data.files)
            setMessages(prev => [...prev, { type: 's', text: '✓ Готово — код обновлён' }])
        } catch (err) {
            setMessages(prev => [...prev, { type: 's', text: `Ошибка: ${err.message}` }])
        } finally {
            setEditLoading(false)
        }
    }

    return (
        <div style={{ background: '#fff', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0', flexShrink: 0, maxHeight: '45vh', overflowY: 'auto' }}>
                <div style={label}>Анализ структуры</div>
                {!result ? (
                    <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>Появится после анализа</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {result.sections?.map((s, i) => {
                            const name = typeof s === 'object' ? s.name : s
                            const type = typeof s === 'object' ? s.type : null
                            const desc = typeof s === 'object' ? s.description : null
                            const isDynamic = type === 'dynamic'

                            return (
                                <div key={i} style={{ padding: '7px 10px', borderRadius: 6, background: '#fafafa', border: '1px solid #f0f0f0', marginBottom: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: isDynamic ? '#ef4444' : '#111', flexShrink: 0 }} />
                                        <span style={{ flex: 1, color: '#374151' }}>{name}</span>
                                        {type && (
                                            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: isDynamic ? '#fef2f2' : '#f3f4f6', color: isDynamic ? '#ef4444' : '#6b7280', border: `1px solid ${isDynamic ? '#fecaca' : '#e5e7eb'}` }}>
                                                {isDynamic ? 'динамичный' : 'статичный'}
                                            </span>
                                        )}
                                    </div>
                                    {desc && <div style={{ marginTop: 3, fontSize: 10, color: '#9ca3af', paddingLeft: 15 }}>{desc}</div>}
                                </div>
                            )
                        })}
                        {result.colors?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Цвета</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {result.colors.map(c => (
                                        <div key={c} title={c} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid #e5e7eb' }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 10, minHeight: 0, maxWidth: '100%' }}>
                <div style={label}>Редактирование</div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{
                            padding: '9px 11px', borderRadius: 7, fontSize: 11, lineHeight: 1.5,
                            border: '1px solid #e5e7eb', maxWidth: '92%',
                            background: m.type === 'u' ? '#f3f4f6' : '#fff',
                            alignSelf: m.type === 'u' ? 'flex-end' : 'flex-start',
                            color: m.type === 'u' ? '#111' : '#6b7280'
                        }}>
                            {m.text}
                        </div>
                    ))}
                    {editLoading && (
                        <div style={{ padding: '9px 11px', borderRadius: 7, fontSize: 11, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', alignSelf: 'flex-start' }}>
                            Применяю изменение...
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendEdit()}
                        placeholder={result ? 'Что изменить...' : 'Сначала сгенерируй код'}
                        disabled={!result || editLoading}
                        style={{ flex: 1, background: '#f9f9f9', border: '1px solid #e5e7eb', borderRadius: 7, padding: '9px 12px', fontSize: 11, outline: 'none', fontFamily: 'inherit', opacity: !result ? 0.5 : 1 }}
                    />
                    <button
                        onClick={sendEdit}
                        disabled={!result || editLoading}
                        style={{ background: !result || editLoading ? '#d1d5db' : '#111', border: 'none', borderRadius: 7, width: 36, color: '#fff', fontSize: 14, cursor: !result || editLoading ? 'not-allowed' : 'pointer' }}
                    >↑</button>
                </div>
            </div>
        </div>
    )
}

const label = { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }