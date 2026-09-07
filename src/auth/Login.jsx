import { useState } from 'react'
import { Card } from '../foundation/ui/Card'
import { Input } from '../foundation/ui/Input'
import { Button } from '../foundation/ui/Button'
import { Logo } from '../foundation/ui/misc'
import { useAuth } from './AuthProvider'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
      className="blueprint-grid"
    >
      <Card style={{ width: 380 }} padding="32px">
        <div style={{ marginBottom: 24 }}>
          <Logo />
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@xtransmatrix.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
          <Button type="submit" loading={loading} style={{ marginTop: 8 }}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  )
}
