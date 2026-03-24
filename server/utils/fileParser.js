function parseFiles(generatedCode) {
    const componentRegex = /\/\/\s*@@FILE:\s*(\w+\.jsx)\s*\r?\n([\s\S]*?)(?=\/\/\s*@@FILE:|$)/g
    const files = []
    let match

    while ((match = componentRegex.exec(generatedCode)) !== null) {
        const content = match[2].trim()
        if (content.length > 0) {
            files.push({ name: match[1].trim(), content })
        }
    }

    if (files.length > 0 && !files.find(f => f.name === 'App.jsx')) {
        const appIndex = files.findIndex(f =>
            f.content.includes('export default App') ||
            f.content.includes('function App') ||
            f.content.includes('const App')
        )
        const targetIndex = appIndex !== -1 ? appIndex : files.length - 1
        files[targetIndex].name = 'App.jsx'
    }

    return files
}

module.exports = { parseFiles }