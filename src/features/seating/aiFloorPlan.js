const SYSTEM_PROMPT = `You are an expert office space analyst. When given a photo of an office, you analyze it and return a structured JSON floor plan layout.

Return ONLY valid JSON, no markdown, no explanation. The JSON must match this exact shape:

{
  "blocks": [
    { "block_type": "wall"|"sitting"|"entrance"|"room", "x": 0-100, "y": 0-100, "w": 5-80, "h": 3-40, "label": "optional string" }
  ],
  "zones": [
    { "label": "ZONE NAME", "x": 0-100, "y": 0-100, "w": 10-60, "h": 10-50, "color": "rgba(r,g,b,0.07)" }
  ],
  "desks": [
    { "cx": 0-100, "cy": 0-100 }
  ]
}

Rules:
- x, y, w, h are percentages of a 900x520 canvas (100 = full width/height)
- Analyze visible desk clusters and place a desk dot at the center of each visible seat/chair
- Identify distinct work zones (e.g. open plan, meeting room, lounge, reception) as zones
- Identify walls, entry points, lounges, kitchen/café areas as blocks
- entry points: block_type "entrance", x at 0 or ~100 (left or right edge), thin (w: 3-6, h: 5-10)
- walls/partitions: block_type "wall", narrow strips
- meeting rooms, enclosed spaces: block_type "room"
- lounge/soft seating: block_type "sitting"
- Return 10-60 desks depending on what's visible
- Zones should have subtle, distinct rgba colors
- Be conservative — only mark what you can clearly see`

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
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: 'Analyze this office photo and generate the floor plan JSON layout. Return only the JSON object.',
          },
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

  try {
    return JSON.parse(clean)
  } catch {
    throw new Error('AI returned an unreadable layout — try a clearer overhead photo.')
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target.result
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
