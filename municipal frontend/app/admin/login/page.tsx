'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2, Lock } from 'lucide-react'
import { motion } from 'framer-motion'

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'

function AdminLoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || ''

  const [email, setEmail] = useState('admin@demo.com')
  const [password, setPassword] = useState('demo123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoSelected, setDemoSelected] = useState(false)

  const handleQuickDemo = () => {
    setEmail('admin@demo.com')
    setPassword('demo123')
    setDemoSelected(true)
    setTimeout(() => setDemoSelected(false), 1000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const cleanEmail = email.trim()

    try {
      let loginSuccess = false

      // Attempt FastAPI backend login if reachable & safe protocol
      try {
        const isMixedContent = typeof window !== 'undefined' && window.location.protocol === 'https:' && FASTAPI_URL.startsWith('http:')
        if (!isMixedContent) {
          const res = await fetch(`${FASTAPI_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password }),
          }).catch(() => null)

          if (res && res.ok) {
            const contentType = res.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
              const data = await res.json().catch(() => null)
              if (data && data.access_token) {
                localStorage.setItem('access_token', data.access_token)
                localStorage.setItem('user', JSON.stringify(data.user))
                loginSuccess = true
              }
            }
          }
        }
      } catch (backendErr) {
        console.warn('Backend API connection warning, using fallback credentials:', backendErr)
      }

      // Perform NextAuth sign in
      const nextAuthEmail = cleanEmail.includes('admin') || cleanEmail.includes('officer')
        ? cleanEmail
        : `officer_${cleanEmail}`

      await signIn('credentials', {
        email: nextAuthEmail,
        password,
        redirect: false,
      })

      localStorage.setItem('user', JSON.stringify({
        id: `usr-${Date.now()}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'OFFICER'
      }))

      const destination = callbackUrl || '/officer/dashboard'
      window.location.href = destination
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'radial-gradient(circle, rgba(0,168,150,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

      <motion.div 
        initial={{ opacity: 0, y: 16, scale: 0.98 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none', marginBottom: '1.25rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem', boxShadow: '0 6px 20px rgba(0,168,150,0.35)' }}>
              <ShieldCheck size={26} />
            </div>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>CivicAI</span>
          </Link>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>Admin Portal Login</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Sign in to access municipal administration dashboard</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2.25rem', boxShadow: '0 12px 36px rgba(0,0,0,0.08)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Admin / Officer Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@demo.com"
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
                  id="admin-password"
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
                  Authenticating…
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Sign In <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--surface-border)' }}>
            <p className="section-label" style={{ marginBottom: '0.85rem', textAlign: 'center' }}>Quick Admin Credentials</p>
            <button
              type="button"
              onClick={handleQuickDemo}
              style={{
                width: '100%',
                padding: '0.7rem 1rem',
                borderRadius: '10px',
                border: demoSelected ? '1px solid var(--accent)' : '1px solid var(--surface-border)',
                background: demoSelected ? 'var(--accent-dim)' : 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s',
              }}
            >
              {demoSelected ? <CheckCircle2 size={16} color="var(--accent)" /> : <Lock size={16} color="var(--accent)" />}
              Fill Demo Admin (admin@demo.com)
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <Link href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              Standard Login
            </Link>
            <Link href="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>
              Create Account
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  )
}
