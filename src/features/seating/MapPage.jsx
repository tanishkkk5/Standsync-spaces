// MapPage — pure VIEW mode. No edit tools here.
import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '../../foundation/ui/Button'
import { Card } from '../../foundation/ui/Card'
import { Badge } from '../../foundation/ui/Card'
import { useAuth } from '../../auth/AuthProvider'
import {
  fetchOffices, fetchSeats, fetchLayoutBlocks, fetchZones, fetchClusters, saveSeat,
} from './api'
import { SvgFloorMap } from './SvgFloorMap'
import { EditSeatModal } from './EditSeatModal'

export default function MapPage({ onEditLayout }) {
  const { isAdmin } = useAuth()
  const [offices, setOffices] = useState([])
  const [officeId, setOfficeId] = useState(null)
  const [seats, setSeats] = useState([])
  const [blocks, setBlocks] = useState([])
  const [zones, setZones] = useState([])
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOffices().then(list => { setOffices(list); setOfficeId(list[0]?.id) })
  }, [])

  useEffect(() => {
    if (!officeId) return
    setLoading(true)
    Promise.all([fetchSeats(officeId), fetchLayoutBlocks(officeId), fetchZones(officeId), fetchClusters(officeId)])
      .then(([s, b, z, c]) => { setSeats(s); setBlocks(b); setZones(z); setClusters(c) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [officeId])

  const orgs = [...new Set(seats.map(s => s.org).filter(Boolean))]
  const hasLayout = clusters.length > 0 || blocks.length > 0

  async function handleSaveSeat(updated) {
    try {
      await saveSeat(updated)
      setSeats(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
      setEditing(null)
      setSelected(s => s?.data?.id === updated.id ? { ...s, data: { ...s.data, ...updated } } : s)
    } catch (e) { setError(e.message) }
  }

  return (
    <div style={{ display:'flex', gap:20 }}>
      <div style={{ flex:1, minWidth:0 }}>
        {/* Top row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:8 }}>
            {offices.map(o => (
              <Button key={o.id} size="sm" variant={o.id===officeId?'primary':'secondary'} onClick={() => { setOfficeId(o.id); setSelected(null) }}>
                {o.name}
              </Button>
            ))}
          </div>
          {isAdmin && (
            <Button size="sm" variant="ghost" onClick={onEditLayout} style={{ color:'var(--text-tertiary)', fontSize:12 }}>
              <Settings size={13} /> Edit layout
            </Button>
          )}
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:16, marginBottom:12, fontSize:12, color:'var(--text-tertiary)', alignItems:'center' }}>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width={14} height={14}><circle cx={7} cy={7} r={5} fill="#3DD68C" stroke="#1DB370" strokeWidth={1.5}/></svg> Vacant
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width={14} height={14}><circle cx={7} cy={7} r={5} fill="#fff" stroke="#B8C6D4" strokeWidth={1.5}/></svg> Occupied
          </span>
          <span>Hover a seat for details{isAdmin ? ' · click to edit' : ''}</span>
        </div>

        {error && <p style={{ fontSize:12, color:'var(--danger)', marginBottom:10 }}>{error}</p>}

        <Card padding="12px" style={{ overflow:'auto' }}>
          {loading ? (
            <div style={{ height:400, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-tertiary)', fontSize:13 }}>Loading…</div>
          ) : !hasLayout ? (
            <div style={{ height:400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, textAlign:'center' }}>
              <div style={{ fontSize:40 }}>🏢</div>
              <p style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)' }}>No floor plan yet</p>
              <p style={{ fontSize:13, color:'var(--text-tertiary)', maxWidth:340 }}>
                An admin can create the layout from the Edit layout page.
              </p>
              {isAdmin && <Button size="sm" onClick={onEditLayout}><Settings size={13}/> Go to Edit layout</Button>}
            </div>
          ) : (
            <SvgFloorMap
              seats={seats} blocks={blocks} zones={zones} clusters={clusters}
              isAdmin={isAdmin} editable={false}
              selectedId={selected?.data?.id}
              onSelectDesk={seat => {
                setSelected({ type:'seat', data:seat })
                if (isAdmin) setEditing(seat)
              }}
              onSelectCluster={() => {}}
              onSelectBlock={() => {}} onSelectZone={() => {}}
            />
          )}
        </Card>
      </div>

      {/* Info panel */}
      {selected?.type === 'seat' && !editing && (
        <Card padding="20px" style={{ width:220, flexShrink:0, alignSelf:'flex-start' }}>
          <p style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>Desk</p>
          <p style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>{selected.data.seat_number}</p>
          <Badge color={selected.data.occupied?'danger':'success'} style={{ marginBottom:12 }}>
            {selected.data.occupied ? 'Occupied' : 'Vacant'}
          </Badge>
          {selected.data.occupied && (
            <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:14 }}>
              <div style={{ fontWeight:600 }}>{selected.data.name}</div>
              <div>{selected.data.org}</div>
              <div>{selected.data.collab}</div>
              <div style={{ color:'var(--text-tertiary)', fontSize:12 }}>{selected.data.email}</div>
            </div>
          )}
          {isAdmin && <Button size="sm" onClick={() => setEditing(selected.data)}>Edit occupant</Button>}
        </Card>
      )}

      {editing && (
        <EditSeatModal
          seat={editing}
          orgs={orgs.length ? orgs : ['New organisation']}
          onSave={handleSaveSeat}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
