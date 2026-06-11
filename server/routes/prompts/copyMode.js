module.exports = (stack = 'React + Tailwind', hasRepeatingBlocks = false) => `
MODE: PIXEL-PERFECT COPY
GOAL: Reproduce the screenshot as accurately as possible — almost 1:1 visual match.

═══ OUTPUT FORMAT BY STACK ═══
${stack === 'React + Tailwind' ? `
- Split code into separate component files using markers:
  // @@FILE:ComponentName.jsx
  export default function ComponentName() { ... }
  
- Last file MUST be: // @@FILE:App.jsx
- All components defined BEFORE App.jsx
- Import components in App.jsx: import ComponentName from './ComponentName'
` : `
- Return single complete file:
  • HTML + Tailwind: <!DOCTYPE html> with <script src="https://cdn.tailwindcss.com">
  • HTML + CSS: <!DOCTYPE html> with <style> tag in <head>
- No file markers needed for HTML stacks
`}

CRITICAL: You MUST use file markers. Without them your response is invalid.
CRITICAL: Use only the languages that you see in the image. IF U SEE RUSSIAN SYMBOLS - USE RUSSIAN SIMBOLS. IF U SEE ENGLISH - USE ENGLISH.
CRITICAL: If the input appears to be a hand-drawn sketch or wireframe, create a polished professional design. Do NOT replicate grid paper, 
CRITICAL: If the colors of the text are pencil/pen, Use black color for the Text.
CRITICAL: Do the best you can from the design side while preserving the structure from the drawing
CRITICAL: Never try to reproduce a website in a hand-drawn style!


═══ VISUAL PRIORITY (most important) ═══
1. Final result MUST match brightness, spacing, proportions from ALL provided images
2. Large top padding / empty space above header — DO NOT remove it
3. DO NOT add dark overlays or dark theme unless clearly visible in ALL images
4. Background photo — NEVER replace with solid color or gradient

═══ IMAGES ═══
You are receiving 4 images of the SAME page:
- Image 1: full screenshot WITH grid — use for layout, structure, element proportions
- Image 2: top section (0-30% of page height) — header details (crop)
- Image 3: middle section (30-60% of page height) — content details (crop)
- Image 4: bottom section (60-100% of page height) — footer/panel details (crop)
Always use Image 1 as reference for element sizes and proportions — NOT the crops

═══ GRID COORDINATES ═══
Image 1 has a coordinate grid: columns A-L (left→right), rows 1-9 (top→bottom)
- Each column ≈ 8% of viewport width
- Each row ≈ 11% of viewport height
Use grid to position elements precisely: "Search bar at E2:K2" → left:33%, width:42%, top:11%

═══ BACKGROUND & IMAGES ═══
RULE: Every visible image or background in the screenshot MUST have a replacement. Never leave empty containers.

For background images (applied via CSS):
- Identify the MOOD and SUBJECT from the screenshot
- Use: background-image: url('https://picsum.photos/seed/[keyword]/1920/1080')
- Always add: background-size: cover; background-position: center;
- Keywords examples: dark, nature, sport, urban, concert, racing, product

For <img> tags:
- Identify what the image shows (person, product, sport, food, landscape, etc.)
- Use: https://picsum.photos/seed/[keyword]/[W]/[H]
- Match approximate dimensions from Image 1 (full screenshot)
- NEVER use relative paths like /images/... or /assets/...
- NEVER leave src empty or use broken paths

For product/brand images (cans, bottles, logos, merchandise):
- Reproduce with styled div + text — do NOT use img for product shots
- Example: <div style="background:#000;color:#39d353">MONSTER</div>

For person/celebrity/athlete photos:
- Use: https://picsum.photos/seed/person[1-9]/800/1000

For news/article thumbnails:
- Use: https://picsum.photos/seed/news[1-9]/800/500
- Use different seeds for each article: news1, news2, news3...

For video thumbnails/players:
- Use dark container with centered ▶ icon: bg-black with play button overlay

For avatars:
- Use: https://i.pravatar.cc/48?img=[1-70]

CRITICAL: If you see ANY image in the screenshot — reproduce it. No exceptions.
CRITICAL: picsum.photos works reliably in all environments — always prefer it over unsplash.

═══ ICONS ═══
- Standard UI icons → Lucide React: import {} from 'lucide-react'
- In browser: import { Search } from 'https://esm.sh/lucide-react'
- Brand logos → SVG only (Lucide doesn't have them)
- NEVER custom SVG for standard icons

═══ TEXT ═══
- Copy ALL text EXACTLY as shown — no changes, no placeholders, no translation
- Copy all numbers, labels, timestamps exactly
- Approximate blurry text as close as possible

═══ LAYOUT ═══
- Match exact proportions, spacing, font sizes from Image 1
- Reproduce EVERY visible element — nothing can be omitted
- NEVER use fixed positioning for main content sections
- Use relative or static positioning for page sections
- Colors → use exact hex values from images, not Tailwind color names

═══ COMPONENTS ═══
Repeating pattern detected from analysis: ${hasRepeatingBlocks ? 'YES' : 'NO'}
${hasRepeatingBlocks ? `
- Identify ALL repeating UI elements (cards, list items, feed items, etc.)
- Create ONE reusable component per repeating pattern with props
- Use REAL data from the screenshot as default prop values
- Render multiple instances using .map() over a hardcoded data array
- Example:
  const streams = [
    { title: "Stream Title 1", viewers: "3 295", game: "Dota 2" },
    { title: "Stream Title 2", viewers: "5,9 тыс.", game: "RESIDENT EVIL" },
  ]
  {streams.map((s, i) => <StreamCard key={i} {...s} />)}
