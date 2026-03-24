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
app.use('/api/debug', require('./routes/debug'))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/history', require('./routes/history'))
app.use('/api/generate', require('./routes/generate'))
app.use('/api/edit', require('./routes/edit'))

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`)
})