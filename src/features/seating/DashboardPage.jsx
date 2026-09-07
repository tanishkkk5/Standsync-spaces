import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { StatCard, Card } from '../../foundation/ui/Card'
import { Skeleton } from '../../foundation/ui/misc'
import { fetchAllSeatsGroupedByOffice } from './api'

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAllSeatsGroupedByOffice().then(setData).catch(e => setError(e.message))
  }, [])

  const summary = useMemo(() => {
    if (!data) return []
    return Object.entries(data).map(([name, seats]) => {
      const occ = seats.filter(s => s.occupied).length
      return { name, total: seats.length, occ, vacant: seats.length - occ }
    })
  }, [data])

  const chartData = useMemo(() => {
    if (!data) return []
    const orgSet = new Set()
    const byOffice = {}
    Object.entries(data).forEach(([officeName, seats]) => {
      const counts = {}
      seats.forEach(s => {
        if (s.occupied && s.org) {
          counts[s.org] = (counts[s.org] || 0) + 1
          orgSet.add(s.org)
        }
      })
      byOffice[officeName] = counts
    })
    return [...orgSet].map(org => {
      const row = { org }
      Object.keys(byOffice).forEach(office => {
        row[office] = byOffice[office][org] || 0
      })
      return row
    })
  }, [data])

  const officeNames = data ? Object.keys(data) : []
  const barColors = ['var(--danger)', 'var(--accent)', 'var(--warning)']

  if (error) return <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>
  if (!data) return <Skeleton height={320} />

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {summary.map(s => (
          <StatCard
            key={s.name}
            label={s.name}
            value={`${s.occ} / ${s.total}`}
            sub={`${s.vacant} vacant`}
            style={{ flex: 1, minWidth: 220 }}
          />
        ))}
      </div>

      <Card padding="20px">
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>
          Seated headcount by organisation, per office
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="org" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {officeNames.map((name, i) => (
              <Bar key={name} dataKey={name} fill={barColors[i % barColors.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
