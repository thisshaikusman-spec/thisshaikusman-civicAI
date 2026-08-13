'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import {
  ClipboardList, CheckCircle2, Cog, AlertTriangle,
  FileText, Bot, MapPin, Menu, X, ArrowRight,
  Shield, Clock, Users, ChevronRight, Activity, QrCode,
} from 'lucide-react'
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import PageContainer from '@/components/PageContainer'
import QRScannerButton from '@/components/QRScannerButton'

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'

/* ── count-up ── */
function useCountUp(target: number, inView: boolean) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 55, damping: 20 })
  const [display, setDisplay] = useState('0')
  useEffect(() => { if (inView) mv.set(target) }, [inView, target, mv])
  useEffect(() => spring.on('change', v => {
    setDisplay(v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v).toString())
  }), [spring])
  return display
}

/* ── stat card ── */
function StatCard({ icon: Icon, label, rawValue, color, glow, delay }: {
  icon: React.ElementType; label: string; rawValue: number
  color: string; glow: string; delay: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const count = useCountUp(rawValue, inView)
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{ background: 'var(--surface-card)', border: `1px solid ${glow.replace('0.22','0.4')}`, borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center', boxShadow: `0 0 32px ${glow}`, flex: 1, minWidth: '200px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <Icon size={36} color={color} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: '2.75rem', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{inView ? count : '0'}</div>
      <div style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginTop: '0.6rem', fontWeight: 600 }}>{label}</div>
    </motion.div>
  )
}

