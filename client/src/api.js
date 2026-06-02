
// Если мы на продакшене (Vercel), берем URL из переменных окружения.
// Если локально (Vite), оставляем пустым, чтобы запросы шли на тот же домен (где сработает proxy).
const BASE_URL = import.meta.env.VITE_API_URL || '';

export function apiUrl(path) {
    // Убираем слэш в начале пути, если BASE_URL уже имеет его, чтобы не было //api/...
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
}

export function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function apiFetch(path, options = {}) {
    // Добавляем Content-Type по умолчанию для POST/PUT запросов
    const isFormData = options.body instanceof FormData;
    const headers = {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...authHeader(),
        ...options.headers,
    };

    const res = await fetch(apiUrl(path), {
        ...options,
        headers
    });
    return res;
}