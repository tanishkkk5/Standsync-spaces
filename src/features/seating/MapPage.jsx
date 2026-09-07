import { useEffect, useRef, useState } from 'react'
import { Upload, Wand2, Trash2, Plus } from 'lucide-react'
import { Button } from '../../foundation/ui/Button'
import { Card } from '../../foundation/ui/Card'
import { Input, Select } from '../../foundation/ui/Input'
import { Modal } from '../../foundation/ui/Modal'
import { Badge } from '../../foundation/ui/Card'
import { useAuth } from '../../auth/AuthProvider'
import {
  fetchOffices, fetchSeats, fetchLayoutBlocks, fetchZones,
  saveSeat, createDesk, deleteSeat, updateDeskPos,
  createLayoutBlock, updateLayoutBlock, deleteLayoutBlock,
  createZone, updateZone, deleteZone,
} from './api'
import { SvgFloorMap } from './SvgFloorMap'
import { EditSeatModal } from './EditSeatModal'
import { generateFloorPlanFromPhoto, fileToBase64 } from './aiFloorPlan'

const DRAW_TOOLS = [
  { key: null, label: 'Select' },
  { key: 'desk', label: '+ Desk' },
  { key: 'zone', label: '+ Zone' },
  { key: 'wall', label: '+ Wall' },
  { key: 'room', label: '+ Room' },
  { key: 'sitting', label: '+ Lounge' },
  { key: 'entrance', label: '+ Entry' },
]