/* ── Service Categories ── */
const CATEGORIES = ['Roads & Potholes', 'Street Lighting', 'Sanitation & Waste', 'Water Supply', 'Traffic & Signals', 'Drainage']

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [liveStats, setLiveStats] = useState({
    total: 0,
    resolved: 0,
    inProgress: 0,
    critical: 0,
  })

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    fetch(`${FASTAPI_URL}/complaints/stats`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setLiveStats({
            total: data.total || 0,
            resolved: data.by_status?.Resolved || data.by_status?.RESOLVED || 0,
            inProgress: (data.by_status?.['In Progress'] || 0) + (data.by_status?.IN_PROGRESS || 0),
            critical: data.by_priority?.CRITICAL || 0,
          })
        }
      })
      .catch(() => {})
  }, [])

  const NAV_LINKS = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', overflowX: 'hidden' }}>

      {/* subtle dot-grid bg texture */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'radial-gradient(circle, rgba(0,168,150,0.06) 1px, transparent 1px)', backgroundSize: '36px 36px', pointerEvents: 'none' }} />

      {/* ── Navbar ── */}
      <nav style={{
        width: '100%',
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(16px)',
        background: 'var(--nav-bg)',
      }}>
        <div style={{ width: '100%', padding: '0 2.5rem', display: 'flex', alignItems: 'center', height: '80px', justifyContent: 'space-between' }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--accent)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.35rem', boxShadow: '0 4px 16px rgba(0,168,150,0.35)' }}>C</div>
            <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', letterSpacing: '-0.01em' }}>CivicAI</span>
          </Link>

          {/* Center nav links — desktop only */}
          <div className="center-nav" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, justifyContent: 'center' }}>
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} style={{ padding: '0.6rem 1.35rem', borderRadius: '10px', fontSize: '1.1rem', color: '#e2e8f0', textDecoration: 'none', fontWeight: 600, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'transparent' }}
              >{l.label}</a>
            ))}
          </div>

          {/* Right CTA — desktop */}
          <div className="desktop-cta" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
            <QRScannerButton variant="nav" />
            <Link href="/login" style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              transition: 'all 0.15s',
            }}>Sign In</Link>
            <Link href="/register" className="btn-primary" style={{
              padding: '0.65rem 1.4rem',
              fontSize: '0.95rem',
              borderRadius: '10px',
              textDecoration: 'none',
            }}>Sign Up</Link>
          </div>

          {/* Hamburger — mobile */}
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.25rem', display: 'none', marginLeft: 'auto' }}>
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', borderTop: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
              <PageContainer style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {NAV_LINKS.map(l => <a key={l.label} href={l.href} style={{ fontSize: '1.15rem', color: 'var(--text-muted)', textDecoration: 'none', padding: '0.6rem 0', fontWeight: 600 }} onClick={() => setMenuOpen(false)}>{l.label}</a>)}
                <hr style={{ border: 'none', borderTop: '1px solid var(--surface-border)', margin: '0.25rem 0' }} />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link href="/login" style={{ flex: 1, padding: '0.75rem', textAlign: 'center', color: 'var(--text-main)', border: '1px solid var(--surface-border)', borderRadius: '10px', textDecoration: 'none', fontWeight: 600 }} onClick={() => setMenuOpen(false)}>Sign In</Link>
                  <Link href="/register" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>Sign Up</Link>
                </div>
              </PageContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero — two-col on desktop ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(4.5rem,10vw,8.5rem) 0 clamp(3.5rem,7vw,6rem)' }}>
        <PageContainer style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: 'clamp(3rem,7vw,6rem)' }} className="hero-grid">

          {/* Left — text */}
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 1.4rem', borderRadius: '999px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', fontSize: '1rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '2rem' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
              AI-Powered Municipal System
            </div>

            <h1 style={{ fontSize: 'clamp(2.75rem, 6vw, 4.75rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '1.75rem', color: 'var(--text-main)' }}>
              Resolve Civic Issues<br />
              <span style={{ color: 'var(--accent)' }}>Faster with AI</span>
            </h1>

            <p style={{ fontSize: 'clamp(1.15rem, 2vw, 1.4rem)', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '680px' }}>
              CivicAI automatically categorizes, prioritizes, and routes municipal complaints — so every pothole, broken streetlight, and drainage issue gets resolved on time.
            </p>

            <div style={{ display: 'flex', gap: '1.15rem', flexWrap: 'wrap' }}>
              <motion.div whileTap={{ scale: 0.95 }} transition={{ duration: 0.1 }} style={{ display: 'inline-block' }}>
                <Link href="/login" className="btn-primary" style={{ padding: '1.1rem 2.4rem', fontSize: '1.15rem', gap: '0.75rem' }}>
                  Submit a Complaint <ArrowRight size={22} />
                </Link>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }} transition={{ duration: 0.1 }} style={{ display: 'inline-block' }}>
                <QRScannerButton variant="hero" />
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }} transition={{ duration: 0.1 }} style={{ display: 'inline-block' }}>
                <a href="#how" className="btn-ghost" style={{ padding: '1.1rem 2.1rem', fontSize: '1.15rem' }}>
                  How it Works
                </a>
              </motion.div>
            </div>

            {/* Social proof micro-strip */}
            <div style={{ marginTop: '3.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', borderRadius: '12px', background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
                <Activity size={18} color="var(--success)" />
                <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Live System Connected to FastAPI Backend
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right — product mockup */}
          <motion.div initial={{ opacity: 0, x: 24, y: 8 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            style={{ position: 'relative' }}>
            {/* glow behind image */}
            <div aria-hidden style={{ position: 'absolute', inset: '-24px', borderRadius: '28px', background: 'radial-gradient(ellipse at center, rgba(0,168,150,0.15) 0%, transparent 70%)', filter: 'blur(28px)', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--surface-border)', boxShadow: '0 24px 48px rgba(0,0,0,0.12)', background: 'var(--surface-card)' }}>
              <Image
                src="/dashboard-mockup.png"
                alt="CivicAI dashboard preview"
                width={840}
                height={500}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                priority
              />
            </div>
          </motion.div>
        </PageContainer>
      </section>

      {/* ── Service Categories Strip ── */}
      <section style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--surface-border)', borderBottom: '1px solid var(--surface-border)', padding: '1.75rem 0', background: 'var(--bg-card-light)' }}>
        <PageContainer style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, whiteSpace: 'nowrap' }}>Covered Services</span>
          {CATEGORIES.map(cat => (
            <span key={cat} style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0.5rem 1.25rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--surface-border)', whiteSpace: 'nowrap' }}>{cat}</span>
          ))}
        </PageContainer>
      </section>

      {/* ── Stats ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <PageContainer>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.65rem)', fontWeight: 800 }}>Live System Database Metrics</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', marginTop: '0.6rem' }}>Real complaints stored and categorized in the system</p>
          </div>
          <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <StatCard icon={ClipboardList} label="Total Complaints"  rawValue={liveStats.total} color="var(--accent)"   glow="rgba(0,168,150,0.22)"   delay={0} />
            <StatCard icon={CheckCircle2} label="Resolved"          rawValue={liveStats.resolved} color="var(--success)"  glow="rgba(13,148,136,0.22)"  delay={0.07} />
            <StatCard icon={Cog}          label="In Progress"        rawValue={liveStats.inProgress} color="var(--warning)"  glow="rgba(217,119,6,0.22)"   delay={0.14} />
            <StatCard icon={AlertTriangle}label="Critical Issues"   rawValue={liveStats.critical} color="var(--danger)"   glow="rgba(220,38,38,0.22)"   delay={0.21} />
          </div>
        </PageContainer>
      </section>

      {/* ── How it Works ── */}
      <section id="how" style={{ position: 'relative', zIndex: 1, padding: '0 0 clamp(4rem,8vw,7rem)' }}>
        <PageContainer>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.65rem)', fontWeight: 800 }}>How CivicAI Works</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', marginTop: '0.6rem' }}>From complaint to resolution in three steps</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
            {[
              { step:'01', icon: FileText, title:'Submit Your Complaint', desc:'Describe the issue in plain language. Name, contact, location, and a clear title — takes 60 seconds.' },
              { step:'02', icon: Bot,      title:'AI Analysis & Routing',  desc:'AI classifies the complaint, assigns priority (LOW/MEDIUM/HIGH/CRITICAL), and routes it to the right department in seconds.' },
              { step:'03', icon: MapPin,   title:'Track & Resolve',        desc:'Monitor real-time status from Submitted → In Progress → Resolved. Officers act, you stay informed.' },
            ].map(({ step, icon: Icon, title, desc }, i) => (
              <motion.div key={step}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius)', padding: '2.25rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Icon size={30} color="var(--accent)" strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '0.6rem' }}>Step {step}</div>
                <h3 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.75rem' }}>{title}</h3>
                <p style={{ fontSize: '1.08rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ── Features / Why CivicAI ── */}
      <section id="features" style={{ position: 'relative', zIndex: 1, background: 'var(--bg-card-light)', borderTop: '1px solid var(--surface-border)', borderBottom: '1px solid var(--surface-border)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <PageContainer>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.65rem)', fontWeight: 800 }}>Why Citizens Trust CivicAI</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.75rem' }}>
            {[
              { icon: Clock,  title: 'Fast Resolution',      desc: 'AI routing delivers complaints to the right officer in seconds, not days.', color: 'var(--accent)' },
              { icon: Shield, title: 'Transparent Process',  desc: 'Every step is tracked. Citizens always know exactly where their complaint stands.', color: 'var(--success)' },
              { icon: Users,  title: 'Built for Everyone',   desc: 'Designed for all citizens regardless of technical skill or language.', color: 'var(--warning)' },
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div key={title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius)', padding: '2.25rem' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.35rem' }}>
                  <Icon size={28} color={color} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.65rem' }}>{title}</h3>
                <p style={{ fontSize: '1.08rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <PageContainer>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ background: 'var(--surface-card)', border: '1px solid var(--accent-border)', borderRadius: '20px', padding: 'clamp(3rem,6vw,4.5rem)', textAlign: 'center', boxShadow: '0 8px 32px rgba(15,45,86,0.10)', position: 'relative', overflow: 'hidden' }}>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.85rem)', fontWeight: 800, marginBottom: '1rem' }}>Ready to report an issue?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginBottom: '2.25rem' }}>Join citizens holding their municipalities accountable.</p>
            <motion.div whileTap={{ scale: 0.95 }} style={{ display: 'inline-block' }}>
              <Link href="/login" className="btn-primary" style={{ padding: '1.15rem 2.75rem', fontSize: '1.2rem', gap: '0.75rem' }}>
                Get Started Free <ChevronRight size={24} />
              </Link>
            </motion.div>
          </motion.div>
        </PageContainer>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--surface-border)', position: 'relative', zIndex: 1 }}>
        <PageContainer style={{ padding: 'clamp(3.5rem,6vw,4.5rem) 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) repeat(2, auto)', gap: '3.5rem 6rem', flexWrap: 'wrap', marginBottom: '3.5rem' }} className="footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.15rem', boxShadow: '0 4px 12px rgba(0,168,150,0.3)' }}>C</div>
                <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>CivicAI</span>
              </div>
              <p style={{ fontSize: '1rem', color: 'var(--text-faint)', lineHeight: 1.7, maxWidth: '280px' }}>AI-powered municipal complaint management for faster civic resolution.</p>
            </div>
            {[
              { heading: 'Product',  links: ['How it Works', 'Features', 'Submit Complaint', 'Track Status'] },
              { heading: 'Company',  links: ['About', 'Privacy Policy', 'Terms of Use', 'Contact'] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '1.15rem' }}>{col.heading}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {col.links.map(l => (
                    <Link key={l} href="/login" style={{ fontSize: '1.05rem', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>{l}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-faint)' }}>© 2026 CivicAI. All rights reserved.</p>
          </div>
        </PageContainer>
      </footer>

      {/* ── Responsive overrides ── */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-grid > div:last-child { display: none; }
          .center-nav { display: none !important; }
          .desktop-cta { display: none !important; }
          .hamburger { display: flex !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 901px) {
          .hamburger { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  )
}
