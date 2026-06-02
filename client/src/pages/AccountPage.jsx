import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

/**
 * Страница личного кабинета пользователя
 *
 * Предоставляет функционал:
 * - Просмотр информации об аккаунте (логин, email)
 * - Смена пароля с валидацией
 * - Смена email (отправка ссылки подтверждения)
 * - Выход из аккаунта
 *
 * @param {Object} props
 * @param {Object} props.user - Данные авторизованного пользователя { login, email }
 * @param {Function} props.onLogout - Обработчик выхода из аккаунта
 */
export default function AccountPage({ user, onLogout }) {
    // ═══════════ Состояние формы информации ═══════════
    const [info, setInfo] = useState({ login: '', email: '' })

    // ═══════════ Состояние формы смены пароля ═══════════
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' })

    // ═══════════ Состояние формы смены email ═══════════
    const [newEmail, setNewEmail] = useState('')

    // ═══════════ Состояния сообщений и загрузки ═══════════
    const [passMsg, setPassMsg] = useState(null)
    const [emailMsg, setEmailMsg] = useState(null)
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()

    /** Синхронизирует локальное состояние с данными пользователя */
    useEffect(() => {
        if (user) setInfo({ login: user.login, email: user.email })
    }, [user])

    /**
     * Отправляет запрос на смену пароля
     * Выполняет клиентскую валидацию перед отправкой
     */
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

    /** Заглушка для функционала смены email (будет реализовано позже) */
    function changeEmail() {
        setEmailMsg({ error: false, text: 'Функция отправки кода на почту появится позже' })
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-900">

            {/* ═══════════ Шапка с навигацией ═══════════ */}
            <header className="h-[52px] bg-white border-b border-gray-200 flex items-center justify-between px-5">
                <div
                    className="font-semibold text-[15px] cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => navigate('/')}
                >
                    На главную
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="text-xs text-gray-400 bg-transparent border-none cursor-pointer hover:text-gray-600 transition-colors"
                >
                    ← Назад
                </button>
            </header>

            {/* ═══════════ Контейнер с карточками ═══════════ */}
            <div className="max-w-[480px] mx-auto mt-2.5 px-5 flex flex-col gap-2.5">

                {/* ═══════════ Карточка: Информация об аккаунте ═══════════ */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <div className="text-sm font-semibold mb-4 text-gray-900">
                        Информация об аккаунте
                    </div>
                    <div className="flex flex-col gap-3">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                Логин
                            </div>
                            <div className="text-[13px] text-gray-700 px-3 py-2 bg-gray-100 border border-gray-200 rounded-md">
                                {info.login}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                Email
                            </div>
                            <div className="text-[13px] text-gray-700 px-3 py-2 bg-gray-100 border border-gray-200 rounded-md">
                                {info.email}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════ Карточка: Смена email ═══════════ */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <div className="text-sm font-semibold mb-4 text-gray-900">
                        Смена email
                    </div>
                    <div className="flex flex-col gap-2.5">
                        <input
                            placeholder="Новый email"
                            type="email"
                            autoComplete="off"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            className="px-3 py-2.5 border border-gray-200 rounded-md text-[13px] outline-none font-sans w-full bg-white text-gray-900"
                        />
                        {emailMsg && (
                            <div className={`text-xs px-3 py-2 rounded-md ${
                                emailMsg.error
                                    ? 'bg-red-950 text-red-400'
                                    : 'bg-green-950 text-green-400'
                            }`}>
                                {emailMsg.text}
                            </div>
                        )}
                        <button
                            onClick={changeEmail}
                            className="py-2.5 bg-blue-500 border border-blue-600 rounded-md text-gray-200 text-[13px] font-medium cursor-pointer hover:bg-blue-600 transition-colors"
                        >
                            Отправить письмо со ссылкой
                        </button>
                    </div>
                </div>

                {/* ═══════════ Карточка: Смена пароля ═══════════ */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <div className="text-sm font-semibold mb-4 text-gray-900">
                        Смена пароля
                    </div>
                    <div className="flex flex-col gap-2.5">
                        <input
                            placeholder="Старый пароль"
                            type="password"
                            autoComplete="new-password"
                            value={passwords.old}
                            onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))}
                            className="px-3 py-2.5 border border-gray-200 rounded-md text-[13px] outline-none font-sans w-full bg-white text-gray-900"
                        />
                        <input
                            placeholder="Новый пароль"
                            type="password"
                            autoComplete="new-password"
                            value={passwords.new}
                            onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}
                            className="px-3 py-2.5 border border-gray-200 rounded-md text-[13px] outline-none font-sans w-full bg-white text-gray-900"
                        />
                        <input
                            placeholder="Повторите новый пароль"
                            type="password"
                            autoComplete="new-password"
                            value={passwords.confirm}
                            onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                            className="px-3 py-2.5 border border-gray-200 rounded-md text-[13px] outline-none font-sans w-full bg-white text-gray-900"
                        />

                        {passMsg && (
                            <div className={`text-xs px-3 py-2 rounded-md ${
                                passMsg.error
                                    ? 'bg-slate-700 text-red-300'
                                    : 'bg-green-950 text-green-400'
                            }`}>
                                {passMsg.text}
                            </div>
                        )}

                        <button
                            onClick={changePassword}
                            disabled={loading}
                            className={`py-2.5 border-none rounded-md text-[13px] font-medium cursor-pointer transition-colors ${
                                loading
                                    ? 'bg-blue-300 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {loading ? 'Сохранение...' : 'Изменить пароль'}
                        </button>
                    </div>
                </div>

                {/* ═══════════ Кнопка выхода из аккаунта ═══════════ */}
                <button
                    onClick={onLogout}
                    className="py-2.5 bg-blue-500 border border-blue-600 rounded-md text-white text-[13px] cursor-pointer hover:bg-blue-600 transition-colors"
                >
                    Выйти из аккаунта
                </button>
            </div>
        </div>
    )
}