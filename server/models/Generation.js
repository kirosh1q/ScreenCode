const mongoose = require('mongoose')

/**
 * Схема документа генерации кода
 *
 * Хранит результаты генерации фронтенд-кода по скриншоту интерфейса.
 * Каждая генерация привязана к пользователю через userId.
 *
 * Структура данных:
 * - userId: ссылка на документ пользователя (авторизованный создатель)
 * - stack: выбранный технологический стек (например, "React + Tailwind")
 * - mode: режим генерации ("copy" или "template")
 * - layout: описание макета из Pass 1 (текстовое описание структуры)
 * - sections: массив секций интерфейса из Pass 1 (JSON)
 * - colors: массив HEX-цветов палитры из Pass 1
 * - files: массив сгенерированных файлов [{ name, content }]
 * - createdAt/updatedAt: автоматически добавляются Mongoose (timestamps: true)
 *
 * Оптимизация производительности:
 * При запросе списка истории (GET /api/history) поле files.content
 * намеренно исключается через проекцию .select('-files.content'),
 * чтобы уменьшить объём передаваемых данных. Содержимое файлов
 * загружается только при явном запросе конкретной записи.
 */
const generationSchema = new mongoose.Schema({
    // Ссылка на пользователя, создавшего генерацию
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Технологический стек генерации
    stack: String,

    // Режим генерации: 'copy' (точное воспроизведение) или 'template' (шаблон)
    mode: String,

    // Описание макета из Pass 1 (текстовое)
    layout: String,

    // Массив секций интерфейса из Pass 1 (структурированные данные)
    sections: Array,

    // Массив HEX-цветов палитры из Pass 1
    colors: Array,

    // Массив сгенерированных файлов с кодом
    files: [{
        name: String,    // Имя файла (например, "App.jsx", "Header.jsx")
        content: String  // Содержимое файла (код)
    }],
}, {
    // Автоматически добавляет поля createdAt и updatedAt
    timestamps: true
})

module.exports = mongoose.model('Generation', generationSchema)