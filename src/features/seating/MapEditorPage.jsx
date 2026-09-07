// MapEditorPage — admin-only layout editor with custom table creator, zone/block tools, AI generate
import { useEffect, useRef, useState } from 'react'
import { Wand2, Trash2, Upload, Settings2 } from 'lucide-react'
import { Button } from '../../foundation/ui/Button'
import { Card } from '../../foundation/ui/Card'
import { Input } from '../../foundation/ui/Input'
import { Modal } from '../../foundation/ui/Modal'
import {
  fetchOffices, fetchSeats, fetchLayoutBlocks, fetchZones, fetchClusters,
  saveSeat, deleteSeat, createLayoutBlock, updateLayoutBlock, deleteLayoutBlock,
  createZone, updateZone, deleteZone,
  createCluster, updateClusterPos, deleteCluster,
} from './api'
import { SvgFloorMap } from './SvgFloorMap'
import { EditSeatModal } from './EditSeatModal'
import { clusterLabel, clusterSeatCount } from './clusterDefs'
import { generateFloorPlanFromPhoto, fileToBase64 } from './aiFloorPlan'

const PRESET_TOOLS = [
  { key: null,          label: 'Select / Move' },
  { key: 'cluster:4',   label: '4-seat table' },
  { key: 'cluster:6',   label: '6-seat table' },
  { key: 'cluster:round4', label: 'Round 4-seat' },
  { key: 'cluster:round2', label: 'Round lounge' },
  { key: 'custom',       label: 'Custom table…' },
  { key: 'zone',         label: '+ Zone' },
  { key: 'room',         label: '+ Room' },
  { key: 'sitting',      label: '+ Lounge area' },
  { key: 'entrance',     label: '+ Entry' },
  { key: 'wall',         label: '+ Wall' },
]

