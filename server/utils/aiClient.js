const axios = require('axios')

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = process.env.AI_MODEL

function cleanThinking(text) {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

async function callAIJson(messages, apiKey, model) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
        },
        body: JSON.stringify({
            model: model,
            messages,
            temperature: 0.2,
            response_format: { type: "json_object" }
        })
    })

    if (!response.ok) {
        const err = await response.json()
        throw new Error(`OpenRouter API error: ${err.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
}

async function callAICode(messages, apiKey, model) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
            messages,
            temperature: 0.4
        })
    })

    if (!response.ok) {
        const err = await response.json()
        throw new Error(`OpenRouter API error: ${err.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
}

module.exports = { callAIJson, callAICode }