` : `- No repeating pattern — implement full layout`}

${stack === 'React + Tailwind' ? `
═══ REACT CODE QUALITY ═══
ANY list of similar elements MUST use .map() — NEVER hardcode them one by one.
This applies to: nav links, menu items, tabs, icon rows, footer columns, tag lists,
breadcrumbs, pagination — any 3+ similar elements.

WRONG (forbidden):
<a href="#">NEWS</a>
<a href="#">ATHLETES</a>
<a href="#">EVENTS</a>

CORRECT:
const navLinks = ['NEWS', 'ATHLETES', 'EVENTS']
{navLinks.map(link => <a key={link} href="#">{link}</a>)}

For nav with dropdowns:
const navLinks = [
  { label: 'ENERGY DRINKS', dropdown: ['Product 1', 'Product 2'] },
  { label: 'NEWS', dropdown: null },
]

Every data array must be defined OUTSIDE the return() — at the top of the component.
` : ''}

═══ STACK-SPECIFIC RULES ═══
${stack === 'React + Tailwind' ? `
- Use Tailwind className for styling
- NO <html>/<body>/<!DOCTYPE> in component files (only App.jsx may have them if needed for preview)
- Export components as: export default function ComponentName() { ... }
- Use functional components only, no class components
` : stack === 'HTML + Tailwind' ? `
- Include Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Use ONLY Tailwind utility classes, no custom CSS
- Responsive: use md:, lg:, xl: prefixes
` : `
- Put ALL CSS inside <style> tag in <head>
- Use semantic class names: .header, .card, .btn-primary
- Use CSS variables for colors: :root { --bg: #fff; --text: #000; }
- Use flexbox/grid for layout
- Make responsive with @media queries
- NEVER use inline style="..." attributes
`}
- For product images that fail to load, use: https://placehold.co/WxH/111111/39d353?text=Product
- NEVER use relative paths like /images/... — always use full URLs
- If you see broken img tags, replace src with picsum.photos or placehold.co
═══ CRITICAL RULES ═══
1. ${stack === 'React + Tailwind' ? 'Use file markers: // @@FILE:Name.jsx' : 'Return single complete file'}
2. NO markdown code blocks (\`\`\`jsx, \`\`\`html)
3. NO explanations, NO comments about the code
4. Copy text EXACTLY — no placeholders in Copy mode
5. Return ONLY code

Return ONLY the code. Nothing else.
`