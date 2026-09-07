import { useEffect, useState } from 'react'
import { MousePointer2, Trash2 } from 'lucide-react'
import { Button } from '../../foundation/ui/Button'
import { Card } from '../../foundation/ui/Card'
import { Input } from '../../foundation/ui/Input'
import {
  fetchOffices, fetchSeats, fetchLayoutBlocks,
  createSeat, deleteSeat, moveSeat,
  createLayoutBlock, deleteLayoutBlock, updateLayoutBlock,
  updateOfficeGrid,
} from './api'

const TOOLS = [
  { key: 'select', label: 'Select / Move', icon: MousePointer2 },
  { key: 'seat', label: 'Add seat' },
  { key: 'wall', label: 'Add wall' },
  { key: 'sitting', label: 'Add sitting area' },
  { key: 'entrance', label: 'Add entrance' },
  { key: 'erase', label: 'Eraser' },
]

const CELL = 28

export default function LayoutEditorPage() {
  const [offices, setOffices] = useState([])
  const [officeId, setOfficeId] = useState(null)
  const [seats, setSeats] = useState([])
  const [blocks, setBlocks] = useState([])
  const [tool, setTool] = useState('select')
  const [drag, setDrag] = useState(null) // { kind: 'draw' | 'move', ... }
  const [hoverCell, setHoverCell] = useState(null)
  const [seatCounter, setSeatCounter] = useState(1)
  const [selected, setSelected] = useState(null) // { type: 'seat'|'block', data }
  const [labelDraft, setLabelDraft] = useState('')
  const [sizeDraft, setSizeDraft] = useState({ w: 1, h: 1 })
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
    setSelected(null)
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

  useEffect(() => {
    if (selected?.type === 'block') {
      setLabelDraft(selected.data.label || '')
      setSizeDraft({ w: selected.data.w, h: selected.data.h })
    }
  }, [selected])

  if (!office) return null

  function seatAt(x, y) {
    return seats.find(s => s.x === x && s.y === y)
  }
  function blockAt(x, y) {
    return blocks.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)
  }
  function clamp(v, max) {
    return Math.max(0, Math.min(max, v))
  }

  function handleCellDown(x, y) {
    setError('')

    if (tool === 'select') {
      const seat = seatAt(x, y)
      const block = !seat && blockAt(x, y)
      if (seat) {
        setSelected({ type: 'seat', data: seat })
        setDrag({ kind: 'move', type: 'seat', id: seat.id, origin: { x: seat.x, y: seat.y }, startCell: { x, y }, w: 1, h: 1 })
      } else if (block) {
        setSelected({ type: 'block', data: block })
        setDrag({ kind: 'move', type: 'block', id: block.id, origin: { x: block.x, y: block.y }, startCell: { x, y }, w: block.w, h: block.h })
      } else {
        setSelected(null)
      }
      return
    }

    if (tool === 'seat') {
      if (seatAt(x, y) || blockAt(x, y)) return
      const prefix = office.name.match(/(\d+)\s*$/)?.[1] ?? '1'
      const seatNumber = `B${prefix}-${String(seatCounter).padStart(2, '0')}`
      createSeat(officeId, x, y, seatNumber).then(() => { setSeatCounter(c => c + 1); reload() }).catch(e => setError(e.message))
      return
    }

    if (tool === 'erase') {
      const seat = seatAt(x, y)
      if (seat) { deleteSeat(seat.id).then(reload).catch(e => setError(e.message)); return }
      const block = blockAt(x, y)
      if (block) { deleteLayoutBlock(block.id).then(reload).catch(e => setError(e.message)); return }
      return
    }

    // draw a new wall / sitting area / entrance
    setDrag({ kind: 'draw', type: tool, start: { x, y } })
    setHoverCell({ x, y })
  }

  function handleCellEnter(x, y) {
    if (drag) setHoverCell({ x, y })
  }

  async function handleMouseUp() {
    if (!drag) return

    if (drag.kind === 'draw' && hoverCell) {
      const x = Math.min(drag.start.x, hoverCell.x)
      const y = Math.min(drag.start.y, hoverCell.y)
      const w = Math.abs(hoverCell.x - drag.start.x) + 1
      const h = Math.abs(hoverCell.y - drag.start.y) + 1
      try {
        await createLayoutBlock({ office_id: officeId, x, y, w, h, block_type: drag.type })
        reload()
      } catch (e) {
        setError(e.message)
      }
    }

    if (drag.kind === 'move' && hoverCell) {
      const dx = hoverCell.x - drag.startCell.x
      const dy = hoverCell.y - drag.startCell.y
      const newX = clamp(drag.origin.x + dx, office.grid_cols - drag.w)
      const newY = clamp(drag.origin.y + dy, office.grid_rows - drag.h)
      try {
        if (drag.type === 'seat') {
          await moveSeat(drag.id, newX, newY)
        } else {
          await updateLayoutBlock(drag.id, { x: newX, y: newY })
        }
        reload()
      } catch (e) {
        setError(e.message)
      }
    }

    setDrag(null)
    setHoverCell(null)
  }

  function previewRect() {
    if (!drag || !hoverCell) return null
    if (drag.kind === 'draw') {
      const x = Math.min(drag.start.x, hoverCell.x)
      const y = Math.min(drag.start.y, hoverCell.y)
      const w = Math.abs(hoverCell.x - drag.start.x) + 1
      const h = Math.abs(hoverCell.y - drag.start.y) + 1
      return { x, y, w, h }
    }
    const dx = hoverCell.x - drag.startCell.x
    const dy = hoverCell.y - drag.startCell.y
    return {
      x: clamp(drag.origin.x + dx, office.grid_cols - drag.w),
      y: clamp(drag.origin.y + dy, office.grid_rows - drag.h),
      w: drag.w,
      h: drag.h,
    }
  }

  function isPreviewing(x, y) {
    const r = previewRect()
    if (!r) return false
    return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h
  }

  async function handleGridResize() {
    try {
      await updateOfficeGrid(officeId, Number(gridDraft.cols), Number(gridDraft.rows))
      setOffices(prev => prev.map(o => (o.id === officeId ? { ...o, grid_cols: Number(gridDraft.cols), grid_rows: Number(gridDraft.rows) } : o)))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleSaveLabel() {
    if (selected?.type !== 'block') return
    try {
      await updateLayoutBlock(selected.data.id, { label: labelDraft })
      reload()
      setSelected(s => (s ? { ...s, data: { ...s.data, label: labelDraft } } : s))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleApplySize() {
    if (selected?.type !== 'block') return
    try {
      const w = Math.max(1, Number(sizeDraft.w))
      const h = Math.max(1, Number(sizeDraft.h))
      await updateLayoutBlock(selected.data.id, { w, h })
      reload()
      setSelected(null)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDeleteSelected() {
    if (!selected) return
    try {
      if (selected.type === 'seat') await deleteSeat(selected.data.id)
      else await deleteLayoutBlock(selected.data.id)
      setSelected(null)
      reload()
    } catch (e) {
      setError(e.message)
    }
  }

  const cells = []
  for (let y = 0; y < office.grid_rows; y++) {
    for (let x = 0; x < office.grid_cols; x++) cells.push({ x, y })
  }

  return (
    <div style={{ display: 'flex', gap: 20 }} onMouseUp={handleMouseUp} onMouseLeave={() => { setDrag(null); setHoverCell(null) }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {offices.map(o => (
            <Button key={o.id} size="sm" variant={o.id === officeId ? 'primary' : 'secondary'} onClick={() => setOfficeId(o.id)}>
              {o.name}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TOOLS.map(t => (
              <Button key={t.key} size="sm" variant={tool === t.key ? 'primary' : 'secondary'} onClick={() => { setTool(t.key); setSelected(null) }}>
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
          {tool === 'select' && 'Click a seat or block to select it, or click-drag it to move it.'}
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
              const isSelected =
                (selected?.type === 'seat' && seat?.id === selected.data.id) ||
                (selected?.type === 'block' && block?.id === selected.data.id)

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
                  title={seat ? seat.seat_number : block ? (block.label || block.block_type) : `${x}, ${y}`}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 4,
                    background,
                    border: isSelected ? '2px solid var(--text-primary)' : '1px solid var(--border)',
                    cursor: tool === 'select' ? 'grab' : 'pointer',
                  }}
                />
              )
            })}
          </div>
        </Card>
      </div>

      {selected && (
        <Card padding="20px" style={{ width: 260, flexShrink: 0, height: 'fit-content' }}>
          {selected.type === 'seat' ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>Seat</p>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{selected.data.seat_number}</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
                Occupant details are edited from the Seating map tab. Drag this seat on the grid to move it.
              </p>
              <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                <Trash2 size={14} /> Remove seat
              </Button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'capitalize' }}>
                {selected.data.block_type}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                <Input
                  label="Label"
                  value={labelDraft}
                  onChange={e => setLabelDraft(e.target.value)}
                  placeholder="e.g. Main entrance"
                />
                <Button size="sm" variant="secondary" onClick={handleSaveLabel}>Save label</Button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Input label="Width" type="number" min="1" value={sizeDraft.w}
                    onChange={e => setSizeDraft(s => ({ ...s, w: e.target.value }))} />
                  <Input label="Height" type="number" min="1" value={sizeDraft.h}
                    onChange={e => setSizeDraft(s => ({ ...s, h: e.target.value }))} />
                </div>
                <Button size="sm" variant="secondary" onClick={handleApplySize}>Resize</Button>
              </div>
              <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                <Trash2 size={14} /> Delete block
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
