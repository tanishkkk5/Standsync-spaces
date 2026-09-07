import { SeatChip } from './SeatChip'

// Structural markers are presentational only — they render alongside the
// bay's row_index values but aren't stored per-seat.
const WALL_BEFORE_ROW = 4
const SITTING_AREA_BEFORE_ROW = 6

export function FloorPlan({ seats, isAdmin, onSeatClick, hovered, onHover }) {
  const pods = groupPods(seats)
  const bayRows = groupBayRows(seats)

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pods.map((pod, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 8,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 34px)',
              gap: 6,
              background: 'var(--surface)',
            }}
          >
            {pod.map(seat => (
              <SeatChip
                key={seat.id}
                seat={seat}
                facing="left"
                isAdmin={isAdmin}
                onEdit={onSeatClick}
                onHover={onHover}
                active={hovered?.id === seat.id}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
        {bayRows.map((row, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {i === WALL_BEFORE_ROW && (
              <div
                style={{
                  background: 'var(--text-tertiary)',
                  color: '#fff',
                  fontSize: 11,
                  letterSpacing: '0.05em',
                  textAlign: 'center',
                  padding: '3px 0',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                Wall
              </div>
            )}
            {i === SITTING_AREA_BEFORE_ROW && (
              <div
                style={{
                  background: 'var(--warning-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                }}
              >
                Sitting area — informal / overflow seating
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {row.seats.map(seat => (
                <SeatChip
                  key={seat.id}
                  seat={seat}
                  facing={row.facing}
                  isAdmin={isAdmin}
                  onEdit={onSeatClick}
                  onHover={onHover}
                  active={hovered?.id === seat.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function groupPods(seats) {
  const pods = new Map()
  seats
    .filter(s => s.section === 'pod')
    .forEach(s => {
      if (!pods.has(s.pod_index)) pods.set(s.pod_index, [])
      pods.get(s.pod_index).push(s)
    })
  return [...pods.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, group]) => group.sort((a, b) => a.col_index - b.col_index))
}

function groupBayRows(seats) {
  const rows = new Map()
  seats
    .filter(s => s.section === 'bay')
    .forEach(s => {
      if (!rows.has(s.row_index)) rows.set(s.row_index, { facing: s.facing, seats: [] })
      rows.get(s.row_index).seats.push(s)
    })
  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) => ({ ...row, seats: row.seats.sort((a, b) => a.col_index - b.col_index) }))
}
