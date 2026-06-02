import { useState } from 'react'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { useGeneration } from './hooks/useGeneration.js'
import { useAuth } from './hooks/useAuth.js'
import CenterPanel from './components/CenterPanel.jsx'
import RightPanel from './components/RightPanel.jsx'
import LeftPanel, { stacks, models } from './components/LeftPanel.jsx'
import AuthPage from './pages/AuthPage.jsx'
import HistoryDrawer from './components/HistoryDrawer.jsx'
import AccountPage from './pages/AccountPage.jsx'

import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import ConfirmEmailPage from './pages/ConfirmEmailPage.jsx'

import DebugPage from './pages/DebugPage.jsx' //test

export default function App() {
    const [selectedStack, setSelectedStack] = useState(stacks[0])
    const [selectedModel, setSelectedModel] = useState(models[0])
    const [selectedMode, setSelectedMode] = useState('copy')
    const [showHistory, setShowHistory] = useState(false)

    const { previewUrl, loading, result, error, handleFile, generate, handleCodeUpdate, reset, restoreResult } = useGeneration()
    const { user, authLoading, login, logout } = useAuth()
    const navigate = useNavigate()

    if (authLoading) return <div>Загрузка...</div>

    function handleNavigate(path) {
        reset()
        navigate(path)
    }

    async function restoreGeneration(id) {
        const token = localStorage.getItem('token')
        const res = await fetch(`http://localhost:3001/api/history/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
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
                user ? <AccountPage user={user} onLogout={() => logout(reset)} /> : <Navigate to="/login" replace />
            } />
            <Route path="/login" element={<AuthPage onLogin={login} defaultTab="login" />} />
            <Route path="/register" element={<AuthPage onLogin={login} defaultTab="register" />} />

            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />

            <Route path="/" element={
                <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Inter, sans-serif', background: '#f8f9fa', overflowX: 'hidden' }}>

                    <header style={{ height: 52, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}> ScreenCode</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {user ? (
                                <>
                                    <span style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer' }} onClick={() => navigate('/account')}>{user.login}</span>
                                    <button style={btnGhost} onClick={() => setShowHistory(true)}>История</button>
                                    <button style={btnGhost} onClick={() => logout(reset)}>Выйти</button>
                                </>
                            ) : (
                                <>
                                    <button style={btnGhost} onClick={() => handleNavigate('/login')}>Войти</button>
                                    <button style={btnSolid} onClick={() => handleNavigate('/register')}>Регистрация</button>
                                </>
                            )}
                        </div>
                    </header>

                    <div style={{ display: 'grid', gridTemplateColumns: result ? '280px 1fr 300px' : '280px 1fr', flex: 1, overflow: 'hidden' }}>
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
                            onGenerate={() => generate(selectedStack, selectedMode)}
                            error={error}
                            user={user}
                        />
                        <CenterPanel loading={loading} result={result} onCodeUpdate={handleCodeUpdate} />
                        {result && <RightPanel result={result} onCodeUpdate={handleCodeUpdate} />}
                    </div>

                    <HistoryDrawer
                        open={showHistory}
                        onClose={() => setShowHistory(false)}
                        onRestore={restoreGeneration}
                    />
                </div>
            } />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

const btnGhost = {
    background: 'none', border: '1px solid #e5e7eb', color: '#555',
    padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer'
}
const btnSolid = {
    background: '#111', border: '1px solid #111', color: '#fff',
    padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer'
}