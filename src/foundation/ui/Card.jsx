import { initials } from '../lib/format'

/* ─── Card ─────────────────────────────────────────── */
export function Card({ children, style, padding = '24px', onClick, hoverable }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding,
        boxShadow: 'var(--shadow-sm)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow var(--transition), border-color var(--transition)',
        ...style,
      }}
      onMouseEnter={hoverable || onClick ? e => {
        e.currentTarget.style.boxShadow = 'var(--shadow)'
        e.currentTarget.style.borderColor = 'var(--accent-light)'
      } : undefined}
      onMouseLeave={hoverable || onClick ? e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.borderColor = 'var(--border)'
      } : undefined}
    >
      {children}
    </div>
  )
}

/* ─── Badge ─────────────────────────────────────────── */
const BADGE_COLORS = {
  success: { bg: 'var(--success-dim)', color: 'var(--success)' },
  danger:  { bg: 'var(--danger-dim)',  color: 'var(--danger)'  },
  warning: { bg: 'var(--warning-dim)', color: 'var(--warning)' },
  info:    { bg: 'var(--info-dim)',    color: 'var(--info)'    },
  accent:  { bg: 'var(--accent-dim)', color: 'var(--accent)'  },
  neutral: { bg: 'var(--surface-2)',  color: 'var(--text-secondary)' },
}

export function Badge({ color = 'neutral', children, dot, style }) {
  const c = BADGE_COLORS[color] || BADGE_COLORS.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px',
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 500,
      background: c.bg,
      color: c.color,
      ...style,
    }}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: c.color, flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  )
}

/* ─── Avatar ─────────────────────────────────────────── */
const AVATAR_COLORS = [
  ['#EDE9FE','#7C3AED'],['#DBEAFE','#2563EB'],['#DCFCE7','#16A34A'],
  ['#FEF3C7','#D97706'],['#FCE7F3','#9D174D'],['#E0F2FE','#0369A1'],
]
function pickColor(name = '') {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[i]
}

export function Avatar({ name, src, size = 36, style }) {
  const [bg, fg] = pickColor(name)
  if (src) {
    return (
      <img src={src} alt={name} style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'cover', flexShrink: 0, ...style,
      }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 600, flexShrink: 0,
      fontFamily: 'var(--font-display)',
      ...style,
    }}>
      {initials(name)}
    </div>
  )
}

/* ─── StatCard ─────────────────────────────────────────── */
export function StatCard({ label, value, sub, icon, color = 'accent', style }) {
  return (
    <Card style={{ ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {label}
          </p>
          <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1 }}>
            {value}
          </p>
          {sub && <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6 }}>{sub}</p>}
        </div>
        {icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius)',
            background: 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

/* ─── EmptyState ─────────────────────────────────────────── */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', textAlign: 'center',
      gap: 12,
    }}>
      {icon && (
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-lg)',
          background: 'var(--accent-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)', marginBottom: 4,
        }}>
          {icon}
        </div>
      )}
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</p>
      {description && (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 360 }}>{description}</p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}
