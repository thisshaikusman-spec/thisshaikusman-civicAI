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
  complaints,
  demoNotifications,
}: CitizenDashboardClientProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'resolved' | 'in_progress' | 'notifications'>('all')
  const notifSectionRef = useRef<HTMLDivElement>(null)

  const resolvedComplaints = complaints.filter(c => ['resolved', 'RESOLVED'].includes(c.status))
  const inProgressComplaints = complaints.filter(c => ['in progress', 'IN_PROGRESS', 'in_progress'].includes(c.status.toLowerCase()))
  const unreadNotifs = demoNotifications.filter((n) => !n.read).length

  const handleStatClick = (key: 'all' | 'resolved' | 'in_progress' | 'notifications') => {
    setActiveFilter(key)
    if (key === 'notifications' && notifSectionRef.current) {
      notifSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  // Filter complaints based on active selection
  const filteredComplaints = complaints.filter((c) => {
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
      value: complaints.length,
      accent: 'var(--accent)',
      glow: 'rgba(14,165,233,0.35)',
      activeBorder: '#0ea5e9',
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
        borderBottom: '1px solid var(--surface-border)',
        backdropFilter: 'blur(14px)',
        background: 'var(--surface-card)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <PageContainer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', boxShadow: '0 0 12px rgba(14,165,233,0.4)' }}>C</div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>CivicAI</span>
            <span style={{ color: 'var(--text-faint)', fontSize: '0.9rem' }}>/ Citizen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="/citizen/complaints" className="nav-link">My Complaints</Link>
            <Link href="/citizen/submit" className="nav-link">Submit</Link>
            <ProfileMenu />
          </div>
        </PageContainer>
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
                  {isActive && (
                    <span style={{
                      position: 'absolute',
                      top: '8px',
                      right: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: stat.accent,
                      background: 'rgba(255,255,255,0.06)',
                      padding: '2px 8px',
                      borderRadius: '99px',
                      border: `1px solid ${stat.activeBorder}`,
                    }}>
                      Active Filter
                    </span>
                  )}
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
                          <span style={{ flexShrink: 0, padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                            {c.status}
                          </span>
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
