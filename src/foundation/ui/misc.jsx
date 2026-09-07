import { useTheme } from '../theme/ThemeProvider'

/* ─── Tabs ─────────────────────────────────────────── */
export function Tabs({ tabs, active, onChange, style }) {
  return (
    <div style={{
      display: 'flex', gap: 2,
      borderBottom: '1px solid var(--border)',
      ...style,
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: active === tab.id ? 600 : 400,
            color: active === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            borderBottom: active === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all var(--transition)',
            marginBottom: -1,
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Table ─────────────────────────────────────────── */
export function Table({ columns, rows, emptyText = 'No data', onRowClick }) {
  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '10px 16px',
                textAlign: col.align || 'left',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                {emptyText}
              </td>
            </tr>
          ) : rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background var(--transition)',
              }}
              onMouseEnter={onRowClick ? e => e.currentTarget.style.background = 'var(--surface-2)' : undefined}
              onMouseLeave={onRowClick ? e => e.currentTarget.style.background = 'transparent' : undefined}
            >
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '12px 16px',
                  textAlign: col.align || 'left',
                  color: 'var(--text-primary)',
                  verticalAlign: 'middle',
                }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Skeleton ─────────────────────────────────────────── */
export function Skeleton({ width = '100%', height = 16, radius = 6, style }) {
  return (
    <div style={{
      width, height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, var(--surface-2) 0%, var(--border) 50%, var(--surface-2) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }}>
      <style>{`@keyframes shimmer { to { background-position: -200% 0; } }`}</style>
    </div>
  )
}

/* ─── ThemeToggle ─────────────────────────────────────────── */
export function ThemeToggle({ style }) {
  const { isDark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 36, height: 36,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all var(--transition)',
        flexShrink: 0,
        ...style,
      }}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

/* ─── Logo ─────────────────────────────────────────── */
export function Logo({ size = 32, showText = true, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}>
      <div style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.28),
        background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
      }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      {showText && (
        <div>
          <div style={{
            fontSize: Math.round(size * 0.44),
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
          }}>
            Spaces
          </div>
          <div style={{
            fontSize: Math.round(size * 0.3),
            color: 'var(--text-tertiary)',
            fontWeight: 500,
            letterSpacing: '0.04em',
          }}>
            by StandSync
          </div>
        </div>
      )}
    </div>
  )
}
