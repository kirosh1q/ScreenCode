import { useState } from 'react'
import { apiFetch } from '../api'

/**
 * Правая панель анализа и редактирования
 *
 * Отображает результаты структурного анализа из Pass 1
 * и предоставляет чат-интерфейс для точечного редактирования кода.
 *
 * @param {Object} props
 * @param {Object|null} props.result - Результат генерации (секции, цвета, файлы)
 * @param {Function} props.onCodeUpdate - Обработчик обновления кода
 * @param {string} props.apiKey - API-ключ OpenRouter
 * @param {string} props.model - Имя модели для редактирования
 */
export default function RightPanel({ result, onCodeUpdate, apiKey, model }) {
    const [editText, setEditText] = useState('')
    const [messages, setMessages] = useState([
        { type: 's', text: 'Опишите что изменить.' }
    ])
    const [editLoading, setEditLoading] = useState(false)

    /**
     * Отправляет инструкцию по редактированию на сервер
     *
     * Передаёт текущий код (или все файлы) и текстовую инструкцию
     * в языковую модель для внесения изменений.
     */
    async function sendEdit() {
        const t = editText.trim()
        if (!t || !result || editLoading) return

        setMessages(prev => [...prev, { type: 'u', text: t }])
        setEditText('')
        setEditLoading(true)

        try {
            const currentCode = result.generatedHTML || result.files?.[0]?.content || ''
            const allFiles = result.files || []

            const res = await apiFetch('/api/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentCode,
                    editPrompt: t,
                    allFiles,
                    apiKey,
                    model
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            onCodeUpdate(data.code, data.files)
            setMessages(prev => [...prev, { type: 's', text: '✓ Готово — код обновлён' }])
        } catch (err) {
            setMessages(prev => [...prev, { type: 's', text: `Ошибка: ${err.message}` }])
        } finally {
            setEditLoading(false)
        }
    }

    return (
        <div className="bg-white border-l border-gray-200 flex flex-col overflow-hidden">

            {/* ═══════════ Секция: Анализ структуры ═══════════ */}
            <section className="p-4 border-b border-gray-100 flex-shrink-0 max-h-[45vh] overflow-y-auto">
                <h3 className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-2.5">
                    Анализ структуры
                </h3>

                {!result ? (
                    // Заглушка до завершения генерации
                    <div className="text-[11px] text-gray-400 text-center py-2">
                        Появится после анализа
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {/* Список секций интерфейса */}
                        {result.sections?.map((s, i) => {
                            const name = typeof s === 'object' ? s.name : s
                            const type = typeof s === 'object' ? s.type : null
                            const desc = typeof s === 'object' ? s.description : null
                            const isDynamic = type === 'dynamic'

                            return (
                                <div
                                    key={i}
                                    className="px-2.5 py-1.5 rounded-md bg-gray-50 border border-gray-100 mb-1"
                                >
                                    <div className="flex items-center gap-2 text-[11px]">
                                        {/* Индикатор типа секции */}
                                        <div
                                            className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${
                                                isDynamic ? 'bg-red-500' : 'bg-gray-900'
                                            }`}
                                        />
                                        <span className="flex-1 text-gray-700">{name}</span>

                                        {/* Бейдж типа секции */}
                                        {type && (
                                            <span
                                                className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                                    isDynamic
                                                        ? 'bg-red-50 text-red-500 border-red-200'
                                                        : 'bg-gray-100 text-gray-500 border-gray-200'
                                                }`}
                                            >
                                                {isDynamic ? 'динамичный' : 'статичный'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Описание секции (если есть) */}
                                    {desc && (
                                        <div className="mt-0.5 text-[10px] text-gray-400 pl-[15px]">
                                            {desc}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Палитра цветов */}
                        {result.colors?.length > 0 && (
                            <div className="mt-2">
                                <div className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider">
                                    Цвета
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                    {result.colors.map(c => (
                                        <div
                                            key={c}
                                            title={c}
                                            className="w-5 h-5 rounded border border-gray-200"
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ═══════════ Секция: Редактирование через чат ═══════════ */}
            <section className="flex-1 flex flex-col p-4 gap-2.5 min-h-0 max-w-full">
                <h3 className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-2.5">
                    Редактирование
                </h3>

                {/* История сообщений чата */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`px-2.5 py-2 rounded-md text-[11px] leading-relaxed border border-gray-200 max-w-[92%] ${
                                m.type === 'u'
                                    ? 'bg-gray-100 self-end text-gray-900'
                                    : 'bg-white self-start text-gray-500'
                            }`}
                        >
                            {m.text}
                        </div>
                    ))}

                    {/* Индикатор загрузки */}
                    {editLoading && (
                        <div className="px-2.5 py-2 rounded-md text-[11px] border border-gray-200 bg-white text-gray-400 self-start">
                            Применяю изменение...
                        </div>
                    )}
                </div>

                {/* Поле ввода и кнопка отправки */}
                <div className="flex gap-1.5 flex-shrink-0">
                    <input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendEdit()}
                        placeholder={result ? 'Что изменить...' : 'Сначала сгенерируй код'}
                        disabled={!result || editLoading}
                        className={`flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-[11px] outline-none font-sans transition-opacity ${
                            !result ? 'opacity-50' : 'opacity-100'
                        }`}
                    />
                    <button
                        onClick={sendEdit}
                        disabled={!result || editLoading}
                        className={`border-none rounded-md w-9 text-white text-sm transition-colors ${
                            !result || editLoading
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gray-900 hover:bg-gray-800 cursor-pointer'
                        }`}
                    >
                        ↑
                    </button>
                </div>
            </section>
        </div>
    )
}