import LeftPanel from './LeftPanel.jsx'
import CenterPanel from './CenterPanel.jsx'
import RightPanel from './RightPanel.jsx'
import HistoryDrawer from './HistoryDrawer.jsx'

/**
 * Основной макет рабочей области приложения
 *
 * Компонент-оболочка, организующий трёхпанельный интерфейс:
 * - Header с навигацией и управлением аккаунтом
 * - Левая панель (LeftPanel) — настройки генерации
 * - Центральная панель (CenterPanel) — редактор кода и превью
 * - Правая панель (RightPanel) — анализ структуры и чат-редактирование
 * - Выдвижная панель истории (HistoryDrawer)
 *
 * Не содержит собственной бизнес-логики — только оркестрирует
 * передачу пропсов между родительским App и дочерними панелями.
 *
 * @param {Object} props
 *
 * @param {string|null} props.previewUrl - URL предпросмотра загруженного изображения
 * @param {boolean} props.loading - Флаг процесса генерации
 * @param {Object|null} props.result - Результат генерации (секции, цвета, файлы)
 * @param {string|null} props.error - Текст ошибки генерации
 *
 * @param {Function} props.handleFile - Обработчик выбора/удаления файла
 * @param {Function} props.generate - Функция запуска генерации (stack, mode, apiKey, model)
 * @param {Function} props.handleCodeUpdate - Обработчик редактирования кода
 *
 * @param {Object|null} props.user - Данные авторизованного пользователя
 * @param {Function} props.logout - Функция выхода из аккаунта
 * @param {Function} props.navigate - Функция навигации React Router
 *
 * @param {boolean} props.showHistory - Флаг открытия панели истории
 * @param {Function} props.setShowHistory - Сеттер флага истории
 * @param {Function} props.restoreGeneration - Функция восстановления генерации по ID
 *
 * @param {string} props.selectedStack - Выбранный технологический стек
 * @param {Function} props.setSelectedStack - Сеттер стека
 * @param {string} props.selectedMode - Выбранный режим генерации
 * @param {Function} props.setSelectedMode - Сеттер режима
 *
 * @param {string} props.apiKey - API-ключ OpenRouter (пользовательский)
 * @param {Function} props.setApiKey - Сеттер API-ключа
 * @param {string} props.customModel - Имя модели для генерации
 * @param {Function} props.setCustomModel - Сеттер имени модели
 */
export default function MainLayout({
                                       // Данные генерации
                                       previewUrl, loading, result, error,
                                       handleFile, generate, handleCodeUpdate,

                                       // Аутентификация и навигация
                                       user, logout, navigate,

                                       // История генераций
                                       showHistory, setShowHistory, restoreGeneration,

                                       // Настройки генерации
                                       selectedStack, setSelectedStack,
                                       selectedMode, setSelectedMode,

                                       // API-ключи (BYOK — Bring Your Own Key)
                                       apiKey, setApiKey,
                                       customModel, setCustomModel
                                   }) {
    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-x-hidden">

            {/* ═══════════════════════════════════════════════════════
                HEADER — Шапка приложения с логотипом и навигацией
                ═══════════════════════════════════════════════════════ */}
            <header className="h-[52px] bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0">

                {/* Логотип / название приложения */}
                <div className="font-semibold text-[15px] text-gray-900">
                    ScreenCode
                </div>

                {/* Навигационные кнопки (зависят от статуса авторизации) */}
                <div className="flex items-center gap-2">
                    {user ? (
                        // ── Авторизованный пользователь ──
                        <>
                            {/* Переход в личный кабинет по клику на логин */}
                            <span
                                className="text-xs text-gray-500 cursor-pointer hover:text-gray-900 transition-colors"
                                onClick={() => navigate('/account')}
                            >
                                {user.login}
                            </span>

                            <button
                                className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
                                onClick={() => setShowHistory(true)}
                            >
                                История
                            </button>

                            <button
                                className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                onClick={() => logout()}
                            >
                                Выйти
                            </button>
                        </>
                    ) : (
                        // ── Неавторизованный пользователь ──
                        <>
                            <button
                                className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
                                onClick={() => navigate('/login')}
                            >
                                Войти
                            </button>

                            <button
                                className="px-3 py-1 text-xs bg-gray-900 text-white border border-gray-900 rounded-md hover:bg-gray-800 transition-colors"
                                onClick={() => navigate('/register')}
                            >
                                Регистрация
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════
                MAIN GRID — Трёхпанельная рабочая область

                Динамическая сетка:
                - Без результата: 2 колонки (настройки + код)
                - С результатом: 3 колонки (настройки + код + анализ/чат)
                ═══════════════════════════════════════════════════════ */}
            <div className={`flex-1 overflow-hidden grid ${
                result
                    ? 'grid-cols-[280px_1fr_300px]'
                    : 'grid-cols-[280px_1fr]'
            }`}>

                {/* Левая панель: настройки генерации */}
                <LeftPanel
                    previewUrl={previewUrl}
                    onFile={handleFile}
                    loading={loading}
                    selectedStack={selectedStack}
                    setSelectedStack={setSelectedStack}
                    selectedMode={selectedMode}
                    setSelectedMode={setSelectedMode}
                    onGenerate={() => generate(selectedStack, selectedMode, apiKey, customModel)}
                    error={error}
                    user={user}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    customModel={customModel}
                    setCustomModel={setCustomModel}
                />

                {/* Центральная панель: редактор кода и превью */}
                <CenterPanel
                    loading={loading}
                    result={result}
                    onCodeUpdate={handleCodeUpdate}
                />

                {/* Правая панель: появляется только после завершения генерации */}
                {result && (
                    <RightPanel
                        result={result}
                        onCodeUpdate={handleCodeUpdate}
                        apiKey={apiKey}
                        model={customModel}
                    />
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════
                HISTORY DRAWER — Выдвижная панель истории генераций
                Рендерится всегда, но виден только при open=true
                ═══════════════════════════════════════════════════════ */}
            <HistoryDrawer
                open={showHistory}
                onClose={() => setShowHistory(false)}
                onRestore={restoreGeneration}
            />
        </div>
    )
}