export default function MapPage() {
  const { isAdmin } = useAuth()
  const [offices, setOffices] = useState([])
  const [officeId, setOfficeId] = useState(null)
  const [seats, setSeats] = useState([])
  const [blocks, setBlocks] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [editable, setEditable] = useState(false)
  const [drawTool, setDrawTool] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selected, setSelected] = useState(null) // { type, data }
  const [editing, setEditing] = useState(null) // seat being edited (occupant info)
  const [error, setError] = useState('')
  const [seatCount, setSeatCount] = useState(1)
  const [aiModal, setAiModal] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const aiFileRef = useRef(null)

  // Zone/block editing fields
  const [labelDraft, setLabelDraft] = useState('')
  const [sizeDraft, setSizeDraft] = useState({ w: 20, h: 15 })
  const [colorDraft, setColorDraft] = useState('rgba(99,102,241,0.07)')

  useEffect(() => {
    fetchOffices().then(list => { setOffices(list); setOfficeId(list[0]?.id) })
  }, [])

  useEffect(() => {
    if (!officeId) return
    reload()
    setSelected(null)
    setSelectedId(null)
  }, [officeId])

  async function reload() {
    setLoading(true)
    try {
      const [s, b, z] = await Promise.all([fetchSeats(officeId), fetchLayoutBlocks(officeId), fetchZones(officeId)])
      setSeats(s)
      setBlocks(b)
      setZones(z)
      setSeatCount(s.length + 1)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const office = offices.find(o => o.id === officeId)
  const orgs = [...new Set(seats.map(s => s.org).filter(Boolean))]
  const orgOptions = orgs.length ? orgs : ['New organisation']

  function selectItem(type, data) {
    setSelected({ type, data })
    setSelectedId(data.id)
    if (type === 'zone') {
      setLabelDraft(data.label || '')
      setSizeDraft({ w: data.w, h: data.h })
      setColorDraft(data.color || 'rgba(99,102,241,0.07)')
    }
    if (type === 'block') {
      setLabelDraft(data.label || '')
      setSizeDraft({ w: data.w, h: data.h })
    }
  }

  async function handleCanvasClick(pos) {
    if (!editable || !drawTool) return
    setError('')
    try {
      if (drawTool === 'desk') {
        const prefix = office.name.match(/(\d+)\s*$/)?.[1] ?? '1'
        const seatNumber = `B${prefix}-${String(seatCount).padStart(2, '0')}`
        await createDesk(officeId, pos.cx, pos.cy, seatNumber, null)
        setSeatCount(c => c + 1)
        reload()
      } else if (drawTool === 'zone') {
        const z = await createZone({ office_id: officeId, label: 'NEW ZONE', x: pos.x - 10, y: pos.y - 7.5, w: 20, h: 15, color: colorDraft })
        reload()
        selectItem('zone', z)
      } else {
        const b = await createLayoutBlock({ office_id: officeId, block_type: drawTool, x: pos.x - 5, y: pos.y - 3, w: 10, h: 6 })
        reload()
        selectItem('block', b)
      }
    } catch (e) { setError(e.message) }
  }

  async function handleDeskDrop(id, cx, cy) {
    try {
      await updateDeskPos(id, cx, cy)
      setSeats(prev => prev.map(s => s.id === id ? { ...s, cx, cy } : s))
    } catch (e) { setError(e.message) }
  }

  async function handleBlockDrop(id, x, y) {
    try {
      await updateLayoutBlock(id, { x, y })
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, x, y } : b))
    } catch (e) { setError(e.message) }
  }

  async function handleZoneDrop(id, x, y) {
    try {
      await updateZone(id, { x, y })
      setZones(prev => prev.map(z => z.id === id ? { ...z, x, y } : z))
    } catch (e) { setError(e.message) }
  }

  async function handleSaveZone() {
    if (selected?.type !== 'zone') return
    try {
      await updateZone(selected.data.id, { label: labelDraft, w: Number(sizeDraft.w), h: Number(sizeDraft.h), color: colorDraft })
      reload()
    } catch (e) { setError(e.message) }
  }

  async function handleSaveBlock() {
    if (selected?.type !== 'block') return
    try {
      await updateLayoutBlock(selected.data.id, { label: labelDraft, w: Number(sizeDraft.w), h: Number(sizeDraft.h) })
      reload()
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteSelected() {
    if (!selected) return
    try {
      if (selected.type === 'seat') await deleteSeat(selected.data.id)
      else if (selected.type === 'block') await deleteLayoutBlock(selected.data.id)
      else if (selected.type === 'zone') await deleteZone(selected.data.id)
      setSelected(null)
      setSelectedId(null)
      reload()
    } catch (e) { setError(e.message) }
  }

  async function handleSaveSeat(updated) {
    try {
      await saveSeat(updated)
      setSeats(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
      setEditing(null)
    } catch (e) { setError(e.message) }
  }

  // ── AI floor plan generation ──────────────────────────────────────────
  async function handleAiGenerate(file) {
    if (!file) return
    setAiLoading(true)
    setAiError('')
    try {
      const b64 = await fileToBase64(file)
      const mimeType = file.type || 'image/jpeg'
      const layout = await generateFloorPlanFromPhoto(b64, mimeType)

      // Wipe and repopulate the current office layout
      await Promise.all([
        ...blocks.map(b => deleteLayoutBlock(b.id)),
        ...zones.map(z => deleteZone(z.id)),
        ...seats.map(s => deleteSeat(s.id)),
      ])

      let deskNum = 1
      const prefix = office.name.match(/(\d+)\s*$/)?.[1] ?? '1'

      await Promise.all([
        ...(layout.blocks || []).map(b =>
          createLayoutBlock({ office_id: officeId, block_type: b.block_type, x: b.x, y: b.y, w: b.w, h: b.h, label: b.label || null })
        ),
        ...(layout.zones || []).map(z =>
          createZone({ office_id: officeId, label: z.label, x: z.x, y: z.y, w: z.w, h: z.h, color: z.color || 'rgba(99,102,241,0.07)' })
        ),
        ...(layout.desks || []).map(d => {
          const seatNumber = `B${prefix}-${String(deskNum++).padStart(2, '0')}`
          return createDesk(officeId, d.cx, d.cy, seatNumber, null)
        }),
      ])

      setAiModal(false)
      reload()
    } catch (e) {
      setAiError(e.message)
    }
    setAiLoading(false)
  }

  if (!office) return null

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Office switcher + controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {offices.map(o => (
              <Button key={o.id} size="sm" variant={o.id === officeId ? 'primary' : 'secondary'} onClick={() => setOfficeId(o.id)}>
                {o.name}
              </Button>
            ))}
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={() => setAiModal(true)}>
                <Wand2 size={14} /> AI Generate layout
              </Button>
              <Button size="sm" variant={editable ? 'primary' : 'secondary'} onClick={() => { setEditable(e => !e); setDrawTool(null); setSelected(null); setSelectedId(null) }}>
                {editable ? 'Done editing' : 'Edit layout'}
              </Button>
            </div>
          )}
        </div>

        {/* Draw tools bar (admin + editing mode) */}
        {editable && isAdmin && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {DRAW_TOOLS.map(t => (
              <Button key={String(t.key)} size="sm" variant={drawTool === t.key ? 'primary' : 'secondary'}
                onClick={() => setDrawTool(t.key)}>
                {t.label}
              </Button>
            ))}
          </div>
        )}

        {editable && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
            {drawTool === 'desk' && 'Click on the floor plan to place a desk.'}
            {drawTool === 'zone' && 'Click to drop a new zone label area, then resize in the side panel.'}
            {['wall', 'room', 'sitting', 'entrance'].includes(drawTool) && `Click to place a ${drawTool} block, then resize/label in the side panel.`}
            {!drawTool && 'Select tool active — click any desk, zone, or block to select and move it.'}
          </p>
        )}

        {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 10 }}>{error}</p>}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 18, marginBottom: 12, fontSize: 12, color: 'var(--text-tertiary)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#3DD68C', border: '1.5px solid #1A9F5A', display: 'inline-block' }} /> Vacant
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', border: '1.5px solid #B0B8C4', display: 'inline-block' }} /> Occupied
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>Click a desk to see occupant details{isAdmin ? ' or edit them' : ''}</span>
        </div>

        <Card padding="12px">
          {loading ? (
            <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              Loading floor plan…
            </div>
          ) : (
            <SvgFloorMap
              office={office}
              seats={seats}
              blocks={blocks}
              zones={zones}
              isAdmin={isAdmin}
              editable={editable && drawTool !== null}
              selectedId={selectedId}
              onSelectDesk={s => { if (editable) { selectItem('seat', s) } else if (isAdmin) { setEditing(s) } else { selectItem('seat', s) } }}
              onSelectBlock={b => selectItem('block', b)}
              onSelectZone={z => selectItem('zone', z)}
              onDeskDrop={handleDeskDrop}
              onBlockDrop={handleBlockDrop}
              onZoneDrop={handleZoneDrop}
              onCanvasClick={handleCanvasClick}
            />
          )}
        </Card>
      </div>

      {/* Side panel */}
      {selected && (
        <Card padding="20px" style={{ width: 260, flexShrink: 0, alignSelf: 'flex-start' }}>
          {selected.type === 'seat' && (
            <>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Desk</p>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{selected.data.seat_number}</p>
              <Badge color={selected.data.occupied ? 'danger' : 'success'} style={{ marginBottom: 14 }}>
                {selected.data.occupied ? 'Occupied' : 'Vacant'}
              </Badge>
              {selected.data.occupied && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600 }}>{selected.data.name}</div>
                  <div>{selected.data.org}</div>
                  <div>{selected.data.collab}</div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{selected.data.email}</div>
                </div>
              )}
              {isAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(selected.data)}>
                    Edit occupant
                  </Button>
                  <Button size="sm" variant="danger" onClick={handleDeleteSelected}>
                    <Trash2 size={14} /> Remove desk
                  </Button>
                </div>
              )}
            </>
          )}

          {selected.type === 'zone' && (
            <>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Zone</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                <Input label="Zone name" value={labelDraft} onChange={e => setLabelDraft(e.target.value)} placeholder="e.g. MARKETING" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input label="Width %" type="number" min="5" value={sizeDraft.w} onChange={e => setSizeDraft(s => ({ ...s, w: e.target.value }))} />
                  <Input label="Height %" type="number" min="5" value={sizeDraft.h} onChange={e => setSizeDraft(s => ({ ...s, h: e.target.value }))} />
                </div>
                <Input label="Color (rgba)" value={colorDraft} onChange={e => setColorDraft(e.target.value)} />
                <Button size="sm" onClick={handleSaveZone}>Save zone</Button>
              </div>
              <Button size="sm" variant="danger" onClick={handleDeleteSelected}><Trash2 size={14} /> Delete zone</Button>
            </>
          )}

          {selected.type === 'block' && (
            <>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{selected.data.block_type}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                <Input label="Label" value={labelDraft} onChange={e => setLabelDraft(e.target.value)} placeholder="e.g. Kitchen" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input label="Width %" type="number" min="1" value={sizeDraft.w} onChange={e => setSizeDraft(s => ({ ...s, w: e.target.value }))} />
                  <Input label="Height %" type="number" min="1" value={sizeDraft.h} onChange={e => setSizeDraft(s => ({ ...s, h: e.target.value }))} />
                </div>
                <Button size="sm" onClick={handleSaveBlock}>Save</Button>
              </div>
              <Button size="sm" variant="danger" onClick={handleDeleteSelected}><Trash2 size={14} /> Delete</Button>
            </>
          )}
        </Card>
      )}

      {/* AI Generate modal */}
      <Modal open={aiModal} onClose={() => { setAiModal(false); setAiError('') }} title="AI — Generate floor plan from photo"
        footer={<Button variant="ghost" onClick={() => setAiModal(false)}>Cancel</Button>}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Upload a clear photo of your office — overhead or a wide-angle shot works best.
          Claude AI will analyze it and automatically generate desk positions, zones (Marketing, Sales, etc.),
          and structural elements (walls, entry points, lounges) as an editable floor map.
        </p>
        <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 16 }}>
          ⚠ This will replace your current layout for this office. Export your sheet first if needed.
        </p>
        {aiError && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{aiError}</p>}
        <Button
          variant="primary"
          loading={aiLoading}
          onClick={() => aiFileRef.current?.click()}
        >
          <Upload size={14} /> {aiLoading ? 'Analysing photo…' : 'Choose office photo'}
        </Button>
        <input
          ref={aiFileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => handleAiGenerate(e.target.files?.[0])}
        />
      </Modal>

      {editing && (
        <EditSeatModal seat={editing} orgs={orgOptions} onSave={handleSaveSeat} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
