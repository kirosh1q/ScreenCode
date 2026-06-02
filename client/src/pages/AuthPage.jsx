import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

/**
 * Страница аутентификации (вход / регистрация)
 *
 * Реализует:
 * - Переключение между формами входа и регистрации
 * - Валидацию и отправку данных на сервер
 * - Восстановление пароля через email
 * - Обработку ошибок и состояний загрузки
 *
 * @param {Object} props
 * @param {Function} props.onLogin - Обработчик успешного входа (принимает token, user)
 * @param {string} props.defaultTab - Начальная вкладка ('login' | 'register')
 */
export default function AuthPage({ onLogin, defaultTab = 'login' }) {
    // ═══════════ Состояние формы входа/регистрации ═══════════
    const [isLogin, setIsLogin] = useState(defaultTab === 'login')
    const [form, setForm] = useState({ login: '', email: '', password: '' })
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    // ═══════════ Состояние восстановления пароля ═══════════
    const [showForgot, setShowForgot] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotMsg, setForgotMsg] = useState(null)
    const [forgotLoading, setForgotLoading] = useState(false)

    const navigate = useNavigate()

    /** Обновляет поле формы и сбрасывает ошибку */
    function handleChange(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setError(null)
    }

    /** Отправляет форму входа или регистрации */
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

    /** Отправляет запрос на восстановление пароля */
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

    /** Открывает форму восстановления пароля */
    function openForgot() {
        setShowForgot(true)
        setForgotEmail('')
        setForgotMsg(null)
    }

    /** Закрывает форму восстановления пароля */
    function closeForgot() {
        setShowForgot(false)
        setForgotMsg(null)
    }

    // ═══════════ Режим: Восстановление пароля ═══════════
    if (showForgot) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
                <div className="bg-white rounded-xl border border-gray-200 p-8 w-[360px]">
                    <div className="text-center mb-6 font-bold text-lg">ScreenCode</div>

                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
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
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-[13px] outline-none font-sans mb-3"
                            />
                            <button
                                onClick={handleForgotSubmit}
                                disabled={forgotLoading || !forgotEmail.trim()}
                                className={`w-full py-2.5 border-none rounded-lg text-[13px] font-medium text-white transition-colors ${
                                    (forgotLoading || !forgotEmail.trim())
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-gray-900 hover:bg-gray-800 cursor-pointer'
                                }`}
                            >
                                {forgotLoading ? 'Отправляю...' : 'Отправить ссылку'}
                            </button>
                        </>
                    )}

                    {forgotMsg && (
                        <div className={`p-2.5 rounded-md text-xs ${
                            forgotMsg.ok
                                ? 'bg-green-50 text-green-600'
                                : 'bg-red-50 text-red-500'
                        }`}>
                            {forgotMsg.text}
                        </div>
                    )}

                    <button
                        onClick={closeForgot}
                        className="mt-3.5 bg-transparent border-none text-gray-500 text-xs cursor-pointer w-full text-center py-1 hover:text-gray-700 transition-colors"
                    >
                        ← Вернуться ко входу
                    </button>
                </div>
            </div>
        )
    }

    // ═══════════ Режим: Вход / Регистрация ═══════════
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
            <div className="bg-white rounded-xl border border-gray-200 p-8 w-[360px]">
                <div className="text-center mb-6 font-bold text-lg">ScreenCode</div>

                {/* Переключатель вкладок: Вход / Регистрация */}
                <div className="flex bg-gray-100 rounded-lg p-0.5 mb-6 gap-0.5">
                    {[['login', 'Вход'], ['register', 'Регистрация']].map(([val, label]) => {
                        const active = (isLogin ? 'login' : 'register') === val
                        return (
                            <button
                                key={val}
                                onClick={() => { setIsLogin(val === 'login'); setError(null) }}
                                className={`flex-1 py-[7px] border-none rounded-md text-xs cursor-pointer transition-all ${
                                    active
                                        ? 'bg-white text-gray-900 font-medium shadow-sm'
                                        : 'bg-transparent text-gray-500 font-normal hover:text-gray-700'
                                }`}
                            >
                                {label}
                            </button>
                        )
                    })}
                </div>

                {/* Форма входа/регистрации */}
                <div className="flex flex-col gap-3">
                    <input
                        name="login"
                        placeholder="Логин"
                        value={form.login}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-[13px] outline-none font-sans"
                    />
                    {!isLogin && (
                        <input
                            name="email"
                            placeholder="Email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-[13px] outline-none font-sans"
                        />
                    )}
                    <input
                        name="password"
                        placeholder="Пароль"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-[13px] outline-none font-sans"
                    />
                </div>

                {/* Сообщение об ошибке */}
                {error && (
                    <div className="mt-3 text-xs text-red-500 bg-red-50 py-2 px-3 rounded-md">
                        {error}
                    </div>
                )}

                {/* Кнопка отправки формы */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`w-full py-2.5 border-none rounded-lg text-[13px] font-medium text-white mt-5 transition-colors ${
                        loading
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-gray-900 hover:bg-gray-800 cursor-pointer'
                    }`}
                >
                    {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
                </button>

                {/* Ссылка на восстановление пароля (только для входа) */}
                {isLogin && (
                    <button
                        onClick={openForgot}
                        className="mt-3.5 bg-transparent border-none text-gray-500 text-xs cursor-pointer w-full text-center py-1 hover:text-gray-700 transition-colors"
                    >
                        Забыли пароль?
                    </button>
                )}
            </div>
        </div>
    )
}