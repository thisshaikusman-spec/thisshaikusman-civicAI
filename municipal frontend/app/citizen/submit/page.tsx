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
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Link 
              href="/citizen/dashboard" 
              style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '1.1rem', color: '#e2e8f0', textDecoration: 'none', fontWeight: 600, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'transparent' }}
            >
              ← Dashboard
            </Link>
            <ProfileMenu />
          </div>
        </div>
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
                <h2 className="section-label">Complaint Details</h2>
                
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

