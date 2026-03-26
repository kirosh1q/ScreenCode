const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Нет токена' })

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.userId = decoded.userId
        next()
    } catch {
        res.status(401).json({ error: 'Вы не авторизованы' })
    }
}

module.exports = authMiddleware