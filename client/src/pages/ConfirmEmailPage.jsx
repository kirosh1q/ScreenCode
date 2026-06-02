import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

export default function ConfirmEmailPage() {
    const [params] = useSearchParams()
    const token = params.get('token')
    const navigate = useNavigate()
    const [msg, setMsg] = useState('Подтверждаем...')

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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
            <p style={{ fontSize: 16 }}>{msg}</p>
        </div>
    )
}