'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import ProfileMenu from '@/components/ProfileMenu'
import PageContainer from '@/components/PageContainer'
import CountUpNumber from '@/components/motion/CountUpNumber'
import AnimatedBadge from '@/components/motion/AnimatedBadge'

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
  complaintId?: string
  type?: string
}

interface CitizenDashboardClientProps {
  userName: string
  complaints: ComplaintResponse[]
  demoNotifications: NotificationItem[]
}

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Submitted: { bg: 'var(--warning-dim)', color: 'var(--warning)', border: 'rgba(245,158,11,0.3)' },
  SUBMITTED: { bg: 'var(--warning-dim)', color: 'var(--warning)', border: 'rgba(245,158,11,0.3)' },
  'In Progress': { bg: 'var(--accent-dim)', color: 'var(--accent)', border: 'var(--accent-border)' },
  IN_PROGRESS: { bg: 'var(--accent-dim)', color: 'var(--accent)', border: 'var(--accent-border)' },
  Resolved: { bg: 'var(--success-dim)', color: 'var(--success)', border: 'rgba(16,185,129,0.3)' },
  RESOLVED: { bg: 'var(--success-dim)', color: 'var(--success)', border: 'rgba(16,185,129,0.3)' },
  Rejected: { bg: 'var(--danger-dim)', color: 'var(--danger)', border: 'rgba(239,68,68,0.3)' },
  REJECTED: { bg: 'var(--danger-dim)', color: 'var(--danger)', border: 'rgba(239,68,68,0.3)' },
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'var(--success)',
  MEDIUM: 'var(--warning)',
  HIGH: '#fb923c',
  CRITICAL: 'var(--danger)',
}

import VoiceAssistantToolbar, { SupportedLang } from '@/components/VoiceAssistantToolbar'

