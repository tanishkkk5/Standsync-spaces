import { useState } from 'react'
import { useAuth } from './auth/AuthProvider'
import Login from './auth/Login'
import { Sidebar } from './components/Sidebar'
import SeatingPage from './features/seating/SeatingPage'
import DashboardPage from './features/seating/DashboardPage'
import LayoutEditorPage from './features/seating/LayoutEditorPage'
import MapPage from './features/seating/MapPage'
import MapEditorPage from './features/seating/MapEditorPage'

export default function App() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState('map')
  const goToLayout = () => setTab('layout')

  if (loading) return null
  if (!user) return <Login />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="spaces-sidebar">
        <Sidebar tab={tab} onTabChange={setTab} />
      </div>
      <div className="spaces-main blueprint-grid" style={{ flex: 1, padding: 28, overflowX: 'auto', paddingBottom: 80 }}>
        <h1 style={{ fontSize: 22, fontFamily: 'var(--font-display)', marginBottom: 20, color: 'var(--text-primary)' }}>
          {tab === 'map' ? 'Floor map' : tab === 'seating' ? 'Seating grid' : tab === 'dashboard' ? 'Dashboard' : 'Edit grid layout'}
        </h1>
        {tab === 'map' && <MapPage onEditLayout={goToLayout} />}
        {tab === 'seating' && <SeatingPage />}
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'layout' && <MapEditorPage />}
      </div>

      {/* Mobile bottom nav */}
      <nav className="spaces-mobile-nav">
        {[
          { key: 'map', label: 'Map', icon: '🗺️' },
          { key: 'seating', label: 'Grid', icon: '⊞' },
          { key: 'dashboard', label: 'Stats', icon: '📊' },
        ].map(item => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 16px',
            color: tab === item.key ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 11,
          }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
