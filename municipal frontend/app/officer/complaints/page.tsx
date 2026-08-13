'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import ProfileMenu from '@/components/ProfileMenu'
import PageContainer from '@/components/PageContainer'
import ComplaintMapWrapper from '@/components/ComplaintMapWrapper'
import AnimatedBadge from '@/components/motion/AnimatedBadge'
import AnimatedButton from '@/components/motion/AnimatedButton'
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

interface AIRankingItem {
  complaint_id: string
  title: string
  description: string
  category: string
  department: string
  location: string
  status: string
  current_priority: string
  ai_urgency_score: number
  ai_priority: string
  risk_factors: string[]
  priority_rank: number
}

interface AIRankingSummary {
  total_analyzed: number
  critical_count: number
  high_count: number
  primary_recommendation: string
}

const ALLOWED_STATUSES = ['Submitted', 'In Progress', 'Resolved', 'Rejected']

function ComplaintsContent() {
  const searchParams = useSearchParams()
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintResponse | null>(null)

  useEffect(() => {
    const priorityParam = searchParams.get('priority')
    const statusParam = searchParams.get('status')
    if (priorityParam) setFilterPriority(priorityParam.toUpperCase())
    if (statusParam) setFilterStatus(statusParam)
  }, [searchParams])

  const [analyzingAllRisks, setAnalyzingAllRisks] = useState(false)
  const [aiReport, setAiReport] = useState<{ summary: AIRankingSummary; ranked_complaints: AIRankingItem[] } | null>(null)

  const handleAnalyzeAllRisks = async () => {
    setAnalyzingAllRisks(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${baseUrl}/complaints/ai-analyze-priorities?apply_to_db=true`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setAiReport(data)
        // Refresh complaints list seamlessly
        const params = new URLSearchParams()
        if (filterStatus) params.append('status', filterStatus)
        if (filterPriority) params.append('priority', filterPriority)
        const url = `${baseUrl}/complaints/${params.toString() ? '?' + params.toString() : ''}`
        const cRes = await fetch(url)
        if (cRes.ok) {
          const cData = await cRes.json()
          setComplaints(cData.complaints || [])
        }
      } else {
        alert('Failed to execute AI batch risk analysis.')
      }
    } catch (err) {
      console.error('Error running AI risk analysis:', err)
      alert('Error connecting to backend AI service.')
    } finally {
      setAnalyzingAllRisks(false)
    }
  }

  const fetchComplaints = async () => {
    setLoading(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)
      if (filterPriority) params.append('priority', filterPriority)

      const url = `${baseUrl}/complaints/${params.toString() ? '?' + params.toString() : ''}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setComplaints(data.complaints || [])
      }
    } catch (err) {
      console.error('Failed to fetch complaints:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
  }, [filterStatus, filterPriority])

  const handleStatusChange = async (complaintId: string, newStatus: string) => {
    setUpdatingId(complaintId)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${baseUrl}/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setComplaints((prev) =>
          prev.map((c) => (c.complaint_id === complaintId ? { ...c, status: newStatus } : c))
        )
      } else {
        alert('Failed to update status on backend')
      }
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Error connecting to backend')
    } finally {
      setUpdatingId(null)
    }
  }

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
            <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>/ Officer</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>All Complaints</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{complaints.length} complaints in database (Live backend data)</p>
            </div>
            {/* Filters & AI Button */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAnalyzeAllRisks}
                disabled={analyzingAllRisks}
                style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(0, 168, 150, 0.35)',
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border-0"
              >
                {analyzingAllRisks ? (
                  <>
                    <span className="animate-spin text-sm">⌛</span>
                    Analyzing All Risks...
                  </>
                ) : (
                  <>
                    <span className="text-sm">🤖</span>
                    AI Risk Prioritizer
                  </>
                )}
              </button>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--surface-border)',
                  color: 'var(--text-main)',
                }}
                className="px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="" style={{ background: 'var(--bg-card-light)', color: 'var(--text-main)' }}>All Statuses</option>
                {ALLOWED_STATUSES.map((s) => (
                  <option key={s} value={s} style={{ background: 'var(--bg-card-light)', color: 'var(--text-main)' }}>{s}</option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--surface-border)',
                  color: 'var(--text-main)',
                }}
                className="px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="" style={{ background: 'var(--bg-card-light)', color: 'var(--text-main)' }}>All Priorities</option>
                <option value="LOW" style={{ background: 'var(--bg-card-light)', color: 'var(--text-main)' }}>LOW</option>
                <option value="MEDIUM" style={{ background: 'var(--bg-card-light)', color: 'var(--text-main)' }}>MEDIUM</option>
                <option value="HIGH" style={{ background: 'var(--bg-card-light)', color: 'var(--text-main)' }}>HIGH</option>
                <option value="CRITICAL" style={{ background: 'var(--bg-card-light)', color: 'var(--text-main)' }}>CRITICAL</option>
              </select>
            </div>
          </div>

          {/* Loading Banner during AI analysis */}
          {analyzingAllRisks && (
            <div 
              style={{
                background: 'linear-gradient(145deg, rgba(30,41,59,0.85) 0%, rgba(15,23,42,0.95) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                boxShadow: '0 8px 24px rgba(0,168,150,0.2)',
              }}
              className="p-5 rounded-2xl mb-8 flex items-center justify-between gap-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                <div>
                  <div className="text-emerald-400 font-bold text-sm">🤖 AI Priority Engine Analyzing All Complaints...</div>
                  <p className="text-xs text-gray-300">Scanning titles, descriptions, and risk factors across all complaints in database...</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Running LLM Analysis
              </span>
            </div>
          )}

          {/* AI Batch Analysis Report Banner (Rendered ONLY after analysis completes with real API data) */}
          {!analyzingAllRisks && aiReport && (
            <div 
              style={{
                background: 'linear-gradient(145deg, rgba(30,41,59,0.85) 0%, rgba(15,23,42,0.95) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 8px 24px rgba(0,168,150,0.15)',
              }}
              className="p-5 rounded-2xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold text-sm">⚡ AI Risk Batch Analysis Complete</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Synced to Database ({aiReport.summary.total_analyzed} Analyzed)</span>
                </div>
                <p className="text-xs text-gray-300">{aiReport.summary.primary_recommendation}</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <div className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
                  🚨 Critical Risks: {aiReport.summary.critical_count}
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ⚠️ High Risks: {aiReport.summary.high_count}
                </div>
                <button 
                  type="button"
                  onClick={() => setAiReport(null)}
                  className="text-gray-400 hover:text-white text-xs underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading complaints from backend...</div>
              ) : complaints.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No complaints found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)' }} className="text-xs uppercase tracking-wider">
                      <th className="text-left px-5 py-4 font-bold">ID</th>
                      <th className="text-left px-5 py-4 font-bold">Title & Description</th>
                      <th className="text-left px-5 py-4 font-bold">Category & Dept</th>
                      <th className="text-left px-5 py-4 font-bold">Priority</th>
                      <th className="text-left px-5 py-4 font-bold">Status</th>
                      <th className="text-left px-5 py-4 font-bold">Actions</th>
                      <th className="text-left px-5 py-4 font-bold">Location</th>
                      <th className="text-left px-5 py-4 font-bold">Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((complaint, i) => {
                      const isCompleted = complaint.status.toLowerCase() === 'resolved'
                      const isInProgress = complaint.status.toLowerCase() === 'in progress' || complaint.status.toLowerCase() === 'in_progress'
                      const isRejected = complaint.status.toLowerCase() === 'rejected'

                      return (
                        <tr
                          key={complaint.complaint_id}
                          style={{ borderBottom: '1px solid var(--surface-border)' }}
                          className="hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
                          onClick={() => setSelectedComplaint(complaint)}
                        >
                          <td className="px-5 py-4 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{complaint.complaint_id}</span>
                              {complaint.is_duplicate && (
                                <span className="badge badge-rejected text-[10px]" title={`Duplicate of ${complaint.duplicate_of_id}`}>
                                  Dup
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 max-w-xs">
                            <div className="font-semibold truncate" style={{ color: 'var(--text-main)' }}>{complaint.title}</div>
                            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{complaint.description}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>{complaint.category}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{complaint.department}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-bold" style={{ color: getPriorityColor(complaint.priority) }}>
                              {complaint.priority}
                            </span>
                          </td>
                          <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={complaint.status}
                              disabled={updatingId === complaint.complaint_id}
                              onChange={(e) => handleStatusChange(complaint.complaint_id, e.target.value)}
                              style={{
                                background: 'var(--bg-primary)',
                                borderColor: 'var(--surface-border)',
                                color: 'var(--text-main)',
                              }}
                              className="px-3 py-1 rounded-full text-xs font-bold border focus:outline-none cursor-pointer"
                            >
                              {ALLOWED_STATUSES.map((st) => (
                                <option key={st} value={st} style={{ background: 'var(--bg-card-light)', color: 'var(--text-main)' }}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={updatingId === complaint.complaint_id || isInProgress}
                                onClick={() => handleStatusChange(complaint.complaint_id, 'In Progress')}
                                style={{
                                  background: isInProgress ? 'var(--surface-hover)' : 'var(--accent-dim)',
                                  color: 'var(--accent)',
                                  border: '1px solid var(--accent-border)',
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {updatingId === complaint.complaint_id ? '...' : isInProgress ? '✓ Progress' : 'In Progress'}
                              </button>

                              {(() => {
                                const rowResCheck = isResolveAllowed(complaint)
                                return (
                                  <div className="flex flex-col items-center">
                                    <button
                                      type="button"
                                      disabled={updatingId === complaint.complaint_id || isCompleted || !rowResCheck.allowed}
                                      onClick={() => handleStatusChange(complaint.complaint_id, 'Resolved')}
                                      title={!rowResCheck.allowed ? rowResCheck.reason : undefined}
                                      style={{
                                        background: isCompleted ? 'var(--surface-hover)' : 'var(--success-dim)',
                                        color: 'var(--success)',
                                        border: '1px solid rgba(90,122,82,0.3)',
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      {updatingId === complaint.complaint_id ? '...' : isCompleted ? '✓ Resolved' : 'Resolve'}
                                    </button>
                                    {!rowResCheck.allowed && !isCompleted && (
                                      <span className="text-[9px] text-amber-400 font-medium mt-0.5 text-center leading-tight">
                                        Unverified
                                      </span>
                                    )}
                                  </div>
                                )
                              })()}

                              <button
                                type="button"
                                disabled={updatingId === complaint.complaint_id || isRejected}
                                onClick={() => handleStatusChange(complaint.complaint_id, 'Rejected')}
                                style={{
                                  background: isRejected ? 'var(--surface-hover)' : 'var(--danger-dim)',
                                  color: 'var(--danger)',
                                  border: '1px solid rgba(192,71,62,0.3)',
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {updatingId === complaint.complaint_id ? '...' : isRejected ? '✓ Rejected' : 'Reject'}
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{complaint.location}</td>
                          <td className="px-5 py-4 text-xs whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
                            <span suppressHydrationWarning>{new Date(complaint.created_at).toLocaleDateString('en-GB')}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
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
                      await handleStatusChange(selectedComplaint.complaint_id, 'In Progress')
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
                            await handleStatusChange(selectedComplaint.complaint_id, 'Resolved')
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
                      await handleStatusChange(selectedComplaint.complaint_id, 'Rejected')
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

export default function OfficerComplaintsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading complaints…
      </div>
    }>
      <ComplaintsContent />
    </Suspense>
  )
}



