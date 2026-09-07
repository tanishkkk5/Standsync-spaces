import { useRef, useState } from 'react'

export function PhotoFloorPlan({ office, seats, isAdmin, editable, onSeatClick, onPinCreate, onPinMove }) {
  const imgRef = useRef(null)
  const [hovered, setHovered] = useState(null)
  const [dragging, setDragging] = useState(null) // seat id being dragged

  function relativePos(e) {
    const rect = imgRef.current.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    return { x, y }
  }

  function handleImageClick(e) {
    if (!editable || dragging) return
    const { x, y } = relativePos(e)
    onPinCreate?.(x, y)
  }

  function handlePinMouseDown(e, seat) {
    if (!editable) return
    e.stopPropagation()
    setDragging(seat.id)
  }

  function handleMouseMove(e) {
    if (!dragging) return
    const { x, y } = relativePos(e)
    onPinMove?.(dragging, x, y)
  }

  function handleMouseUp() {
    setDragging(null)
  }

  const shown = seats.filter(s => s.pin_x != null && s.pin_y != null)

  return (
    <div
      style={{ position: 'relative', width: '100%', userSelect: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <img
        ref={imgRef}
        src={office.floor_plan_url}
        alt={`${office.name} floor plan`}
        onClick={handleImageClick}
        style={{ width: '100%', display: 'block', borderRadius: 'var(--radius)', cursor: editable ? 'crosshair' : 'default' }}
        draggable={false}
      />

      {shown.map(seat => {
        const isHot = hovered === seat.id || dragging === seat.id
        return (
          <div
            key={seat.id}
            onMouseDown={e => handlePinMouseDown(e, seat)}
            onMouseEnter={() => setHovered(seat.id)}
            onMouseLeave={() => setHovered(h => (h === seat.id ? null : h))}
            onClick={e => {
              e.stopPropagation()
              if (!editable && isAdmin) onSeatClick?.(seat)
            }}
            style={{
              position: 'absolute',
              left: `${seat.pin_x * 100}%`,
              top: `${seat.pin_y * 100}%`,
              transform: 'translate(-50%, -50%)',
              cursor: editable ? 'grab' : isAdmin ? 'pointer' : 'default',
              zIndex: isHot ? 10 : 1,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: seat.occupied ? 'var(--danger)' : 'var(--success)',
                border: '2px solid #fff',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
            {isHot && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '130%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: seat.occupied ? 'var(--danger)' : 'var(--sidebar-bg)',
                  color: '#fff',
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {seat.occupied ? seat.name : seat.seat_number}
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: `5px solid ${seat.occupied ? 'var(--danger)' : 'var(--sidebar-bg)'}`,
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
