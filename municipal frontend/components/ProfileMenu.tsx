'use client'

import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'

interface User {
  id?: number
  name?: string
  email?: string
  role?: string
}

export default function ProfileMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem('user')
    if (raw) {
      try { setUser(JSON.parse(raw)) } catch {}
    }
  }, [])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleLogout = async () => {
    localStorage.clear()
    try { await signOut({ redirect: false }) } catch {}
    window.location.href = '/login'
  }

  const initial = (user?.name || user?.email || 'U').charAt(0).toUpperCase()
  const role = (user?.role || 'user').toUpperCase()

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Profile menu"
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'var(--accent)', color: '#fff',
          fontWeight: 700, fontSize: '0.875rem',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 12px rgba(14,165,233,0.3)',
          transition: 'box-shadow 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.07)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      >
        {initial}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 10px)',
          width: '240px', borderRadius: 'var(--radius)',
          background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          padding: '1rem', zIndex: 100,
        }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem', paddingBottom: '0.875rem', borderBottom: '1px solid var(--surface-border)' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent)', fontSize: '0.9375rem', flexShrink: 0 }}>
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>

          {/* Role */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Role</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)', letterSpacing: '0.05em' }}>
              {role}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '0.625rem',
              borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
              background: 'var(--danger-dim)', color: 'var(--danger)',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-dim)' }}
          >
            🚪 Log out
          </button>
        </div>
      )}
    </div>
  )
}
