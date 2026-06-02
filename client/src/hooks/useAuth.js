import { useState } from 'react'

/**
 * Хук управления аутентификацией пользователя
 *
 * Отвечает за:
 * - Восстановление сессии из localStorage при монтировании
 * - Сохранение JWT-токена и данных пользователя
 * - Выход из аккаунта с очисткой хранилища
 *
 * Использует ленивую инициализацию состояния (lazy initialization),
 * чтобы избежать лишнего рендера при чтении из localStorage.
 * Это решает проблему ESLint react-hooks/set-state-in-effect.
 */
export function useAuth() {
    // Ленивая инициализация — читаем из localStorage один раз при первом рендере
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('user')
            return saved ? JSON.parse(saved) : null
        } catch {
            return null
        }
    })

    // Токен тоже восстанавливаем лениво, но храним в замыкании
    // (не нужен в состоянии, т.к. используется только для запросов)
    const [token] = useState(() => localStorage.getItem('token'))

    // Поскольку чтение из localStorage синхронное и мгновенное,
    // состояние загрузки не требуется — authLoading сразу false
    const authLoading = false

    /**
     * Сохраняет данные входа в localStorage и обновляет состояние
     * @param {string} token - JWT-токен для авторизации
     * @param {Object} userData - Данные пользователя { id, login, email }
     */
    function login(token, userData) {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }

    /**
     * Очищает данные сессии из localStorage и состояния
     * @param {Function} [onLogout] - Опциональный колбэк после выхода
     */
    function logout(onLogout) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
        if (onLogout) onLogout()
    }

    return { user, token, authLoading, login, logout }
}