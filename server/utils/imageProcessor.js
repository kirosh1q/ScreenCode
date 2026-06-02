const sharp = require('sharp')
const { createCanvas, loadImage } = require('canvas')

/**
 * Модуль предобработки изображений для конвейера генерации кода
 *
 * Отвечает за все этапы подготовки изображения перед отправкой в AI-модель:
 * - Базовая обработка (resize, sharpen, normalize, modulate)
 * - Извлечение сырых пикселей для программного анализа
 * - Создание мульти-кропов зон (верх/середина/низ)
 * - Наложение координатной сетки для формализации позиций
 *
 * Архитектурная роль:
 * Все функции модуля используются в server/routes/generate.js и server/routes/debug.js.
 * Они образуют конвейер: оригинал → processImageForAI → addGridOverlay → модель (Pass 1)
 *                                                       → createMultiCrop → модель (Pass 2)
 *
 * Зависимости:
 * - sharp: высокопроизводительная обработка изображений (libvips)
 * - canvas: node-canvas для наложения векторной сетки поверх растрового изображения
 *
 * @module utils/imageProcessor
 */

// ═══════════════════════════════════════════════════════════════
// ФУНКЦИЯ: processImageForAI — Базовая предобработка для AI
// ═══════════════════════════════════════════════════════════════

/**
 * Выполняет базовую предобработку изображения для передачи в AI-модель
 *
 * Цепочка операций (pipeline):
 * 1. resize до 1280px по ширине — оптимизация количества токенов
 *    (слишком большие изображения расходуют лимит токенов модели)
 * 2. sharpen (sigma: 1.2) — повышение резкости мелких деталей
 *    (модель лучше распознаёт границы элементов интерфейса)
 * 3. normalize — нормализация яркости и контраста
 *    (уравнивает освещение разных скриншотов)
 * 4. modulate (saturation: 1.5) — усиление насыщенности цветов
 *    (модель точнее определяет цвета палитры)
 * 5. png (quality: 92, compressionLevel: 6) — баланс качества и размера
 *
 * @param {Buffer} buffer - Буфер исходного изображения (из multer)
 * @returns {Promise<{buffer: Buffer, mimeType: string}>}
 *   - buffer: обработанный PNG-буфер
 *   - mimeType: всегда 'image/png'
 *
 * @example
 * const { buffer, mimeType } = await processImageForAI(req.file.buffer)
 * const base64 = buffer.toString('base64')
 */
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

// ═══════════════════════════════════════════════════════════════
// ФУНКЦИЯ: processImageForAnalysis — Подготовка для программного анализа
// ═══════════════════════════════════════════════════════════════

/**
 * Подготавливает изображение для программного анализа (без AI)
 *
 * Извлекает сырые пиксели (raw RGBA) для алгоритмов анализа:
 * - detectRepeatingBlocks: поиск повторяющихся паттернов
 *
 * Отличается от processImageForAI:
 * - Больший размер (1920px) для точности анализа
 * - Формат 'raw' вместо PNG — даёт прямой доступ к пикселям
 * - Не применяет sharpen/normalize/modulate — нужен "чистый" результат
 *
 * @param {Buffer} buffer - Буфер исходного изображения
 * @returns {Promise<{rawPixels: Buffer, info: Object}>}
 *   - rawPixels: буфер сырых RGBA-пикселей (width * height * 4 байта)
 *   - info: метаданные { width, height, channels, premultiplied }
 *
 * @example
 * const { rawPixels, info } = await processImageForAnalysis(buffer)
 * const hasRepeating = detectRepeatingBlocks(rawPixels, info.width, info.height)
 */
