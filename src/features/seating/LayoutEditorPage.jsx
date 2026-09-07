import { useEffect, useState } from 'react'
import { Button } from '../../foundation/ui/Button'
import { Card } from '../../foundation/ui/Card'
import { Input } from '../../foundation/ui/Input'
import {
  fetchOffices, fetchSeats, fetchLayoutBlocks,
  createSeat, deleteSeat, createLayoutBlock, deleteLayoutBlock, updateOfficeGrid,
} from './api'

const TOOLS = [
  { key: 'seat', label: 'Seat' },
  { key: 'wall', label: 'Wall' },
  { key: 'sitting', label: 'Sitting area' },
  { key: 'entrance', label: 'Entrance' },
  { key: 'erase', label: 'Eraser' },
]

const CELL = 28

export default function LayoutEditorPage() {
  const [offices, setOffices] = useState([])
  const [officeId, setOfficeId] = useState(null)
  const [seats, setSeats] = useState([])
  const [blocks, setBlocks] = useState([])
  const [tool, setTool] = useState('seat')
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)
  const [seatCounter, setSeatCounter] = useState(1)
  const [error, setError] = useState('')
  const [gridDraft, setGridDraft] = useState({ cols: 10, rows: 11 })

  useEffect(() => {
    fetchOffices().then(list => {
      setOffices(list)
      setOfficeId(list[0]?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (officeId) reload()
  }, [officeId])

  async function reload() {
    try {
      const [s, b] = await Promise.all([fetchSeats(officeId), fetchLayoutBlocks(officeId)])
      setSeats(s)
      setBlocks(b)
      setSeatCounter(s.length + 1)
    } catch (e) {
      setError(e.message)
    }
  }

  const office = offices.find(o => o.id === officeId)

  useEffect(() => {
    if (office) setGridDraft({ cols: office.grid_cols, rows: office.grid_rows })
  }, [office?.id])

  if (!office) return null

  function seatAt(x, y) {
    return seats.find(s => s.x === x && s.y === y)
  }
  function blockAt(x, y) {
    return blocks.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)
  }

  async function handleCellDown(x, y) {
    setError('')
    try {
      if (tool === 'seat') {
        if (seatAt(x, y) || blockAt(x, y)) return
        const prefix = office.name.match(/(\d+)\s*$/)?.[1] ?? '1'
        const seatNumber = `B${prefix}-${String(seatCounter).padStart(2, '0')}`
        await createSeat(officeId, x, y, seatNumber)
        setSeatCounter(c => c + 1)
        reload()
        return
      }
      if (tool === 'erase') {
        const seat = seatAt(x, y)
        if (seat) {
          await deleteSeat(seat.id)
          reload()
          return
        }
        const block = blockAt(x, y)
        if (block) {
          await deleteLayoutBlock(block.id)
          reload()
        }
        return
      }
      // wall / sitting / entrance — start a drag
      setDragStart({ x, y })
      setDragEnd({ x, y })
    } catch (e) {
      setError(e.message)
    }
  }

  function handleCellEnter(x, y) {
    if (dragStart) setDragEnd({ x, y })
  }

  async function handleMouseUp() {
    if (dragStart && dragEnd && ['wall', 'sitting', 'entrance'].includes(tool)) {
      const x = Math.min(dragStart.x, dragEnd.x)
      const y = Math.min(dragStart.y, dragEnd.y)
      const w = Math.abs(dragEnd.x - dragStart.x) + 1
      const h = Math.abs(dragEnd.y - dragStart.y) + 1
      try {
        await createLayoutBlock({ office_id: officeId, x, y, w, h, block_type: tool })
        reload()
      } catch (e) {
        setError(e.message)
      }
    }
    setDragStart(null)
    setDragEnd(null)
  }

  function isPreviewing(x, y) {
    if (!dragStart || !dragEnd) return false
    const minX = Math.min(dragStart.x, dragEnd.x)
    const maxX = Math.max(dragStart.x, dragEnd.x)
    const minY = Math.min(dragStart.y, dragEnd.y)
    const maxY = Math.max(dragStart.y, dragEnd.y)
    return x >= minX && x <= maxX && y >= minY && y <= maxY
  }

  async function handleGridResize() {
    try {
      await updateOfficeGrid(officeId, Number(gridDraft.cols), Number(gridDraft.rows))
      const updated = offices.map(o => (o.id === officeId ? { ...o, grid_cols: Number(gridDraft.cols), grid_rows: Number(gridDraft.rows) } : o))
      setOffices(updated)
    } catch (e) {
      setError(e.message)
    }
  }

  const cells = []
  for (let y = 0; y < office.grid_rows; y++) {
    for (let x = 0; x < office.grid_cols; x++) cells.push({ x, y })
  }

  return (
    <div onMouseUp={handleMouseUp} onMouseLeave={() => { setDragStart(null); setDragEnd(null) }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {offices.map(o => (
          <Button
            key={o.id}
            size="sm"
            variant={o.id === officeId ? 'primary' : 'secondary'}
            onClick={() => setOfficeId(o.id)}
          >
            {o.name}
          </Button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {TOOLS.map(t => (
            <Button
              key={t.key}
              size="sm"
              variant={tool === t.key ? 'primary' : 'secondary'}
              onClick={() => setTool(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Input label="Columns" type="number" min="1" style={{ width: 90 }}
            value={gridDraft.cols} onChange={e => setGridDraft(g => ({ ...g, cols: e.target.value }))} />
          <Input label="Rows" type="number" min="1" style={{ width: 90 }}
            value={gridDraft.rows} onChange={e => setGridDraft(g => ({ ...g, rows: e.target.value }))} />
          <Button size="sm" variant="secondary" onClick={handleGridResize}>Resize grid</Button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
        {tool === 'seat' && 'Click an empty cell to add a seat.'}
        {tool === 'erase' && 'Click a seat or block to remove it.'}
        {['wall', 'sitting', 'entrance'].includes(tool) && 'Click and drag to draw a block, release to place it.'}
      </p>

      {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}

      <Card padding="16px" style={{ overflow: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${office.grid_cols}, ${CELL}px)`,
            gridTemplateRows: `repeat(${office.grid_rows}, ${CELL}px)`,
            gap: 3,
            width: 'fit-content',
            userSelect: 'none',
          }}
        >
          {cells.map(({ x, y }) => {
            const seat = seatAt(x, y)
            const block = blockAt(x, y)
            const preview = isPreviewing(x, y)
            let background = 'var(--surface-2)'
            if (seat) background = seat.occupied ? 'var(--danger)' : 'var(--success)'
            else if (block) {
              background =
                block.block_type === 'wall' ? 'var(--text-tertiary)'
                : block.block_type === 'sitting' ? 'var(--warning-subtle)'
                : 'var(--accent)'
            } else if (preview) background = 'var(--accent-subtle)'

            return (
              <div
                key={`${x}-${y}`}
                onMouseDown={() => handleCellDown(x, y)}
                onMouseEnter={() => handleCellEnter(x, y)}
                title={seat ? seat.seat_number : block ? block.block_type : `${x}, ${y}`}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 4,
                  background,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              />
            )
          })}
        </div>
      </Card>
    </div>
  )
}
