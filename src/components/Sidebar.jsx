import { LayoutGrid, BarChart2, PenSquare, ShieldCheck, Eye, LogOut } from 'lucide-react'
import { Logo } from '../foundation/ui/misc'
import { useAuth } from '../auth/AuthProvider'

const NAV_ITEMS = [
  { key: 'seating', label: 'Seating map', icon: LayoutGrid },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { key: 'layout', label: 'Edit layout', icon: PenSquare, adminOnly: true },
]

export function Sidebar({ tab, onTabChange }) {
  const { isAdmin, signOut } = useAuth()
  const items = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
        minHeight: '100vh',
      }}
    >
      <div style={{ padding: '0 8px', marginBottom: 28 }}>
        <Logo size={30} />
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {items.map(item => {
          const Icon = item.icon
          const active = tab === item.key
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                color: active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon size={16} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--sidebar-border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 12, color: 'var(--sidebar-text)' }}>
          {isAdmin ? <ShieldCheck size={14} /> : <Eye size={14} />}
          {isAdmin ? 'Admin' : 'Manager'}
        </div>
        <button
          onClick={signOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            color: 'var(--sidebar-text)',
            fontSize: 14,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  )
}
