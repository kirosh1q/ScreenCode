import { stacks, models } from '../constants/constants.js'

/**
 * Левая панель настроек генерации
 *
 * Отвечает за:
 * - Загрузку скриншота (drag-and-drop + file input)
 * - Выбор технологического стека
 * - Ввод API-ключа OpenRouter и имени модели
 * - Переключение режима генерации (копия/шаблон)
 * - Запуск процесса генерации
 *
 * @param {Object} props
 * @param {string|null} props.previewUrl - URL предпросмотра загруженного изображения
 * @param {Function} props.onFile - Обработчик выбора/удаления файла
 * @param {boolean} props.loading - Флаг процесса генерации
 * @param {string} props.selectedStack - Выбранный стек
 * @param {Function} props.setSelectedStack - Сеттер стека
 * @param {string} props.selectedMode - Выбранный режим
 * @param {Function} props.setSelectedMode - Сеттер режима
 * @param {Function} props.onGenerate - Обработчик запуска генерации
 * @param {string|null} props.error - Текст ошибки (если есть)
 * @param {Object|null} props.user - Данные авторизованного пользователя
 * @param {string} props.apiKey - API-ключ OpenRouter
 * @param {Function} props.setApiKey - Сеттер API-ключа
 * @param {string} props.customModel - Имя модели
 * @param {Function} props.setCustomModel - Сеттер модели
 */
export default function LeftPanel({
                                      previewUrl, onFile, loading,
                                      selectedStack, setSelectedStack,
                                      selectedMode, setSelectedMode,
                                      onGenerate, error, user,
                                      apiKey, setApiKey, customModel, setCustomModel
                                  }) {
    /** Обработчик выбора файла через input[type="file"] */
    function handleChange(e) {
        const file = e.target.files[0]
        if (file) onFile(file)
    }

    /** Обработчик drag-and-drop для зоны загрузки */
    function handleDrop(e) {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) onFile(file)
    }

    /** Обработчик клика по кнопке "Сгенерировать" */
    function handleGenerateClick() {
        onGenerate(selectedStack, selectedMode, apiKey, customModel)
    }

    /** Флаг блокировки кнопки генерации */
    const isDisabled =
        loading ||
        !previewUrl ||
        !user ||
        !apiKey

    return (
        <div className="bg-white border-r border-gray-200 flex flex-col overflow-y-auto">

            {/* ═══════════ Блок: Загрузка скриншота ═══════════ */}
            <section className="p-4 border-b border-gray-100">
                <h3 className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-2.5">
                    Скриншот
                </h3>

                {!user ? (
                    <div className="border-[1.5px] border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 text-gray-400">
                        <div className="text-xs font-medium">Войдите в аккаунт</div>
                        <div className="text-[11px] mt-1">чтобы загрузить скриншот</div>
                    </div>
                ) : (
                    <>
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Превью скриншота"
                                className="w-full rounded-lg max-h-40 object-cover border border-gray-200"
                            />
                        ) : (
                            // Зона drag-and-drop
                            <label
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                className="block border-[1.5px] border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleChange}
                                    className="hidden"
                                />
                                <div className="text-xs text-gray-700 font-medium">Выбор файла</div>
                                <div className="text-[11px] text-gray-400 mt-0.5">PNG, JPG, WEBP</div>
                            </label>
                        )}

                        {previewUrl && (
                            <button
                                onClick={() => onFile(null)}
                                className="mt-1.5 text-[11px] text-red-500 hover:text-red-600 bg-transparent border-none cursor-pointer"
                            >
                                ✕ убрать
                            </button>
                        )}
                    </>
                )}
            </section>

            {/* ═══════════ Блок: Выбор стека ═══════════ */}
            <section className="p-4 border-b border-gray-100">
                <h3 className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-2.5">
                    Стек
                </h3>
                <div className="flex flex-col gap-1.5">
                    {stacks.map((stack) => {
                        const isSelected = selectedStack === stack
                        return (
                            <div
                                key={stack}
                                onClick={() => setSelectedStack(stack)}
                                className={`border-[1.5px] rounded-md py-2 px-3 cursor-pointer text-xs transition-colors ${
                                    isSelected
                                        ? 'border-gray-900 bg-gray-50 text-gray-900 font-medium'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {stack}
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ═══════════ Блок: Настройки AI (ключ + модель) ═══════════ */}
            <section className="p-4 border-b border-gray-100">
                <h3 className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-2.5">
                    Настройки AI (OpenRouter)
                </h3>
                <input
                    type="text"
                    placeholder="sk-or-v1-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 border-[1.5px] border-gray-200 rounded-md text-xs mb-2 outline-none focus:border-gray-400 transition-colors"
                />
                <input
                    type="text"
                    placeholder="qwen/qwen3.6-plus"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="w-full px-3 py-2 border-[1.5px] border-gray-200 rounded-md text-xs outline-none focus:border-gray-400 transition-colors"
                />
                <p className="text-[10px] text-gray-400 mt-1.5">
                    Ключ не сохраняется на сервере.
                </p>
            </section>

            {/* ═══════════ Блок: Режим генерации ═══════════ */}
            <section className="p-4 border-b border-gray-100">
                <h3 className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-2.5">
                    Режим
                </h3>
                <div className="flex bg-gray-100 rounded-md p-0.5 gap-0.5">
                    {models.map(({ value, label }) => {
                        const isSelected = selectedMode === value
                        return (
                            <button
                                key={value}
                                onClick={() => setSelectedMode(value)}
                                className={`flex-1 py-1.5 px-2 border-none rounded text-[11px] cursor-pointer transition-all ${
                                    isSelected
                                        ? 'bg-white text-gray-900 font-medium shadow-sm'
                                        : 'bg-transparent text-gray-500 font-normal hover:text-gray-700'
                                }`}
                            >
                                {label}
                            </button>
                        )
                    })}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                    {models.find((m) => m.value === selectedMode)?.description}
                </p>
            </section>

            {/* ═══════════ Блок: Кнопка генерации ═══════════ */}
            <section className="p-4 mt-auto">
                {error && (
                    <div className="text-[11px] text-red-500 bg-red-50 py-2 px-3 rounded-md mb-2.5">
                        {error}
                    </div>
                )}
                <button
                    onClick={handleGenerateClick}
                    disabled={isDisabled}
                    className={`w-full py-2.5 border-none rounded-lg text-[13px] font-medium transition-colors ${
                        isDisabled
                            ? 'bg-gray-300 text-white cursor-not-allowed'
                            : 'bg-gray-900 text-white hover:bg-gray-800 cursor-pointer'
                    }`}
                >
                    {loading ? 'Генерирую...' : 'Сгенерировать'}
                </button>
            </section>
        </div>
    )
}