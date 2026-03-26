const express = require('express')
const cors = require('cors')
require('dotenv').config()
const connectDB = require('./db/connect')

const app = express()

connectDB()

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Сервер работает' })
})
app.get('/api/models', (req, res) => {
    // Возвращаем список доступных моделей
    res.json({
        models: [
            { id: process.env.AI_MODEL || 'qwen/qwen3.5-35b-a3b', name: 'Qwen 3.5' },
            //{ id: 'openai/gpt-4o', name: 'GPT-4o' },
            //{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5' }
        ]
    })
})

app.use('/api/debug', require('./routes/debug'))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/history', require('./routes/history'))
app.use('/api/generate', require('./routes/generate'))
// Эндпоинт для получения данных последней генерации
const lastGenerationDebug = require('./debugStore')
app.get('/api/last-debug', (req, res) => {
    res.json(lastGenerationDebug)
})
app.use('/api/edit', require('./routes/edit'))

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`)
})