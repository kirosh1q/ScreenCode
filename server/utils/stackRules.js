function getStackRules(stack, mode) {
    if (stack === 'HTML + Tailwind') {
        return `- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Return complete HTML5 starting with <!DOCTYPE html>
- Use only Tailwind utility classes`
    }
    if (stack === 'HTML + CSS') {
        return `- Use plain HTML5 with custom CSS in a <style> tag in <head>
- Do NOT use Tailwind or any CSS framework
- Return complete HTML5 starting with <!DOCTYPE html>`
    }
    if (stack === 'React + Tailwind') {
        return `- Return ONLY React functional component(s), export default App
- Use Tailwind className, no CDN needed
- No <html>/<body>/<!DOCTYPE> tags
- You MAY use inline <style> blocks for effects Tailwind cannot express
- For images use <img> tags with real URLs, NOT placeholder divs
- All interactive elements must have: className="... cursor-pointer hover:opacity-80"
- Active/selected tab must have visually distinct style
- Use plain JavaScript (JSX), NOT TypeScript — no type annotations, no React.FC
`
    }
    return ''
}

module.exports = { getStackRules }