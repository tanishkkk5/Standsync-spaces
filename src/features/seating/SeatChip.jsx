export function SeatChip({ seat, facing, isAdmin, onEdit, active, onHover }) {
  const bg = seat.occupied ? 'var(--danger)' : 'var(--success)'
  const ring = seat.occupied ? 'var(--danger-subtle)' : 'var(--success-subtle)'
  const arrow = facing === 'up' ? '↑' : facing === 'down' ? '↓' : '•'

  return (
    <div
      onMouseEnter={() => onHover(seat)}
      onMouseLeave={() => onHover(null)}
      onClick={() => isAdmin && onEdit(seat)}
      style={{
        width: 34,
        height: 34,
        borderRadius: 'var(--radius-sm)',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isAdmin ? 'pointer' : 'default',
        boxShadow: active ? `0 0 0 2px var(--text-primary)` : `0 0 0 3px ${ring}`,
        transform: active ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform var(--transition), box-shadow var(--transition)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#fff', opacity: 0.9 }}>
        {arrow}
      </span>
    </div>
  )
}

export function HoverCard({ seat }) {
  if (!seat) return null
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 260,
        background: 'var(--sidebar-bg)',
        color: '#fff',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 50,
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em', color: 'rgba(255,255,255,.5)' }}>
        {seat.seat_number}
      </div>
      {seat.occupied ? (
        <>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4, fontFamily: 'var(--font-display)' }}>
            {seat.name}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', marginTop: 6, lineHeight: 1.5 }}>
            {seat.org}
            <br />
            {seat.collab}
            <br />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{seat.email}</span>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 14, marginTop: 4, color: 'rgba(255,255,255,.72)' }}>Vacant</div>
      )}
    </div>
  )
}
