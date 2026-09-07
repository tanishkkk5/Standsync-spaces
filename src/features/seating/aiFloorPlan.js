export async function generateFloorPlanFromPhoto(imageBase64, mimeType) {
  const response = await fetch('/api/generate-floor-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data?.error || `Server error ${response.status}`)

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
