const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const authMiddleware = require('../middleware/authMiddleware')

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
module.exports = router
