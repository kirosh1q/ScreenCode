import LeftPanel from './LeftPanel.jsx'
import CenterPanel from './CenterPanel.jsx'
import RightPanel from './RightPanel.jsx'
import HistoryDrawer from './HistoryDrawer.jsx'

export default function MainLayout({
                                       previewUrl, loading, result, error,
                                       handleFile, generate, handleCodeUpdate,
                                       user, logout, navigate,
                                       showHistory, setShowHistory, restoreGeneration,
                                       selectedStack, setSelectedStack,
                                       selectedModel, setSelectedModel,
                                       selectedMode, setSelectedMode,
                                       apiKey, setApiKey, customModel, setCustomModel // ← ДОБАВИТЬ
                                   }) {
    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-x-hidden">
            {/* Header */}
            <header className="h-[52px] bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0">
                <div className="font-semibold text-[15px] text-gray-900">ScreenCode</div>
                <div className="flex items-center gap-2">
                    {user ? (
                        <>
                            <span className="text-xs text-gray-500 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => navigate('/account')}>
                                {user.login}
                            </span>
                            <button className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors" onClick={() => setShowHistory(true)}>
                                История
                            </button>
                            <button className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors" onClick={() => logout()}>
                                Выйти
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors" onClick={() => navigate('/login')}>
                                Войти
                            </button>
                            <button className="px-3 py-1 text-xs bg-gray-900 text-white border border-gray-900 rounded-md hover:bg-gray-800 transition-colors" onClick={() => navigate('/register')}>
                                Регистрация
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Main Grid */}
            <div className={`flex-1 overflow-hidden grid ${result ? 'grid-cols-[280px_1fr_300px]' : 'grid-cols-[280px_1fr]'}`}>
                <LeftPanel
                    previewUrl={previewUrl}
                    onFile={handleFile}
                    loading={loading}
                    selectedStack={selectedStack}
                    setSelectedStack={setSelectedStack}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
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
                <CenterPanel loading={loading} result={result} onCodeUpdate={handleCodeUpdate} />
                {result && <RightPanel result={result} onCodeUpdate={handleCodeUpdate} apiKey={apiKey} model={customModel} />}
            </div>

            <HistoryDrawer
                open={showHistory}
                onClose={() => setShowHistory(false)}
                onRestore={restoreGeneration}
            />
        </div>
    )
}