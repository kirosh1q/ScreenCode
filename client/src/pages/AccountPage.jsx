import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

export default function AccountPage({ user, onLogout }) {
    const [info, setInfo] = useState({ login: '', email: '' })
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' })
    const [newEmail, setNewEmail] = useState('')
    const [passMsg, setPassMsg] = useState(null)
    const [emailMsg, setEmailMsg] = useState(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        if (user) setInfo({ login: user.login, email: user.email })
    }, [user])

    async function changePassword() {
        if (passwords.new !== passwords.confirm)
            return setPassMsg({ error: true, text: 'Пароли не совпадают' })
        if (passwords.new.length < 8)
            return setPassMsg({ error: true, text: 'Минимум 8 символов' })

        setLoading(true)
        try {
            const res = await apiFetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword: passwords.old, newPassword: passwords.new })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setPassMsg({ error: false, text: 'Пароль изменён' })
            setPasswords({ old: '', new: '', confirm: '' })
        } catch (err) {
            setPassMsg({ error: true, text: err.message })
        } finally {
            setLoading(false)
        }
    }

    function changeEmail() {
        setEmailMsg({ error: false, text: 'Функция отправки кода на почту появится позже' })
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f4f4f5', fontFamily: 'Inter, sans-serif', color: '#111' }}>
            <header style={{ height: 52, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                <div style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => navigate('/')}>На главную</div>
                <button onClick={() => navigate('/')} style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>← Назад</button>
            </header>

            <div style={{ maxWidth: 480, margin: '10px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                <div style={card}>
                    <div style={cardTitle}>Информация об аккаунте</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                            <div style={label}>Логин</div>
                            <div style={valueBox}>{info.login}</div>
                        </div>
                        <div>
                            <div style={label}>Email</div>
                            <div style={valueBox}>{info.email}</div>
                        </div>
                    </div>
                </div>

                <div style={card}>
                    <div style={cardTitle}>Смена email</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input placeholder="Новый email" type="email" autoComplete="off" value={newEmail}
                               onChange={e => setNewEmail(e.target.value)}
                               style={inputStyle} />
                        {emailMsg && (
                            <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 6, background: emailMsg.error ? '#2d1515' : '#152d1e', color: emailMsg.error ? '#f87171' : '#4ade80' }}>
                                {emailMsg.text}
                            </div>
                        )}
                        <button onClick={changeEmail}
                                style={{ padding: '10px', background: '#6091f8', border: '1px solid #446bc3', borderRadius: 7, color: '#e5e7eb', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                            Отправить письмо со ссылкой
                        </button>
                    </div>
                </div>

                <div style={card}>
                    <div style={cardTitle}>Смена пароля</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input placeholder="Старый пароль" type="password" autoComplete="new-password" value={passwords.old}
                               onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))}
                               style={inputStyle} />
                        <input placeholder="Новый пароль" type="password" autoComplete="new-password" value={passwords.new}
                               onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}
                               style={inputStyle} />
                        <input placeholder="Повторите новый пароль" type="password" autoComplete="new-password" value={passwords.confirm}
                               onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                               style={inputStyle} />

                        {passMsg && (
                            <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 6, background: passMsg.error ? '#33405c' : '#152d1e', color: passMsg.error ? '#ff7d7d' : '#4ade80' }}>
                                {passMsg.text}
                            </div>
                        )}

                        <button onClick={changePassword} disabled={loading}
                                style={{ padding: '10px', background: loading ? '#90b5ff' : '#6091f8', border: 'none', borderRadius: 7, color: loading ? '#9ca3af' : '#ffffff', fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}>
                            {loading ? 'Сохранение...' : 'Изменить пароль'}
                        </button>
                    </div>
                </div>

                <button onClick={onLogout}
                        style={{ padding: '10px', background: '#6091f8', border: '1px solid #446bc3', borderRadius: 7, color: '#ffffff', fontSize: 13, cursor: 'pointer' }}>
                    Выйти из аккаунта
                </button>
            </div>
        </div>
    )
}

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const cardTitle = { fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#111' }
const label = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 6 }
const valueBox = { fontSize: 13, color: '#374151', padding: '9px 12px', background: '#f4f4f5', border: '1px solid #e5e7eb', borderRadius: 7 }
const inputStyle = { padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', background: '#fff', color: '#111' }