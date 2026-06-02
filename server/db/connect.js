const mongoose = require('mongoose')

/**
 * Подключение к базе данных MongoDB
 *
 * Устанавливает соединение с MongoDB Atlas (облачная база данных)
 * используя строку подключения из переменной окружения MONGO_URI.
 *
 * Архитектурная роль:
 * Вызывается один раз при запуске сервера в index.js.
 * В случае неудачи подключения процесс завершается с кодом 1,
 * так как работа приложения без базы данных невозможна.
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Если подключение не удалось — завершает процесс
 */
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log('✅ MongoDB подключена успешно')
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error.message)
        // Завершаем процесс, так как без БД приложение не может работать
        process.exit(1)
    }
}

module.exports = connectDB