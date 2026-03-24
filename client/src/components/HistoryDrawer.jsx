import { useEffect, useState } from 'react'

const HISTORY_LIMIT = 5 // ← меняй здесь

export default function HistoryDrawer({ open, onClose, onRestore }) {
    const [generations, setGenerations] = useState([])
    const [loading, setLoading] = useState(false)
    const [clearTimer, setClearTimer] = useState(null)
    const [clearProgress, setClearProgress] = useState(0)

    useEffect(() => {
        if (!open) return
        loadHistory()
    }, [open])

    async function loadHistory() {
        setLoading(true)
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`http://localhost:3001/api/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setGenerations(Array.isArray(data) ? data.slice(0, HISTORY_LIMIT) : [])
        } catch {
            setGenerations([])
        } finally {
            setLoading(false)
        }
    }

    async function deleteOne(id, e) {
        e.stopPropagation()
        const token = localStorage.getItem('token')
        await fetch(`http://localhost:3001/api/history/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        setGenerations(prev => prev.filter(g => g._id !== id))
    }

    function startClear() {
        let progress = 0
        const interval = setInterval(() => {
            progress += 20
            setClearProgress(progress)
            if (progress >= 100) {
                clearInterval(interval)
                executeClear()
            }
        }, 1000)
        setClearTimer(interval)
    }

    function cancelClear() {
        clearInterval(clearTimer)
        setClearTimer(null)
        setClearProgress(0)
    }

    async function executeClear() {
        const token = localStorage.getItem('token')
        const ids = generations.map(g => g._id)
        await Promise.all(ids.map(id =>
            fetch(`http://localhost:3001/api/history/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ))
        setGenerations([])
        setClearTimer(null)
        setClearProgress(0)
    }

    if (!open) return null

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
            <div style={{ width: 420, background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Шапка */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>История генераций</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
                </div>

                {/* Список */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {loading && <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>Загрузка...</div>}

                    {!loading && generations.length === 0 && (
                        <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>История пуста</div>
                    )}

                    {!loading && generations.map(g => (
                        <div key={g._id} onClick={() => { onRestore(g._id); onClose() }}
                             style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', background: '#fafafa', position: 'relative' }}>

                            {/* Кнопка удаления */}
                            <button onClick={(e) => deleteOne(g._id, e)}
                                    style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
                                    title="Удалить">
                                ×
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingRight: 20 }}>
                                <span style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{g.stack}</span>
                                <span style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(g.createdAt).toLocaleString('ru')}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                                {g.mode === 'copy' ? 'Копия' : 'Шаблон'} · {g.files?.length || 0} файл(ов)
                            </div>
                            {g.layout && (
                                <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {g.layout}
                                </div>
                            )}
                            {g.colors?.length > 0 && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                                    {g.colors.map((c, i) => (
                                        <div key={i} title={c} style={{ width: 16, height: 16, borderRadius: 3, background: c, border: '1px solid #e5e7eb' }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Футер — очистка */}
                {generations.length > 0 && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                        {clearTimer ? (
                            <div>
                                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                                    Очистка через {5 - Math.floor(clearProgress / 20)} сек...
                                </div>
                                <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${clearProgress}%`, background: '#ef4444', borderRadius: 2, transition: 'width 1s linear' }} />
                                </div>
                                <button onClick={cancelClear}
                                        style={{ fontSize: 11, color: '#111', background: 'none', border: '1px solid #e5e7eb', borderRadius: 5, padding: '4px 10px', cursor: 'pointer' }}>
                                    Отменить
                                </button>
                            </div>
                        ) : (
                            <button onClick={startClear}
                                    style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                Очистить историю
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}