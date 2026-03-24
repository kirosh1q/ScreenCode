module.exports = () => `
MODE: PIXEL-PERFECT COPY
GOAL: Reproduce the screenshot as accurately as possible — almost 1:1 visual match.

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

═══ BACKGROUND ═══
- If photo is visible → https://source.unsplash.com/1920x1080/?[exact_scene_keywords]
- Apply as: background-image: url(...); background-size: cover; background-position: center
- No overlays unless visible in screenshot

═══ IMAGES IN CONTENT ═══
- News/article images → https://source.unsplash.com/600x400/?[topic]
- Avatars → https://i.pravatar.cc/48?img=[1-70]
- Brand logos (YouTube, VK, Facebook, MSN) → SVG or emoji
- NEVER use placeholder divs — always real <img> with URLs

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
`