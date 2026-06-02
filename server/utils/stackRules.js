function getStackRules(stack, mode) {
    if (stack === 'HTML + Tailwind') {
        return `
- Include Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Return complete HTML5 starting with <!DOCTYPE html>
- Use ONLY Tailwind utility classes for styling
- For responsive: use md:, lg:, xl: prefixes
`
    }
    if (stack === 'HTML + CSS') {
        return `
- Return complete HTML5 starting with <!DOCTYPE html>
- Put ALL CSS inside <style> tag in <head>
- Use semantic class names (.header, .card, .btn)
- Use CSS variables for colors: :root { --bg: #fff; --text: #000; }
- Use flexbox/grid for layout
- Make responsive with @media queries
- NEVER use Tailwind classes or inline style="..."
`
    }
    if (stack === 'React + Tailwind') {
        return `
- Return ONLY React functional component(s), export default App
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