export default function MapEditorPage() {
  const [offices,   setOffices]   = useState([])
  const [officeId,  setOfficeId]  = useState(null)
  const [seats,     setSeats]     = useState([])
  const [blocks,    setBlocks]    = useState([])
  const [zones,     setZones]     = useState([])
  const [clusters,  setClusters]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [drawTool,  setDrawTool]  = useState(null)
  const [selectedId,setSelectedId]= useState(null)
  const [selected,  setSelected]  = useState(null)
  const [editing,   setEditing]   = useState(null)
  const [error,     setError]     = useState('')
  const [seatCount, setSeatCount] = useState(1)

  // Side-panel drafts
  const [labelDraft, setLabelDraft] = useState('')
  const [sizeDraft,  setSizeDraft]  = useState({ w:20, h:15 })
  const [colorDraft, setColorDraft] = useState('rgba(99,102,241,0.07)')

  // Custom table modal
  const [customModal,   setCustomModal]   = useState(false)
  const [customSeats,   setCustomSeats]   = useState(3)
  const [customSided,   setCustomSided]   = useState('2') // '1' or '2'
  const pendingCustom = useRef(null)

  // AI modal
  const [aiModal,   setAiModal]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError,   setAiError]   = useState('')
  const aiFileRef = useRef(null)

  useEffect(() => {
    fetchOffices().then(list => { setOffices(list); setOfficeId(list[0]?.id) })
  }, [])

  useEffect(() => {
    if (!officeId) return
    reload(); setSelected(null); setSelectedId(null)
  }, [officeId])

  async function reload() {
    setLoading(true)
    try {
      const [s, b, z, c] = await Promise.all([
        fetchSeats(officeId), fetchLayoutBlocks(officeId), fetchZones(officeId), fetchClusters(officeId),
      ])
      setSeats(s); setBlocks(b); setZones(z); setClusters(c)
      setSeatCount(s.length + 1)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const office = offices.find(o => o.id === officeId)
  const orgs = [...new Set(seats.map(s => s.org).filter(Boolean))]

  function selectItem(type, data) {
    setSelected({ type, data }); setSelectedId(data.id)
    if (type === 'zone')  { setLabelDraft(data.label||''); setSizeDraft({ w:data.w, h:data.h }); setColorDraft(data.color||'rgba(99,102,241,0.07)') }
    if (type === 'block') { setLabelDraft(data.label||''); setSizeDraft({ w:data.w, h:data.h }) }
  }

  function handleToolClick(key) {
    if (key === 'custom') { setCustomModal(true); return }
    setDrawTool(key)
  }

  function handleCustomConfirm() {
    const ct = customSided === '1' ? `1s-${customSeats}` : `2s-${customSeats}`
    setDrawTool(`cluster:${ct}`)
    setCustomModal(false)
  }

  // editable means clusters/blocks/zones can be dragged
  const isDragMode = drawTool === null

  async function handleCanvasClick(pos) {
    if (!drawTool) return
    setError('')
    try {
      if (drawTool.startsWith('cluster:')) {
        const ct = drawTool.split(':')[1]
        const prefix = `B${office.name.match(/(\d+)\s*$/)?.[1]??'1'}`
        const seatPrefix = `${prefix}-C${String(seatCount).padStart(2,'0')}`
        const cluster = await createCluster(officeId, pos.cx, pos.cy, ct, seatPrefix)
        setSeatCount(c => c + clusterSeatCount(ct))
        reload(); selectItem('cluster', cluster)
      } else if (drawTool === 'zone') {
        const z = await createZone({ office_id:officeId, label:'NEW ZONE', x:pos.cx-10, y:pos.cy-7, w:20, h:14, color:colorDraft })
        reload(); selectItem('zone', { ...z, w:20, h:14 })
      } else {
        const b = await createLayoutBlock({ office_id:officeId, block_type:drawTool, x:pos.cx-5, y:pos.cy-3, w:10, h:6 })
        reload(); selectItem('block', { ...b, w:10, h:6 })
      }
    } catch (e) { setError(e.message) }
  }

  async function handleClusterDrop(id, cx, cy) {
    try { await updateClusterPos(id, cx, cy); setClusters(p => p.map(c => c.id===id?{...c,cx,cy}:c)) }
    catch (e) { setError(e.message) }
  }
  async function handleBlockDrop(id, x, y) {
    try { await updateLayoutBlock(id, { x, y }); setBlocks(p => p.map(b => b.id===id?{...b,x,y}:b)) }
    catch (e) { setError(e.message) }
  }
  async function handleZoneDrop(id, x, y) {
    try { await updateZone(id, { x, y }); setZones(p => p.map(z => z.id===id?{...z,x,y}:z)) }
    catch (e) { setError(e.message) }
  }

  async function handleDeleteSelected() {
    if (!selected) return
    try {
      if (selected.type==='seat')    await deleteSeat(selected.data.id)
      if (selected.type==='cluster') await deleteCluster(selected.data.id)
      if (selected.type==='block')   await deleteLayoutBlock(selected.data.id)
      if (selected.type==='zone')    await deleteZone(selected.data.id)
      setSelected(null); setSelectedId(null); reload()
    } catch (e) { setError(e.message) }
  }

  async function handleSaveZone() {
    try { await updateZone(selected.data.id, { label:labelDraft, w:Number(sizeDraft.w), h:Number(sizeDraft.h), color:colorDraft }); reload() }
    catch (e) { setError(e.message) }
  }
  async function handleSaveBlock() {
    try { await updateLayoutBlock(selected.data.id, { label:labelDraft, w:Number(sizeDraft.w), h:Number(sizeDraft.h) }); reload() }
    catch (e) { setError(e.message) }
  }
  async function handleSaveSeat(updated) {
    try { await saveSeat(updated); setSeats(p => p.map(s => s.id===updated.id?{...s,...updated}:s)); setEditing(null) }
    catch (e) { setError(e.message) }
  }

  async function handleAiGenerate(file) {
    if (!file) return
    setAiLoading(true); setAiError('')
    try {
      const b64 = await fileToBase64(file)
      const layout = await generateFloorPlanFromPhoto(b64, file.type||'image/jpeg')
      await Promise.all([
        ...clusters.map(c => deleteCluster(c.id)),
        ...blocks.map(b => deleteLayoutBlock(b.id)),
        ...zones.map(z => deleteZone(z.id)),
        ...seats.filter(s => !s.cluster_id).map(s => deleteSeat(s.id)),
      ])
      const prefix = `B${office.name.match(/(\d+)\s*$/)?.[1]??'1'}`
      let cn = 1
      await Promise.all([
        ...(layout.blocks||[]).map(b => createLayoutBlock({ office_id:officeId, block_type:b.block_type, x:b.x, y:b.y, w:b.w, h:b.h, label:b.label||null })),
        ...(layout.zones||[]).map(z => createZone({ office_id:officeId, label:z.label, x:z.x, y:z.y, w:z.w, h:z.h, color:z.color||'rgba(99,102,241,0.07)' })),
        ...(layout.clusters||[]).map(cl => {
          const p = `${prefix}-C${String(cn++).padStart(2,'0')}`
          return createCluster(officeId, cl.cx, cl.cy, cl.cluster_type||'4', p)
        }),
      ])
      setAiModal(false); reload()
    } catch (e) { setAiError(e.message) }
    setAiLoading(false)
  }

  return (
    <div style={{ display:'flex', gap:20 }}>
      <div style={{ flex:1, minWidth:0 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:8 }}>
            {offices.map(o => (
              <Button key={o.id} size="sm" variant={o.id===officeId?'primary':'secondary'} onClick={() => setOfficeId(o.id)}>
                {o.name}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={() => setAiModal(true)}>
            <Wand2 size={14}/> AI Generate from photo / layout
          </Button>
        </div>

        {/* Toolbar */}
        <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
          {PRESET_TOOLS.map(t => (
            <Button key={String(t.key)} size="sm"
              variant={drawTool === t.key ? 'primary' : 'secondary'}
              onClick={() => handleToolClick(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <p style={{ fontSize:12, color:'var(--text-tertiary)', marginBottom:10 }}>
          {!drawTool && 'Select / Move — click a table to select, drag it to reposition.'}
          {drawTool?.startsWith('cluster:') && `Click on the floor plan to place a ${clusterLabel(drawTool.split(':')[1])}.`}
          {drawTool === 'zone' && 'Click to place a zone area. Resize it in the panel →'}
          {['room','sitting','entrance','wall'].includes(drawTool) && `Click to place a ${drawTool}. Resize in the panel →`}
        </p>

        {error && <p style={{ fontSize:12, color:'var(--danger)', marginBottom:10 }}>{error}</p>}

        {/* Legend */}
        <div style={{ display:'flex', gap:14, marginBottom:12, fontSize:12, color:'var(--text-tertiary)', alignItems:'center' }}>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width={14} height={14}><circle cx={7} cy={7} r={5} fill="#3DD68C" stroke="#1DB370" strokeWidth={1.5}/></svg> Vacant
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width={14} height={14}><circle cx={7} cy={7} r={5} fill="#fff" stroke="#B8C6D4" strokeWidth={1.5}/></svg> Occupied
          </span>
        </div>

        <Card padding="12px" style={{ overflow:'auto' }}>
          {loading ? (
            <div style={{ height:400, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-tertiary)' }}>Loading…</div>
          ) : (
            <SvgFloorMap
              seats={seats} blocks={blocks} zones={zones} clusters={clusters}
              isAdmin editable={isDragMode}
              selectedId={selectedId}
              onSelectDesk={seat => selectItem('seat', seat)}
              onSelectCluster={c => selectItem('cluster', c)}
              onSelectBlock={b => selectItem('block', b)}
              onSelectZone={z => selectItem('zone', z)}
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
          {/* Seat */}
          {selected.type==='seat' && (
            <>
              <p style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>Desk</p>
              <p style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>{selected.data.seat_number}</p>
              {selected.data.occupied && (
                <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:14 }}>
                  <div style={{ fontWeight:600 }}>{selected.data.name}</div>
                  <div>{selected.data.org} · {selected.data.collab}</div>
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <Button size="sm" onClick={() => setEditing(selected.data)}>Edit occupant</Button>
                <Button size="sm" variant="danger" onClick={handleDeleteSelected}><Trash2 size={14}/> Remove desk</Button>
              </div>
            </>
          )}

          {/* Cluster */}
          {selected.type==='cluster' && (
            <>
              <p style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>Table</p>
              <p style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{clusterLabel(selected.data.cluster_type)}</p>
              <p style={{ fontSize:12, color:'var(--text-tertiary)', marginBottom:14 }}>
                {seats.filter(s=>s.cluster_id===selected.data.id).length} seats ·{' '}
                {seats.filter(s=>s.cluster_id===selected.data.id&&s.occupied).length} occupied
              </p>
              <p style={{ fontSize:12, color:'var(--text-tertiary)', marginBottom:14 }}>
                Drag this table on the map to reposition it.
              </p>
              <Button size="sm" variant="danger" onClick={handleDeleteSelected}><Trash2 size={14}/> Delete table</Button>
            </>
          )}

          {/* Zone */}
          {selected.type==='zone' && (
            <>
              <p style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Zone</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                <Input label="Name" value={labelDraft} onChange={e=>setLabelDraft(e.target.value)} placeholder="e.g. MARKETING" />
                <div style={{ display:'flex', gap:8 }}>
                  <Input label="Width %" type="number" value={sizeDraft.w} onChange={e=>setSizeDraft(s=>({...s,w:e.target.value}))} />
                  <Input label="Height %" type="number" value={sizeDraft.h} onChange={e=>setSizeDraft(s=>({...s,h:e.target.value}))} />
                </div>
                <Input label="Color (rgba)" value={colorDraft} onChange={e=>setColorDraft(e.target.value)} />
                <Button size="sm" onClick={handleSaveZone}>Save zone</Button>
              </div>
              <Button size="sm" variant="danger" onClick={handleDeleteSelected}><Trash2 size={14}/> Delete</Button>
            </>
          )}

          {/* Block */}
          {selected.type==='block' && (
            <>
              <p style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {selected.data.block_type}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                <Input label="Label" value={labelDraft} onChange={e=>setLabelDraft(e.target.value)} placeholder="e.g. Meeting Room" />
                <div style={{ display:'flex', gap:8 }}>
                  <Input label="Width %" type="number" value={sizeDraft.w} onChange={e=>setSizeDraft(s=>({...s,w:e.target.value}))} />
                  <Input label="Height %" type="number" value={sizeDraft.h} onChange={e=>setSizeDraft(s=>({...s,h:e.target.value}))} />
                </div>
                <Button size="sm" onClick={handleSaveBlock}>Save</Button>
              </div>
              <Button size="sm" variant="danger" onClick={handleDeleteSelected}><Trash2 size={14}/> Delete</Button>
            </>
          )}
        </Card>
      )}

      {/* Custom table modal */}
      <Modal open={customModal} onClose={() => setCustomModal(false)} title="Custom table"
        footer={<>
          <Button variant="ghost" onClick={() => setCustomModal(false)}>Cancel</Button>
          <Button onClick={handleCustomConfirm}>Place on map</Button>
        </>}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Input label="Seats per side" type="number" min="1" max="10" value={customSeats}
            onChange={e => setCustomSeats(Math.min(10, Math.max(1, Number(e.target.value))))} />
          <div>
            <p style={{ fontSize:13, fontWeight:500, color:'var(--text-secondary)', marginBottom:8 }}>Seating arrangement</p>
            {[
              { val:'1', label:'Single-sided', desc:'Chairs on one side only, all facing the same way' },
              { val:'2', label:'Double-sided (facing each other)', desc:'Chairs on both sides, facing across the table' },
            ].map(opt => (
              <label key={opt.val} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10, cursor:'pointer' }}>
                <input type="radio" name="sided" value={opt.val} checked={customSided===opt.val}
                  onChange={() => setCustomSided(opt.val)} style={{ marginTop:2, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{opt.label}</div>
                  <div style={{ fontSize:12, color:'var(--text-tertiary)' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ padding:'12px', background:'var(--surface-2)', borderRadius:8, fontSize:12, color:'var(--text-secondary)' }}>
            This will create a <strong>{customSided==='1' ? customSeats : `${customSeats}+${customSeats}`}-seat table</strong>
            {customSided==='2' ? ' with chairs facing each other across the table.' : ' with chairs on one side.'}
          </div>
        </div>
      </Modal>

      {/* AI modal */}
      <Modal open={aiModal} onClose={() => { setAiModal(false); setAiError('') }}
        title="AI — Generate from photo or layout diagram"
        footer={<Button variant="ghost" onClick={() => setAiModal(false)}>Cancel</Button>}
      >
        <p style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:10, lineHeight:1.6 }}>
          Upload any of these and Claude AI will generate an editable floor map:
        </p>
        <ul style={{ fontSize:13, color:'var(--text-secondary)', paddingLeft:20, marginBottom:14, lineHeight:2 }}>
          <li>Overhead or wide-angle office photo</li>
          <li>Screenshot of your Excel/spreadsheet seating layout</li>
          <li>A hand-drawn or printed floor plan sketch</li>
          <li>Any other diagram showing desk positions</li>
        </ul>
        <p style={{ fontSize:12, color:'var(--danger)', marginBottom:14 }}>
          ⚠ Replaces the current layout for this office. This cannot be undone.
        </p>
        {aiError && <p style={{ fontSize:12, color:'var(--danger)', marginBottom:10 }}>{aiError}</p>}
        <Button variant="primary" loading={aiLoading} onClick={() => aiFileRef.current?.click()}>
          <Upload size={14}/> {aiLoading ? 'Analysing…' : 'Choose file'}
        </Button>
        <input ref={aiFileRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => handleAiGenerate(e.target.files?.[0])} />
      </Modal>

      {editing && (
        <EditSeatModal seat={editing} orgs={orgs.length?orgs:['New organisation']}
          onSave={handleSaveSeat} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
