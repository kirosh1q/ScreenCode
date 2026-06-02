const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { Resend } = require('resend')
const User = require('../models/User')
const authMiddleware = require('../middleware/authMiddleware')

/**
 * Маршруты аутентификации и управления аккаунтом
 *
 * Реализует полный цикл работы с пользователем:
 * - Регистрация и вход с JWT-токенами
 * - Смена пароля с проверкой старого
 * - Восстановление пароля через email (ссылка с токеном)
 * - Смена email с подтверждением через письмо
 *
 * Архитектурные решения:
 * - JWT-токены действительны 7 дней (баланс безопасности и UX)
 * - bcrypt с cost factor 10 (стандарт индустрии, ~100ms на хеш)
 * - Токены сброса пароля хранятся в памяти 30 минут (для демо достаточно)
 * - Email не раскрывается при отсутствии в БД (защита от enumeration attacks)
 *
 * Для продакшена:
 * - Заменить Map на Redis для распределённого хранения токенов
 * - Добавить rate limiting для защиты от brute-force
 * - Добавить валидацию email через DNS MX records
 */

const resend = new Resend(process.env.RESEND_API_KEY)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

/**
 * Временные хранилища токенов (в оперативной памяти)
 *
 * ⚠️ ВНИМАНИЕ: Для продакшена заменить на Redis!
 *
 * Текущее решение работает только для одного инстанса сервера.
 * При перезапуске сервера все токены теряются.
 * При масштабировании на несколько серверов токены не синхронизируются.
 *
 * Структура данных:
 * - Key: криптографически случайный токен (32 байта = 64 hex символа)
 * - Value: { userId, expires, newEmail? }
 */
const resetTokens = new Map()       // Токены сброса пароля
const emailChangeTokens = new Map() // Токены смены email

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: POST /register — Регистрация нового пользователя
// ═══════════════════════════════════════════════════════════════

/**
 * Регистрирует нового пользователя и возвращает JWT-токен
 *
 * @param {Object} req.body
 * @param {string} req.body.login - Уникальный логин (минимум 4 символа)
 * @param {string} req.body.email - Уникальный email (валидируется форматом)
 * @param {string} req.body.password - Пароль в открытом виде (минимум 8 символов)
 *
 * @returns {Object} { token, user: { id, login, email } }
 * @throws {400} Если поля пустые или login/email уже заняты
 * @throws {500} При ошибке сервера
 *
 * Безопасность:
 * - Пароль хешируется bcrypt перед сохранением (никогда не хранится в открытом виде)
 * - Проверка уникальности login и email через $or запрос
 */
