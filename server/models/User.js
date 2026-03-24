const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    login: {
        type: String,
        required: true,
        unique: true,
        minlength: [4, 'Логин минимум 4 символа'],
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Некорректный email']
    },
    password: {
        type: String,
        required: true,
        minlength: [8, 'Пароль минимум 8 символов']
    },
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)