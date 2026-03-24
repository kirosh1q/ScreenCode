import { useState } from 'react'

export function useGeneration() {
    const [file, setFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

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

    async function generate(selectedStack, selectedMode) {
        if (!file) return setError('Выбери скриншот')
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const form = new FormData()
            form.append('image', file)
            form.append('stack', selectedStack)
            form.append('mode', selectedMode)

            const res = await fetch('http://localhost:3001/api/generate', {
                method: 'POST',
                body: form
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Ошибка сервера')
            setResult(data.data)

            const token = localStorage.getItem('token')
            if (token) {
                fetch('http://localhost:3001/api/history', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
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

    function handleCodeUpdate(newCode, newFiles) {
        if (newFiles?.length > 0) {
            setResult(prev => ({
                ...prev,
                generatedHTML: newFiles.find(f => f.name === 'App.jsx')?.content || newFiles[0].content,
                files: newFiles
            }))
        } else {
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
    function reset() {
        setFile(null)
        setPreviewUrl(null)
        setResult(null)
        setError(null)
    }

    function restoreResult(data) {
        setResult(data)
    }

    return { file, previewUrl, loading, result, error, handleFile, generate, handleCodeUpdate, reset, restoreResult }
}