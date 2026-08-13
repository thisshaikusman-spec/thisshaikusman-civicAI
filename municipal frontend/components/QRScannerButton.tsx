'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import QRScannerModal, { ScannedAssetData } from './QRScannerModal'

interface QRScannerButtonProps {
  onScanResult?: (result: ScannedAssetData) => void
  variant?: 'nav' | 'hero' | 'inline'
  className?: string
}

export default function QRScannerButton({
  onScanResult,
  variant = 'nav',
  className = '',
}: QRScannerButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (variant === 'hero') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.85rem 1.6rem',
            borderRadius: '12px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent-border)',
            color: 'var(--accent)',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 4px 16px rgba(0,168,150,0.15)',
          }}
          className={className}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)'
            e.currentTarget.style.color = '#ffffff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-dim)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
        >
          <QrCode size={20} />
          Scan Public QR Tag
        </button>

        <QRScannerModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onScanResult={onScanResult}
        />
      </>
    )
  }

  if (variant === 'inline') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent-border)',
            color: 'var(--accent)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          className={className}
        >
          <QrCode size={16} />
          Scan QR Code
        </button>

        <QRScannerModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onScanResult={onScanResult}
        />
      </>
    )
  }

  // Default 'nav' style
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.55rem',
          padding: '0.55rem 1.1rem',
          borderRadius: '10px',
          background: 'rgba(0,168,150,0.14)',
          border: '1px solid rgba(0,168,150,0.35)',
          color: '#ffffff',
          fontSize: '0.95rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        className={className}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--accent)'
          e.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0,168,150,0.14)'
          e.currentTarget.style.borderColor = 'rgba(0,168,150,0.35)'
        }}
      >
        <QrCode size={18} color="var(--accent)" />
        <span style={{ color: '#ffffff' }}>Scan QR</span>
      </button>

      <QRScannerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onScanResult={onScanResult}
      />
    </>
  )
}
