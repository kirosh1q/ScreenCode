module.exports = (hasRepeatingBlocks, analysis, stack = 'React + Tailwind') => {
    const isReact = stack.includes('React')
    const isTailwind = stack.includes('Tailwind')
    const isPlainCSS = stack === 'HTML + CSS'

    return `
MODE: DEVELOPER TEMPLATE
GOAL: Reproduce visual structure accurately, replace all real data with generic placeholders.

CRITICAL: You MUST use file markers. Without them your response is invalid.
CRITICAL: Use only the languages that you see in the image. IF U SEE RUSSIAN SYMBOLS - USE RUSSIAN SIMBOLS. IF U SEE ENGLISH - USE ENGLISH.
CRITICAL: If the input appears to be a hand-drawn sketch or wireframe, create a polished professional design. Do NOT replicate grid paper, 
CRITICAL: If the colors of the text are pencil/pen, Use black color for the Text.
CRITICAL: Do the best you can from the design side while preserving the structure from the drawing
CRITICAL: Never try to reproduce a website in a hand-drawn style!

═══ FILE STRUCTURE ═══
${isReact ? `
EXAMPLE OF CORRECT OUTPUT:
// @@FILE:StreamCard.jsx
export default function StreamCard({ title, viewers }) { ... }

// @@FILE:App.jsx
import StreamCard from './StreamCard'
export default function App() { return <StreamCard title="Stream Title" viewers="0" /> }

- Every file: // @@FILE:Name.jsx
- Last file MUST be: // @@FILE:App.jsx
- All components defined BEFORE App
- Export as: export default function ComponentName({ props }) { ... }
` : `
EXAMPLE OF CORRECT OUTPUT:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Title</title>
  ${isTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : '<style>/* custom CSS */</style>'}
</head>
<body>
  <!-- content here -->
</body>
</html>

- Return single complete HTML5 file
- Include all CSS in <style> tag (if plain CSS) or use Tailwind CDN classes
`}

═══ VISUAL PRIORITY (most important) ═══
1. Match layout, spacing, proportions from ALL provided images
2. Preserve large top padding / empty space if visible
3. DO NOT add dark overlays unless clearly visible in ALL images
4. Keep contrast high — do not flatten to uniform dark

═══ IMAGES ═══
You are receiving 4 images of the SAME page:
- Image 1: full screenshot WITH grid — use for layout, structure, element proportions
- Image 2: top section (0-30% of page height) — header details
- Image 3: middle section (30-60% of page height) — content details
- Image 4: bottom section (60-100% of page height) — footer/panel details
Always use Image 1 as reference for element sizes and proportions — NOT the crops

═══ GRID COORDINATES ═══
Image 1 has a coordinate grid: columns A-L (left→right), rows 1-9 (top→bottom)
- Each column ≈ 8% of viewport width
- Each row ≈ 11% of viewport height
Use grid to position elements precisely: "Panel starts at row 7" → top: ~65%

═══ PLACEHOLDER RULES ═══
Replace ALL real content with generic placeholders:
- Navigation items → "Nav Item 1", "Nav Item 2"
- News headlines → "News Title 1", "News Title 2"
- Descriptions → "Description text goes here"
- Authors/names → "Author Name"
- Dates/times → "Jan 1", "2 hours ago"
- Numbers/stats → "0", "000"
- Prices → "$0.00"
- Tab labels → "Tab 1", "Tab 2"
- Location → "City Name"
- Temperature → "00°"
- Buttons with functional text (Submit, Save, Cancel) → keep as-is

═══ BACKGROUND ═══
- Photo → https://source.unsplash.com/1920x1080/?[scene_keywords]
- Apply as: background-image: url(...); background-size: cover; background-position: center
- background_type: ${analysis.background_type || 'solid'}
${analysis.background_type === 'photo'
        ? `- Covers ${analysis.background_coverage || '60%'} of screen height`
        : `- Use color: ${analysis.exact_colors?.background || '#0a0a0a'}`}

═══ IMAGES IN CONTENT ═══
- Content images → https://placehold.co/WxH/2a2a2a/666666 (match proportions from Image 1)
- Avatars → https://placehold.co/48x48/2a2a2a/666666
- Brand logos → SVG (structural, keep as-is)

═══ COLORS ═══
- Background: ${analysis.exact_colors?.background || '#0a0a0a'}
- Surface/cards: ${analysis.exact_colors?.surface || '#1a1a1a'}
- Text: ${analysis.exact_colors?.text || '#ffffff'}
- Accent: ${analysis.exact_colors?.accent || '#0078d4'}

═══ COMPONENTS ═══
Repeating pattern: ${hasRepeatingBlocks ? 'YES' : 'NO'}
${hasRepeatingBlocks
        ? isReact
            ? `- Create ONE React component for the repeating element with props
- Show ONE rendered example in App.jsx
- Add: {/* TODO: replace with .map() over your data array */}`
            : `- Create a reusable HTML structure for the repeating element
- Show ONE example in the main HTML
- Add comment: <!-- TODO: repeat this block for each item -->`
        : `- No repeating pattern — implement full layout`}

${isReact ? `
═══ REACT CODE QUALITY ═══
ANY list of similar elements MUST use .map() — NEVER hardcode them one by one.
This applies to: nav links, menu items, tabs, icon rows, footer columns, tag lists,
breadcrumbs, pagination — any 3+ similar elements.

WRONG (forbidden):
<a href="#">Nav Item 1</a>
<a href="#">Nav Item 2</a>
<a href="#">Nav Item 3</a>

CORRECT:
const navLinks = ['Nav Item 1', 'Nav Item 2', 'Nav Item 3']
{navLinks.map(link => <a key={link} href="#">{link}</a>)}

Every data array must be defined OUTSIDE the return() — at the top of the component.
` : ''}

${isReact ? `
═══ COMPONENT PROPS RULES ═══
- Every reusable component MUST accept props for dynamic content
- Prop names must be descriptive: { title, imageUrl, onClick, isActive } — NOT { prop1, data }
- For repeating patterns, use array prop: { items: [{ id, title, description }] }
- Default values: strings → "", numbers → 0, booleans → false, arrays → []
- Export components as: export default function ComponentName({ props }) { ... }
` : ''}

${isTailwind ? `
═══ TAILWIND & RESPONSIVENESS ═══
- Use mobile-first approach: base styles for mobile, md:/lg: for larger screens
- For grids: use grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pattern
- For spacing: use responsive padding/margin: p-4 md:p-6 lg:p-8
- NEVER use arbitrary values like w-[347px] — use Tailwind's scale or %/vw/vh
- For images: always add className="w-full h-auto object-cover"
${isReact ? `- Use className prop for Tailwind classes, NOT style attribute` : ''}
` : ''}

${isPlainCSS ? `
═══ PLAIN CSS RULES ═══
- Write all CSS inside a <style> tag in <head>
- Use semantic class names: .header, .card, .nav-item, .btn-primary
- Use CSS variables for colors: --bg-color, --text-color, --accent-color
- Use flexbox/grid for layout
- Make responsive with @media queries: @media (min-width: 768px) { ... }
- NEVER use inline style="..." attributes — use classes only
` : ''}

═══ STRICT PROHIBITIONS ═══
- DO NOT include markdown code blocks (\`\`\`jsx, \`\`\`html)
- DO NOT add explanations, comments about the code, or thinking process
${isReact ? `- DO NOT use TypeScript syntax (no : type annotations, no interfaces, no React.FC)` : ''}
${isPlainCSS ? `- DO NOT use Tailwind classes or any CSS framework — plain CSS only` : ''}
${!isPlainCSS ? `- DO NOT import external CSS files — all styles must be inline or Tailwind classes` : ''}
${isReact ? `- DO NOT generate <html>, <head>, <body> tags for component files (only for App.jsx if stack is HTML)` : ''}
- DO NOT use placeholder text like "Lorem ipsum" — use the specific placeholders listed above

═══ CRITICAL RULES (MOST IMPORTANT) ═══
1. Use file markers: // @@FILE:Name.jsx ${isReact ? '(for React)' : '(for HTML: return single file)'}
2. ${isReact ? 'Last file MUST be App.jsx' : 'Return single complete HTML file'}
3. NO markdown, NO explanations${isReact ? ', NO TypeScript' : ''}
4. Use placeholders from PLACEHOLDER RULES section
5. Return ONLY code

Return ONLY the code. Nothing else.
`
}