const express = require('express')
const router = express.Router()
const Generation = require('../models/Generation')
const authMiddleware = require('../middleware/authMiddleware')
const { Types } = require('mongoose')

router.use(authMiddleware)

router.post('/', async (req, res) => {
    try {
        const { stack, mode, layout, sections, colors, files } = req.body
        const generation = await Generation.create({
            userId: req.userId,
            stack, mode, layout, sections, colors, files
        })
        res.json({ success: true, id: generation._id })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.get('/', async (req, res) => {
    try {
        const generations = await Generation.find({ userId: req.userId })
            .select('-files.content')
            .sort({ createdAt: -1 })
            .limit(20)
        res.json(generations)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.get('/:id', async (req, res) => {
    try {
        const generation = await Generation.findOne({
            _id: req.params.id,
            userId: req.userId
        })
        if (!generation) return res.status(404).json({ error: 'Не найдено' })
        res.json(generation)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.delete('/:id', async (req, res) => {
    try {
        // Кастуем строку в ObjectId + проверяем deletedCount
        const result = await Generation.deleteOne({
            _id: new Types.ObjectId(req.params.id),
            userId: req.userId
        })

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Запись не найдена или недоступна' })
        }

        res.json({ success: true })
    } catch (error) {
        console.error('Ошибка удаления:', error.message)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router