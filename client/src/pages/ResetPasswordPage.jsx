import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

/**
 * Страница сброса пароля
 *
 * Вызывается при переходе по ссылке из письма для восстановления пароля.
 * Позволяет пользователю ввести новый пароль и подтверждение.
 *
 * URL формат: /reset-password?token=<token>
 */
export default function ResetPasswordPage() {
    const [params] = useSearchParams()
    const token = params.get('token')
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [msg, setMsg] = useState(null)
    const [loading, setLoading] = useState(false)

    /** Отправляет новый пароль на сервер */
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
        <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
            <div className="bg-white rounded-xl p-8 w-[360px] shadow-lg">
                <h2 className="text-lg font-semibold mb-5 text-gray-900">
                    Новый пароль
                </h2>

                {/* Поля ввода пароля */}
                <input
                    type="password"
                    placeholder="Новый пароль"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-[13px] outline-none font-sans"
                />
                <input
                    type="password"
                    placeholder="Повторите пароль"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-[13px] outline-none font-sans mt-2.5"
                />

                {/* Сообщение об успехе/ошибке */}
                {msg && (
                    <div className={`mt-2.5 text-xs ${
                        msg.error ? 'text-red-500' : 'text-green-600'
                    }`}>
                        {msg.text}
                    </div>
                )}

                {/* Кнопка сохранения */}
                <button
                    onClick={submit}
                    disabled={loading}
                    className={`w-full py-2.5 border-none rounded-md text-[13px] font-medium cursor-pointer transition-colors ${
                        loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                >
                    {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
            </div>
        </div>
    )
}