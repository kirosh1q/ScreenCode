const sharp = require('sharp')

async function processImageForAI(buffer) {
    const processed = await sharp(buffer)
        .resize({ width: 1280, withoutEnlargement: true })
        .sharpen({ sigma: 1.2 })
        .normalize()
        .modulate({ saturation: 1.5 })
        .png({ quality: 92, compressionLevel: 6 })
        .toBuffer()
    return { buffer: processed, mimeType: 'image/png' }
}

async function processImageForAnalysis(buffer) {
    const { data: rawPixels, info } = await sharp(buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .toFormat('raw')
        .toBuffer({ resolveWithObject: true })
    return { rawPixels, info }
}

async function cropSection(buffer, info, fromPercent, heightPercent) {
    const top = Math.floor(info.height * fromPercent)
    const height = Math.floor(info.height * heightPercent)
    const cropped = await sharp(buffer)
        .extract({ left: 0, top, width: info.width, height })
        .resize({ width: 1280 })
        .png()
        .toBuffer()
    return cropped
}

async function createMultiCrop(buffer) {
    const { width, height } = await sharp(buffer).metadata()

    const MIN_HEIGHT_FOR_CROPS = 600

    if (height < MIN_HEIGHT_FOR_CROPS) {
        console.log('Изображение слишком низкое, кропы пропускаем')
        return { top: null, middle: null, bottom: null }
    }

    const topHeight = Math.floor(height * 0.30)
    const middleHeight = Math.floor(height * 0.30)
    const bottomHeight = height - topHeight - middleHeight  // остаток ~40%

    const [top, middle, bottom] = await Promise.all([
        sharp(buffer)
            .extract({ left: 0, top: 0, width, height: topHeight })
            .resize({ width: 1920, withoutEnlargement: true })
            .png()
            .toBuffer(),
        sharp(buffer)
            .extract({ left: 0, top: topHeight, width, height: middleHeight })
            .resize({ width: 1920, withoutEnlargement: true })
            .png()
            .toBuffer(),
        sharp(buffer)
            .extract({ left: 0, top: topHeight + middleHeight, width, height: bottomHeight })
            .resize({ width: 1920, withoutEnlargement: true })
            .png()
            .toBuffer()
    ])

    return { top, middle, bottom }
}

const { createCanvas, loadImage } = require('canvas')

async function addGridOverlay(buffer, options = {}) {
    const { width, height } = await sharp(buffer).metadata()

    // Параметры по умолчанию (можно переопределить)
    const {
        targetCellSize = 120,    // Желаемый размер ячейки в пикселях
        minCols = 8, maxCols = 16,  // Диапазон колонок
        minRows = 5, maxRows = 12   // Диапазон строк
    } = options

    // 1. Вычисляем количество колонок и строк динамически
    const cols = Math.min(maxCols, Math.max(minCols, Math.round(width / targetCellSize)))
    const rows = Math.min(maxRows, Math.max(minRows, Math.round(height / targetCellSize)))

    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    const img = await loadImage(buffer)
    ctx.drawImage(img, 0, 0)

    const colW = width / cols
    const rowH = height / rows

    // Стили сетки
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.lineWidth = 1
    ctx.font = `bold ${Math.max(10, Math.floor(colW * 0.15))}px Arial`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 3

    // Вертикальные линии + буквы (A, B, C...)
    for (let c = 0; c <= cols; c++) {
        const x = Math.round(c * colW)
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
        if (c < cols) {
            const letter = String.fromCharCode(65 + c)
            ctx.fillText(letter, x + 4, Math.min(20, rowH * 0.3))
        }
    }

    // Горизонтальные линии + цифры (1, 2, 3...)
    for (let r = 0; r <= rows; r++) {
        const y = Math.round(r * rowH)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
        if (r < rows) {
            ctx.fillText(String(r + 1), 4, y + Math.min(20, rowH * 0.3))
        }
    }

    const result = canvas.toBuffer('image/png')

    // Возвращаем метаданные для промпта
    return {
        buffer: result,
        colW: Math.round(colW),
        rowH: Math.round(rowH),
        cols,
        rows,
        // Удобная справка для промпта
        gridSpec: `grid ${cols}×${rows}, cell ~${Math.round(colW)}×${Math.round(rowH)}px`
    }
}

module.exports = { processImageForAI, processImageForAnalysis, cropSection, createMultiCrop, addGridOverlay }
