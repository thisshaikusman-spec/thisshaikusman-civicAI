'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProfileMenu from '@/components/ProfileMenu'
import PageContainer from '@/components/PageContainer'

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'

type Stats = {
  total: number
  by_status: Record<string, number>
  by_category: Record<string, number>
  by_department: Record<string, number>
  by_priority: Record<string, number>
  resolution_rate_percent: number
  avg_resolution_hours: number | null
}

const CATEGORY_COLORS = ['#686D55', '#B4B59D', '#5A7A52', '#A07C3A', '#C07832', '#373A2A', '#8A6D55']
const STATUS_COLORS: Record<string, string> = {
  Submitted: '#A07C3A',
  'In Progress': '#686D55',
  Resolved: '#5A7A52',
  Rejected: '#A04040',
}

export default function OfficerAnalyticsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userRaw = localStorage.getItem('user')
    if (!userRaw) {
      router.push('/login?callbackUrl=/officer/analytics')
      return
    }

    fetch(`${FASTAPI_URL}/complaints/stats`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load stats (${res.status})`)
        return res.json()
      })
      .then((data: Stats) => setStats(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load stats'))
      .finally(() => setLoading(false))
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--nav-bg)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', width: '100%' }}>
        <div style={{ width: '100%', padding: '1rem 2.5rem' }} className="flex items-center justify-between">
          <Link href="/officer/dashboard" className="flex items-center gap-2.5 text-decoration-none">
            <div 
              style={{
                background: 'var(--accent)',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(0,168,150,0.35)',
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-base"
            >
              C
            </div>
            <span className="font-extrabold text-lg" style={{ color: '#ffffff' }}>CivicAI</span>
            <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>/ Analytics</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link 
              href="/officer/dashboard" 
              className="text-sm font-medium transition-colors"
              style={{ color: '#cbd5e1' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
            >
              Dashboard
            </Link>
            <Link 
              href="/officer/complaints" 
              className="text-sm font-medium transition-colors"
              style={{ color: '#cbd5e1' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
            >
              Complaints
            </Link>
            <ProfileMenu />
          </div>
        </div>
      </nav>

      <main className="py-10">
        <PageContainer>
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>Analytics & Reports</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Municipal complaint performance metrics — live data from database</p>
          </div>

          {loading && <p className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading stats...</p>}
          {error && (
            <div 
              style={{
                background: 'var(--danger-dim)',
                borderColor: 'rgba(160,64,64,0.3)',
                color: 'var(--danger)',
              }}
              className="rounded-xl border p-4 text-sm mb-6"
            >
              {error}
            </div>
          )}

          {stats && (
            <>
              {/* KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="card p-5" style={{ borderLeft: '4px solid var(--accent)' }}>
                  <div className="text-2xl mb-2">📋</div>
                  <div className="text-2xl font-bold mb-0.5" style={{ color: 'var(--accent)' }}>{stats.total}</div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Total Complaints</div>
                </div>
                <div className="card p-5" style={{ borderLeft: '4px solid var(--success)' }}>
                  <div className="text-2xl mb-2">📈</div>
                  <div className="text-2xl font-bold mb-0.5" style={{ color: 'var(--success)' }}>{stats.resolution_rate_percent}%</div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Resolution Rate</div>
                </div>
                <div className="card p-5" style={{ borderLeft: '4px solid var(--warning)' }}>
                  <div className="text-2xl mb-2">⏱️</div>
                  <div className="text-2xl font-bold mb-0.5" style={{ color: 'var(--warning)' }}>
                    {stats.avg_resolution_hours !== null ? `${stats.avg_resolution_hours}h` : '—'}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Avg Resolution Time</div>
                </div>
                <div className="card p-5 opacity-60">
                  <div className="text-2xl mb-2">😊</div>
                  <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Not available</div>
                  <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Citizen Satisfaction — no backend endpoint yet</div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                {/* Complaints by Category */}
                <div className="card p-6">
                  <h3 className="font-bold mb-5 text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Complaints by Category</h3>
                  {Object.keys(stats.by_category).length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No data yet.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {Object.entries(stats.by_category).map(([name, value], i) => {
                        const maxVal = Math.max(...Object.values(stats.by_category))
                        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                        return (
                          <div key={name}>
                            <div className="flex justify-between text-sm mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                <span style={{ color: 'var(--text-main)' }}>{name}</span>
                              </div>
                              <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{value}</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${(value / maxVal) * 100}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Complaints by Status */}
                <div className="card p-6">
                  <h3 className="font-bold mb-5 text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Complaints by Status</h3>
                  {Object.keys(stats.by_status).length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No data yet.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {Object.entries(stats.by_status).map(([name, value]) => (
                        <div key={name}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[name] || 'var(--accent-sage)' }} />
                              <span style={{ color: 'var(--text-main)' }}>{name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{((value / stats.total) * 100).toFixed(1)}%</span>
                              <span className="font-semibold w-10 text-right" style={{ color: 'var(--text-main)' }}>{value}</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(value / stats.total) * 100}%`, backgroundColor: STATUS_COLORS[name] || 'var(--accent-sage)' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card p-6 text-center">
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  Weekly & monthly trend charts are not available — backend requires timestamped history endpoint.
                </p>
              </div>
            </>
          )}
        </PageContainer>
      </main>
    </div>
  )
}

