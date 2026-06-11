/**
 * Строитель промпта для Pass 1 (структурный анализ)
 *
 * Формирует промпт для мультимодальной модели, который запрашивает
 * детальный анализ UI-скриншота с координатной сеткой.
 *
 * @param {Object} gridInfo - Информация о координатной сетке
 * @param {number} gridInfo.colW - Ширина колонки в пикселях
 * @param {number} gridInfo.rowH - Высота строки в пикселях
 * @param {number} gridInfo.cols - Количество колонок
 * @param {number} gridInfo.rows - Количество строк
 *
 * @returns {string} Промпт для Pass 1
 */
function buildPass1Prompt({ colW, rowH, cols, rows }) {
    return `Analyze this UI screenshot in detail.
The image has a coordinate grid overlay:
Columns: A to ${String.fromCharCode(64 + cols)} (left→right), each column ≈ ${colW}px wide
Rows: 1 to ${rows} (top→bottom), each row ≈ ${rowH}px tall
Return ONLY valid JSON, no markdown. Follow this structure EXACTLY:
{
  "layout": "one sentence describing the overall page structure",
  "background_type": "photo | solid | gradient",
  "background_description": "if photo: describe scene in detail. if solid: hex color. if gradient: colors and direction",
  "background_coverage": "percentage of screen height (e.g., '65%', 'full height')",
  "z_index_layers": [
    {"layer": 1, "elements": ["background elements"]},
    {"layer": 2, "elements": ["navigation", "sidebar"]}
  ],
  "layout_structure": {
    "type": "flex row | flex column | grid",
    "children": [
      {"name": "Sidebar", "width": "240px | 20% | fixed", "position": "left | right", "grid_area": "A1:A9"},
      {"name": "MainContent", "flex": "1 | auto", "position": "center", "grid_area": "B1:L9", "margin_left": "240px"}
    ]
  },
  "navigation": {
    "items": ["link1", "link2", "link3"],
    "has_dropdown": true,
    "dropdown_items": {"link1": ["sub1", "sub2"]}
  },
  "repeating_patterns": [
    {
      "name": "ComponentName",
      "location": "where it appears",
      "count": number_of_instances,
      "layout": "vertical list | horizontal scroll | responsive grid (N columns)",
      "data_fields": ["field1", "field2", "field3"],
      "sample_data": [
        {"field1": "real value from screenshot", "field2": "real value"}
      ]
    }
  ],
  "sections": [
    {
      "name": "Section name",
      "type": "static | dynamic",
      "position": "top | bottom | left | right | center",
      "top_percent": 0,
      "height_percent": 20,
      "grid_area": "A1:L2",
      "description": "list EVERY visible element: inputs, buttons, icons, text labels, images, badges"
    }
  ],
  "static_elements": [],
  "dynamic_elements": [],
  "exact_colors": {
    "background": "#hex",
    "surface": "#hex",
    "text": "#hex",
    "accent": "#hex",
    "secondary_text": "#hex"
  }
}
CRITICAL RULES:
1. Use grid coordinates (A1:L${rows}) for EVERY element position
2. Describe ALL sections — not just the main ones
3. Identify ALL repeating patterns with their data fields AND sample_data from screenshot
4. List ALL z-index layers from bottom to top
5. Be precise with percentages (top_percent, height_percent)
6. For repeating patterns, specify exact count if visible
7. Include EVERY visible element in section descriptions
8. For navigation: list ALL nav links as array in "navigation.items" — this is REQUIRED
9. If any list has 3+ similar items (tabs, icons, buttons) — add as repeating_pattern`
}

module.exports = { buildPass1Prompt }