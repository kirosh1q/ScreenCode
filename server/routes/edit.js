const express = require('express')
const router = express.Router()
const axios = require('axios')

router.post('/', async (req, res) => {
    try {
        const { currentCode, editPrompt, allFiles } = req.body

        if (!editPrompt) {
            return res.status(400).json({ error: 'Нет инструкции' })
        }

        // Если есть несколько файлов — передаём все в модель
        const codeContext = allFiles?.length > 1
            ? allFiles.map(f => `// FILE: ${f.name}\n${f.content}`).join('\n\n---\n\n')
            : currentCode

        if (!codeContext) {
            return res.status(400).json({ error: 'Нет кода' })
        }

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: process.env.AI_MODEL,
                messages: [{
                    role: 'user',
                    content: allFiles?.length > 1
                        ? `Here are the current files:\n\n${codeContext}\n\nApply this change: ${editPrompt}\n\nReturn ALL files in the same format:\n// FILE: filename.jsx\n[code]\n\n---\n\n// FILE: App.jsx\n[code]\n\nReturn ONLY the files, no explanations, no markdown backticks.`
                        : `Here is the current code:\n\`\`\`\n${codeContext}\n\`\`\`\n\nApply this change: ${editPrompt}\n\nReturn ONLY the complete updated code, no explanations, no markdown backticks.`
                }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            }
        )

        let updatedCode = response.data.choices[0].message.content
        updatedCode = updatedCode.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        updatedCode = updatedCode.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '').trim()

        // Парсим обратно в файлы если их несколько
        console.log('=== EDIT RESPONSE ===')
        console.log('updatedCode length:', updatedCode.length)
        console.log('first 500 chars:', updatedCode.slice(0, 500))
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