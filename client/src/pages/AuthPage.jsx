import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

export default function AuthPage({ onLogin, defaultTab = 'login' }) {
    const [isLogin, setIsLogin] = useState(defaultTab === 'login')
    const [form, setForm] = useState({ login: '', email: '', password: '' })
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    const [showForgot, setShowForgot] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotMsg, setForgotMsg] = useState(null)
    const [forgotLoading, setForgotLoading] = useState(false)

    const navigate = useNavigate()

    function handleChange(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setError(null)
    }

    async function handleSubmit() {
        setLoading(true)
        setError(null)
        try {
            const body = isLogin
                ? { login: form.login, password: form.password }
                : { login: form.login, email: form.email, password: form.password }

            const res = await apiFetch(`/api/auth/${isLogin ? 'login' : 'register'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            onLogin(data.token, data.user)
            navigate('/')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleForgotSubmit() {
        if (!forgotEmail.trim()) return
        setForgotLoading(true)
        setForgotMsg(null)
        try {
            const res = await apiFetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setForgotMsg({ ok: true, text: 'Если такой email зарегистрирован — письмо отправлено. Проверьте почту.' })
        } catch (err) {
            setForgotMsg({ ok: false, text: err.message || 'Ошибка при отправке' })
        } finally {
            setForgotLoading(false)
        }
    }

    function openForgot() {
        setShowForgot(true)
        setForgotEmail('')
        setForgotMsg(null)
    }

    function closeForgot() {
        setShowForgot(false)
        setForgotMsg(null)
    }

    if (showForgot) {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <div style={logoStyle}>ScreenCode</div>

                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
                        Введите email, привязанный к аккаунту — мы отправим ссылку для сброса пароля.
                    </p>

                    {!forgotMsg && (
                        <>
                            <input
                                type="email"
                                placeholder="Email"
                                value={forgotEmail}
                                onChange={e => setForgotEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleForgotSubmit()}
                                style={inputStyle}
                            />
                            <button
                                onClick={handleForgotSubmit}
                                disabled={forgotLoading || !forgotEmail.trim()}
                                style={{
                                    ...btnStyle,
                                    background: (forgotLoading || !forgotEmail.trim()) ? '#d1d5db' : '#111',
                                    cursor: (forgotLoading || !forgotEmail.trim()) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {forgotLoading ? 'Отправляю...' : 'Отправить ссылку'}
                            </button>
                        </>
                    )}

                    {forgotMsg && (
                        <div style={{
                            padding: '10px 12px', borderRadius: 6, fontSize: 12,
                            background: forgotMsg.ok ? '#f0fdf4' : '#fef2f2',
                            color: forgotMsg.ok ? '#16a34a' : '#ef4444'
                        }}>
                            {forgotMsg.text}
                        </div>
                    )}

                    <button onClick={closeForgot} style={linkBtnStyle}>
                        ← Вернуться ко входу
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div style={pageStyle}>
            <div style={cardStyle}>
                <div style={logoStyle}>ScreenCode</div>

                <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: 24, gap: 3 }}>
                    {[['login', 'Вход'], ['register', 'Регистрация']].map(([val, label]) => {
                        const active = (isLogin ? 'login' : 'register') === val
                        return (
                            <button
                                key={val}
                                onClick={() => { setIsLogin(val === 'login'); setError(null) }}
                                style={{
                                    flex: 1, padding: '7px 0', border: 'none', borderRadius: 6,
                                    fontSize: 12, cursor: 'pointer',
                                    background: active ? '#fff' : 'none',
                                    color: active ? '#111' : '#6b7280',
                                    fontWeight: active ? 500 : 400,
                                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                {label}
                            </button>
                        )
                    })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                        name="login"
                        placeholder="Логин"
                        value={form.login}
                        onChange={handleChange}
                        style={inputStyle}
                    />
                    {!isLogin && (
                        <input
                            name="email"
                            placeholder="Email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            style={inputStyle}
                        />
                    )}
                    <input
                        name="password"
                        placeholder="Пароль"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        style={inputStyle}
                    />
                </div>

                {error && (
                    <div style={{ marginTop: 12, fontSize: 12, color: '#ef4444', background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ ...btnStyle, marginTop: 20, background: loading ? '#d1d5db' : '#111', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
                </button>

                {isLogin && (
                    <button onClick={openForgot} style={linkBtnStyle}>
                        Забыли пароль?
                    </button>
                )}
            </div>
        </div>
    )
}

const pageStyle = {
    minHeight: '100vh', background: '#f8f9fa',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Inter, sans-serif'
}

const cardStyle = {
    background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
    padding: '32px 36px', width: 360
}

const logoStyle = {
    textAlign: 'center', marginBottom: 24,
    fontWeight: 700, fontSize: 18
}

const inputStyle = {
    padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7,
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
    width: '100%', boxSizing: 'border-box'
}

const btnStyle = {
    width: '100%', padding: 11, border: 'none',
    borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500
}

const linkBtnStyle = {
    marginTop: 14, background: 'none', border: 'none',
    color: '#6b7280', fontSize: 12, cursor: 'pointer',
    width: '100%', textAlign: 'center', padding: '4px 0'
}