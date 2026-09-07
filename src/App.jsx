import { useState } from 'react'
import { useAuth } from './auth/AuthProvider'
import Login from './auth/Login'
import { Sidebar } from './components/Sidebar'
import SeatingPage from './features/seating/SeatingPage'
import DashboardPage from './features/seating/DashboardPage'

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
          {tab === 'seating' ? 'Seating & occupancy' : 'Dashboard'}
        </h1>
        {tab === 'seating' ? <SeatingPage /> : <DashboardPage />}
      </div>
    </div>
  )
}
