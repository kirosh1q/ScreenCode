const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const authMiddleware = require('../middleware/authMiddleware')
const { Resend } = require('resend')
const crypto = require('crypto')

router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body
        if (!oldPassword || !newPassword)
            return res.status(400).json({ error: 'Все поля обязательны' })
        if (newPassword.length < 8)
            return res.status(400).json({ error: 'Минимум 8 символов' })

        const user = await User.findById(req.userId)
        const valid = await bcrypt.compare(oldPassword, user.password)
        if (!valid) return res.status(400).json({ error: 'Неверный старый пароль' })

        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.post('/register', async (req, res) => {
    try {
        const { login, email, password } = req.body
        if (!login || !email || !password)
            return res.status(400).json({ error: 'Все поля обязательны' })

        const exists = await User.findOne({ $or: [{ email }, { login }] })
        if (exists) return res.status(400).json({ error: 'Email или логин уже используется' })

        const hashed = await bcrypt.hash(password, 10)
        const user = await User.create({ login, email, password: hashed })

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
        res.json({ token, user: { id: user._id, login: user.login, email: user.email } })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body
        const user = await User.findOne({ login })
        if (!user) return res.status(400).json({ error: 'Неверный логин или пароль' })

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return res.status(400).json({ error: 'Неверный логин или пароль' })

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
        res.json({ token, user: { id: user._id, login: user.login, email: user.email } })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password')
        res.json(user)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})


const resend = new Resend(process.env.RESEND_API_KEY)

// Временное хранилище токенов (для диплома достаточно, в проде — Redis)
const resetTokens = new Map() // token -> { userId, expires }

// Запрос сброса пароля
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body
        const user = await User.findOne({ email })
        if (!user) return res.json({ success: true }) // не раскрываем существование

        const token = crypto.randomBytes(32).toString('hex')
        resetTokens.set(token, {
            userId: user._id,
            expires: Date.now() + 1000 * 60 * 30 // 30 минут
        })

        const link = `http://localhost:5173/reset-password?token=${token}`

        await resend.emails.send({
            from: 'ScreenCode <onboarding@resend.dev>',
            to: email,
            subject: 'Сброс пароля ScreenCode',
            html: `<p>Для сброса пароля перейдите по ссылке:</p>
                   <a href="${link}">${link}</a>
                   <p>Ссылка действительна 30 минут.</p>`
        })

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Сброс пароля по токену
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body
        const data = resetTokens.get(token)

        if (!data || Date.now() > data.expires)
            return res.status(400).json({ error: 'Ссылка недействительна или истекла' })
        if (newPassword.length < 8)
            return res.status(400).json({ error: 'Минимум 8 символов' })

        const hash = await bcrypt.hash(newPassword, 10)
        await User.findByIdAndUpdate(data.userId, { password: hash })
        resetTokens.delete(token)

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Смена email (с подтверждением на новый адрес)
const emailChangeTokens = new Map()

router.post('/request-email-change', authMiddleware, async (req, res) => {
    try {
        const { newEmail } = req.body
        const existing = await User.findOne({ email: newEmail })
        if (existing) return res.status(400).json({ error: 'Email уже занят' })

        const token = crypto.randomBytes(32).toString('hex')
        emailChangeTokens.set(token, {
            userId: req.userId,
            newEmail,
            expires: Date.now() + 1000 * 60 * 30
        })

        const link = `http://localhost:5173/confirm-email?token=${token}`

        await resend.emails.send({
            from: 'ScreenCode <onboarding@resend.dev>',
            to: newEmail,
            subject: 'Подтверждение смены email',
            html: `<p>Для подтверждения нового email перейдите по ссылке:</p>
                   <a href="${link}">${link}</a>
                   <p>Ссылка действительна 30 минут.</p>`
        })

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.post('/confirm-email-change', async (req, res) => {
    try {
        const { token } = req.body
        const data = emailChangeTokens.get(token)

        if (!data || Date.now() > data.expires)
            return res.status(400).json({ error: 'Ссылка недействительна или истекла' })

        await User.findByIdAndUpdate(data.userId, { email: data.newEmail })
        emailChangeTokens.delete(token)

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})
module.exports = router
