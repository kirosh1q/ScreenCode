const jwt = require('jsonwebtoken')

/**
 * Middleware проверки JWT-токена авторизации
 *
 * Извлекает токен из заголовка Authorization (формат: "Bearer <token>"),
 * проверяет его валидность и срок действия, затем добавляет userId
 * в объект req для использования в защищённых маршрутах.
 *
 * Архитектурная роль:
 * Применяется ко всем маршрутам, требующим авторизации:
 * - POST /api/generate (генерация кода)
 * - GET/POST/DELETE /api/history (история генераций)
 * - GET /api/auth/me (профиль пользователя)
 *
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next функция
 *
 * @example
 * // Использование в маршруте:
 * router.post('/generate', authMiddleware, async (req, res) => {
 *     // req.userId доступен здесь после успешной проверки токена
 *     const userId = req.userId
 * })
 */
function authMiddleware(req, res, next) {
    // Извлекаем токен из заголовка Authorization: Bearer <token>
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Нет токена авторизации' })
    }

    try {
        // Проверяем подпись и срок действия токена
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Добавляем userId в req для использования в маршруте
        req.userId = decoded.userId

        next()
    } catch (error) {
        // Токен невалиден, истёк или подпись не совпадает
        res.status(401).json({ error: 'Вы не авторизованы или токен истёк' })
    }
}

module.exports = authMiddleware