module.exports = (hasRepeatingBlocks, analysis) => `
MODE: DEVELOPER TEMPLATE
GOAL: Reproduce visual structure accurately, replace all real data with generic placeholders.

CRITICAL: You MUST use file markers. Without them your response is invalid. 
═══ FILE STRUCTURE ═══
EXAMPLE of correct output:
// @@FILE:StreamCard.jsx
export default function StreamCard({ title, viewers }) { ... }

// @@FILE:App.jsx
import StreamCard from './StreamCard'
export default function App() { return <StreamCard title="Stream Title" viewers="0" /> }


- Every file: // @@FILE:Name.jsx
- Last file MUST be: // @@FILE:App.jsx
- All components defined BEFORE App

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
    ? `- Create ONE component for the repeating element with props
- Show ONE rendered example in App.jsx
- Add: {/* TODO: replace with .map() over your data array */}`
    : `- No repeating pattern — implement full layout`}

`