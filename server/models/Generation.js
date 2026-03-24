const mongoose = require('mongoose')

const generationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stack: String,
    mode: String,
    layout: String,
    sections: Array,
    colors: Array,
    files: [{ name: String, content: String }],
}, { timestamps: true })

module.exports = mongoose.model('Generation', generationSchema)