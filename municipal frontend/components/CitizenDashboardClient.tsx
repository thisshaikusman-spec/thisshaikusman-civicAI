'use client'

import { useState, useRef } from 'react'
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

interface NotificationItem {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

interface CitizenDashboardClientProps {
  userName: string
  complaints: ComplaintResponse[]
  demoNotifications: NotificationItem[]
}

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Submitted:   { bg: 'var(--warning-dim)',  color: 'var(--warning)',  border: 'rgba(245,158,11,0.3)'  },
  SUBMITTED:   { bg: 'var(--warning-dim)',  color: 'var(--warning)',  border: 'rgba(245,158,11,0.3)'  },
  'In Progress':{ bg: 'var(--accent-dim)',  color: 'var(--accent)',   border: 'var(--accent-border)'  },
  IN_PROGRESS: { bg: 'var(--accent-dim)',   color: 'var(--accent)',   border: 'var(--accent-border)'  },
  Resolved:    { bg: 'var(--success-dim)',  color: 'var(--success)',  border: 'rgba(16,185,129,0.3)'  },
  RESOLVED:    { bg: 'var(--success-dim)',  color: 'var(--success)',  border: 'rgba(16,185,129,0.3)'  },
  Rejected:    { bg: 'var(--danger-dim)',   color: 'var(--danger)',   border: 'rgba(239,68,68,0.3)'   },
  REJECTED:    { bg: 'var(--danger-dim)',   color: 'var(--danger)',   border: 'rgba(239,68,68,0.3)'   },
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW:      'var(--success)',
  MEDIUM:   'var(--warning)',
  HIGH:     '#fb923c',
  CRITICAL: 'var(--danger)',
}

