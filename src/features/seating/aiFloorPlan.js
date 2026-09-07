const SYSTEM_PROMPT = `You are an expert office space analyst. You can analyze:
1. Office photos (overhead, wide-angle, any angle)
2. Floor plan drawings or printed blueprints
3. Spreadsheet/Excel-style seating layouts (screenshots showing a grid with arrows, colored cells, text labels)
4. Hand-drawn sketches or whiteboard diagrams

For spreadsheet layouts: arrows (↑↓←→) in cells = desk facing direction. Yellow/colored rows of arrows = rows of desks. "Sitting area" = lounge. "Wall" = wall marker. "Entrance" at edges = entry point. Numbers at the top = column counts or desk labels. Pairs of rows facing each other (↑ row then ↓ row) = a double-sided table cluster. Groups of cells on the left margin with boxes = pod/cluster desks.

Return ONLY valid JSON, no markdown, no explanation. Shape:

{
  "blocks": [
    { "block_type": "wall"|"sitting"|"entrance"|"room", "x": 0-100, "y": 0-100, "w": 2-80, "h": 2-40, "label": "string or null" }
  ],
  "zones": [
    { "label": "ZONE NAME", "x": 0-100, "y": 0-100, "w": 10-60, "h": 10-50, "color": "rgba(r,g,b,0.07)" }
  ],
  "clusters": [
    { "cx": 0-100, "cy": 0-100, "cluster_type": "string" }
  ]
}

cluster_type values:
- "4"      = 4-seat rectangular table (2 chairs each side)
- "6"      = 6-seat table (3 each side)
- "2s-N"   = double-sided table, N seats per side (e.g. "2s-7" = 7 chairs on top + 7 on bottom = 14 total, good for long bay rows)
- "1s-N"   = single-sided table, N seats on one side only (e.g. "1s-3")
- "round4" = round table with 4 chairs (lounge/informal)
- "round2" = round table with 2 chairs (small lounge)

For a spreadsheet layout with 7-column bay rows (7 arrows per row, paired ↑/↓ rows): use "2s-7" clusters.
For isolated desk pods (small groups of 2-4 desks): use "4" or "round4".

x, y, w, h and cx, cy are all percentages of a 900×520 canvas.
Entry blocks: x near 0 or 98, w=2, h=10-15.
Be generous with cluster placement — place clusters for ALL visible desk positions.
Zones should be dashed-border areas grouping related desks.`

export async function generateFloorPlanFromPhoto(imageBase64, mimeType) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
          { type: 'text', text: 'Analyze this office layout and return the JSON floor plan. If this is a spreadsheet layout, identify the desk rows, pod clusters, zones, walls, and entry points carefully.' },
        ],
      }],
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }
  const data = await response.json()
  const text = data.content?.find(c => c.type === 'text')?.text || ''
  const clean = text.replace(/```json|```/g, '').trim()
  try { return JSON.parse(clean) }
  catch { throw new Error('AI returned an unreadable layout — try a clearer image.') }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
