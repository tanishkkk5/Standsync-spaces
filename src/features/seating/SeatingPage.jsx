import { useEffect, useRef, useState } from 'react'
import { Download, Upload, MapPin, AlertCircle, LayoutGrid, Image } from 'lucide-react'
import { Button } from '../../foundation/ui/Button'
import { Card } from '../../foundation/ui/Card'
import { Skeleton } from '../../foundation/ui/misc'
import { useAuth } from '../../auth/AuthProvider'
import { fetchOffices, fetchSeats, fetchLayoutBlocks, saveSeat, applySheetRows } from './api'
import { downloadSheet, parseSheetFile } from './sheet'
import { FloorPlan } from './FloorPlan'
import { PhotoFloorPlan } from './PhotoFloorPlan'
import { HoverCard } from './SeatChip'
import { EditSeatModal } from './EditSeatModal'

export default function SeatingPage() {
  const { isAdmin } = useAuth()
  const [offices, setOffices] = useState([])
  const [officeId, setOfficeId] = useState(null)
  const [seats, setSeats] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState(null)
  const [editing, setEditing] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [view, setView] = useState('grid')
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchOffices()
      .then(list => {
        setOffices(list)
        setOfficeId(list[0]?.id ?? null)
      })
      .catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    if (!officeId) return
    setLoading(true)
    Promise.all([fetchSeats(officeId), fetchLayoutBlocks(officeId)])
      .then(([s, b]) => {
        setSeats(s)
        setBlocks(b)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [officeId])

  const office = offices.find(o => o.id === officeId)
  const orgs = [...new Set(seats.map(s => s.org).filter(Boolean))]
  const orgOptions = orgs.length ? orgs : ['New organisation']

  async function handleSave(updated) {
    setError('')
    try {
      await saveSeat(updated)
      setSeats(prev => prev.map(s => (s.id === updated.id ? { ...s, ...updated } : s)))
      setEditing(null)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setNote('')
    try {
      const rows = await parseSheetFile(file)
      const count = await applySheetRows(officeId, rows)
      const refreshed = await fetchSeats(officeId)
      setSeats(refreshed)
      setNote(`Updated ${count} seats from "${file.name}".`)
    } catch (err) {
      setError(err.message)
    }
    e.target.value = ''
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {offices.map(o => (
            <Button
              key={o.id}
              variant={o.id === officeId ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setOfficeId(o.id)}
            >
              {o.name}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {office?.floor_plan_url && (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button variant={view === 'grid' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('grid')}>
                <LayoutGrid size={14} /> Grid
              </Button>
              <Button variant={view === 'photo' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('photo')}>
                <Image size={14} /> Floor plan
              </Button>
            </div>
          )}

        {isAdmin && office && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => downloadSheet(office.name, seats)}>
              <Download size={14} /> Download sheet
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Upload sheet
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </div>
        )}
        </div>
      </div>

      {(note || error) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            marginBottom: 14,
            color: error ? 'var(--danger)' : 'var(--success)',
          }}
        >
          <AlertCircle size={13} /> {error || note}
        </div>
      )}

      <div style={{ display: 'flex', gap: 18, marginBottom: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--success)' }} /> Vacant
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--danger)' }} /> Occupied
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={13} /> Hover a seat for details{isAdmin ? ' · click to edit' : ''}
        </span>
      </div>

      <Card padding="20px" style={{ overflowX: 'auto' }}>
        {loading ? (
          <Skeleton height={400} />
        ) : view === 'photo' && office.floor_plan_url ? (
          <PhotoFloorPlan
            office={office}
            seats={seats}
            isAdmin={isAdmin}
            editable={false}
            onSeatClick={setEditing}
          />
        ) : (
          <FloorPlan
            office={office}
            seats={seats}
            blocks={blocks}
            isAdmin={isAdmin}
            onSeatClick={setEditing}
            hovered={hovered}
            onHover={setHovered}
          />
        )}
      </Card>

      <HoverCard seat={hovered} />
      {editing && (
        <EditSeatModal seat={editing} orgs={orgOptions} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
