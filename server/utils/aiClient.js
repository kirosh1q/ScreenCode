const axios = require('axios')

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = process.env.AI_MODEL

function cleanThinking(text) {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

// для запросов которые должны вернуть JSON
async function callAIJson(messages, timeout = 60000) {
    const response = await axios.post(
        OPENROUTER_URL,
        { model: MODEL, messages },
        {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout
        }
    )
    const usage = response.data.usage
    if (usage) {
        console.log(`[Pass 1] Токены: prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}, total=${usage.total_tokens}`)
    }

    let text = response.data.choices[0].message.content

    if (!text) {
        console.log('Полный ответ от API:', JSON.stringify(response.data, null, 2))
        throw new Error('Модель вернула пустой ответ в Pass 2')
    }
    text = cleanThinking(text)
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return text
}

// для запросов которые должны вернуть HTML/код
async function callAICode(messages, timeout = 300000) {
    const response = await axios.post(
        OPENROUTER_URL,
        { model: MODEL, messages, stream: true, temperature: 0.3 },
        {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout,
            responseType: 'stream'
        }
    )

    return new Promise((resolve, reject) => {
        let fullText = ''
        const timer = setTimeout(() => reject(new Error('Stream timeout')), timeout)

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(l => l.trim())
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                    const parsed = JSON.parse(data)
                    const delta = parsed.choices?.[0]?.delta?.content
                    if (delta) fullText += delta
                } catch {}
            }
        })

        response.data.on('end', () => {
            clearTimeout(timer)
            console.log(`[Pass 2] Стрим завершён, длина ответа: ${fullText.length} символов`)
            let text = cleanThinking(fullText)
            text = text.replace(/```html\n?/g, '').replace(/```jsx?\n?/g, '').replace(/```\n?/g, '').trim()
            text = text.replace(/<\/body>\s*<\/body>/gi, '</body>')
            text = text.replace(/<\/html>\s*<\/html>/gi, '</html>')
            resolve(text)
        })

        response.data.on('error', (err) => {
            clearTimeout(timer)
            reject(err)
        })
    })
}

module.exports = { callAIJson, callAICode }