export default function CitizenDashboardClient({
  userName,
  complaints: initialComplaints,
  demoNotifications,
}: CitizenDashboardClientProps) {
  const router = useRouter()
  const [complaintList, setComplaintList] = useState<ComplaintResponse[]>(initialComplaints)
  const [notifications, setNotifications] = useState<NotificationItem[]>(demoNotifications)
  const [activeFilter, setActiveFilter] = useState<'all' | 'resolved' | 'in_progress' | 'notifications'>('all')
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [lang, setLang] = useState<SupportedLang>('en')
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

  const handleNotificationClick = (notif: NotificationItem) => {
    // 1. Mark notification as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    )

    // 2. Extract complaint ID from message/title or fallback to complaintId / id
    const text = `${notif.title} ${notif.message}`
    const match = text.match(/(CIV-\d+|CMP-\d+|CMP_[A-Za-z0-9_-]+|[A-Z]{3,}-\d+)/i)
    const targetId = match ? match[0].toUpperCase() : (notif.complaintId || notif.id)

    // 3. Navigate to complaint detail page
    router.push(`/citizen/complaints/${targetId}`)
  }

  const resolvedComplaints = complaintList.filter(c => ['resolved', 'RESOLVED'].includes(c.status))
  const inProgressComplaints = complaintList.filter(c => ['in progress', 'IN_PROGRESS', 'in_progress'].includes(c.status.toLowerCase()))
  const unreadNotifs = notifications.filter((n) => !n.read).length

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
      glow: 'rgba(0,168,150,0.35)',
      activeBorder: 'var(--accent)',
    },
    {
      key: 'resolved' as const,
      label: 'Resolved',
      value: resolvedComplaints.length,
      accent: 'var(--success)',
      glow: 'rgba(13,148,136,0.35)',
      activeBorder: 'var(--success)',
    },
    {
      key: 'in_progress' as const,
      label: 'In Progress',
      value: inProgressComplaints.length,
      accent: 'var(--warning)',
      glow: 'rgba(217,119,6,0.35)',
      activeBorder: '#D97706',
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
        background: 'var(--nav-bg)',
      }}>
        <div style={{ width: '100%', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
          <Link href="/citizen/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--accent)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.35rem', boxShadow: '0 4px 16px rgba(0,168,150,0.35)' }}>C</div>
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
          {/* AI Voice Assistant & Accessibility Toolbar */}
          <VoiceAssistantToolbar
            lang={lang}
            onLangChange={setLang}
            speakText={
              lang === 'ta'
                ? `வணக்கம் ${userName}. உங்களுக்கு மொத்தம் ${complaintList.length} புகார்கள் உள்ளன. அதில் ${resolvedComplaints.length} தீர்க்கப்பட்டுள்ளன மற்றும் ${inProgressComplaints.length} புகார்கள் பரிசீலனையில் உள்ளன.`
                : `Welcome back, ${userName}. Here is your dashboard overview. You have ${complaintList.length} total complaints, ${resolvedComplaints.length} resolved, and ${inProgressComplaints.length} in progress.`
            }
          />

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
            {stats.map((stat, idx) => {
              const isActive = activeFilter === stat.key
              return (
                <motion.button
                  key={stat.key}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.06, ease: 'easeOut' }}
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.97 }}
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
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: stat.accent, lineHeight: 1.1 }}>
                    <CountUpNumber value={stat.value} />
                  </div>
                  <div style={{ fontSize: '0.95rem', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', marginTop: '0.5rem', fontWeight: isActive ? 700 : 500 }}>
                    {stat.label}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Submit CTA banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            style={{
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
            }}
          >
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.25rem' }}>Report a Civic Issue</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>AI will analyze and route your complaint automatically</p>
            </div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
              <Link href="/citizen/submit" className="btn-primary" style={{ whiteSpace: 'nowrap', padding: '0.75rem 1.5rem', fontSize: '1rem', display: 'inline-block' }}>
                + New Complaint
              </Link>
            </motion.div>
          </motion.div>

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
                <Link href="/citizen/complaints" style={{ fontSize: '0.95rem', color: 'var(--accent-text)', textDecoration: 'none', marginLeft: 'auto', fontWeight: 600 }}>
                  View all →
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <AnimatePresence mode="popLayout">
                  {filteredComplaints.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius)', padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '1rem' }}
                    >
                      {activeFilter === 'resolved'
                        ? 'No resolved complaints found.'
                        : activeFilter === 'in_progress'
                          ? 'No complaints currently in progress.'
                          : 'No complaints yet.'}{' '}
                      <Link href="/citizen/submit" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                        Submit a complaint →
                      </Link>
                    </motion.div>
                  ) : (
                    filteredComplaints.map((c, idx) => {
                      const s = STATUS_STYLE[c.status] ?? { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'var(--surface-border)' }
                      return (
                        <motion.div
                          key={c.complaint_id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25, delay: idx * 0.04, ease: 'easeOut' }}
                          whileHover={{ scale: 1.015, y: -2 }}
                          style={{
                            background: 'var(--surface-card)',
                            border: '1px solid var(--surface-border)',
                            borderRadius: 'var(--radius)',
                            padding: '1.35rem 1.65rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-faint)', marginBottom: '0.3rem' }}>{c.complaint_id}</div>
                              <h3 style={{ fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.4 }}>{c.title}</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                              <AnimatedBadge
                                statusKey={c.status}
                                style={{
                                  padding: '0.3rem 0.85rem',
                                  borderRadius: '999px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  background: s.bg,
                                  color: s.color,
                                  border: `1px solid ${s.border}`,
                                }}
                              >
                                {c.status}
                              </AnimatedBadge>
                              <div>
                                {confirmingId === c.complaint_id ? (
                                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444' }}>Withdraw?</span>
                                    <motion.button
                                      whileTap={{ scale: 0.92 }}
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
                                    </motion.button>
                                    <motion.button
                                      whileTap={{ scale: 0.92 }}
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
                                    </motion.button>
                                  </motion.div>
                                ) : (
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
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
                                      transition: 'background-color 0.2s, border-color 0.2s',
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                    Withdraw
                                  </motion.button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span>{c.department}</span>
                            <span style={{ color: PRIORITY_COLOR[c.priority] ?? 'var(--text-muted)', fontWeight: 600 }}>{c.priority} Priority</span>
                            <span>{c.location}</span>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
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
                  <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ padding: '0.2rem 0.7rem', borderRadius: '999px', background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700 }}>
                    {unreadNotifs} new
                  </motion.span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <AnimatePresence mode="popLayout">
                  {notifications.map((notif, idx) => {
                    const text = `${notif.title} ${notif.message}`
                    const match = text.match(/(CIV-\d+|CMP-\d+|CMP_[A-Za-z0-9_-]+|[A-Z]{3,}-\d+)/i)
                    const targetId = match ? match[0].toUpperCase() : (notif.complaintId || notif.id)

                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0, padding: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02, x: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleNotificationClick(notif)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleNotificationClick(notif)
                          }
                        }}
                        style={{
                          background: notif.read ? 'var(--surface-card)' : 'var(--accent-dim)',
                          border: `1px solid ${notif.read ? 'var(--surface-border)' : 'var(--accent-border)'}`,
                          borderRadius: 'var(--radius)',
                          padding: '1.15rem 1.35rem',
                          cursor: 'pointer',
                          position: 'relative',
                          pointerEvents: 'auto',
                          userSelect: 'none',
                          transition: 'background-color 0.2s, border-color 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{notif.title}</div>
                          {!notif.read && (
                            <motion.span
                              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                              style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--accent)',
                                boxShadow: '0 0 8px var(--accent)',
                              }}
                            />
                          )}
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{notif.message}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem' }}>
                          <div suppressHydrationWarning style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                            {new Date(notif.createdAt).toLocaleDateString('en-GB')}
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            View {targetId} →
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  )
}
