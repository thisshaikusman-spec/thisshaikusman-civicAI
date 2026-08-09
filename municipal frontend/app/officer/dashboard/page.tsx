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

export default function OfficerDashboard() {
  const router = useRouter()
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* Navbar */}
      <nav style={{ background: '#0b1d3a', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', width: '100%' }}>
        <div style={{ width: '100%', padding: '1rem 2.5rem' }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/officer/dashboard" className="flex items-center gap-2.5 text-decoration-none">
              <div 
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
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
            {[
              {
                label: 'Total Complaints',
                value: totalCount.toLocaleString(),
                icon: '📋',
                accentColor: 'var(--accent)',
                dimColor: 'var(--accent-dim)',
              },
              {
                label: 'Resolved',
                value: resolvedCount.toLocaleString(),
                icon: '✅',
                accentColor: 'var(--success)',
                dimColor: 'var(--success-dim)',
              },
              {
                label: 'In Progress',
                value: inProgressCount.toLocaleString(),
                icon: '⚙️',
                accentColor: 'var(--warning)',
                dimColor: 'var(--warning-dim)',
              },
              {
                label: 'Critical',
                value: criticalCount.toLocaleString(),
                icon: '🚨',
                accentColor: 'var(--danger)',
                dimColor: 'var(--danger-dim)',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="card p-5"
                style={{
                  borderLeft: `4px solid ${stat.accentColor}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <div className="text-2xl font-bold mb-0.5" style={{ color: stat.accentColor }}>{stat.value}</div>
                <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Priority Queue / Complaints List */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>Priority Queue (Live Complaints)</h2>
                <Link 
                  href="/officer/complaints" 
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
                ) : complaints.length === 0 ? (
                  <div className="card p-5 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    No complaints in database.
                  </div>
                ) : (
                  complaints.slice(0, 6).map((complaint) => {
                    const isCompleted = complaint.status.toLowerCase() === 'resolved'
                    const isInProgress = complaint.status.toLowerCase() === 'in progress' || complaint.status.toLowerCase() === 'in_progress'

                    return (
                      <div
                        key={complaint.complaint_id}
                        className="card p-5 hover:opacity-95 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2.5 mb-1.5">
                              <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                                {complaint.complaint_id}
                              </span>
                              <span className={getStatusBadgeClass(complaint.status)}>
                                {complaint.status}
                              </span>
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
                        <div className="flex items-center gap-2.5 pt-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
                          <button
                            type="button"
                            disabled={updatingId === complaint.complaint_id || isInProgress}
                            onClick={() => handleUpdateStatus(complaint.complaint_id, 'In Progress')}
                            style={{
                              background: isInProgress ? 'var(--surface-hover)' : 'var(--accent-dim)',
                              color: 'var(--accent)',
                              border: '1px solid var(--accent-border)',
                            }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {updatingId === complaint.complaint_id ? 'Updating...' : isInProgress ? '✓ In Progress' : 'Set In Progress'}
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === complaint.complaint_id || isCompleted}
                            onClick={() => handleUpdateStatus(complaint.complaint_id, 'Resolved')}
                            style={{
                              background: isCompleted ? 'var(--surface-hover)' : 'var(--success-dim)',
                              color: 'var(--success)',
                              border: '1px solid rgba(90,122,82,0.3)',
                            }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {updatingId === complaint.complaint_id ? 'Updating...' : isCompleted ? '✓ Resolved' : 'Resolve'}
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
      </main>
    </div>
  )
}

