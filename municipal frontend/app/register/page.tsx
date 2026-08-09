'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'citizen' | 'officer'>('citizen')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Call real FastAPI /auth/register
      const res = await fetch(`${FASTAPI_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Registration failed')
        setLoading(false)
        return
      }

      const data = await res.json()

      // 2. Store JWT + user in localStorage for API calls
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // 3. Create NextAuth session cookie so Next.js middleware allows access
      await signIn('credentials', {
        email: role === 'officer' ? `officer_${email}` : email,
        password,
        redirect: false,
      })

      // 4. Navigate to correct dashboard
      const destination = role === 'officer' ? '/officer/dashboard' : '/citizen/dashboard'
      window.location.href = destination
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error. Make sure backend is running.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', marginBottom: '1.25rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.125rem', color: '#ffffff', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
              C
            </div>
            <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>CivicAI</span>
          </Link>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Create your account</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Join to report and manage civic issues</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="field"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="field"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                className="field"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '0.25rem' }}>Minimum 8 characters</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>I am a</label>
              <div style={{
                display: 'flex',
                background: '#0b1d3a',
                padding: '0.45rem',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                gap: '0.4rem',
              }}>
                <button
                  type="button"
                  onClick={() => setRole('citizen')}
                  style={{
                    flex: 1, padding: '0.7rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700,
                    border: role === 'citizen' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s',
                    background: role === 'citizen' ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : 'transparent',
                    color: role === 'citizen' ? '#ffffff' : '#94a3b8',
                    boxShadow: role === 'citizen' ? '0 4px 14px rgba(14, 165, 233, 0.35)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (role !== 'citizen') e.currentTarget.style.color = '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    if (role !== 'citizen') e.currentTarget.style.color = '#94a3b8'
                  }}
                >
                  👤 Citizen
                </button>
                <button
                  type="button"
                  onClick={() => setRole('officer')}
                  style={{
                    flex: 1, padding: '0.7rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700,
                    border: role === 'officer' ? '1px solid rgba(52, 211, 153, 0.5)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s',
                    background: role === 'officer' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                    color: role === 'officer' ? '#ffffff' : '#94a3b8',
                    boxShadow: role === 'officer' ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (role !== 'officer') e.currentTarget.style.color = '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    if (role !== 'officer') e.currentTarget.style.color = '#94a3b8'
                  }}
                >
                  🛡️ Officer
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius)', background: 'var(--danger-dim)', border: '1px solid rgba(160,64,64,0.3)', color: 'var(--danger)', fontSize: '0.8125rem' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-full"
              style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem', marginTop: '0.5rem', boxSizing: 'border-box' }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-faint)', marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