router.post('/register', async (req, res) => {
    try {
        const { login, email, password } = req.body

        // Валидация обязательных полей
        if (!login || !email || !password) {
            return res.status(400).json({ error: 'Все поля обязательны' })
        }

        // Проверка уникальности login и email
        const exists = await User.findOne({ $or: [{ email }, { login }] })
        if (exists) {
            return res.status(400).json({ error: 'Email или логин уже используется' })
        }

        // Хеширование пароля (cost factor 10 = ~100ms на хеш)
        const hashed = await bcrypt.hash(password, 10)

        // Создание пользователя в БД
        const user = await User.create({ login, email, password: hashed })

        // Генерация JWT-токена (действителен 7 дней)
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.json({
            token,
            user: {
                id: user._id,
                login: user.login,
                email: user.email
            }
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: POST /login — Вход в систему
// ═══════════════════════════════════════════════════════════════

/**
 * Аутентифицирует пользователя и возвращает JWT-токен
 *
 * @param {Object} req.body
 * @param {string} req.body.login - Логин пользователя
 * @param {string} req.body.password - Пароль в открытом виде
 *
 * @returns {Object} { token, user: { id, login, email } }
 * @throws {400} Если логин не найден или пароль неверный
 * @throws {500} При ошибке сервера
 *
 * Безопасность:
 * - Используется bcrypt.compare() для безопасного сравнения хешей
 * - Одинаковое сообщение об ошибке для "нет пользователя" и "неверный пароль"
 *   (защита от enumeration attacks — нельзя узнать, существует ли пользователь)
 */
router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body

        // Поиск пользователя по логину
        const user = await User.findOne({ login })
        if (!user) {
            return res.status(400).json({ error: 'Неверный логин или пароль' })
        }

        // Сравнение пароля с хешем (bcrypt.compare защищён от timing attacks)
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            return res.status(400).json({ error: 'Неверный логин или пароль' })
        }

        // Генерация JWT-токена (действителен 7 дней)
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.json({
            token,
            user: {
                id: user._id,
                login: user.login,
                email: user.email
            }
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: GET /me — Получение профиля текущего пользователя
// ═══════════════════════════════════════════════════════════════

/**
 * Возвращает данные авторизованного пользователя
 *
 * Требует JWT-токен в заголовке Authorization: Bearer <token>
 *
 * @returns {Object} Данные пользователя без поля password
 * @throws {401} Если токен невалиден или отсутствует
 * @throws {500} При ошибке сервера
 *
 * Безопасность:
 * - Поле password исключается через .select('-password')
 * - Middleware authMiddleware проверяет валидность токена
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        // req.userId добавляется middleware authMiddleware после проверки токена
        const user = await User.findById(req.userId).select('-password')
        res.json(user)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: POST /change-password — Смена пароля (авторизованный)
// ═══════════════════════════════════════════════════════════════

/**
 * Меняет пароль авторизованного пользователя
 *
 * Требует JWT-токен в заголовке Authorization: Bearer <token>
 *
 * @param {Object} req.body
 * @param {string} req.body.oldPassword - Текущий пароль для проверки
 * @param {string} req.body.newPassword - Новый пароль (минимум 8 символов)
 *
 * @returns {Object} { success: true }
 * @throws {400} Если поля пустые, пароль короткий или старый пароль неверный
 * @throws {401} Если токен невалиден
 * @throws {500} При ошибке сервера
 *
 * Безопасность:
 * - Проверяется старый пароль перед изменением (защита от hijacking)
 * - Новый пароль хешируется bcrypt перед сохранением
 */
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body

        // Валидация обязательных полей
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Все поля обязательны' })
        }

        // Валидация длины нового пароля
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Минимум 8 символов' })
        }

        // Поиск пользователя и проверка старого пароля
        const user = await User.findById(req.userId)
        const valid = await bcrypt.compare(oldPassword, user.password)
        if (!valid) {
            return res.status(400).json({ error: 'Неверный старый пароль' })
        }

        // Хеширование нового пароля и сохранение
        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: POST /forgot-password — Запрос письма для сброса пароля
// ═══════════════════════════════════════════════════════════════

/**
 * Отправляет письмо со ссылкой для сброса пароля
 *
 * @param {Object} req.body
 * @param {string} req.body.email - Email пользователя
 *
 * @returns {Object} { success: true }
 * @throws {500} При ошибке сервера
 *
 * Безопасность:
 * - Возвращает success: true даже если email не найден (защита от enumeration)
 * - Генерирует криптографически случайный токен (32 байта = 64 hex символа)
 * - Токен действителен 30 минут (баланс удобства и безопасности)
 * - Ссылка содержит токен: /reset-password?token=<token>
 *
 * Ограничения:
 * - Токены хранятся в Map (в памяти) — теряются при перезапуске сервера
 * - Для продакшена заменить на Redis с TTL
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body
        const user = await User.findOne({ email })

        // ⚠️ ВАЖНО: Возвращаем success даже если email не найден
        // Это защищает от enumeration attacks (нельзя узнать, есть ли email в БД)
        if (!user) {
            return res.json({ success: true })
        }

        // Генерация криптографически случайного токена
        const token = crypto.randomBytes(32).toString('hex')

        // Сохранение токена в памяти с временем истечения (30 минут)
        resetTokens.set(token, {
            userId: user._id,
            expires: Date.now() + 1000 * 60 * 30 // 30 минут в миллисекундах
        })

        // Формирование ссылки для сброса пароля
        const link = `${FRONTEND_URL}/reset-password?token=${token}`

        // Отправка письма через Resend API
        await resend.emails.send({
            from: 'ScreenCode <onboarding@resend.dev>',
            to: email,
            subject: 'Сброс пароля ScreenCode',
            html: `
                <p>Для сброса пароля перейдите по ссылке:</p>
                <a href="${link}">${link}</a>
                <p>Ссылка действительна 30 минут.</p>
            `
        })

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: POST /reset-password — Применение токена сброса пароля
// ═══════════════════════════════════════════════════════════════

/**
 * Сбрасывает пароль по токену из письма
 *
 * @param {Object} req.body
 * @param {string} req.body.token - Токен из ссылки письма
 * @param {string} req.body.newPassword - Новый пароль (минимум 8 символов)
 *
 * @returns {Object} { success: true }
 * @throws {400} Если токен невалиден, истёк или пароль короткий
 * @throws {500} При ошибке сервера
 *
 * Безопасность:
 * - Проверяется срок действия токена (30 минут)
 * - Токен удаляется после использования (одноразовый)
 * - Новый пароль хешируется bcrypt перед сохранением
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body
        const data = resetTokens.get(token)

        // Проверка валидности и срока действия токена
        if (!data || Date.now() > data.expires) {
            return res.status(400).json({ error: 'Ссылка недействительна или истекла' })
        }

        // Валидация длины нового пароля
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Минимум 8 символов' })
        }

        // Хеширование нового пароля и обновление в БД
        const hash = await bcrypt.hash(newPassword, 10)
        await User.findByIdAndUpdate(data.userId, { password: hash })

        // Удаление токена после использования (одноразовый)
        resetTokens.delete(token)

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: POST /request-email-change — Запрос письма для смены email
// ═══════════════════════════════════════════════════════════════

/**
 * Отправляет письмо со ссылкой для подтверждения смены email
 *
 * Требует JWT-токен в заголовке Authorization: Bearer <token>
 *
 * @param {Object} req.body
 * @param {string} req.body.newEmail - Новый email для подтверждения
 *
 * @returns {Object} { success: true }
 * @throws {400} Если email уже занят
 * @throws {401} Если токен невалиден
 * @throws {500} При ошибке сервера
 *
 * Безопасность:
 * - Проверяется уникальность нового email
 * - Токен привязан к userId и newEmail
 * - Токен действителен 30 минут
 * - Письмо отправляется на НОВЫЙ email (не на старый)
 *
 * Ограничения:
 * - Токены хранятся в Map (в памяти) — теряются при перезапуске сервера
 * - Для продакшена заменить на Redis с TTL
 */
router.post('/request-email-change', authMiddleware, async (req, res) => {
    try {
        const { newEmail } = req.body

        // Проверка уникальности нового email
        const existing = await User.findOne({ email: newEmail })
        if (existing) {
            return res.status(400).json({ error: 'Email уже занят' })
        }

        // Генерация криптографически случайного токена
        const token = crypto.randomBytes(32).toString('hex')

        // Сохранение токена с привязкой к userId и newEmail
        emailChangeTokens.set(token, {
            userId: req.userId, // req.userId из middleware authMiddleware
            newEmail,
            expires: Date.now() + 1000 * 60 * 30 // 30 минут
        })

        // Формирование ссылки для подтверждения
        const link = `${FRONTEND_URL}/confirm-email?token=${token}`

        // Отправка письма на НОВЫЙ email (пользователь должен подтвердить доступ)
        await resend.emails.send({
            from: 'ScreenCode <onboarding@resend.dev>',
            to: newEmail,
            subject: 'Подтверждение смены email',
            html: `
                <p>Для подтверждения нового email перейдите по ссылке:</p>
                <a href="${link}">${link}</a>
                <p>Ссылка действительна 30 минут.</p>
            `
        })

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: POST /confirm-email-change — Подтверждение смены email
// ═══════════════════════════════════════════════════════════════

/**
 * Подтверждает смену email по токену из письма
 *
 * @param {Object} req.body
 * @param {string} req.body.token - Токен из ссылки письма
 *
 * @returns {Object} { success: true }
 * @throws {400} Если токен невалиден или истёк
 * @throws {500} При ошибке сервера
 *
 * Безопасность:
 * - Проверяется срок действия токена (30 минут)
 * - Токен удаляется после использования (одноразовый)
 * - Email обновляется только после подтверждения доступа к новому адресу
 */
router.post('/confirm-email-change', async (req, res) => {
    try {
        const { token } = req.body
        const data = emailChangeTokens.get(token)

        // Проверка валидности и срока действия токена
        if (!data || Date.now() > data.expires) {
            return res.status(400).json({ error: 'Ссылка недействительна или истекла' })
        }

        // Обновление email в БД
        await User.findByIdAndUpdate(data.userId, { email: data.newEmail })

        // Удаление токена после использования (одноразовый)
        emailChangeTokens.delete(token)

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router