export default function CitizenDashboardClient({
  userName,
  complaints: initialComplaints,
  demoNotifications,
}: CitizenDashboardClientProps) {
  const [complaintList, setComplaintList] = useState<ComplaintResponse[]>(initialComplaints)
  const [activeFilter, setActiveFilter] = useState<'all' | 'resolved' | 'in_progress' | 'notifications'>('all')
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const notifSectionRef = useRef<HTMLDivElement>(null)

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

      setComplaintList((prev) => prev.filter((c) => c.complaint_id !== complaintId))
      setConfirmingId(null)
    } catch (err) {
      console.error('Error deleting complaint:', err)
      alert('Failed to withdraw complaint. Please try again.')
    } finally {
      setWithdrawingId(null)
    }
  }

  const resolvedComplaints = complaintList.filter(c => ['resolved', 'RESOLVED'].includes(c.status))
  const inProgressComplaints = complaintList.filter(c => ['in progress', 'IN_PROGRESS', 'in_progress'].includes(c.status.toLowerCase()))
  const unreadNotifs = demoNotifications.filter((n) => !n.read).length

  const handleStatClick = (key: 'all' | 'resolved' | 'in_progress' | 'notifications') => {
    setActiveFilter(key)
    if (key === 'notifications' && notifSectionRef.current) {
      notifSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  // Filter complaints based on active selection
  const filteredComplaints = complaintList.filter((c) => {
    if (activeFilter === 'resolved') {
      return ['resolved', 'RESOLVED'].includes(c.status)
    }
    if (activeFilter === 'in_progress') {
      return ['in progress', 'IN_PROGRESS', 'in_progress'].includes(c.status.toLowerCase())
    }
    return true // 'all' or 'notifications'
  })

  const stats = [
    {
      key: 'all' as const,
      label: 'Total Complaints',
      value: complaintList.length,
      accent: 'var(--accent)',
      glow: 'rgba(16,185,129,0.35)',
      activeBorder: '#10b981',
    },
    {
      key: 'resolved' as const,
      label: 'Resolved',
      value: resolvedComplaints.length,
      accent: 'var(--success)',
      glow: 'rgba(16,185,129,0.35)',
      activeBorder: '#10b981',
    },
    {
      key: 'in_progress' as const,
      label: 'In Progress',
      value: inProgressComplaints.length,
      accent: 'var(--warning)',
      glow: 'rgba(245,158,11,0.35)',
      activeBorder: '#f59e0b',
    },
    {
      key: 'notifications' as const,
      label: 'Notifications',
      value: unreadNotifs,
      accent: '#a78bfa',
      glow: 'rgba(167,139,250,0.35)',
      activeBorder: '#a78bfa',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* ── Navbar ── */}
      <nav style={{
        width: '100%',
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(16px)',
        background: '#0b1d3a',
      }}>
        <div style={{ width: '100%', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
          <Link href="/citizen/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.35rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>C</div>
            <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', letterSpacing: '-0.01em' }}>CivicAI</span>
            <span style={{ color: '#94a3b8', fontSize: '1.05rem', fontWeight: 600 }}>/ Citizen</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Link href="/citizen/complaints" style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '1.1rem', color: '#e2e8f0', textDecoration: 'none', fontWeight: 600, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'transparent' }}
            >My Complaints</Link>
            <Link href="/citizen/submit" style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '1.1rem', color: '#e2e8f0', textDecoration: 'none', fontWeight: 600, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'transparent' }}
            >Submit</Link>
            <ProfileMenu />
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main style={{ padding: '2.5rem 0 4rem' }}>
        <PageContainer>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, marginBottom: '0.375rem' }}>
              Welcome back, {userName} 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
              Here&apos;s an overview of your complaints and civic activity
            </p>
          </div>

          {/* ── Top Four Active Stat Card Buttons ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {stats.map((stat) => {
              const isActive = activeFilter === stat.key
              return (
                <button
                  key={stat.key}
                  onClick={() => handleStatClick(stat.key)}
                  aria-pressed={isActive}
                  style={{
                    background: isActive ? 'var(--surface-hover)' : 'var(--surface-card)',
                    border: isActive
                      ? `2px solid ${stat.activeBorder}`
                      : `1px solid ${stat.glow.replace('0.35', '0.25')}`,
                    borderRadius: 'var(--radius)',
                    padding: '1.5rem',
                    textAlign: 'center',
                    boxShadow: isActive
                      ? `0 0 28px ${stat.glow}, 0 0 12px ${stat.activeBorder}`
                      : `0 0 16px ${stat.glow.replace('0.35', '0.12')}`,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.transform = 'translateY(-3px)'
                      e.currentTarget.style.boxShadow = `0 0 24px ${stat.glow}`
                      e.currentTarget.style.borderColor = stat.activeBorder
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = `0 0 16px ${stat.glow.replace('0.35', '0.12')}`
                      e.currentTarget.style.borderColor = stat.glow.replace('0.35', '0.25')
                    }
                  }}
                >
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: stat.accent, lineHeight: 1.1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', marginTop: '0.5rem', fontWeight: isActive ? 700 : 500 }}>
                    {stat.label}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Submit CTA banner */}
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--accent-border)',
            borderRadius: 'var(--radius)',
            padding: '1.5rem 2rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            boxShadow: '0 0 32px rgba(14,165,233,0.08)',
            flexWrap: 'wrap',
          }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.25rem' }}>Report a Civic Issue</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>AI will analyze and route your complaint automatically</p>
            </div>
            <Link href="/citizen/submit" className="btn-primary" style={{ whiteSpace: 'nowrap', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
              + New Complaint
            </Link>
          </div>

          {/* Content grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.75rem', alignItems: 'start' }}>
            {/* ── Complaints list ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                    {activeFilter === 'resolved'
                      ? 'Resolved Complaints'
                      : activeFilter === 'in_progress'
                      ? 'In Progress Complaints'
                      : 'My Complaints'}
                  </h2>
                  {activeFilter !== 'all' && (
                    <button
                      onClick={() => setActiveFilter('all')}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        padding: '2px 10px',
                        borderRadius: '99px',
                        cursor: 'pointer',
                      }}
                    >
                      Reset Filter ✕
                    </button>
                  )}
                </div>
                <Link href="/citizen/complaints" style={{ fontSize: '0.95rem', color: 'var(--accent)', textDecoration: 'none', marginLeft: 'auto', fontWeight: 600 }}>
                  View all →
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredComplaints.length === 0 ? (
                  <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius)', padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '1rem' }}>
                    {activeFilter === 'resolved'
                      ? 'No resolved complaints found.'
                      : activeFilter === 'in_progress'
                      ? 'No complaints currently in progress.'
                      : 'No complaints yet.'}{' '}
                    <Link href="/citizen/submit" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                      Submit a complaint →
                    </Link>
                  </div>
                ) : (
                  filteredComplaints.map((c) => {
                    const s = STATUS_STYLE[c.status] ?? { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'var(--surface-border)' }
                    return (
                      <div key={c.complaint_id} style={{
                        background: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius)',
                        padding: '1.35rem 1.65rem',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-faint)', marginBottom: '0.3rem' }}>{c.complaint_id}</div>
                            <h3 style={{ fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.4 }}>{c.title}</h3>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                            <span style={{ flexShrink: 0, padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                              {c.status}
                            </span>
                            {confirmingId === c.complaint_id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444' }}>Withdraw?</span>
                                <button
                                  onClick={() => handleWithdrawComplaint(c.complaint_id)}
                                  disabled={withdrawingId === c.complaint_id}
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    border: 'none',
                                    cursor: withdrawingId === c.complaint_id ? 'not-allowed' : 'pointer',
                                    opacity: withdrawingId === c.complaint_id ? 0.7 : 1,
                                  }}
                                >
                                  {withdrawingId === c.complaint_id ? 'Withdrawing...' : 'Yes'}
                                </button>
                                <button
                                  onClick={() => setConfirmingId(null)}
                                  disabled={withdrawingId === c.complaint_id}
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
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
                                onClick={() => setConfirmingId(c.complaint_id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.3rem 0.75rem',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Withdraw Complaint
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span>{c.department}</span>
                          <span style={{ color: PRIORITY_COLOR[c.priority] ?? 'var(--text-muted)', fontWeight: 600 }}>{c.priority} Priority</span>
                          <span>{c.location}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* ── Notifications Sidebar ── */}
            <div ref={notifSectionRef} style={{
              border: activeFilter === 'notifications' ? '2px solid #a78bfa' : '1px solid transparent',
              borderRadius: 'var(--radius)',
              transition: 'all 0.3s ease',
              padding: activeFilter === 'notifications' ? '0.5rem' : '0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '1.2rem' }}>Notifications</h2>
                {unreadNotifs > 0 && (
                  <span style={{ padding: '0.2rem 0.7rem', borderRadius: '999px', background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700 }}>
                    {unreadNotifs} new
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {demoNotifications.map((notif) => (
                  <div key={notif.id} style={{
                    background: notif.read ? 'var(--surface-card)' : 'var(--accent-dim)',
                    border: `1px solid ${notif.read ? 'var(--surface-border)' : 'var(--accent-border)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '1.15rem 1.35rem',
                  }}>
                    {!notif.read && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', marginBottom: '0.6rem' }} />
                    )}
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.35rem' }}>{notif.title}</div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{notif.message}</p>
                    <div suppressHydrationWarning style={{ fontSize: '0.8rem', color: 'var(--text-faint)', marginTop: '0.6rem' }}>
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  )
}
