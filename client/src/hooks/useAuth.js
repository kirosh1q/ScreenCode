import { useState, useEffect } from 'react'

export function useAuth() {
    const [user, setUser] = useState(null)
    const [authLoading, setAuthLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        const saved = localStorage.getItem('user')
        if (token && saved) {
            setUser(JSON.parse(saved))
        }
        setAuthLoading(false)
    }, [])

    function login(token, userData) {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }

    function logout(onLogout) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
        if (onLogout) onLogout()
    }

    return { user, authLoading, login, logout }
}