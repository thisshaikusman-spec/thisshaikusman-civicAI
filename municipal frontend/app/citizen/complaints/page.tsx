'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProfileMenu from '@/components/ProfileMenu'
import PageContainer from '@/components/PageContainer'

interface ComplaintResponse {
  complaint_id: string
  title: string
  description: string
  category: string
  department: string
  priority: string
  confidence: number
  status: string
  location: string
  latitude: number
  longitude: number
  created_at: string
  updated_at: string | null
}

export default function CitizenComplaintsPage() {
  const router = useRouter()
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const userRaw = localStorage.getItem('user')
    if (!userRaw) {
      router.push('/login')
      return
    }

    let user: { email: string }
    try {
      user = JSON.parse(userRaw)
    } catch {
      router.push('/login')
      return
    }

    if (!user?.email) {
      router.push('/login')
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
    fetch(`${baseUrl}/complaints/?email=${encodeURIComponent(user.email)}`, {
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Backend returned ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setComplaints(data.complaints || [])
      })
      .catch((err) => {
        console.error('Error fetching complaints:', err)
        setError('Failed to load complaints. Please try again.')
      })
      .finally(() => setLoading(false))
  }, [router])

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return 'badge badge-resolved'
      case 'in progress':
      case 'in_progress':
        return 'badge badge-progress'
      case 'rejected':
        return 'badge badge-rejected'
      default:
        return 'badge badge-submitted'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'LOW':
        return 'var(--success)'
      case 'MEDIUM':
        return 'var(--warning)'
      case 'HIGH':
        return '#C07832'
      case 'CRITICAL':
        return 'var(--danger)'
      default:
        return 'var(--text-muted)'
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--surface-border)' }}>
        <PageContainer className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Link href="/citizen/dashboard" className="flex items-center gap-2.5 text-decoration-none">
              <div 
                style={{
                  background: 'var(--accent)',
                  color: 'var(--text-light)',
                  boxShadow: '0 4px 14px rgba(104,109,85,0.25)',
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-base"
              >
                C
              </div>
              <span className="font-extrabold text-lg" style={{ color: 'var(--text-main)' }}>CivicAI</span>
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <Link 
              href="/citizen/dashboard" 
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Dashboard
            </Link>
            <Link href="/citizen/submit" className="btn-primary px-4 py-2 text-sm font-semibold">
              + Submit
            </Link>
            <ProfileMenu />
          </div>
        </PageContainer>
      </nav>

      <main className="py-10">
        <PageContainer>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>My Complaints</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {loading ? 'Loading…' : `${complaints.length} total complaint${complaints.length !== 1 ? 's' : ''} (Live from Backend)`}
              </p>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="card p-8 text-center animate-pulse" style={{ color: 'var(--text-muted)' }}>
              Loading your complaints…
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div 
              style={{
                background: 'var(--danger-dim)',
                borderColor: 'rgba(160,64,64,0.3)',
                color: 'var(--danger)',
              }}
              className="p-8 rounded-2xl border text-center"
            >
              {error}
            </div>
          )}

          {/* Complaints */}
          {!loading && !error && (
            <div className="space-y-4">
              {complaints.length === 0 ? (
                <div className="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  No complaints found for your account.
                </div>
              ) : (
                complaints.map((complaint) => (
                  <div key={complaint.complaint_id} className="card p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>{complaint.complaint_id}</span>
                          <span className={getStatusBadgeClass(complaint.status)}>
                            {complaint.status}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg" style={{ color: 'var(--text-main)' }}>{complaint.title}</h3>
                        <p className="text-sm mt-1.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{complaint.description}</p>
                      </div>
                      <div className="text-right text-xs whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
                        <div>{new Date(complaint.created_at).toLocaleDateString()}</div>
                        <div className="mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{complaint.location}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs mt-4 pt-3" style={{ borderTop: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <span>📁</span> {complaint.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>🏢</span> {complaint.department}
                      </span>
                      <span className="font-semibold" style={{ color: getPriorityColor(complaint.priority) }}>
                        ↑ {complaint.priority}
                      </span>
                      <span className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        <span>🤖</span> {Math.round((complaint.confidence || 0) * 100)}% AI confidence
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 pt-2">
                      <div className="flex items-center gap-1.5">
                        {['Submitted', 'In Progress', 'Resolved'].map((step, i) => {
                          const steps = ['Submitted', 'In Progress', 'Resolved']
                          const currentIdx = steps.indexOf(complaint.status)
                          const isCompleted = i <= (currentIdx >= 0 ? currentIdx : 0)
                          return (
                            <div key={step} className="flex items-center flex-1">
                              <div 
                                className="h-2 flex-1 rounded-full transition-all" 
                                style={{ background: isCompleted ? 'var(--accent)' : 'var(--border-color)' }} 
                              />
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex justify-between text-xs mt-1.5" style={{ color: 'var(--text-faint)' }}>
                        <span>Submitted</span>
                        <span>Resolved</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </PageContainer>
      </main>
    </div>
  )
}

