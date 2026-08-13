'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Download, Copy, Check, ExternalLink } from 'lucide-react'

interface QRCodeGeneratorProps {
  value: string
  size?: number
  title?: string
  subtitle?: string
  downloadFilename?: string
  showActions?: boolean
}

export default function QRCodeGenerator({
  value,
  size = 180,
  title,
  subtitle,
  downloadFilename = 'civicai-qr-code.png',
  showActions = true,
}: QRCodeGeneratorProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!value) return
    QRCode.toDataURL(
      value,
      {
        width: size * 2, // Retinal crispness
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (err) {
          console.error('Failed to generate QR code:', err)
          setError(true)
        } else {
          setDataUrl(url)
          setError(false)
        }
      }
    )
  }, [value, size])

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = downloadFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius)',
        padding: '1.25rem',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '100%',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}
    >
      {title && (
        <div style={{ marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            {title}
          </h4>
          {subtitle && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', margin: 0 }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div
        style={{
          background: '#ffffff',
          padding: '0.75rem',
          borderRadius: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {error ? (
          <div
            style={{
              width: size,
              height: size,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--danger)',
              fontSize: '0.85rem',
            }}
          >
            Failed to load QR
          </div>
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR Code for ${value}`}
            style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: size,
              height: size,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Generating...
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--accent)',
          background: 'var(--accent-dim)',
          padding: '0.25rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--accent-border)',
        }}
      >
        {value}
      </div>

      {showActions && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%' }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: 'var(--surface-border)',
              color: 'var(--text-main)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!dataUrl}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              cursor: dataUrl ? 'pointer' : 'not-allowed',
              opacity: dataUrl ? 1 : 0.6,
              transition: 'all 0.15s',
            }}
          >
            <Download size={14} />
            Download
          </button>
        </div>
      )}
    </div>
  )
}
