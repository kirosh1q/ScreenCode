import { useState } from 'react'
import { apiFetch } from '../api'

/**
 * Хук управления жизненным циклом генерации кода
 *
 * Отвечает за:
 * - Загрузку и предпросмотр скриншота (через URL.createObjectURL)
 * - Отправку изображения и настроек на сервер (POST /api/generate)
 * - Автоматическое сохранение успешной генерации в историю
 * - Обновление кода после ручного редактирования
 * - Восстановление предыдущих генераций из истории
 *
 * Архитектурная роль:
 * Инкапсулирует всю логику взаимодействия с эндпоинтами генерации
 * и истории, освобождая компоненты от прямых API-вызовов.
 *
 * @returns {Object} Состояние и функции управления генерацией
 */
export function useGeneration() {
    // ═══════════ Состояние файла и предпросмотра ═══════════
    const [file, setFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)

    // ═══════════ Состояние процесса генерации ═══════════
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    /**
     * Обрабатывает выбор или удаление файла скриншота
     * Создаёт blob URL для предпросмотра в <img>
     *
     * @param {File|null} f - Файл изображения или null для сброса
     */
    function handleFile(f) {
        if (!f) {
            setFile(null)
            setPreviewUrl(null)
            setResult(null)
            setError(null)
            return
        }
        setFile(f)
        setPreviewUrl(URL.createObjectURL(f))
        setResult(null)
        setError(null)
    }

    /**
     * Запускает процесс генерации кода
     *
     * Отправляет изображение и настройки на сервер, получает результат,
     * распаковывает обёртку { success, data } и автоматически сохраняет
     * успешную генерацию в историю пользователя.
     *
     * @param {string} selectedStack - Технологический стек (например, 'React + Tailwind')
     * @param {string} selectedMode - Режим генерации ('copy' | 'template')
     * @param {string} apiKey - API-ключ OpenRouter (пользовательский)
     * @param {string} model - Имя модели (например, 'qwen/qwen3.6-plus')
     */
    async function generate(selectedStack, selectedMode, apiKey, model) {
        if (!file) return setError('Выбери скриншот')
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const form = new FormData()
            form.append('image', file)
            form.append('stack', selectedStack)
            form.append('mode', selectedMode)
            form.append('apiKey', apiKey)
            form.append('model', model)

            const res = await apiFetch('/api/generate', {
                method: 'POST',
                body: form
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Ошибка сервера')

            // Сервер возвращает { success: true, data: {...} } — распаковываем
            setResult(data.data)

            // Сохраняем успешную генерацию в историю (асинхронно, не блокируя UI)
            const token = localStorage.getItem('token')
            if (token && data.data) {
                apiFetch('/api/history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        stack: selectedStack,
                        mode: selectedMode,
                        layout: data.data.layout,
                        sections: data.data.sections,
                        colors: data.data.colors,
                        files: data.data.files
                    })
                }).catch(err => console.error('История не сохранилась:', err))
            }

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    /**
     * Обновляет код после ручного редактирования или чат-правки
     *
     * Поддерживает два сценария:
     * - Обновление нескольких файлов (после чат-редактирования)
     * - Обновление одного файла (после правки в CodeMirror)
     *
     * @param {string|null} newCode - Новый код (для однофайлового режима)
     * @param {Array|null} newFiles - Массив файлов { name, content } (для многофайлового)
     */
    function handleCodeUpdate(newCode, newFiles) {
        if (newFiles?.length > 0) {
            // Многофайловый режим: обновляем весь массив файлов
            setResult(prev => ({
                ...prev,
                generatedHTML: newFiles.find(f => f.name === 'App.jsx')?.content || newFiles[0].content,
                files: newFiles
            }))
        } else {
            // Однофайловый режим: обновляем только активный файл
            setResult(prev => ({
                ...prev,
                generatedHTML: newCode,
                files: prev.files?.map(f =>
                    f.name === prev.files[0].name
                        ? { ...f, content: newCode }
                        : f
                ) || [{ name: 'index.html', content: newCode }]
            }))
        }
    }

    /** Сбрасывает всё состояние генерации к начальному */
    function reset() {
        setFile(null)
        setPreviewUrl(null)
        setResult(null)
        setError(null)
    }

    /**
     * Восстанавливает результат генерации из истории
     * @param {Object} data - Полные данные генерации (layout, sections, files и т.д.)
     */
    function restoreResult(data) {
        setResult(data)
    }

    return {
        file,
        previewUrl,
        loading,
        result,
        error,
        handleFile,
        generate,
        handleCodeUpdate,
        reset,
        restoreResult
    }
}