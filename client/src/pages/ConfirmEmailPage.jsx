import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

/**
 * Страница подтверждения смены email
 *
 * Автоматически вызывается при переходе по ссылке из письма.
 * Отправляет токен на сервер для подтверждения смены email,
 * отображает статус операции и перенаправляет в личный кабинет.
 *
 * URL формат: /confirm-email?token=<token>
 */
export default function ConfirmEmailPage() {
    const [params] = useSearchParams()
    const token = params.get('token')
    const navigate = useNavigate()
    const [msg, setMsg] = useState('Подтверждаем...')

    /** Автоматически подтверждает email при монтировании компонента */
    useEffect(() => {
        apiFetch('/api/auth/confirm-email-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setMsg('Email успешно изменён! Перенаправляем...')
                    setTimeout(() => navigate('/account'), 2000)
                } else {
                    setMsg('Ошибка: ' + data.error)
                }
            })
    }, [token])

    return (
        <div className="min-h-screen flex items-center justify-center font-sans">
            <p className="text-base text-gray-700">{msg}</p>
        </div>
    )
}