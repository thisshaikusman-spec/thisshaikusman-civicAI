'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ProfileMenu from '@/components/ProfileMenu'
import PageContainer from '@/components/PageContainer'
import ComplaintMapWrapper from '@/components/ComplaintMapWrapper'
import { DEMO_COMPLAINTS } from '@/lib/demo-data'

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

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Submitted:    { bg: 'var(--warning-dim)', color: 'var(--warning)', border: 'rgba(245,158,11,0.3)' },
  SUBMITTED:    { bg: 'var(--warning-dim)', color: 'var(--warning)', border: 'rgba(245,158,11,0.3)' },
  ASSIGNED:     { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  Assigned:     { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  'In Progress': { bg: 'var(--accent-dim)', color: 'var(--accent)', border: 'var(--accent-border)' },
  IN_PROGRESS:  { bg: 'var(--accent-dim)', color: 'var(--accent)', border: 'var(--accent-border)' },
  Resolved:     { bg: 'var(--success-dim)', color: 'var(--success)', border: 'rgba(13,148,136,0.3)' },
  RESOLVED:     { bg: 'var(--success-dim)', color: 'var(--success)', border: 'rgba(13,148,136,0.3)' },
  Rejected:     { bg: 'var(--danger-dim)', color: 'var(--danger)', border: 'rgba(239,68,68,0.3)' },
  REJECTED:     { bg: 'var(--danger-dim)', color: 'var(--danger)', border: 'rgba(239,68,68,0.3)' },
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'var(--success)',
  MEDIUM: 'var(--warning)',
  HIGH: '#fb923c',
  CRITICAL: 'var(--danger)',
}

export default function CitizenComplaintDetailPage() {
  const router = useRouter()
  const params = useParams()
  const complaintIdFromUrl = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''

  const [complaint, setComplaint] = useState<ComplaintResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)

  useEffect(() => {
    if (!complaintIdFromUrl) return

    const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'

    // First attempt: fetch directly from FastAPI backend GET /complaints/{id}
    fetch(`${baseUrl}/complaints/${encodeURIComponent(complaintIdFromUrl)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          setComplaint(data)
          setLoading(false)
        } else {
          // If not found in backend, search DEMO_COMPLAINTS
          findInDemoData()
        }
      })
      .catch(() => {
        // Backend offline or fetch error -> fallback to DEMO_COMPLAINTS
        findInDemoData()
      })

    function findInDemoData() {
      const matchedDemo = DEMO_COMPLAINTS.find(
        (d) =>
          d.civicId.toLowerCase() === complaintIdFromUrl.toLowerCase() ||
          d.id.toLowerCase() === complaintIdFromUrl.toLowerCase()
      )

      if (matchedDemo) {
        setComplaint({
          complaint_id: matchedDemo.civicId,
          title: matchedDemo.title,
          description: matchedDemo.description,
          category: matchedDemo.categoryDisplay || matchedDemo.category,
          department: matchedDemo.department,
          priority: matchedDemo.priority,
          confidence: matchedDemo.aiConfidence,
          status: matchedDemo.status === 'IN_PROGRESS' ? 'In Progress' : matchedDemo.status === 'ASSIGNED' ? 'In Progress' : matchedDemo.status,
          location: matchedDemo.address,
          latitude: matchedDemo.latitude,
          longitude: matchedDemo.longitude,
          created_at: matchedDemo.createdAt,
          updated_at: matchedDemo.updatedAt,
        })
      } else {
        // Fallback generic demo view if ID format matched notification demo
        setComplaint({
          complaint_id: complaintIdFromUrl.toUpperCase(),
          title: `Municipal Complaint (${complaintIdFromUrl.toUpperCase()})`,
          description: 'Details for this complaint have been logged and processed by CivicAI automated routing.',
          category: 'Drainage Department',
          department: 'Public Works & Drainage',
          priority: 'HIGH',
          confidence: 0.95,
          status: 'In Progress',
          location: 'Coimbatore, Tamil Nadu',
          latitude: 11.0168,
          longitude: 76.9558,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
      setLoading(false)
    }
  }, [complaintIdFromUrl])

  const handleWithdraw = async () => {
    if (!complaint) return
    setWithdrawing(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${baseUrl}/complaints/${complaint.complaint_id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        console.warn('Backend delete returned status:', res.status)
      }
      router.push('/citizen/dashboard')
    } catch (err) {
      console.error('Error withdrawing complaint:', err)
      router.push('/citizen/dashboard')
    } finally {
      setWithdrawing(false)
    }
  }

  const statusInfo = STATUS_STYLE[complaint?.status ?? 'Submitted'] ?? {
    bg: 'rgba(255,255,255,0.05)',
    color: 'var(--text-muted)',
    border: 'var(--surface-border)',
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
            <span style={{ color: '#94a3b8', fontSize: '1.05rem', fontWeight: 600 }}>/ Complaint Detail</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Link href="/citizen/dashboard" style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '1.1rem', color: '#e2e8f0', textDecoration: 'none', fontWeight: 600 }}>
              Dashboard
            </Link>
            <Link href="/citizen/complaints" style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '1.1rem', color: '#e2e8f0', textDecoration: 'none', fontWeight: 600 }}>
              My Complaints
            </Link>
            <ProfileMenu />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '2.5rem 0 4rem' }}>
        <PageContainer>
          {/* Top navigation back button */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              href="/citizen/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                background: 'var(--surface-card)',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--surface-border)',
              }}
            >
              ← Back to Dashboard
            </Link>
            <span style={{ color: 'var(--text-faint)' }}>/</span>
            <span suppressHydrationWarning style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontFamily: 'monospace' }}>
              {complaintIdFromUrl}
            </span>
          </div>

          {loading ? (
            <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius)', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading complaint details...
            </div>
          ) : error || !complaint ? (
            <div style={{ background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center' }}>
              {error || 'Complaint not found.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.75rem', alignItems: 'start' }}>
              {/* Left Column: Complaint Main Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius)',
                  padding: '2rem',
                }}>
                  {/* Header badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, background: 'var(--accent-dim)', padding: '0.25rem 0.75rem', borderRadius: '8px', border: '1px solid var(--accent-border)' }}>
                        {complaint.complaint_id}
                      </span>
                      <span style={{ padding: '0.35rem 0.95rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.border}` }}>
                        {complaint.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: PRIORITY_COLOR[complaint.priority] ?? 'var(--text-muted)' }}>
                      ↑ {complaint.priority} Priority
                    </span>
                  </div>

                  <h1 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.3 }}>
                    {complaint.title}
                  </h1>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)', fontWeight: 700, marginBottom: '0.5rem' }}>
                      Description
                    </h3>
                    <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: 1.65 }}>
                      {complaint.description}
                    </p>
                  </div>

                  {/* Progress timeline */}
                  <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)', fontWeight: 700, marginBottom: '1rem' }}>
                      Resolution Progress
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {['Submitted', 'In Progress', 'Resolved'].map((step, i) => {
                        const steps = ['Submitted', 'In Progress', 'Resolved']
                        const currentIdx = steps.findIndex(s => s.toLowerCase() === complaint.status.toLowerCase())
                        const isCompleted = i <= (currentIdx >= 0 ? currentIdx : 0)
                        return (
                          <div key={step} style={{ flex: 1, display: 'flex', flexFlow: 'column', gap: '0.4rem' }}>
                            <div style={{ height: '8px', borderRadius: '999px', background: isCompleted ? 'var(--accent)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }} />
                            <span style={{ fontSize: '0.75rem', color: isCompleted ? 'var(--text-main)' : 'var(--text-faint)', fontWeight: isCompleted ? 600 : 400 }}>
                              {step}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Live Location Tracking Map Card */}
                <div style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius)',
                  padding: '1.75rem',
                }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🗺️</span> Live Location & GPS Tracking
                  </h3>
                  <ComplaintMapWrapper complaint={complaint} />
                </div>
              </div>

              {/* Right Column: Metadata & Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.15rem',
                }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
                    Complaint Metadata
                  </h3>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>Department</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>{complaint.department}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>Category</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>{complaint.category}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>Location</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>{complaint.location}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>AI Routing Confidence</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>🤖</span> {Math.round((complaint.confidence || 0.9) * 100)}% Match
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>Submitted On</div>
                    <div
                      suppressHydrationWarning
                      style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}
                    >
                      {new Date(complaint.created_at).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {confirmingWithdraw ? (
                    <div style={{ background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>Are you sure you want to withdraw this complaint?</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={handleWithdraw}
                          disabled={withdrawing}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: '8px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: withdrawing ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {withdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
                        </button>
                        <button
                          onClick={() => setConfirmingWithdraw(false)}
                          disabled={withdrawing}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: '8px',
                            background: 'var(--surface-border)',
                            color: 'var(--text-muted)',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingWithdraw(true)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Withdraw Complaint
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </PageContainer>
      </main>
    </div>
  )
}
