const { getStackRules } = require('../../utils/stackRules')

/**
 * Строитель промпта для Pass 2 (генерация кода)
 *
 * Формирует промпт для мультимодальной модели, который запрашивает
 * генерацию фронтенд-кода на основе анализа из Pass 1.
 *
 * @param {Object} params
 * @param {Object} params.gridInfo - Информация о координатной сетке
 * @param {number} params.gridInfo.cols - Количество колонок
 * @param {number} params.gridInfo.rows - Количество строк
 * @param {number} params.gridInfo.colW - Ширина колонки
 * @param {number} params.gridInfo.rowH - Высота строки
 * @param {boolean} params.hasCrops - Есть ли кропы зон (top/middle/bottom)
 * @param {number} params.aspectRatio - Соотношение сторон изображения
 * @param {string} params.stack - Технологический стек
 * @param {Object} params.analysis - Результат анализа из Pass 1
 * @param {string} params.modeInstruction - Инструкции режима (copy/template)
 * @param {string} params.mode - Режим генерации ('copy' | 'template')
 *
 * @returns {string} Промпт для Pass 2
 */
function buildPass2Prompt({ gridInfo, hasCrops, aspectRatio, stack, analysis, modeInstruction, mode }) {
    const { cols, rows, colW, rowH } = gridInfo

    const sectionsDesc = analysis.sections
        ?.map(s => `  - ${s.name} (${s.type}, ${s.position}): ${s.description}`)
        .join('\n') || ''

    return `Generate code for this UI screenshot.
${hasCrops
        ? `You are receiving 4 images of the SAME page:
- Image 1: full screenshot WITH coordinate grid (columns A-${String.fromCharCode(64 + cols)}, rows 1-${rows}, each cell = ${colW}x${rowH}px)
- Image 2: top section (0-30% of page height) — header details
- Image 3: middle section (30-60% of page height) — main content
- Image 4: bottom section (60-100% of page height) — footer, panels

CRITICAL: Use ALL 4 images together. Image 1 shows true proportions and positions.`
        : `You are receiving 1 image:
- Image 1: full screenshot WITH coordinate grid (columns A-${String.fromCharCode(64 + cols)}, rows 1-${rows}, each cell = ${colW}x${rowH}px)

NOTE: This is a wide/horizontal image (aspect ratio: ${aspectRatio.toFixed(2)}), so zone crops were not created. Focus on the full image for details.`
    }

Stack: ${stack}

═══ UI STRUCTURE FROM ANALYSIS (Pass 1) ═══

Layout: ${analysis.layout}

Background:
${analysis.background_type === 'photo'
        ? `- Type: PHOTO covering ${analysis.background_coverage || '60%'} of screen
- Description: ${analysis.background_description}
- Implementation: Use Unsplash or similar for photo background`
        : `- Type: ${analysis.background_type || 'solid'}
- Color: ${analysis.exact_colors?.background || '#0a0a0a'}
- Description: ${analysis.background_description || 'none'}`}

Z-Index Layers (render in this order):
${analysis.z_index_layers?.map((layer, i) =>
        `  Layer ${layer.layer}: ${layer.elements.join(', ')}`
    ).join('\n') || '  Standard stacking (background → content → header → overlays)'}

Layout Structure:
${analysis.layout_structure?.children?.map(child =>
        `  - ${child.name}: ${child.position || 'relative'}, ${child.width || child.flex || 'auto'}, grid: ${child.grid_area || 'N/A'}`
    ).join('\n') || '  Standard flex layout'}

Sections:
${sectionsDesc}

Repeating Patterns:
${analysis.repeating_patterns?.map(pattern =>
        `  - ${pattern.name}: ${pattern.count} instances, ${pattern.layout}
    Data fields: ${pattern.data_fields?.join(', ') || 'N/A'}`
    ).join('\n') || '  No repeating patterns detected'}

Colors (use these exact values):
${analysis.exact_colors ? Object.entries(analysis.exact_colors).map(([key, val]) =>
        `  - ${key}: ${val}`
    ).join('\n') : '  No colors specified'}

Static Elements (never change): ${analysis.static_elements?.join(', ') || 'N/A'}
Dynamic Elements (change per user/session): ${analysis.dynamic_elements?.join(', ') || 'N/A'}

═══ CRITICAL: GRID OVERLAY ═══
The coordinate grid (letters A-L on top, numbers 1-9 on left) visible on Image 1 is 
an ANALYSIS OVERLAY for your reference ONLY. It is NOT part of the UI design.

STRICTLY PROHIBITED:
- DO NOT draw grid lines in the generated code
- DO NOT add letter labels (A, B, C...) or number labels (1, 2, 3...)
- DO NOT create any visual element that resembles a grid overlay
- DO NOT use borders or backgrounds to simulate grid cells
- The grid exists ONLY to help you position elements precisely

Use the grid coordinates to determine positions (e.g., "header spans A1:L2" means 
full width at top), but NEVER render the grid itself.

═══ MODE INSTRUCTIONS ═══
${modeInstruction}

═══ STACK RULES ═══
${getStackRules(stack, mode)}

═══ OUTPUT RULES ═══
- Return ONLY the code, no markdown, no backticks, no explanations
${stack.includes('React') && mode === 'template'
        ? `- Every file must start with: // @@FILE:Name.jsx
- Last file MUST be: // @@FILE:App.jsx
- All components defined BEFORE App`
        : `- Return complete single file`}`
}

module.exports = { buildPass2Prompt }