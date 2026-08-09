'use client'

import { useState, useEffect } from 'react'
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

export default function OfficerComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')

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
        await fetchComplaints()
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
      <nav style={{ background: '#0b1d3a', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', width: '100%' }}>
        <div style={{ width: '100%', padding: '1rem 2.5rem' }} className="flex items-center justify-between">
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
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
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

          {/* AI Batch Analysis Report Banner */}
          {aiReport && (
            <div 
              style={{
                background: 'linear-gradient(145deg, rgba(30,41,59,0.85) 0%, rgba(15,23,42,0.95) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 8px 24px rgba(16,185,129,0.15)',
              }}
              className="p-5 rounded-2xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold text-sm">⚡ AI Risk Batch Analysis Complete</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Synced to System</span>
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
                      <th className="text-left px-5 py-4 font-bold">Status (Update)</th>
                      <th className="text-left px-5 py-4 font-bold">Location</th>
                      <th className="text-left px-5 py-4 font-bold">Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((complaint, i) => (
                      <tr
                        key={complaint.complaint_id}
                        style={{ borderBottom: '1px solid var(--surface-border)' }}
                        className="hover:opacity-95 transition-all"
                      >
                        <td className="px-5 py-4 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>{complaint.complaint_id}</td>
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
                        <td className="px-5 py-4">
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
                        <td className="px-5 py-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{complaint.location}</td>
                        <td className="px-5 py-4 text-xs whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  )
}


