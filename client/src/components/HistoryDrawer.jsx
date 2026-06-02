import { useEffect, useState } from 'react'
import { apiFetch } from '../api'

/** Максимальное количество записей в истории */
const HISTORY_LIMIT = 10

/**
 * Выдвижная панель истории генераций
 *
 * Отображает список предыдущих генераций пользователя с возможностью:
 * - Восстановления генерации в рабочую область
 * - Удаления отдельных записей
 * - Полной очистки истории с подтверждением через таймер
 *
 * @param {Object} props
 * @param {boolean} props.open - Флаг открытия панели
 * @param {Function} props.onClose - Обработчик закрытия панели
 * @param {Function} props.onRestore - Обработчик восстановления генерации (принимает id)
 */
export default function HistoryDrawer({ open, onClose, onRestore }) {
    const [generations, setGenerations] = useState([])
    const [loading, setLoading] = useState(false)
    const [clearTimer, setClearTimer] = useState(null)
    const [clearProgress, setClearProgress] = useState(0)

    /** Загружает историю при открытии панели */
    useEffect(() => {
        if (!open) return
        loadHistory()
    }, [open])

    /** Загружает список генераций с сервера */
    async function loadHistory() {
        setLoading(true)
        try {
            const res = await apiFetch('/api/history')
            const data = await res.json()
            setGenerations(Array.isArray(data) ? data.slice(0, HISTORY_LIMIT) : [])
        } catch {
            setGenerations([])
        } finally {
            setLoading(false)
        }
    }

    /**
     * Удаляет одну запись из истории
     * @param {string} id - ID записи для удаления
     * @param {Event} e - Событие клика (для stopPropagation)
     */
    async function deleteOne(id, e) {
        e.stopPropagation()
        const res = await apiFetch(`/api/history/${id}`, { method: 'DELETE' })

        if (!res.ok) {
            try {
                const data = await res.json()
                alert(`Ошибка: ${data.error || 'Неизвестная ошибка'}`)
            } catch {
                alert(`Ошибка сервера: ${res.status}`)
            }
            return
        }

        setGenerations(prev => prev.filter(g => g._id !== id))
    }

    /** Запускает таймер очистки с визуальным прогрессом */
    function startClear() {
        let progress = 0
        const interval = setInterval(() => {
            progress += 20
            setClearProgress(progress)
            if (progress >= 100) {
                clearInterval(interval)
                executeClear()
            }
        }, 1000)
        setClearTimer(interval)
    }

    /** Отменяет очистку истории */
    function cancelClear() {
        clearInterval(clearTimer)
        setClearTimer(null)
        setClearProgress(0)
    }

    /** Выполняет полную очистку истории */
    async function executeClear() {
        const ids = generations.map(g => g._id)
        await Promise.all(ids.map(id =>
            apiFetch(`/api/history/${id}`, { method: 'DELETE' })
        ))
        setGenerations([])
        setClearTimer(null)
        setClearProgress(0)
    }

    // Не рендерим, если панель закрыта
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Затемнение фона (клик закрывает панель) */}
            <div className="flex-1 bg-black/30" onClick={onClose} />

            {/* Панель истории */}
            <div className="w-[420px] bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden">

                {/* ═══════════ Шапка ═══════════ */}
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <span className="font-semibold text-sm">История генераций</span>
                    <button
                        onClick={onClose}
                        className="bg-transparent border-none text-xl cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        ×
                    </button>
                </div>

                {/* ═══════════ Список генераций ═══════════ */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
                    {/* Состояние загрузки */}
                    {loading && (
                        <div className="text-gray-400 text-[13px] text-center pt-10">
                            Загрузка...
                        </div>
                    )}

                    {/* Пустая история */}
                    {!loading && generations.length === 0 && (
                        <div className="text-gray-400 text-[13px] text-center pt-10">
                            История пуста
                        </div>
                    )}

                    {/* Список записей */}
                    {!loading && generations.map(g => (
                        <div
                            key={g._id}
                            onClick={() => { onRestore(g._id); onClose() }}
                            className="p-3 border border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors relative"
                        >
                            {/* Кнопка удаления */}
                            <button
                                onClick={(e) => deleteOne(g._id, e)}
                                className="absolute top-2 right-2 bg-transparent border-none cursor-pointer text-gray-400 hover:text-red-500 text-base leading-none px-1 transition-colors"
                                title="Удалить"
                            >
                                ×
                            </button>

                            {/* Заголовок: стек и дата */}
                            <div className="flex items-center justify-between mb-1.5 pr-5">
                                <span className="text-xs font-medium text-gray-900">{g.stack}</span>
                                <span className="text-[10px] text-gray-400">
                                    {new Date(g.createdAt).toLocaleString('ru')}
                                </span>
                            </div>

                            {/* Режим и количество файлов */}
                            <div className="text-[11px] text-gray-500 mb-1.5">
                                {g.mode === 'copy' ? 'Копия' : 'Шаблон'} · {g.files?.length || 0} файл(ов)
                            </div>

                            {/* Описание макета */}
                            {g.layout && (
                                <div className="text-[11px] text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                                    {g.layout}
                                </div>
                            )}

                            {/* Палитра цветов */}
                            {g.colors?.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                    {g.colors.map((c, i) => (
                                        <div
                                            key={i}
                                            title={c}
                                            className="w-4 h-4 rounded-sm bg-gray-200 border border-gray-200"
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ═══════════ Футер: очистка истории ═══════════ */}
                {generations.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
                        {clearTimer ? (
                            // Состояние очистки (таймер идёт)
                            <div>
                                <div className="text-[11px] text-gray-500 mb-1.5">
                                    Очистка через {5 - Math.floor(clearProgress / 20)} сек...
                                </div>
                                <div className="h-1 bg-gray-100 rounded-sm mb-2 overflow-hidden">
                                    <div
                                        className="h-full bg-red-500 rounded-sm transition-[width] duration-1000 ease-linear"
                                        style={{ width: `${clearProgress}%` }}
                                    />
                                </div>
                                <button
                                    onClick={cancelClear}
                                    className="text-[11px] text-gray-900 bg-transparent border border-gray-200 rounded-md px-2.5 py-1 cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    Отменить
                                </button>
                            </div>
                        ) : (
                            // Кнопка запуска очистки
                            <button
                                onClick={startClear}
                                className="text-[11px] text-red-500 bg-transparent border-none cursor-pointer p-0 hover:text-red-600 transition-colors"
                            >
                                Очистить историю
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}