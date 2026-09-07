import { useEffect, useRef, useState } from 'react'
import { Wand2, Trash2, Upload, ChevronDown } from 'lucide-react'
import { Button } from '../../foundation/ui/Button'
import { Card } from '../../foundation/ui/Card'
import { Badge } from '../../foundation/ui/Card'
import { Input } from '../../foundation/ui/Input'
import { Modal } from '../../foundation/ui/Modal'
import { useAuth } from '../../auth/AuthProvider'
import {
  fetchOffices, fetchSeats, fetchLayoutBlocks, fetchZones,
  saveSeat, deleteSeat,
  createLayoutBlock, updateLayoutBlock, deleteLayoutBlock,
  createZone, updateZone, deleteZone,
  fetchClusters, createCluster, updateClusterPos, deleteCluster,
} from './api'
import { SvgFloorMap } from './SvgFloorMap'
import { EditSeatModal } from './EditSeatModal'
import { generateFloorPlanFromPhoto, fileToBase64 } from './aiFloorPlan'

const CLUSTER_TYPES = [
  { key: '4',      label: '4-seat table' },
  { key: '6',      label: '6-seat table' },
  { key: '8',      label: '8-seat table' },
  { key: '2h',     label: '2-seat table' },
  { key: 'round4', label: 'Round 4-seat' },
  { key: 'round2', label: 'Round 2-seat' },
]
const CLUSTER_LABELS = Object.fromEntries(CLUSTER_TYPES.map(t => [t.key, t.label]))

const DRAW_TOOLS = [
  { key: null,       label: 'Select / Move' },
  ...CLUSTER_TYPES.map(t => ({ key: `cluster:${t.key}`, label: `+ ${t.label}` })),
  { key: 'zone',     label: '+ Zone' },
  { key: 'room',     label: '+ Room' },
  { key: 'sitting',  label: '+ Lounge' },
  { key: 'entrance', label: '+ Entry' },
  { key: 'wall',     label: '+ Wall' },
]

