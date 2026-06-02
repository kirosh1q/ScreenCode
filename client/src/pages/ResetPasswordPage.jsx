import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

export default function ResetPasswordPage() {
    const [params] = useSearchParams()
    const token = params.get('token')
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [msg, setMsg] = useState(null)
    const [loading, setLoading] = useState(false)

    async function submit() {
        if (password !== confirm) return setMsg({ error: true, text: 'Пароли не совпадают' })
        setLoading(true)
        const res = await apiFetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword: password })
        })
        const data = await res.json()
        setLoading(false)
        if (!res.ok) return setMsg({ error: true, text: data.error })
        setMsg({ error: false, text: 'Пароль изменён! Перенаправляем...' })
        setTimeout(() => navigate('/login'), 2000)
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 360, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Новый пароль</h2>
                <input type="password" placeholder="Новый пароль" value={password}
                       onChange={e => setPassword(e.target.value)} autoComplete="new-password"
                       style={inputStyle} />
                <input type="password" placeholder="Повторите пароль" value={confirm}
                       onChange={e => setConfirm(e.target.value)} autoComplete="new-password"
                       style={{ ...inputStyle, marginTop: 10 }} />
                {msg && <div style={{ marginTop: 10, fontSize: 12, color: msg.error ? '#ef4444' : '#16a34a' }}>{msg.text}</div>}
                <button onClick={submit} disabled={loading}
                        style={{ marginTop: 16, width: '100%', padding: 10, background: '#111', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, cursor: 'pointer' }}>
                    {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
            </div>
        </div>
    )
}

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }