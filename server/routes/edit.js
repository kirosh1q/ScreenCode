const express = require('express')
const router = express.Router()
const { parseFiles } = require('../utils/fileParser')

router.post('/', async (req, res) => {
    try {
        const { currentCode, editPrompt, allFiles, apiKey, model } = req.body

        if (!editPrompt) {
            return res.status(400).json({ error: 'Нет инструкции' })
        }

        if (!apiKey) {
            return res.status(400).json({ error: 'Не указан API ключ OpenRouter' })
        }

        const finalModel = model || 'qwen/qwen3.6-plus'

        // Если есть несколько файлов — передаём все в модель
        const codeContext = allFiles?.length > 1
            ? allFiles.map(f => `// FILE: ${f.name}\n${f.content}`).join('\n\n---\n\n')
            : currentCode

        if (!codeContext) {
            return res.status(400).json({ error: 'Нет кода' })
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: finalModel,
                messages: [{
                    role: 'user',
                    content: allFiles?.length > 1
                        ? `Here are the current files:\n\n${codeContext}\n\nApply this change: ${editPrompt}\n\nReturn ALL files in the same format:\n// FILE: filename.jsx\n[code]\n\n---\n\n// FILE: App.jsx\n[code]\n\nReturn ONLY the files, no explanations, no markdown backticks.`
                        : `Here is the current code:\n\`\`\`\n${codeContext}\n\`\`\`\n\nApply this change: ${editPrompt}\n\nReturn ONLY the complete updated code, no explanations, no markdown backticks.`
                }]
            })
        })

        if (!response.ok) {
            const err = await response.json()
            throw new Error(`OpenRouter API error: ${err.error?.message || response.statusText}`)
        }

        const data = await response.json()
        let updatedCode = data.choices[0].message.content
        updatedCode = updatedCode.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        updatedCode = updatedCode.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '').trim()

        console.log('=== EDIT RESPONSE ===')
        console.log('updatedCode length:', updatedCode.length)
        console.log('allFiles count:', allFiles?.length)

        if (allFiles?.length > 1) {
            const fileRegex = /\/\/ FILE:\s*(\S+)\s*\n([\s\S]*?)(?=\n\s*---\s*\n\s*\/\/ FILE:|$)/g
            const files = []
            let match
            while ((match = fileRegex.exec(updatedCode)) !== null) {
                const content = match[2].trim()
                if (content.length > 0) {
                    files.push({ name: match[1], content })
                }
            }

            if (files.length > 0) {
                return res.json({ success: true, files })
            }
        }

        res.json({ success: true, code: updatedCode })

    } catch (error) {
        console.error('Ошибка edit:', error.message)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router