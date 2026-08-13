'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProfileMenu from '@/components/ProfileMenu'
import PageContainer from '@/components/PageContainer'
import ComplaintMapWrapper from '@/components/ComplaintMapWrapper'

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
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null)

  const handleWithdrawComplaint = async (complaintId: string) => {
    setWithdrawingId(complaintId)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${baseUrl}/complaints/${complaintId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error(`Backend returned status ${res.status}`)
      }

      setComplaints((prev) => prev.filter((c) => c.complaint_id !== complaintId))
      setConfirmingId(null)
    } catch (err) {
      console.error('Error deleting complaint:', err)
      alert('Failed to withdraw complaint. Please try again.')
    } finally {
      setWithdrawingId(null)
    }
  }

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
      <nav style={{
        width: '100%',
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(16px)',
        background: 'var(--nav-bg)',
      }}>
        <div style={{ width: '100%', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
          <Link href="/citizen/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--accent)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.35rem', boxShadow: '0 4px 16px rgba(0,168,150,0.35)' }}>C</div>
            <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', letterSpacing: '-0.01em' }}>CivicAI</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Link 
              href="/citizen/dashboard" 
              style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '1.1rem', color: '#e2e8f0', textDecoration: 'none', fontWeight: 600, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'transparent' }}
            >
              Dashboard
            </Link>
            <Link href="/citizen/submit" className="btn-primary" style={{ padding: '0.6rem 1.35rem', fontSize: '1.05rem', fontWeight: 700 }}>
              + Submit
            </Link>
            <ProfileMenu />
          </div>
        </div>
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
                      <div className="text-right text-xs whitespace-nowrap flex flex-col items-end gap-1.5" style={{ color: 'var(--text-faint)' }}>
                        <div suppressHydrationWarning>{new Date(complaint.created_at).toLocaleDateString('en-GB')}</div>
                        <div className="font-medium" style={{ color: 'var(--text-muted)' }}>{complaint.location}</div>
                        {confirmingId === complaint.complaint_id ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>Withdraw?</span>
                            <button
                              onClick={() => handleWithdrawComplaint(complaint.complaint_id)}
                              disabled={withdrawingId === complaint.complaint_id}
                              className="px-2.5 py-1 rounded-md text-xs font-bold transition-all"
                              style={{
                                background: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                cursor: withdrawingId === complaint.complaint_id ? 'not-allowed' : 'pointer',
                                opacity: withdrawingId === complaint.complaint_id ? 0.7 : 1,
                              }}
                            >
                              {withdrawingId === complaint.complaint_id ? 'Withdrawing...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              disabled={withdrawingId === complaint.complaint_id}
                              className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                              style={{
                                background: 'var(--surface-border)',
                                color: 'var(--text-muted)',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingId(complaint.complaint_id)}
                            className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)'
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Withdraw Complaint
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs mt-4 pt-3" style={{ borderTop: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                      <div className="flex flex-wrap items-center gap-4">
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

                      <button
                        type="button"
                        onClick={() => setExpandedMapId(expandedMapId === complaint.complaint_id ? null : complaint.complaint_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border"
                        style={{
                          background: expandedMapId === complaint.complaint_id ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface-hover)',
                          color: expandedMapId === complaint.complaint_id ? '#60a5fa' : 'var(--text-muted)',
                          borderColor: expandedMapId === complaint.complaint_id ? 'rgba(59, 130, 246, 0.3)' : 'var(--surface-border)',
                        }}
                      >
                        <span>🗺️</span> {expandedMapId === complaint.complaint_id ? 'Hide Live Map' : 'Track Live Location'}
                      </button>
                    </div>

                    {/* Expandable Live Location Map */}
                    {expandedMapId === complaint.complaint_id && (
                      <div className="mt-4 pt-2">
                        <ComplaintMapWrapper complaint={complaint} />
                      </div>
                    )}

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

