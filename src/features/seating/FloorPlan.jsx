import { SeatChip } from './SeatChip'

const BLOCK_STYLES = {
  wall: { background: 'var(--text-tertiary)', color: '#fff' },
  sitting: { background: 'var(--warning-subtle)', color: 'var(--text-primary)' },
  entrance: { background: 'var(--accent)', color: '#fff' },
}

export function FloorPlan({ office, seats, blocks, isAdmin, onSeatClick, hovered, onHover }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${office.grid_cols}, 34px)`,
        gridTemplateRows: `repeat(${office.grid_rows}, 34px)`,
        gap: 4,
      }}
    >
      {blocks.map(b => (
        <div
          key={b.id}
          style={{
            gridColumn: `${b.x + 1} / span ${b.w}`,
            gridRow: `${b.y + 1} / span ${b.h}`,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            ...BLOCK_STYLES[b.block_type],
          }}
        >
          {b.label || b.block_type}
        </div>
      ))}
      {seats.map(seat => (
        <div key={seat.id} style={{ gridColumn: seat.x + 1, gridRow: seat.y + 1 }}>
          <SeatChip
            seat={seat}
            facing={seat.facing}
            isAdmin={isAdmin}
            onEdit={onSeatClick}
            onHover={onHover}
            active={hovered?.id === seat.id}
          />
        </div>
      ))}
    </div>
  )
}
