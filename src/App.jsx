import { useState } from 'react'
import { useAuth } from './auth/AuthProvider'
import Login from './auth/Login'
import { Sidebar } from './components/Sidebar'
import SeatingPage from './features/seating/SeatingPage'
import DashboardPage from './features/seating/DashboardPage'
import LayoutEditorPage from './features/seating/LayoutEditorPage'

export default function App() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState('seating')

  if (loading) return null
  if (!user) return <Login />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar tab={tab} onTabChange={setTab} />
      <div className="blueprint-grid" style={{ flex: 1, padding: 28, overflowX: 'auto' }}>
        <h1 style={{ fontSize: 22, fontFamily: 'var(--font-display)', marginBottom: 20, color: 'var(--text-primary)' }}>
          {tab === 'seating' ? 'Seating & occupancy' : tab === 'dashboard' ? 'Dashboard' : 'Edit layout'}
        </h1>
        {tab === 'seating' && <SeatingPage />}
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'layout' && <LayoutEditorPage />}
      </div>
    </div>
  )
}
