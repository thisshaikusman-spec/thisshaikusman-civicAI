'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import ProfileMenu from '@/components/ProfileMenu'
import PageContainer from '@/components/PageContainer'
import ComplaintMapWrapper from '@/components/ComplaintMapWrapper'
import CountUpNumber from '@/components/motion/CountUpNumber'
import AnimatedBadge from '@/components/motion/AnimatedBadge'
import type { PhotoMetadata } from '@/components/ComplaintMapLocation'

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
  email?: string
  image_url?: string | null
  photos?: string[]
  photos_metadata?: PhotoMetadata[]
  is_duplicate?: boolean
  duplicate_of_id?: string | null
  created_at: string
  updated_at: string | null
}

const isResolveAllowed = (c: ComplaintResponse): { allowed: boolean; reason?: string } => {
  if (c.status === 'Location Unverified') {
    return { allowed: false, reason: 'Location not verified — cannot mark complete.' }
  }
  const lat = Number(c.latitude)
  const lng = Number(c.longitude)
  const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
  if (!hasValidCoords) {
    return { allowed: false, reason: 'Location not verified — cannot mark complete.' }
  }
  const photosMeta = c.photos_metadata || []
  const hasLiveCameraGps = photosMeta.some(
    (m: PhotoMetadata) => (m.is_verified || m.source === 'camera') && m.latitude !== null && m.longitude !== null
  )
  if (!hasLiveCameraGps) {
    return { allowed: false, reason: 'Location not verified — cannot mark complete.' }
  }
  return { allowed: true }
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintResponse | null>(null)

  useEffect(() => {
    const filterParam = searchParams.get('filter')
    const priorityParam = searchParams.get('priority')
    const statusParam = searchParams.get('status')

    if (filterParam) {
      setActiveFilter(filterParam)
    } else if (priorityParam?.toUpperCase() === 'CRITICAL') {
      setActiveFilter('critical')
    } else if (statusParam?.toLowerCase() === 'resolved') {
      setActiveFilter('resolved')
    } else if (statusParam?.toLowerCase() === 'in progress' || statusParam?.toLowerCase() === 'in_progress') {
      setActiveFilter('in_progress')
    } else {
      setActiveFilter('all')
    }
  }, [searchParams])

  const fetchComplaints = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${baseUrl}/complaints/`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setComplaints(data.complaints || [])
      }
    } catch (error) {
      console.error('Error fetching complaints for officer dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const userRaw = localStorage.getItem('user')
    if (!userRaw) {
      router.push('/login')
      return
    }
    fetchComplaints()
  }, [router])

  const handleUpdateStatus = async (complaintId: string, newStatus: string) => {
    setUpdatingId(complaintId)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${baseUrl}/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setComplaints((prev) =>
          prev.map((c) => (c.complaint_id === complaintId ? { ...c, status: newStatus } : c))
        )
      } else {
        alert(`Failed to update status to ${newStatus}`)
      }
    } catch (err) {
      console.error('Error updating complaint status:', err)
      alert('Network error when updating complaint status')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleFilterClick = (filterId: string) => {
    const newFilter = activeFilter === filterId && filterId !== 'all' ? 'all' : filterId
    setActiveFilter(newFilter)

    if (newFilter === 'all') {
      router.push('/officer/dashboard')
    } else if (newFilter === 'critical') {
      router.push('/officer/dashboard?filter=critical&priority=CRITICAL')
    } else if (newFilter === 'resolved') {
      router.push('/officer/dashboard?filter=resolved&status=Resolved')
    } else if (newFilter === 'in_progress') {
      router.push('/officer/dashboard?filter=in_progress&status=In+Progress')
    }
  }

  const totalCount = complaints.length
  const resolvedCount = complaints.filter(
    (c) => c.status.toLowerCase() === 'resolved'
  ).length
  const inProgressCount = complaints.filter(
    (c) => c.status.toLowerCase() === 'in progress' || c.status.toLowerCase() === 'in_progress'
  ).length
  const criticalCount = complaints.filter(
    (c) => c.priority.toUpperCase() === 'CRITICAL'
  ).length

  // Filtered list based on active stat card selection
  const filteredComplaints = complaints.filter((c) => {
    if (activeFilter === 'resolved') {
      return c.status.toLowerCase() === 'resolved'
    }
    if (activeFilter === 'in_progress') {
      return c.status.toLowerCase() === 'in progress' || c.status.toLowerCase() === 'in_progress'
    }
    if (activeFilter === 'critical') {
      const p = c.priority?.toUpperCase()
      return p === 'CRITICAL' || p === 'HIGH'
    }
    return true
  })

  // Group by status
  const statusCounts: Record<string, number> = {}
  complaints.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1
  })

  // Group by category
  const categoryCounts: Record<string, number> = {}
  complaints.forEach((c) => {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1
  })

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

  const statCards = [
    {
      id: 'all',
      label: 'Total Complaints',
      value: totalCount,
      icon: '📋',
      accentColor: 'var(--accent)',
      dimColor: 'var(--accent-dim)',
    },
    {
      id: 'resolved',
      label: 'Resolved',
      value: resolvedCount,
      icon: '✅',
      accentColor: 'var(--success)',
      dimColor: 'var(--success-dim)',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      value: inProgressCount,
      icon: '⚙️',
      accentColor: 'var(--warning)',
      dimColor: 'var(--warning-dim)',
    },
    {
      id: 'critical',
      label: 'Critical',
      value: criticalCount,
      icon: '🚨',
      accentColor: 'var(--danger)',
      dimColor: 'var(--danger-dim)',
    },
  ]

  const getViewAllHref = () => {
    if (activeFilter === 'critical') return '/officer/complaints?priority=CRITICAL'
    if (activeFilter === 'resolved') return '/officer/complaints?status=Resolved'
    if (activeFilter === 'in_progress') return '/officer/complaints?status=In+Progress'
    return '/officer/complaints'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--nav-bg)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', width: '100%' }}>
        <div style={{ width: '100%', padding: '1rem 2.5rem' }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
              <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>/ Officer</span>
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/officer/complaints"
              className="text-sm font-medium transition-colors"
              style={{ color: '#cbd5e1' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
            >
              All Complaints
            </Link>
            <Link
              href="/officer/analytics"
              className="text-sm font-medium transition-colors"
              style={{ color: '#cbd5e1' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
            >
              Analytics
            </Link>
            <ProfileMenu />
          </div>
        </div>
      </nav>

      <main className="py-10">
        <PageContainer>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>Officer Dashboard</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Municipal Complaint Management — Live Database Overview
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, idx) => {
              const isActive = activeFilter === stat.id
              return (
                <motion.button
                  key={stat.id}
                  type="button"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05, ease: 'easeOut' }}
                  whileHover={{ scale: 1.025, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleFilterClick(stat.id)}
                  className="card p-5 text-left transition-all cursor-pointer relative overflow-hidden"
                  style={{
                    borderLeft: `4px solid ${stat.accentColor}`,
                    background: isActive ? 'var(--surface-hover)' : undefined,
                    boxShadow: isActive ? `0 0 0 2px ${stat.accentColor}, 0 4px 12px rgba(0,0,0,0.1)` : undefined,
                  }}
                >
                  {isActive && (
                    <span
                      className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: stat.accentColor, color: '#ffffff' }}
                    >
                      Filtered
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <div className="text-2xl font-bold mb-0.5" style={{ color: stat.accentColor }}>
                    <CountUpNumber value={stat.value} />
                  </div>
                  <div className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{stat.label}</span>
                    {isActive && <span style={{ color: stat.accentColor }}>✓</span>}
                  </div>
                </motion.button>
              )
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Priority Queue / Complaints List */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>
                    Priority Queue {activeFilter !== 'all' ? `(${activeFilter === 'critical' ? 'Critical Priority' : activeFilter === 'resolved' ? 'Resolved' : 'In Progress'})` : '(Live Complaints)'}
                  </h2>
                  {activeFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handleFilterClick('all')}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer"
                      style={{
                        background: 'var(--surface-hover)',
                        color: 'var(--danger)',
                        borderColor: 'var(--danger)',
                      }}
                    >
                      ✕ Clear Filter ({filteredComplaints.length})
                    </button>
                  )}
                </div>
                <Link 
                  href={getViewAllHref()} 
                  className="text-sm font-semibold transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  View all →
                </Link>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="card p-5 text-sm text-center animate-pulse" style={{ color: 'var(--text-muted)' }}>
                    Loading priority queue...
                  </div>
                ) : filteredComplaints.length === 0 ? (
                  <div className="card p-5 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    {activeFilter !== 'all' ? `No ${activeFilter} complaints found.` : 'No complaints in database.'}
                  </div>
                ) : (
                  filteredComplaints.slice(0, activeFilter === 'all' ? 6 : 20).map((complaint) => {
                    const isCompleted = complaint.status.toLowerCase() === 'resolved'
                    const isInProgress = complaint.status.toLowerCase() === 'in progress' || complaint.status.toLowerCase() === 'in_progress'
                    const isRejected = complaint.status.toLowerCase() === 'rejected'

                    return (
                      <div
                        key={complaint.complaint_id}
                        className="card p-5 hover:opacity-95 transition-all cursor-pointer"
                        onClick={() => setSelectedComplaint(complaint)}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                              <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                                {complaint.complaint_id}
                              </span>
                              <span className={getStatusBadgeClass(complaint.status)}>
                                {complaint.status}
                              </span>
                              {complaint.is_duplicate && (
                                <span className="badge badge-rejected text-[10px]" title={`Duplicate of ${complaint.duplicate_of_id}`}>
                                  Duplicate
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-base" style={{ color: 'var(--text-main)' }}>{complaint.title}</h3>
                          </div>
                          <div
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: getPriorityColor(complaint.priority) }}
                          >
                            {complaint.priority}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div 
                          className="flex items-center gap-2 pt-3" 
                          style={{ borderTop: '1px solid var(--surface-border)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={updatingId === complaint.complaint_id || isInProgress}
                            onClick={() => handleUpdateStatus(complaint.complaint_id, 'In Progress')}
                            style={{
                              background: isInProgress ? 'var(--surface-hover)' : 'var(--accent-dim)',
                              color: 'var(--accent)',
                              border: '1px solid var(--accent-border)',
                            }}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
                          >
                            {updatingId === complaint.complaint_id ? 'Updating...' : isInProgress ? '✓ In Progress' : 'Set In Progress'}
                          </button>

                          {(() => {
                            const resCheck = isResolveAllowed(complaint)
                            return (
                              <div className="flex-1 flex flex-col">
                                <button
                                  type="button"
                                  disabled={updatingId === complaint.complaint_id || isCompleted || !resCheck.allowed}
                                  onClick={() => handleUpdateStatus(complaint.complaint_id, 'Resolved')}
                                  title={!resCheck.allowed ? resCheck.reason : undefined}
                                  style={{
                                    background: isCompleted ? 'var(--surface-hover)' : 'var(--success-dim)',
                                    color: 'var(--success)',
                                    border: '1px solid rgba(90,122,82,0.3)',
                                  }}
                                  className="w-full py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
                                >
                                  {updatingId === complaint.complaint_id ? 'Updating...' : isCompleted ? '✓ Resolved' : 'Resolve'}
                                </button>
                                {!resCheck.allowed && !isCompleted && (
                                  <span className="text-[10px] text-amber-400 font-medium text-center mt-1 leading-tight">
                                    Location not verified — cannot mark complete.
                                  </span>
                                )}
                              </div>
                            )
                          })()}

                          <button
                            type="button"
                            disabled={updatingId === complaint.complaint_id || isRejected}
                            onClick={() => handleUpdateStatus(complaint.complaint_id, 'Rejected')}
                            style={{
                              background: isRejected ? 'var(--surface-hover)' : 'var(--danger-dim)',
                              color: 'var(--danger)',
                              border: '1px solid rgba(192,71,62,0.3)',
                            }}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
                          >
                            {updatingId === complaint.complaint_id ? 'Updating...' : isRejected ? '✓ Rejected' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-5">
              {/* By Status */}
              <div className="card p-5">
                <h3 className="font-bold mb-4 text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Complaints by Status</h3>
                <div className="space-y-3.5">
                  {Object.entries(statusCounts).map(([st, count]) => (
                    <div key={st}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span style={{ color: 'var(--text-muted)' }}>{st}</span>
                        <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{count}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${totalCount > 0 ? (count / totalCount) * 100 : 0}%`,
                            background: 'var(--accent)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Category */}
              <div className="card p-5">
                <h3 className="font-bold mb-4 text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Top Categories</h3>
                <div className="space-y-2.5">
                  {Object.entries(categoryCounts).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between text-xs py-1" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{cat}</span>
                      <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div className="card p-5">
                <h3 className="font-bold mb-3 text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    href="/officer/complaints"
                    className="flex items-center justify-between p-3 rounded-xl transition-all text-sm font-semibold"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-main)', border: '1px solid var(--surface-border)' }}
                  >
                    <span>📋 All Complaints</span>
                    <span style={{ color: 'var(--text-faint)' }}>→</span>
                  </Link>
                  <Link
                    href="/officer/analytics"
                    className="flex items-center justify-between p-3 rounded-xl transition-all text-sm font-semibold"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-main)', border: '1px solid var(--surface-border)' }}
                  >
                    <span>📊 Analytics</span>
                    <span style={{ color: 'var(--text-faint)' }}>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </PageContainer>

        {/* Complaint Detail View Modal */}
        {selectedComplaint && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedComplaint(null)}
          >
            <div 
              className="card max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
              style={{ background: 'var(--bg-main)', border: '1px solid var(--surface-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>{selectedComplaint.complaint_id}</span>
                    <span className={getStatusBadgeClass(selectedComplaint.status)}>{selectedComplaint.status}</span>
                    {selectedComplaint.is_duplicate && (
                      <span className="badge badge-rejected text-xs">Duplicate of {selectedComplaint.duplicate_of_id}</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>{selectedComplaint.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-sm font-bold px-3 py-1.5 rounded-lg border hover:opacity-80 cursor-pointer"
                  style={{ background: 'var(--surface-card)', color: 'var(--text-muted)', borderColor: 'var(--surface-border)' }}
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="section-label">Description</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>{selectedComplaint.description}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Category & Department</div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>{selectedComplaint.category}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{selectedComplaint.department}</div>
                </div>

                <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Priority & Confidence</div>
                  <div className="font-bold text-sm" style={{ color: getPriorityColor(selectedComplaint.priority) }}>{selectedComplaint.priority} Priority</div>
                  <div style={{ color: 'var(--accent)' }}>🤖 {Math.round((selectedComplaint.confidence || 0) * 100)}% AI Confidence</div>
                </div>

                <div className="p-3.5 rounded-xl border space-y-1 sm:col-span-2" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Location Details</div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>{selectedComplaint.location}</div>
                  <div className="font-mono text-[11px]" style={{ color: 'var(--text-faint)' }}>Coordinates: Lat {selectedComplaint.latitude}, Lng {selectedComplaint.longitude}</div>
                </div>

                {((selectedComplaint.photos && selectedComplaint.photos.length > 0) || selectedComplaint.image_url) && (
                  <div className="p-3.5 rounded-xl border space-y-2 sm:col-span-2" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>📷 Photo Evidence</div>
                    <div className="flex gap-3 overflow-x-auto py-1">
                      {(selectedComplaint.photos && selectedComplaint.photos.length > 0 ? selectedComplaint.photos : [selectedComplaint.image_url!]).map((url, i) => (
                        <a key={i} href={url.startsWith('/') ? `${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'}${url}` : url} target="_blank" rel="noreferrer" className="block flex-shrink-0">
                          <img 
                            src={url.startsWith('/') ? `${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'}${url}` : url} 
                            alt={`Evidence ${i + 1}`} 
                            className="w-24 h-24 rounded-lg object-cover border hover:scale-105 transition-transform" 
                            style={{ borderColor: 'var(--surface-border)' }} 
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <ComplaintMapWrapper complaint={selectedComplaint} />
                </div>
              </div>

              {/* Action buttons inside Detail View Modal */}
              <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--surface-border)' }}>
                <h3 className="section-label">Update Complaint Status</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    disabled={updatingId === selectedComplaint.complaint_id || selectedComplaint.status.toLowerCase() === 'in progress' || selectedComplaint.status.toLowerCase() === 'in_progress'}
                    onClick={async () => {
                      await handleUpdateStatus(selectedComplaint.complaint_id, 'In Progress')
                      setSelectedComplaint((prev) => prev ? { ...prev, status: 'In Progress' } : null)
                    }}
                    style={{
                      background: (selectedComplaint.status.toLowerCase() === 'in progress' || selectedComplaint.status.toLowerCase() === 'in_progress') ? 'var(--surface-hover)' : 'var(--accent-dim)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent-border)',
                    }}
                    className="py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
                  >
                    {(selectedComplaint.status.toLowerCase() === 'in progress' || selectedComplaint.status.toLowerCase() === 'in_progress') ? '✓ In Progress' : 'Set In Progress'}
                  </button>

                  {(() => {
                    const modalResCheck = isResolveAllowed(selectedComplaint)
                    const isResolved = selectedComplaint.status.toLowerCase() === 'resolved'
                    return (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={updatingId === selectedComplaint.complaint_id || isResolved || !modalResCheck.allowed}
                          onClick={async () => {
                            await handleUpdateStatus(selectedComplaint.complaint_id, 'Resolved')
                            setSelectedComplaint((prev) => prev ? { ...prev, status: 'Resolved' } : null)
                          }}
                          title={!modalResCheck.allowed ? modalResCheck.reason : undefined}
                          style={{
                            background: isResolved ? 'var(--surface-hover)' : 'var(--success-dim)',
                            color: 'var(--success)',
                            border: '1px solid rgba(90,122,82,0.3)',
                          }}
                          className="w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
                        >
                          {isResolved ? '✓ Resolved' : 'Resolve'}
                        </button>
                        {!modalResCheck.allowed && !isResolved && (
                          <span className="text-[11px] text-amber-400 font-medium text-center mt-1">
                            Location not verified — cannot mark complete.
                          </span>
                        )}
                      </div>
                    )
                  })()}

                  <button
                    type="button"
                    disabled={updatingId === selectedComplaint.complaint_id || selectedComplaint.status.toLowerCase() === 'rejected'}
                    onClick={async () => {
                      await handleUpdateStatus(selectedComplaint.complaint_id, 'Rejected')
                      setSelectedComplaint((prev) => prev ? { ...prev, status: 'Rejected' } : null)
                    }}
                    style={{
                      background: selectedComplaint.status.toLowerCase() === 'rejected' ? 'var(--surface-hover)' : 'var(--danger-dim)',
                      color: 'var(--danger)',
                      border: '1px solid rgba(192,71,62,0.3)',
                    }}
                    className="py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
                  >
                    {selectedComplaint.status.toLowerCase() === 'rejected' ? '✓ Rejected' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function OfficerDashboard() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading dashboard…
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}


