import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthPage({ onLogin, defaultTab = 'login' }) {
    const [isLogin, setIsLogin] = useState(defaultTab === 'login')
    const [form, setForm] = useState({ login: '', email: '', password: '' })
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
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

            const res = await fetch(`http://localhost:3001/api/auth/${isLogin ? 'login' : 'register'}`, {
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

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '32px 36px', width: 360 }}>

                {/* Лого */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>ScreenCode</div>
                </div>

                {/* Переключатель */}
                <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: 24, gap: 3 }}>
                    {[['login', 'Вход'], ['register', 'Регистрация']].map(([val, label]) => (
                        <button key={val} onClick={() => { setIsLogin(val === 'login'); setError(null) }} style={{
                            flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                            background: (isLogin ? 'login' : 'register') === val ? '#fff' : 'none',
                            color: (isLogin ? 'login' : 'register') === val ? '#111' : '#6b7280',
                            fontWeight: (isLogin ? 'login' : 'register') === val ? 500 : 400,
                            boxShadow: (isLogin ? 'login' : 'register') === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                        }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Поля */}
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

                {/* Ошибка */}
                {error && (
                    <div style={{ marginTop: 12, fontSize: 12, color: '#ef4444', background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>
                        {error}
                    </div>
                )}

                {/* Кнопка */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ marginTop: 20, width: '100%', padding: 11, background: loading ? '#d1d5db' : '#111', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
                </button>

            </div>
        </div>
    )
}

const inputStyle = {
    padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7,
    fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%',
    boxSizing: 'border-box'
}

