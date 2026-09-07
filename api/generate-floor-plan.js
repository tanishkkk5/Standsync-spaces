// api/generate-floor-plan.js
// Vercel serverless function — proxies Anthropic API so the key stays server-side

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on this server.' })
  }

  const { imageBase64, mimeType } = req.body
  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'imageBase64 and mimeType are required.' })
  }

  const SYSTEM_PROMPT = `You are an expert office space analyst. You can analyze:
1. Office photos (overhead, wide-angle, any angle)
2. Floor plan drawings or printed blueprints
3. Spreadsheet/Excel-style seating layouts (screenshots showing a grid with arrows, colored cells, text labels)
4. Hand-drawn sketches or whiteboard diagrams

For spreadsheet layouts: arrows (↑↓←→) in cells = desk facing direction. Yellow/colored rows of arrows = rows of desks. "Sitting area" = lounge. "Wall" = wall marker. "Entrance" at edges = entry point. Numbers at the top = column counts. Pairs of rows facing each other (↑ row then ↓ row) = a double-sided table cluster. Groups of cells on the left margin = pod/cluster desks.

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
- "4"      = 4-seat table (2 chairs each side)
- "6"      = 6-seat table (3 each side)
- "2s-N"   = double-sided table N seats per side (e.g. "2s-7" = 14 total, for long bay rows with 7 desks each side)
- "1s-N"   = single-sided table, N seats on one side only
- "round4" = round table 4 chairs (lounge)
- "round2" = round table 2 chairs (small lounge)

For a spreadsheet with 7-column bay rows (7 arrows per row, paired ↑/↓ rows): use "2s-7" clusters.
x, y, w, h and cx, cy are percentages of a 900×520 canvas.
Entry blocks: x near 0 or 98, w=2, h=10-15. Place clusters for ALL visible desk positions.`

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: 'Analyze this office layout and return the JSON floor plan. If this is a spreadsheet layout, identify desk rows, pod clusters, zones, walls, and entry points carefully.' },
          ],
        }],
      }),
    })

    const data = await anthropicRes.json()
    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({ error: data?.error?.message || 'Anthropic API error' })
    }
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