export default function MapPage() {
  const { isAdmin } = useAuth()
  const [offices, setOffices] = useState([])
  const [officeId, setOfficeId] = useState(null)
  const [seats, setSeats] = useState([])
  const [blocks, setBlocks] = useState([])
  const [zones, setZones] = useState([])
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [editable, setEditable] = useState(false)
  const [drawTool, setDrawTool] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selected, setSelected] = useState(null) // { type, data }
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [seatCount, setSeatCount] = useState(1)
  const [labelDraft, setLabelDraft] = useState('')
  const [sizeDraft, setSizeDraft] = useState({ w: 20, h: 15 })
  const [colorDraft, setColorDraft] = useState('rgba(99,102,241,0.07)')
  const [aiModal, setAiModal] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const aiFileRef = useRef(null)

  useEffect(() => {
    fetchOffices().then(list => { setOffices(list); setOfficeId(list[0]?.id) })
  }, [])

  useEffect(() => {
    if (!officeId) return
    reload()
    setSelected(null); setSelectedId(null)
  }, [officeId])

  async function reload() {
    setLoading(true)
    try {
      const [s, b, z, c] = await Promise.all([
        fetchSeats(officeId), fetchLayoutBlocks(officeId),
        fetchZones(officeId), fetchClusters(officeId),
      ])
      setSeats(s); setBlocks(b); setZones(z); setClusters(c)
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
    if (type === 'zone') { setLabelDraft(data.label||''); setSizeDraft({ w:data.w, h:data.h }); setColorDraft(data.color||'rgba(99,102,241,0.07)') }
    if (type === 'block') { setLabelDraft(data.label||''); setSizeDraft({ w:data.w, h:data.h }) }
  }

  async function handleCanvasClick(pos) {
    if (!editable || !drawTool) return
    setError('')
    try {
      if (drawTool.startsWith('cluster:')) {
        const clusterType = drawTool.split(':')[1]
        const prefix = `B${office.name.match(/(\d+)\s*$/)?.[1] ?? '1'}`
        const seatPrefix = `${prefix}-C${String(seatCount).padStart(2,'0')}`
        const cluster = await createCluster(officeId, pos.cx, pos.cy, clusterType, seatPrefix)
        setSeatCount(c => c + (CLUSTER_TYPES.find(t=>t.key===clusterType)?1:1))
        reload()
        selectItem('cluster', cluster)
      } else if (drawTool === 'zone') {
        const z = await createZone({ office_id:officeId, label:'NEW ZONE', x:pos.cx-10, y:pos.cy-7.5, w:20, h:15, color:colorDraft })
        reload(); selectItem('zone', { ...z, w:20, h:15 })
      } else {
        const b = await createLayoutBlock({ office_id:officeId, block_type:drawTool, x:pos.cx-5, y:pos.cy-3, w:10, h:6 })
        reload(); selectItem('block', { ...b, w:10, h:6 })
      }
    } catch (e) { setError(e.message) }
  }

  async function handleClusterDrop(id, cx, cy) {
    try {
      await updateClusterPos(id, cx, cy)
      setClusters(prev => prev.map(c => c.id === id ? { ...c, cx, cy } : c))
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

  async function handleDeleteSelected() {
    if (!selected) return
    try {
      if (selected.type === 'seat')    await deleteSeat(selected.data.id)
      else if (selected.type === 'cluster') await deleteCluster(selected.data.id)
      else if (selected.type === 'block')   await deleteLayoutBlock(selected.data.id)
      else if (selected.type === 'zone')    await deleteZone(selected.data.id)
      setSelected(null); setSelectedId(null); reload()
    } catch (e) { setError(e.message) }
  }

  async function handleSaveZone() {
    if (selected?.type !== 'zone') return
    try {
      await updateZone(selected.data.id, { label:labelDraft, w:Number(sizeDraft.w), h:Number(sizeDraft.h), color:colorDraft })
      reload()
    } catch (e) { setError(e.message) }
  }

  async function handleSaveBlock() {
    if (selected?.type !== 'block') return
    try {
      await updateLayoutBlock(selected.data.id, { label:labelDraft, w:Number(sizeDraft.w), h:Number(sizeDraft.h) })
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

  async function handleAiGenerate(file) {
    if (!file) return
    setAiLoading(true); setAiError('')
    try {
      const b64 = await fileToBase64(file)
      const layout = await generateFloorPlanFromPhoto(b64, file.type || 'image/jpeg')
      // Wipe
      await Promise.all([
        ...clusters.map(c => deleteCluster(c.id)),
        ...blocks.map(b => deleteLayoutBlock(b.id)),
        ...zones.map(z => deleteZone(z.id)),
        ...seats.filter(s => !s.cluster_id).map(s => deleteSeat(s.id)),
      ])
      const prefix = `B${office.name.match(/(\d+)\s*$/)?.[1] ?? '1'}`
      let cn = 1
      await Promise.all([
        ...(layout.blocks||[]).map(b => createLayoutBlock({ office_id:officeId, block_type:b.block_type, x:b.x, y:b.y, w:b.w, h:b.h, label:b.label||null })),
        ...(layout.zones||[]).map(z => createZone({ office_id:officeId, label:z.label, x:z.x, y:z.y, w:z.w, h:z.h, color:z.color||'rgba(99,102,241,0.07)' })),
        ...(layout.clusters||[]).map(cl => {
          const p = `${prefix}-C${String(cn++).padStart(2,'0')}`
          return createCluster(officeId, cl.cx, cl.cy, cl.cluster_type || '4', p)
        }),
      ])
      setAiModal(false); reload()
    } catch (e) { setAiError(e.message) }
    setAiLoading(false)
  }

  const hasLayout = clusters.length > 0 || blocks.length > 0

  return (
    <div style={{ display:'flex', gap:20 }}>
      <div style={{ flex:1, minWidth:0 }}>
        {/* Office + controls row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:8 }}>
            {offices.map(o => (
              <Button key={o.id} size="sm" variant={o.id===officeId?'primary':'secondary'} onClick={() => setOfficeId(o.id)}>
                {o.name}
              </Button>
            ))}
          </div>
          {isAdmin && (
            <div style={{ display:'flex', gap:8 }}>
              <Button size="sm" variant="secondary" onClick={() => setAiModal(true)}>
                <Wand2 size={14} /> AI Generate
              </Button>
              <Button size="sm" variant={editable?'primary':'secondary'}
                onClick={() => { setEditable(e=>!e); setDrawTool(null); setSelected(null); setSelectedId(null) }}>
                {editable ? 'Done editing' : 'Edit layout'}
              </Button>
            </div>
          )}
        </div>

        {/* Draw toolbar */}
        {editable && isAdmin && (
          <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
            {DRAW_TOOLS.map(t => (
              <Button key={String(t.key)} size="sm"
                variant={drawTool === t.key ? 'primary' : 'secondary'}
                onClick={() => setDrawTool(t.key)}>
                {t.label}
              </Button>
            ))}
          </div>
        )}

        {editable && (
          <p style={{ fontSize:12, color:'var(--text-tertiary)', marginBottom:10 }}>
            {!drawTool && 'Select tool — click a desk or table to select it, drag a table to reposition it.'}
            {drawTool?.startsWith('cluster:') && `Click anywhere to place a ${CLUSTER_LABELS[drawTool.split(':')[1]]}.`}
            {drawTool === 'zone' && 'Click to drop a zone label. Resize in the panel →'}
            {['room','sitting','entrance','wall'].includes(drawTool) && `Click to place a ${drawTool}. Resize in the panel →`}
          </p>
        )}

        {error && <p style={{ fontSize:12, color:'var(--danger)', marginBottom:10 }}>{error}</p>}

        {/* Legend */}
        <div style={{ display:'flex', gap:16, marginBottom:12, fontSize:12, color:'var(--text-tertiary)', flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width={16} height={16}><circle cx={8} cy={8} r={6} fill="#3DD68C" stroke="#1DB370" strokeWidth={1.5}/></svg>
            Vacant
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width={16} height={16}><circle cx={8} cy={8} r={6} fill="#fff" stroke="#B8C6D4" strokeWidth={1.5}/></svg>
            Occupied
          </span>
          <span>Hover a chair for details{isAdmin ? ' · click to edit occupant' : ''}</span>
        </div>

        <Card padding="12px" style={{ overflow:'auto' }}>
          {loading ? (
            <div style={{ height:400, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-tertiary)', fontSize:13 }}>
              Loading floor plan…
            </div>
          ) : !hasLayout ? (
            <div style={{ height:400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, textAlign:'center' }}>
              <div style={{ fontSize:40 }}>🏢</div>
              <p style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)' }}>No floor plan yet</p>
              <p style={{ fontSize:13, color:'var(--text-tertiary)', maxWidth:360 }}>
                Use <strong>AI Generate</strong> to auto-create from a photo, or click <strong>Edit layout</strong> and use the draw tools.
              </p>
              {isAdmin && (
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <Button size="sm" variant="primary" onClick={() => setAiModal(true)}><Wand2 size={14}/> AI Generate</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditable(true)}>Edit manually</Button>
                </div>
              )}
            </div>
          ) : (
            <SvgFloorMap
              seats={seats} blocks={blocks} zones={zones} clusters={clusters}
              isAdmin={isAdmin} editable={editable && !drawTool?.startsWith('cluster:') && !['zone','room','sitting','entrance','wall'].includes(drawTool)}
              selectedId={selectedId}
              onSelectDesk={seat => {
                selectItem('seat', seat)
                if (isAdmin && !editable) setEditing(seat)
              }}
              onSelectBlock={b => selectItem('block', b)}
              onSelectZone={z => selectItem('zone', z)}
              onSelectCluster={c => selectItem('cluster', c)}
              onClusterDrop={handleClusterDrop}
              onBlockDrop={handleBlockDrop}
              onZoneDrop={handleZoneDrop}
              onCanvasClick={handleCanvasClick}
            />
          )}
        </Card>
      </div>

      {/* Side panel */}
      {selected && (
        <Card padding="20px" style={{ width:240, flexShrink:0, alignSelf:'flex-start' }}>
          {/* SEAT */}
          {selected.type === 'seat' && (
            <>
              <p style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>Desk</p>
              <p style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>{selected.data.seat_number}</p>
              <Badge color={selected.data.occupied?'danger':'success'} style={{ marginBottom:12 }}>
                {selected.data.occupied?'Occupied':'Vacant'}
              </Badge>
              {selected.data.occupied && (
                <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:14, lineHeight:1.7 }}>
                  <div style={{ fontWeight:600 }}>{selected.data.name}</div>
                  <div>{selected.data.org}</div>
                  <div>{selected.data.collab}</div>
                  <div style={{ color:'var(--text-tertiary)', fontSize:12 }}>{selected.data.email}</div>
                </div>
              )}
              {isAdmin && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <Button size="sm" onClick={() => setEditing(selected.data)}>Edit occupant</Button>
                  <Button size="sm" variant="danger" onClick={handleDeleteSelected}><Trash2 size={14}/> Remove desk</Button>
                </div>
              )}
            </>
          )}

          {/* CLUSTER */}
          {selected.type === 'cluster' && (
            <>
              <p style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>Table cluster</p>
              <p style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{CLUSTER_LABELS[selected.data.cluster_type] || selected.data.cluster_type}</p>
              <p style={{ fontSize:12, color:'var(--text-tertiary)', marginBottom:14 }}>
                {seats.filter(s => s.cluster_id === selected.data.id).length} seats ·{' '}
                {seats.filter(s => s.cluster_id === selected.data.id && s.occupied).length} occupied
              </p>
              <p style={{ fontSize:12, color:'var(--text-tertiary)', marginBottom:14 }}>
                Drag this table on the map to reposition it.
              </p>
              {isAdmin && (
                <Button size="sm" variant="danger" onClick={handleDeleteSelected}><Trash2 size={14}/> Delete table</Button>
              )}
            </>
          )}

          {/* ZONE */}
          {selected.type === 'zone' && (
            <>
              <p style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Zone</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                <Input label="Name" value={labelDraft} onChange={e => setLabelDraft(e.target.value)} placeholder="e.g. MARKETING" />
                <div style={{ display:'flex', gap:8 }}>
                  <Input label="Width %" type="number" min="5" value={sizeDraft.w} onChange={e => setSizeDraft(s=>({...s,w:e.target.value}))} />
                  <Input label="Height %" type="number" min="5" value={sizeDraft.h} onChange={e => setSizeDraft(s=>({...s,h:e.target.value}))} />
                </div>
                <Input label="Color" value={colorDraft} onChange={e => setColorDraft(e.target.value)} />
                <Button size="sm" onClick={handleSaveZone}>Save zone</Button>
              </div>
              <Button size="sm" variant="danger" onClick={handleDeleteSelected}><Trash2 size={14}/> Delete</Button>
            </>
          )}

          {/* BLOCK */}
          {selected.type === 'block' && (
            <>
              <p style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {selected.data.block_type}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                <Input label="Label" value={labelDraft} onChange={e => setLabelDraft(e.target.value)} placeholder="e.g. Meeting Room" />
                <div style={{ display:'flex', gap:8 }}>
                  <Input label="Width %" type="number" min="1" value={sizeDraft.w} onChange={e => setSizeDraft(s=>({...s,w:e.target.value}))} />
                  <Input label="Height %" type="number" min="1" value={sizeDraft.h} onChange={e => setSizeDraft(s=>({...s,h:e.target.value}))} />
                </div>
                <Button size="sm" onClick={handleSaveBlock}>Save</Button>
              </div>
              <Button size="sm" variant="danger" onClick={handleDeleteSelected}><Trash2 size={14}/> Delete</Button>
            </>
          )}
        </Card>
      )}

      {/* AI modal */}
      <Modal open={aiModal} onClose={() => { setAiModal(false); setAiError('') }}
        title="AI — Generate floor plan from photo"
        footer={<Button variant="ghost" onClick={() => setAiModal(false)}>Cancel</Button>}>
        <p style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:14, lineHeight:1.6 }}>
          Upload a clear overhead or wide-angle photo of your office.
          Claude AI will automatically identify desk clusters, zone labels, meeting rooms, lounges, and entry points —
          generating a fully editable floor map in seconds.
        </p>
        <p style={{ fontSize:12, color:'var(--danger)', marginBottom:14 }}>
          ⚠ This replaces the current layout for this office.
        </p>
        {aiError && <p style={{ fontSize:12, color:'var(--danger)', marginBottom:10 }}>{aiError}</p>}
        <Button variant="primary" loading={aiLoading} onClick={() => aiFileRef.current?.click()}>
          <Upload size={14}/> {aiLoading ? 'Analysing photo…' : 'Choose office photo'}
        </Button>
        <input ref={aiFileRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => handleAiGenerate(e.target.files?.[0])} />
      </Modal>

      {editing && (
        <EditSeatModal seat={editing} orgs={orgOptions} onSave={handleSaveSeat} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