async function processImageForAnalysis(buffer) {
    const { data: rawPixels, info } = await sharp(buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .toFormat('raw')
        .toBuffer({ resolveWithObject: true })

    return { rawPixels, info }
}

// ═══════════════════════════════════════════════════════════════
// ФУНКЦИЯ: cropSection — Обрезка одной секции (legacy)
// ═══════════════════════════════════════════════════════════════

/**
 * Обрезает одну горизонтальную секцию изображения
 *
 * ⚠️ LEGACY: В текущей версии не используется напрямую.
 * Сохранена для обратной совместимости и возможного использования
 * в будущих версиях для точечной обрезки произвольных зон.
 *
 * @param {Buffer} buffer - Буфер исходного изображения
 * @param {Object} info - Метаданные изображения { width, height }
 * @param {number} fromPercent - Начальная позиция (0.0 - 1.0, например 0.3 для 30%)
 * @param {number} heightPercent - Высота секции (0.0 - 1.0, например 0.3 для 30%)
 * @returns {Promise<Buffer>} Буфер обрезанного PNG-изображения
 *
 * @example
 * const topCrop = await cropSection(buffer, info, 0, 0.3)    // верхние 30%
 * const midCrop = await cropSection(buffer, info, 0.3, 0.3)  // средние 30%
 */
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

// ═══════════════════════════════════════════════════════════════
// ФУНКЦИЯ: createMultiCrop — Создание 3 кропов для Pass 2
// ═══════════════════════════════════════════════════════════════

/**
 * Создаёт три горизонтальных кропа изображения для Pass 2
 *
 * Зачем нужны кропы:
 * Модель получает 4 изображения: сетка + 3 кропа. Это позволяет:
 * - Избежать потери деталей при уменьшении общего размера
 * - Сфокусироваться на каждой зоне отдельно
 * - Точнее воспроизвести мелкие элементы (иконки, текст)
 *
 * Разделение зон:
 * - Top: 0-30% высоты (хедер, навигация)
 * - Middle: 30-60% высоты (основной контент)
 * - Bottom: 60-100% высоты (футер, нижние панели)
 *
 * Оптимизации:
 * - Параллельная обработка через Promise.all (3 кропа одновременно)
 * - Пропуск кропов для низких изображений (< 600px) — они не дадут деталей
 * - Resize до 1920px для каждого кропа — баланс детализации и токенов
 *
 * @param {Buffer} buffer - Буфер исходного изображения
 * @returns {Promise<{top: Buffer|null, middle: Buffer|null, bottom: Buffer|null}>}
 *   Буферы кропов или null, если изображение слишком низкое
 *
 * @example
 * const crops = await createMultiCrop(buffer)
 * if (crops.top && crops.middle && crops.bottom) {
 *     // Все 3 кропа созданы — добавляем в промпт Pass 2
 * }
 */
async function createMultiCrop(buffer) {
    const { width, height } = await sharp(buffer).metadata()

    // Порог высоты: для изображений ниже 600px кропы не дадут полезных деталей
    const MIN_HEIGHT_FOR_CROPS = 600

    if (height < MIN_HEIGHT_FOR_CROPS) {
        console.log('Изображение слишком низкое, кропы пропускаем')
        return { top: null, middle: null, bottom: null }
    }

    // Разделение на зоны: 30% / 30% / 40%
    const topHeight = Math.floor(height * 0.30)
    const middleHeight = Math.floor(height * 0.30)
    const bottomHeight = height - topHeight - middleHeight  // остаток ~40%

    // Параллельная обработка всех 3 кропов через Promise.all
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

// ═══════════════════════════════════════════════════════════════
// ФУНКЦИЯ: addGridOverlay — Наложение координатной сетки
// ═══════════════════════════════════════════════════════════════

/**
 * Накладывает координатную сетку на изображение для Pass 1
 *
 * Зачем нужна сетка:
 * - Формализует описание позиций элементов (A1:L9 вместо "слева сверху")
 * - Модель точнее определяет расположение и пропорции
 * - Позволяет использовать координаты в промпте Pass 2
 *
 * Алгоритм:
 * 1. Динамически вычисляет количество колонок и строк
 *    (на основе размера изображения и желаемого размера ячейки)
 * 2. Создаёт canvas поверх изображения
 * 3. Рисует вертикальные линии + буквы (A, B, C...)
 * 4. Рисует горизонтальные линии + цифры (1, 2, 3...)
 * 5. Возвращает буфер с сеткой + метаданные для промпта
 *
 * @param {Buffer} buffer - Буфер обработанного изображения (из processImageForAI)
 * @param {Object} [options={}] - Параметры сетки
 * @param {number} [options.targetCellSize=120] - Желаемый размер ячейки в пикселях
 * @param {number} [options.minCols=8] - Минимальное количество колонок
 * @param {number} [options.maxCols=16] - Максимальное количество колонок
 * @param {number} [options.minRows=5] - Минимальное количество строк
 * @param {number} [options.maxRows=12] - Максимальное количество строк
 *
 * @returns {Promise<Object>}
 *   - buffer: Buffer — изображение с наложенной сеткой (PNG)
 *   - colW: number — ширина колонки в пикселях
 *   - rowH: number — высота строки в пикселях
 *   - cols: number — количество колонок
 *   - rows: number — количество строк
 *   - gridSpec: string — текстовая справка для промпта (например, "grid 12×9, cell ~107×142px")
 *
 * @example
 * const { buffer, cols, rows, colW, rowH } = await addGridOverlay(processedBuffer)
 * const base64Grid = buffer.toString('base64')
 * // Используем в промпте: "Columns: A to L, each column ≈ 107px wide"
 */
async function addGridOverlay(buffer, options = {}) {
    const { width, height } = await sharp(buffer).metadata()

    // Параметры по умолчанию (можно переопределить через options)
    const {
        targetCellSize = 120,
        minCols = 8, maxCols = 16,
        minRows = 5, maxRows = 12
    } = options

    // Динамический расчёт количества колонок и строк
    // Формула: размер_изображения / желаемый_размер_ячейки, ограниченный диапазоном [min, max]
    const cols = Math.min(maxCols, Math.max(minCols, Math.round(width / targetCellSize)))
    const rows = Math.min(maxRows, Math.max(minRows, Math.round(height / targetCellSize)))

    // Создаём canvas того же размера, что и изображение
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Рисуем исходное изображение на canvas
    const img = await loadImage(buffer)
    ctx.drawImage(img, 0, 0)

    // Вычисляем размеры ячейки
    const colW = width / cols
    const rowH = height / rows

    // Стили сетки: полупрозрачные белые линии с тенью для читаемости
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.lineWidth = 1
    ctx.font = `bold ${Math.max(10, Math.floor(colW * 0.15))}px Arial`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 3

    // Рисуем вертикальные линии + подписи колонок (A, B, C...)
    for (let c = 0; c <= cols; c++) {
        const x = Math.round(c * colW)
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()

        // Подпись колонки (буква A, B, C...)
        if (c < cols) {
            const letter = String.fromCharCode(65 + c)  // 65 = ASCII код 'A'
            ctx.fillText(letter, x + 4, Math.min(20, rowH * 0.3))
        }
    }

    // Рисуем горизонтальные линии + подписи строк (1, 2, 3...)
    for (let r = 0; r <= rows; r++) {
        const y = Math.round(r * rowH)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()

        // Подпись строки (цифра 1, 2, 3...)
        if (r < rows) {
            ctx.fillText(String(r + 1), 4, y + Math.min(20, rowH * 0.3))
        }
    }

    // Экспортируем canvas в PNG-буфер
    const result = canvas.toBuffer('image/png')

    // Возвращаем изображение с сеткой + метаданные для формирования промпта
    return {
        buffer: result,
        colW: Math.round(colW),
        rowH: Math.round(rowH),
        cols,
        rows,
        gridSpec: `grid ${cols}×${rows}, cell ~${Math.round(colW)}×${Math.round(rowH)}px`
    }
}

module.exports = {
    processImageForAI,
    processImageForAnalysis,
    cropSection,
    createMultiCrop,
    addGridOverlay
}