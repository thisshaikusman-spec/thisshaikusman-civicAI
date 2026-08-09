'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProfileMenu from '@/components/ProfileMenu'
import PageContainer from '@/components/PageContainer'

interface CreatedComplaintResponse {
  complaint_id: string
  title: string
  description: string
  email: string
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

interface RiskAnalysisResult {
  category: string
  department: string
  priority: string
  confidence: number
  urgency_score: number
  risk_level: string
  risk_factors: string[]
  ai_assessment: string
}

export default function SubmitComplaintPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState('13.0827')
  const [longitude, setLongitude] = useState('80.2707')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdComplaint, setCreatedComplaint] = useState<CreatedComplaintResponse | null>(null)

  // AI Risk Analyzer states
  const [analyzingRisk, setAnalyzingRisk] = useState(false)
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysisResult | null>(null)
  const [riskError, setRiskError] = useState('')

  const handleAnalyzeRisk = async () => {
    if (!title.trim() || !description.trim()) {
      setRiskError('Please enter both a Title and Description first to analyze problem risk.')
      return
    }
    setAnalyzingRisk(true)
    setRiskError('')

    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${baseUrl}/complaints/analyze-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to analyze problem risk.')
      }

      const data: RiskAnalysisResult = await res.json()
      setRiskAnalysis(data)
    } catch (err: any) {
      setRiskError(err?.message || 'Error connecting to AI Risk Analyzer service.')
    } finally {
      setAnalyzingRisk(false)
    }
  }

  useEffect(() => {
    const userRaw = localStorage.getItem('user')
    if (!userRaw) {
      router.push('/login')
      return
    }
    try {
      const user = JSON.parse(userRaw)
      if (!user?.email) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')
      setName(user.name || '')
      setPhone(user.phone || '9876543210')
    } catch {
      router.push('/login')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      const latNum = parseFloat(latitude) || 13.0827
      const lngNum = parseFloat(longitude) || 80.2707

      const res = await fetch(`${baseUrl}/complaints/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || 'Citizen',
          email: email.trim(),
          phone: phone.trim() || '9876543210',
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          latitude: latNum,
          longitude: lngNum,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const detailMsg = typeof errData.detail === 'string' 
          ? errData.detail 
          : JSON.stringify(errData.detail || `Server returned status ${res.status}`)
        throw new Error(detailMsg)
      }

      const data: CreatedComplaintResponse = await res.json()
      setCreatedComplaint(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to submit complaint. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'LOW':
        return 'badge badge-resolved'
      case 'MEDIUM':
        return 'badge badge-submitted'
      case 'HIGH':
        return 'badge'
      case 'CRITICAL':
        return 'badge badge-rejected'
      default:
        return 'badge'
    }
  }

  const getPriorityStyle = (priority: string) => {
    if (priority?.toUpperCase() === 'HIGH') {
      return {
        background: 'rgba(192,120,50,0.14)',
        color: '#C07832',
        borderColor: 'rgba(192,120,50,0.3)',
      }
    }
    return {}
  }

  // Success view
  if (createdComplaint) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }} className="flex items-center justify-center px-4 py-12">
        <PageContainer className="flex flex-col items-center justify-center">
          <div className="text-center max-w-xl w-full">
            <div 
              style={{
                background: 'var(--success-dim)',
                borderColor: 'rgba(90,122,82,0.4)',
                color: 'var(--success)',
                boxShadow: '0 8px 24px rgba(90,122,82,0.2)',
              }}
              className="w-20 h-20 rounded-full border-2 flex items-center justify-center text-4xl mx-auto mb-6"
            >
              ✓
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>Complaint Submitted Successfully!</h1>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>Your complaint has been processed and routed by AI.</p>

            <div 
              style={{
                background: 'var(--surface-card)',
                borderColor: 'var(--surface-border)',
                color: 'var(--accent)',
              }}
              className="inline-block px-5 py-2 border rounded-xl font-mono text-xl font-semibold mb-6"
            >
              {createdComplaint.complaint_id}
            </div>

            <div className="card p-6 mb-6 text-left text-sm space-y-3">
              <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Title</span>
                <span className="font-medium" style={{ color: 'var(--text-main)' }}>{createdComplaint.title}</span>
              </div>
              <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Category</span>
                <span className="font-medium" style={{ color: 'var(--text-main)' }}>{createdComplaint.category}</span>
              </div>
              <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Department</span>
                <span className="font-medium" style={{ color: 'var(--text-main)' }}>{createdComplaint.department}</span>
              </div>
              <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Priority</span>
                <span className={getPriorityBadgeClass(createdComplaint.priority)} style={getPriorityStyle(createdComplaint.priority)}>
                  {createdComplaint.priority}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>AI Confidence</span>
                <span className="font-medium" style={{ color: 'var(--accent)' }}>{Math.round((createdComplaint.confidence || 0) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span className="badge badge-submitted">{createdComplaint.status}</span>
              </div>
              <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Location</span>
                <span className="font-medium" style={{ color: 'var(--text-main)' }}>{createdComplaint.location}</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Link
                href="/citizen/complaints"
                className="btn-primary flex-1 py-3 text-sm font-semibold"
              >
                View My Complaints
              </Link>
              <button
                onClick={() => {
                  setCreatedComplaint(null)
                  setTitle('')
                  setDescription('')
                  setLocation('')
                  setError('')
                }}
                className="btn-ghost flex-1 py-3 text-sm font-semibold"
              >
                Submit Another
              </button>
            </div>
          </div>
        </PageContainer>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--surface-border)' }}>
        <PageContainer className="flex items-center justify-between py-4">
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
          <div className="flex items-center gap-5">
            <Link 
              href="/citizen/dashboard" 
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ← Dashboard
            </Link>
            <ProfileMenu />
          </div>
        </PageContainer>
      </nav>

      <main className="py-10">
        <PageContainer>
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>Submit a Complaint</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Fill in the details below. Backend AI will automatically classify and assign priority.</p>
            </div>

            {error && (
              <div 
                style={{
                  background: 'var(--danger-dim)',
                  borderColor: 'rgba(160,64,64,0.3)',
                  color: 'var(--danger)',
                }}
                className="mb-6 p-4 rounded-xl border text-sm"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Details */}
              <div className="card p-6 space-y-4">
                <h2 className="section-label">Contact Information</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      className="field"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="field"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="field"
                    />
                  </div>
                </div>
              </div>

              {/* Issue Details */}
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="section-label mb-0">Complaint Details</h2>
                  <button
                    type="button"
                    onClick={handleAnalyzeRisk}
                    disabled={analyzingRisk}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border-0"
                  >
                    {analyzingRisk ? (
                      <>
                        <span className="animate-spin text-sm">⌛</span>
                        Analyzing Risk...
                      </>
                    ) : (
                      <>
                        <span className="text-sm">⚡</span>
                        AI Risk Analyser
                      </>
                    )}
                  </button>
                </div>

                {riskError && (
                  <div 
                    style={{
                      background: 'var(--danger-dim)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      color: 'var(--danger)',
                    }}
                    className="p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between"
                  >
                    <span>⚠️ {riskError}</span>
                    <button type="button" onClick={() => setRiskError('')} className="opacity-70 hover:opacity-100 text-xs">✕</button>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Severe pothole on Anna Salai causing traffic hazards"
                    className="field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Description *</label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about the issue..."
                    className="field leading-relaxed resize-none"
                  />
                </div>

                {/* AI Risk Analysis Report */}
                {riskAnalysis && (
                  <div 
                    style={{
                      background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.8) 100%)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
                      backdropFilter: 'blur(12px)',
                    }}
                    className="card p-5 space-y-4 rounded-2xl transition-all mt-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: 'var(--accent)', color: '#fff' }}>
                          🤖
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">AI Risk Analysis Report</h3>
                          <p className="text-xs text-gray-400">Automated AI problem & urgency assessment</p>
                        </div>
                      </div>
                      <div 
                        style={{
                          background: riskAnalysis.urgency_score >= 80 ? 'rgba(239,68,68,0.2)' : riskAnalysis.urgency_score >= 60 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                          color: riskAnalysis.urgency_score >= 80 ? '#ef4444' : riskAnalysis.urgency_score >= 60 ? '#f59e0b' : '#10b981',
                          border: `1px solid ${riskAnalysis.urgency_score >= 80 ? '#ef4444' : riskAnalysis.urgency_score >= 60 ? '#f59e0b' : '#10b981'}`,
                        }}
                        className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider"
                      >
                        {riskAnalysis.risk_level}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1 p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)' }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-400 font-medium">Urgency Score</span>
                          <span className="text-xs font-bold text-white">{riskAnalysis.urgency_score}/100</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full overflow-hidden bg-gray-700 mb-2">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${riskAnalysis.urgency_score}%`,
                              background: riskAnalysis.urgency_score >= 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : riskAnalysis.urgency_score >= 60 ? 'linear-gradient(90deg, #10b981, #f59e0b)' : 'linear-gradient(90deg, #0ea5e9, #10b981)',
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400">
                          Priority: <strong className="text-white">{riskAnalysis.priority}</strong>
                        </span>
                      </div>

                      <div className="sm:col-span-2 p-3.5 rounded-xl flex flex-col justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)' }}>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400 block mb-0.5">Detected Category</span>
                            <span className="font-semibold text-white">{riskAnalysis.category}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Routed Department</span>
                            <span className="font-semibold text-white">{riskAnalysis.department}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-[11px] text-emerald-400 font-medium">
                          Confidence Score: {Math.round(riskAnalysis.confidence * 100)}%
                        </div>
                      </div>
                    </div>

    <div>
      <span className="text-xs text-gray-400 font-medium block mb-1.5">Identified Risk Factors:</span>
      <div className="flex flex-wrap gap-1.5">
        {riskAnalysis.risk_factors.map((factor, idx) => (
          <span 
            key={idx}
            style={{
              background: 'rgba(239,68,68,0.12)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.25)',
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <span>⚠️</span> {factor}
          </span>
        ))}
      </div>
    </div>

                    <div className="p-3.5 rounded-xl text-xs leading-relaxed" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#e0f2fe' }}>
                      <strong className="text-sky-300 block mb-1">AI Recommendation:</strong>
                      {riskAnalysis.ai_assessment}
                    </div>
                  </div>
                )}
              </div>

              {/* Location Details */}
              <div className="card p-6 space-y-4">
                <h2 className="section-label">Location & Coordinates</h2>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Address / Landmark *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Near Bus Stand, Ward 12, Main Road"
                    className="field"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="field"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="field"
                    />
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-4 text-base font-semibold cursor-pointer"
              >
                {submitting ? 'Submitting to Backend...' : 'Submit Complaint'}
              </button>
            </form>
          </div>
        </PageContainer>
      </main>
    </div>
  )
}

