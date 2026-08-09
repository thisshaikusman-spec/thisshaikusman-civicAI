'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Shield, User, ArrowRight, CheckCircle2, Lock } from 'lucide-react'
import { motion } from 'framer-motion'

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || ''

  const [activeTab, setActiveTab] = useState<'citizen' | 'officer'>('citizen')
  const [email, setEmail] = useState('citizen@demo.com')
  const [password, setPassword] = useState('demo123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoSelected, setDemoSelected] = useState<string | null>(null)

  const handleTabChange = (role: 'citizen' | 'officer') => {
    setActiveTab(role)
    setError('')
    if (role === 'citizen') {
      setEmail('citizen@demo.com')
      setPassword('demo123')
    } else {
      setEmail('officer@demo.com')
      setPassword('demo123')
    }
  }

  const handleQuickDemo = (role: 'citizen' | 'officer') => {
    handleTabChange(role)
    setDemoSelected(role)
    setTimeout(() => setDemoSelected(null), 1000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const cleanEmail = email.trim()

    try {
      let res = await fetch(`${FASTAPI_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      })

      // If user doesn't exist yet on backend, auto-register demo user
      if (!res.ok && (cleanEmail.includes('demo') || cleanEmail.includes('citizen') || cleanEmail.includes('officer'))) {
        const role = activeTab === 'officer' || cleanEmail.includes('officer') ? 'officer' : 'citizen'
        const regRes = await fetch(`${FASTAPI_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: role === 'officer' ? 'Demo Officer' : 'Demo Citizen',
            email: cleanEmail,
            password: password,
            role: role,
          }),
        })
        if (regRes.ok) {
          res = await fetch(`${FASTAPI_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password }),
          })
        }
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Invalid email or password')
        setLoading(false)
        return
      }

      const data = await res.json()
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))

      await signIn('credentials', {
        email: data.user.role === 'officer' ? `officer_${cleanEmail}` : cleanEmail,
        password,
        redirect: false,
      })

      const destination = callbackUrl || (data.user.role === 'officer' ? '/officer/dashboard' : '/citizen/dashboard')
      window.location.href = destination
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error. Make sure backend is running.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      
      {/* Background ambient glow */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'radial-gradient(circle, rgba(104,109,85,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

      <motion.div 
        initial={{ opacity: 0, y: 16, scale: 0.98 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '500px', position: 'relative', zIndex: 1 }}
      >

        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none', marginBottom: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem', boxShadow: '0 6px 20px rgba(16,185,129,0.3)' }}>C</div>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>CivicAI</span>
          </Link>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>Welcome Back</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Sign in to access your civic portal</p>
        </div>

        {/* Interactive Navy Blue Role Tabs */}
        <div style={{
          display: 'flex',
          background: '#0b1d3a',
          padding: '0.45rem',
          borderRadius: '16px',
          marginBottom: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 10px 30px rgba(11, 29, 58, 0.3)',
          gap: '0.5rem',
        }}>
          <button
            type="button"
            onClick={() => handleTabChange('citizen')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              border: activeTab === 'citizen' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              background: activeTab === 'citizen'
                ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                : 'transparent',
              color: activeTab === 'citizen' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'citizen' ? '0 4px 16px rgba(14, 165, 233, 0.4)' : 'none',
              transform: activeTab === 'citizen' ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'citizen') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                e.currentTarget.style.color = '#ffffff'
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'citizen') {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#94a3b8'
              }
            }}
          >
            <User size={18} />
            <span>Citizen</span>
            {activeTab === 'citizen' && (
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.25)', padding: '0.15rem 0.4rem', borderRadius: '999px', fontWeight: 800 }}>ACTIVE</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('officer')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              border: activeTab === 'officer' ? '1px solid rgba(52, 211, 153, 0.5)' : '1px solid transparent',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              background: activeTab === 'officer'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'transparent',
              color: activeTab === 'officer' ? '#ffffff' : '#94a3b8',
              boxShadow: activeTab === 'officer' ? '0 4px 16px rgba(16, 185, 129, 0.4)' : 'none',
              transform: activeTab === 'officer' ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'officer') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                e.currentTarget.style.color = '#ffffff'
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'officer') {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#94a3b8'
              }
            }}
          >
            <Shield size={18} />
            <span>Officer</span>
            {activeTab === 'officer' && (
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.25)', padding: '0.15rem 0.4rem', borderRadius: '999px', fontWeight: 800 }}>ACTIVE</span>
            )}
          </button>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2.25rem', boxShadow: '0 12px 36px rgba(0,0,0,0.08)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="field"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="field"
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius)', background: 'var(--danger-dim)', border: '1px solid rgba(160,64,64,0.3)', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-full"
              style={{ width: '100%', padding: '0.95rem', fontSize: '1rem', marginTop: '0.35rem', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Signing in…
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Sign In <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill Badges */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--surface-border)' }}>
            <p className="section-label" style={{ marginBottom: '0.85rem', textAlign: 'center' }}>One-Click Demo Fill</p>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => handleQuickDemo('citizen')}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '10px',
                  border: demoSelected === 'citizen' ? '1px solid var(--accent)' : '1px solid var(--surface-border)',
                  background: demoSelected === 'citizen' ? 'var(--accent-dim)' : 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s',
                }}
              >
                {demoSelected === 'citizen' ? <CheckCircle2 size={14} color="var(--accent)" /> : <User size={14} color="var(--accent)" />}
                Citizen Demo
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('officer')}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '10px',
                  border: demoSelected === 'officer' ? '1px solid var(--accent)' : '1px solid var(--surface-border)',
                  background: demoSelected === 'officer' ? 'var(--accent-dim)' : 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s',
                }}
              >
                {demoSelected === 'officer' ? <CheckCircle2 size={14} color="var(--accent)" /> : <Shield size={14} color="var(--accent)" />}
                Officer Demo
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-faint)', marginTop: '1.5rem' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>
              Create Account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

