/**
 * Унифицированный HTTP-клиент для взаимодействия с бэкендом
 *
 * Обеспечивает:
 * - Автоматическое переключение между локальным (Vite proxy) и продакшен (Vercel) окружением
 * - Автоматическое добавление JWT-токена в заголовки авторизованных запросов
 * - Автоматическую установку Content-Type (JSON для обычных запросов, пропуск для FormData)
 * - Корректную обработку путей (защита от двойных слешей)
 *
 * Архитектурная роль:
 * Все компоненты и хуки должны использовать apiFetch() вместо прямого fetch().
 * Это гарантирует единую обработку авторизации и корректную работу как в dev-режиме
 * (через Vite proxy на localhost:3001), так и на продакшене (через VITE_API_URL).
 */

/**
 * Базовый URL API
 *
 * Локально (Vite dev server): пустая строка → запросы идут на тот же домен (localhost:5173),
 * где Vite proxy перенаправляет /api/* на backend (localhost:3001).
 *
 * Продакшен (Vercel): URL бэкенда из переменной окружения VITE_API_URL,
 * например, https://screencode-backend.onrender.com
 */
const BASE_URL = import.meta.env.VITE_API_URL || ''

/**
 * Формирует полный URL для API-запроса
 *
 * @param {string} path - Путь эндпоинта (например, '/api/generate')
 * @returns {string} Полный URL (например, 'https://backend.com/api/generate' или '/api/generate')
 */
export function apiUrl(path) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${BASE_URL}${cleanPath}`
}

/**
 * Формирует заголовки авторизации на основе JWT-токена из localStorage
 *
 * @returns {Object} Объект заголовков. Если токен есть — добавляет Authorization: Bearer <token>
 */
export function authHeader() {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
}

/**
 * Унифицированная функция выполнения HTTP-запросов к API
 *
 * Автоматически:
 * - Добавляет JWT-токен в заголовок Authorization (если есть в localStorage)
 * - Устанавливает Content-Type: application/json для обычных запросов
 * - Пропускает Content-Type для FormData (браузер сам установит boundary)
 * - Позволяет переопределить любой заголовок через options.headers
 *
 * @param {string} path - Путь эндпоинта (например, '/api/history')
 * @param {RequestInit} [options={}] - Стандартные опции fetch (method, body, headers и т.д.)
 * @returns {Promise<Response>} Ответ сервера
 *
 * @example
 * // GET-запрос с авторизацией
 * const res = await apiFetch('/api/history')
 *
 * @example
 * // POST-запрос с JSON-телом
 * const res = await apiFetch('/api/auth/login', {
 *     method: 'POST',
 *     body: JSON.stringify({ login, password })
 * })
 *
 * @example
 * // POST-запрос с FormData (файл) — Content-Type установится автоматически
 * const form = new FormData()
 * form.append('image', file)
 * const res = await apiFetch('/api/generate', { method: 'POST', body: form })
 */
export async function apiFetch(path, options = {}) {
    const isFormData = options.body instanceof FormData

    const headers = {
        // Content-Type нужен только для JSON-запросов.
        // Для FormData браузер сам установит правильный Content-Type с boundary.
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...authHeader(),
        ...options.headers,
    }

    return fetch(apiUrl(path), {
        ...options,
        headers
    })
}