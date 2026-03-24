function findHorizontalSections(buffer, width, height) {
    const sections = []
    const sliceH = Math.floor(height / 10) // делим на 10 горизонтальных полос

    let prevAvg = -1
    let sectionStart = 0

    for (let row = 0; row < 10; row++) {
        const y = row * sliceH
        let brightnessSum = 0
        let pixelCount = 0

        for (let x = 0; x < width; x += 4) {
            const idx = (y * width + x) * 3
            if (idx + 2 < buffer.length) {
                brightnessSum += (buffer[idx] + buffer[idx + 1] + buffer[idx + 2]) / 3
                pixelCount++
            }
        }

        const avg = pixelCount > 0 ? Math.round(brightnessSum / pixelCount) : 0

        // резкий перепад яркости = граница секции
        if (prevAvg >= 0 && Math.abs(avg - prevAvg) > 30) {
            sections.push({
                topPercent: Math.round((sectionStart / height) * 100),
                heightPercent: Math.round(((y - sectionStart) / height) * 100),
                avgBrightness: prevAvg,
                type: prevAvg < 80 ? 'dark' : prevAvg > 180 ? 'light' : 'medium'
            })
            sectionStart = y
        }

        prevAvg = avg
    }

    // последняя секция
    sections.push({
        topPercent: Math.round((sectionStart / height) * 100),
        heightPercent: Math.round(((height - sectionStart) / height) * 100),
        avgBrightness: prevAvg,
        type: prevAvg < 80 ? 'dark' : prevAvg > 180 ? 'light' : 'medium'
    })

    return sections
}

function detectRepeatingBlocks(buffer, width, height) {
    // ищем горизонтальные полосы с похожей структурой
    const sliceH = 40
    const signatures = []

    for (let y = 0; y < height - sliceH; y += sliceH) {
        const sig = []
        // берём 20 точек по горизонтали
        for (let x = 0; x < width; x += Math.floor(width / 20)) {
            const idx = (y * width + x) * 3
            if (idx + 2 < buffer.length) {
                sig.push(Math.floor((buffer[idx] + buffer[idx + 1] + buffer[idx + 2]) / 3 / 30))
            }
        }
        signatures.push({ y, sig })
    }

    // ищем похожие сигнатуры
    let repeatCount = 0
    for (let i = 0; i < signatures.length; i++) {
        for (let j = i + 2; j < signatures.length; j++) {
            const similarity = calcSimilarity(signatures[i].sig, signatures[j].sig)
            if (similarity > 0.8) repeatCount++
        }
    }

    // если много похожих полос — есть повторяющиеся элементы
    return repeatCount > 5
}

function calcSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0) return 0
    let diff = 0
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i])
    return 1 - diff / (a.length * 8)
}

module.exports = { findHorizontalSections, detectRepeatingBlocks }