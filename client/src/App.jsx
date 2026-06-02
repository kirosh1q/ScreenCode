import { useState } from 'react'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { useGeneration } from './hooks/useGeneration.js'
import { useAuth } from './hooks/useAuth.js'
import { apiFetch } from './api.js'
import MainLayout from './components/MainLayout.jsx'
import AuthPage from './pages/AuthPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import ConfirmEmailPage from './pages/ConfirmEmailPage.jsx'
import DebugPage from './pages/DebugPage.jsx'

export default function App() {
    // Состояние интерфейса
    const [selectedStack, setSelectedStack] = useState('HTML + Tailwind')
    const [selectedModel, setSelectedModel] = useState('qwen/qwen3.6-plus')
    const [selectedMode, setSelectedMode] = useState('copy')
    const [showHistory, setShowHistory] = useState(false)

    // ← ДОБАВИТЬ: Состояние для API ключа и модели
    const [apiKey, setApiKey] = useState('')
    const [customModel, setCustomModel] = useState('qwen/qwen3.6-plus')

    const { previewUrl, loading, result, error, handleFile, generate, handleCodeUpdate, reset, restoreResult } = useGeneration()
    const { user, authLoading, login, logout } = useAuth()
    const navigate = useNavigate()

    if (authLoading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-500">Загрузка...</div>

    async function restoreGeneration(id) {
        const res = await apiFetch(`/api/history/${id}`)
        const data = await res.json()
        restoreResult({
            layout: data.layout,
            sections: data.sections,
            colors: data.colors,
            files: data.files,
            generatedHTML: data.files?.[0]?.content || ''
        })
    }

    return (
        <Routes>
            <Route path="/account" element={
                user ? <AccountPage user={user} onLogout={() => { logout(); reset(); }} /> : <Navigate to="/login" replace />
            } />
            <Route path="/login" element={<AuthPage onLogin={login} defaultTab="login" />} />
            <Route path="/register" element={<AuthPage onLogin={login} defaultTab="register" />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />
            <Route path="/debug" element={<DebugPage />} />

            <Route path="/" element={
                <MainLayout
                    previewUrl={previewUrl}
                    loading={loading}
                    result={result}
                    error={error}
                    handleFile={handleFile}
                    generate={generate}
                    handleCodeUpdate={handleCodeUpdate}
                    user={user}
                    logout={logout}
                    navigate={navigate}
                    showHistory={showHistory}
                    setShowHistory={setShowHistory}
                    restoreGeneration={restoreGeneration}
                    selectedStack={selectedStack}
                    setSelectedStack={setSelectedStack}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    selectedMode={selectedMode}
                    setSelectedMode={setSelectedMode}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    customModel={customModel}
                    setCustomModel={setCustomModel}
                />
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}