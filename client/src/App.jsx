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
import {defaultModel} from "./constants/constants.js";

/**
 * Корневой компонент приложения ScreenCode
 *
 * Управляет:
 * - Клиентской маршрутизацией через React Router
 * - Глобальным состоянием генерации (через хук useGeneration)
 * - Состоянием аутентификации (через хук useAuth)
 * - Восстановлением генераций из истории
 *
 * Архитектурная роль:
 * - Хранит состояние, общее для всех панелей (стек, режим, API-ключ)
 * - Делегирует рендеринг дочерним компонентам через MainLayout
 * - Обеспечивает защиту маршрутов через компонент Navigate
 */
export default function App() {
    // ═══════════ Состояние настроек генерации ═══════════
    const [selectedStack, setSelectedStack] = useState('HTML + Tailwind')
    const [selectedMode, setSelectedMode] = useState('copy')
    const [showHistory, setShowHistory] = useState(false)

    // ═══════════ Состояние API-ключей (BYOK — Bring Your Own Key) ═══════════
    // Пользователь вводит свой ключ OpenRouter и имя модели в интерфейсе
    const [apiKey, setApiKey] = useState('')
    const [customModel, setCustomModel] = useState(defaultModel)

    // ═══════════ Хуки бизнес-логики ═══════════
    const { previewUrl, loading, result, error, handleFile, generate, handleCodeUpdate, reset, restoreResult } = useGeneration()
    const { user, authLoading, login, logout } = useAuth()
    const navigate = useNavigate()

    // ═══════════ Экран загрузки при проверке JWT-токена ═══════════
    if (authLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-500">
                Загрузка...
            </div>
        )
    }

    /**
     * Восстанавливает генерацию из истории по её ID
     *
     * Загружает полные данные генерации (включая содержимое файлов)
     * с сервера и передаёт их в хук useGeneration для отображения.
     *
     * @param {string} id - MongoDB ObjectId записи из истории
     */
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
            {/* ═══════════ Защищённые маршруты (требуют авторизации) ═══════════ */}
            <Route path="/account" element={
                user
                    ? <AccountPage user={user} onLogout={() => { logout(); reset(); }} />
                    : <Navigate to="/login" replace />
            } />

            {/* ═══════════ Маршруты аутентификации ═══════════ */}
            <Route path="/login" element={<AuthPage onLogin={login} defaultTab="login" />} />
            <Route path="/register" element={<AuthPage onLogin={login} defaultTab="register" />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />

            {/* ═══════════ Отладочная страница (для разработчиков) ═══════════ */}
            <Route path="/debug" element={<DebugPage />} />

            {/* ═══════════ Главная рабочая область ═══════════ */}
            <Route path="/" element={
                <MainLayout
                    // Данные генерации
                    previewUrl={previewUrl}
                    loading={loading}
                    result={result}
                    error={error}
                    handleFile={handleFile}
                    generate={generate}
                    handleCodeUpdate={handleCodeUpdate}

                    // Аутентификация и навигация
                    user={user}
                    logout={logout}
                    navigate={navigate}

                    // История генераций
                    showHistory={showHistory}
                    setShowHistory={setShowHistory}
                    restoreGeneration={restoreGeneration}

                    // Настройки генерации
                    selectedStack={selectedStack}
                    setSelectedStack={setSelectedStack}
                    selectedMode={selectedMode}
                    setSelectedMode={setSelectedMode}

                    // API-ключи (BYOK)
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    customModel={customModel}
                    setCustomModel={setCustomModel}
                />
            } />

            {/* ═══════════ Fallback: редирект всех неизвестных маршрутов на главную ═══════════ */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}