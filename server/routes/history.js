const express = require('express')
const router = express.Router()
const Generation = require('../models/Generation')
const authMiddleware = require('../middleware/authMiddleware')
const { Types } = require('mongoose')

/**
 * Маршруты управления историей генераций
 *
 * Предоставляет CRUD-операции для работы с сохранёнными генерациями:
 * - POST / — создание новой записи после успешной генерации
 * - GET / — получение списка последних 20 генераций (без содержимого файлов)
 * - GET /:id — получение полной записи по ID (для восстановления в редактор)
 * - DELETE /:id — удаление записи из истории
 *
 * Архитектурные решения:
 * - Все маршруты защищены middleware authMiddleware (применяется глобально через router.use)
 * - Multi-tenant security: каждый запрос фильтруется по userId, пользователь видит только свои записи
 * - Оптимизация списка: GET / исключает поле files.content через .select('-files.content'),
 *   чтобы уменьшить объём передаваемых данных (код может весить десятки КБ на запись)
 * - Содержимое файлов загружается только при явном запросе конкретной записи (GET /:id)
 *
 * @module routes/history
 */

// Применяем middleware авторизации ко всем маршрутам этого роутера
router.use(authMiddleware)

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: POST / — Создание записи в истории
// ═══════════════════════════════════════════════════════════════

/**
 * Сохраняет результат успешной генерации в историю пользователя
 *
 * Вызывается автоматически из хука useGeneration после успешного
 * получения ответа от сервера генерации.
 *
 * @param {Object} req.body
 * @param {string} req.body.stack - Технологический стек (например, "React + Tailwind")
 * @param {string} req.body.mode - Режим генерации ("copy" | "template")
 * @param {string} req.body.layout - Описание макета из Pass 1
 * @param {Array} req.body.sections - Массив секций интерфейса из Pass 1
 * @param {string[]} req.body.colors - Массив HEX-цветов палитры
 * @param {Array<{name: string, content: string}>} req.body.files - Сгенерированные файлы
 *
 * @returns {Object} { success: true, id: string } — ID созданной записи
 * @throws {401} Если токен невалиден (проверяется authMiddleware)
 * @throws {500} При ошибке базы данных
 */
router.post('/', async (req, res) => {
    try {
        const { stack, mode, layout, sections, colors, files } = req.body

        const generation = await Generation.create({
            userId: req.userId,  // req.userId добавляется authMiddleware
            stack,
            mode,
            layout,
            sections,
            colors,
            files
        })

        res.json({ success: true, id: generation._id })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: GET / — Получение списка истории
// ═══════════════════════════════════════════════════════════════

/**
 * Возвращает список последних 20 генераций пользователя
 *
 * Оптимизация производительности:
 * Поле files.content исключается через .select('-files.content'),
 * так как содержимое файлов может весить десятки килобайт на запись.
 * В списке истории отображаются только метаданные (стек, дата, цвета, имена файлов),
 * а полное содержимое загружается при клике на запись через GET /:id.
 *
 * @returns {Array<Object>} Массив генераций без поля files.content, отсортированных по дате (новые первыми)
 * @throws {401} Если токен невалиден
 * @throws {500} При ошибке базы данных
 */
router.get('/', async (req, res) => {
    try {
        const generations = await Generation
            .find({ userId: req.userId })
            .select('-files.content')  // Исключаем содержимое файлов для оптимизации
            .sort({ createdAt: -1 })   // Новые записи первыми
            .limit(20)                  // Ограничиваем количество записей

        res.json(generations)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: GET /:id — Получение полной записи по ID
// ═══════════════════════════════════════════════════════════════

/**
 * Возвращает полную запись генерации по её ID
 *
 * Используется для восстановления генерации из истории в редактор.
 * В отличие от GET /, возвращает все поля, включая files.content.
 *
 * @param {Object} req.params
 * @param {string} req.params.id - MongoDB ObjectId записи
 *
 * @returns {Object} Полная запись генерации (включая files.content)
 * @throws {404} Если запись не найдена или не принадлежит пользователю
 * @throws {401} Если токен невалиден
 * @throws {500} При ошибке базы данных
 *
 * Безопасность:
 * Фильтр { _id, userId } гарантирует, что пользователь может получить
 * только свои записи. Даже если ID угадан, чужая запись не вернётся.
 */
router.get('/:id', async (req, res) => {
    try {
        const generation = await Generation.findOne({
            _id: req.params.id,
            userId: req.userId  // Защита от доступа к чужим записям
        })

        if (!generation) {
            return res.status(404).json({ error: 'Не найдено' })
        }

        res.json(generation)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
// МАРШРУТ: DELETE /:id — Удаление записи из истории
// ═══════════════════════════════════════════════════════════════

/**
 * Удаляет запись генерации из истории пользователя
 *
 * @param {Object} req.params
 * @param {string} req.params.id - MongoDB ObjectId записи для удаления
 *
 * @returns {Object} { success: true }
 * @throws {404} Если запись не найдена или не принадлежит пользователю
 * @throws {401} Если токен невалиден
 * @throws {500} При ошибке базы данных
 *
 * Безопасность:
 * - Фильтр { _id, userId } предотвращает удаление чужих записей
 * - Явный каст строки в ObjectId через new Types.ObjectId() валидирует формат ID
 *   и выбрасывает CastError при невалидном формате (например, "abc")
 * - Проверка result.deletedCount === 0 отличает "запись не найдена" от "запись уже удалена"
 */
router.delete('/:id', async (req, res) => {
    try {
        // Явный каст строки в ObjectId для валидации формата ID
        const result = await Generation.deleteOne({
            _id: new Types.ObjectId(req.params.id),
            userId: req.userId  // Защита от удаления чужих записей
        })

        // Если ничего не удалено — запись не найдена или не принадлежит пользователю
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Запись не найдена или недоступна' })
        }

        res.json({ success: true })
    } catch (error) {
        console.error('Ошибка удаления:', error.message)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router