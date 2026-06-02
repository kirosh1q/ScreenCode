import { useState } from 'react'
import { apiFetch } from '../api'

export function useGeneration() {
    const [previewUrl, setPreviewUrl] = useState(null)
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    function handleFile(f) {
        if (!f) {
            setPreviewUrl(null)
            setFile(null)
            return
        }
        setFile(f)
        setPreviewUrl(URL.createObjectURL(f))
        setError(null)
    }

    async function generate(stack, mode, apiKey, model) {
        if (!file) return
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('image', file)
            formData.append('stack', stack)
            formData.append('mode', mode)
            formData.append('apiKey', apiKey)
            formData.append('model', model)

            const res = await apiFetch('/api/generate', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Ошибка генерации')

            setResult(data)
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