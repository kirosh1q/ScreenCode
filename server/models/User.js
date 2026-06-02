const mongoose = require('mongoose')

/**
 * Схема документа пользователя
 *
 * Хранит данные зарегистрированных пользователей системы.
 * Пароли хранятся в виде bcrypt-хешей (никогда в открытом виде).
 *
 * Структура данных:
 * - login: уникальный логин пользователя (минимум 4 символа)
 * - email: уникальный email с валидацией формата
 * - password: bcrypt-хеш пароля (минимум 8 символов до хеширования)
 * - createdAt/updatedAt: автоматически добавляются Mongoose (timestamps: true)
 *
 * Безопасность:
 * - Поле password никогда не возвращается в ответах API (используется .select('-password'))
 * - Пароли хешируются алгоритмом bcrypt с cost factor = 10 перед сохранением
 * - При проверке пароля используется bcrypt.compare() для безопасного сравнения
 */
const userSchema = new mongoose.Schema({
    // Уникальный логин пользователя
    login: {
        type: String,
        required: [true, 'Логин обязателен'],
        unique: true,
        minlength: [4, 'Логин минимум 4 символа'],
        trim: true  // Удаляет пробелы в начале и конце
    },

    // Уникальный email пользователя
    email: {
        type: String,
        required: [true, 'Email обязателен'],
        unique: true,
        lowercase: true,  // Приводит к нижнему регистру
        trim: true,
        // Регулярное выражение для валидации формата email
        match: [/^\S+@\S+\.\S+$/, 'Некорректный email']
    },

    // bcrypt-хеш пароля (никогда не хранится в открытом виде)
    password: {
        type: String,
        required: [true, 'Пароль обязателен'],
        minlength: [8, 'Пароль минимум 8 символов']
    },
}, {
    // Автоматически добавляет поля createdAt и updatedAt
    timestamps: true
})

module.exports = mongoose.model('User', userSchema)