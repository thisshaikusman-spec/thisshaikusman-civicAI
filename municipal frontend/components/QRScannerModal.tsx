'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsQR from 'jsqr'
import {
  QrCode, Camera, Upload, Sparkles, X, Check, Copy, ExternalLink,
  AlertCircle, RefreshCw, Layers, ArrowRight, ShieldCheck, Info
} from 'lucide-react'
import QRCodeGenerator from './QRCodeGenerator'

export interface ScannedAssetData {
  type: 'asset' | 'complaint' | 'url' | 'text'
  title?: string
  location?: string
  category?: string
  raw: string
  complaintId?: string
}

interface QRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanResult?: (result: ScannedAssetData) => void
}

const DEMO_QR_ASSETS = [
  {
    id: 'demo-1',
    label: 'Streetlight Pole #402',
    category: 'Street Lighting',
    location: 'Avinashi Road, Ward 12',
    description: 'Electrical junction pole with damaged light bulb',
    payload: 'ASSET:Broken Streetlight Pole #402|Avinashi Road, Near Bus Stop, Ward 12|Street Lighting',
  },
  {
    id: 'demo-2',
    label: 'Public Dumpster #809',
    category: 'Sanitation & Waste',
    location: 'Town Hall Market Road',
    description: 'Overflowing municipal garbage container',
    payload: 'ASSET:Overflowing Garbage Dumpster #809|Town Hall Market Road|Sanitation & Waste',
  },
  {
    id: 'demo-3',
    label: 'Main Pipeline Leak #104',
    category: 'Water Supply',
    location: 'Cross Cut Road, Sector 4',
    description: 'High-pressure water valve leakage',
    payload: 'ASSET:Water Pipeline Leak #104|Cross Cut Road, Sector 4|Water Supply',
  },
  {
    id: 'demo-4',
    label: 'Complaint CMP-0001 Track',
    category: 'Complaint Tracking',
    location: 'Coimbatore Center',
    description: 'Track existing submitted complaint',
    payload: 'CMP-0001',
  },
]

export default function QRScannerModal({ isOpen, onClose, onScanResult }: QRScannerModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'demo'>('camera')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedResult, setScannedResult] = useState<ScannedAssetData | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Parse QR content into structured format
  const parseQRContent = (rawText: string): ScannedAssetData => {
    const trimmed = rawText.trim()
    if (trimmed.startsWith('ASSET:')) {
      const parts = trimmed.substring(6).split('|')
      return {
        type: 'asset',
        title: parts[0] || 'Municipal Asset',
        location: parts[1] || '',
        category: parts[2] || 'General',
        raw: trimmed,
      }
    }

    if (/^CMP-\d+/i.test(trimmed) || trimmed.startsWith('TRACK:')) {
      const complaintId = trimmed.replace('TRACK:', '').trim()
      return {
        type: 'complaint',
        complaintId: complaintId.toUpperCase(),
        raw: trimmed,
      }
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return {
        type: 'url',
        raw: trimmed,
      }
    }

    return {
      type: 'text',
      raw: trimmed,
    }
  }

  const handleScanSuccess = useCallback((rawContent: string) => {
    const parsed = parseQRContent(rawContent)
    setScannedResult(parsed)
    if (onScanResult) {
      onScanResult(parsed)
    }

    // Play subtle audio confirmation
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    } catch {}
  }, [onScanResult])

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current)
      animFrameIdRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }, [])

  // Start Camera Scanning Loop
  const startCamera = useCallback(async () => {
    setCameraError(null)
    stopCamera()

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported in this browser environment.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
        setIsScanning(true)

        // Frame scanner tick
        const tick = () => {
          if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
            animFrameIdRef.current = requestAnimationFrame(tick)
            return
          }

          const video = videoRef.current
          const canvas = canvasRef.current || document.createElement('canvas')
          canvasRef.current = canvas
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            })

            if (code && code.data) {
              stopCamera()
              handleScanSuccess(code.data)
              return
            }
          }

          animFrameIdRef.current = requestAnimationFrame(tick)
        }

        animFrameIdRef.current = requestAnimationFrame(tick)
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err)
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera permissions in your browser or try File Upload / Demo QR.'
          : err.message || 'Unable to start camera scanner.'
      )
      setIsScanning(false)
    }
  }, [stopCamera, handleScanSuccess])

  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !scannedResult) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, activeTab, scannedResult, startCamera, stopCamera])

  // Process uploaded QR code image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP).')
      return
    }

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setUploadError('Failed to process image canvas.')
        return
      }
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code && code.data) {
        handleScanSuccess(code.data)
      } else {
        setUploadError('No valid QR code found in this image. Try another photo or sample demo QR.')
      }
    }
    img.onerror = () => {
      setUploadError('Failed to load image file.')
    }
    img.src = URL.createObjectURL(file)
  }

  const handleActionClick = () => {
    if (!scannedResult) return
    onClose()

    if (scannedResult.type === 'asset') {
      const params = new URLSearchParams()
      if (scannedResult.title) params.set('title', scannedResult.title)
      if (scannedResult.location) params.set('location', scannedResult.location)
      if (scannedResult.category) params.set('category', scannedResult.category)
      router.push(`/citizen/submit?${params.toString()}`)
    } else if (scannedResult.type === 'complaint') {
      router.push(`/citizen/complaints?id=${scannedResult.complaintId}`)
    } else if (scannedResult.type === 'url') {
      window.open(scannedResult.raw, '_blank')
    }
  }

  const resetScan = () => {
    setScannedResult(null)
    setUploadError(null)
    if (activeTab === 'camera') {
      startCamera()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(5, 11, 24, 0.82)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--nav-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Municipal QR Scanner
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Scan public asset tag or complaint QR code
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Tabs */}
          {!scannedResult && (
            <div
              style={{
                display: 'flex',
                gap: '0.35rem',
                background: 'var(--bg-main)',
                padding: '0.35rem',
                borderRadius: '14px',
                border: '1px solid var(--surface-border)',
                marginBottom: '1.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'camera' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'camera' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                <Camera size={16} /> Live Camera
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'upload' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'upload' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                <Upload size={16} /> Upload File
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('demo')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'demo' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'demo' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                <Sparkles size={16} /> Demo QR Tags
              </button>
            </div>
          )}

          {/* Scanned Result Card */}
          {scannedResult ? (
            <div
              style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'left',
                boxShadow: '0 8px 24px rgba(0,168,150,0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                <ShieldCheck size={20} />
                <span>QR CODE SUCCESSFULLY DECODED</span>
              </div>

              {scannedResult.type === 'asset' && (
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                    {scannedResult.title}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    <div>📍 <strong>Location:</strong> {scannedResult.location || 'Municipal Zone'}</div>
                    <div>🏷️ <strong>Department:</strong> {scannedResult.category}</div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--surface-card)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
                    Scanning this municipal asset tag will automatically pre-fill the complaint title, location, and department category.
                  </p>
                </div>
              )}

              {scannedResult.type === 'complaint' && (
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                    Complaint ID: {scannedResult.complaintId}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Complaint tracking QR tag recognized. Click below to view live resolution status.
                  </p>
                </div>
              )}

              {scannedResult.type === 'url' && (
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                    URL Scanned
                  </h4>
                  <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent)', background: 'var(--surface-card)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                    {scannedResult.raw}
                  </div>
                </div>
              )}

              {scannedResult.type === 'text' && (
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                    Decoded Text Payload
                  </h4>
                  <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--surface-card)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                    {scannedResult.raw}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                {(scannedResult.type === 'asset' || scannedResult.type === 'complaint' || scannedResult.type === 'url') && (
                  <button
                    type="button"
                    onClick={handleActionClick}
                    style={{
                      flex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '12px',
                      background: 'var(--accent)',
                      color: '#ffffff',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {scannedResult.type === 'asset' && <>Proceed to Complaint <ArrowRight size={18} /></>}
                    {scannedResult.type === 'complaint' && <>Track Complaint <ArrowRight size={18} /></>}
                    {scannedResult.type === 'url' && <>Open Link <ExternalLink size={18} /></>}
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetScan}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: 'var(--surface-border)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={16} /> Scan Again
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Tab 1: Camera Stream */}
              {activeTab === 'camera' && (
                <div>
                  {cameraError ? (
                    <div
                      style={{
                        padding: '1.5rem',
                        background: 'var(--danger-dim)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '16px',
                        color: 'var(--danger)',
                        textAlign: 'center',
                      }}
                    >
                      <AlertCircle size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.5rem 0' }}>
                        Camera Permission or Hardware Issue
                      </p>
                      <p style={{ fontSize: '0.85rem', margin: '0 0 1rem 0', opacity: 0.9 }}>
                        {cameraError}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setActiveTab('upload')}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            background: 'var(--surface-card)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--surface-border)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Upload File Instead
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('demo')}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            background: 'var(--accent)',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Try Demo QR Tags
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '280px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        background: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <video
                        ref={videoRef}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />

                      {/* Scanner Frame Overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          width: '200px',
                          height: '200px',
                          border: '2px dashed var(--accent)',
                          borderRadius: '20px',
                          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {/* Animated Scanning Line */}
                        <div
                          style={{
                            width: '90%',
                            height: '2px',
                            background: 'var(--accent)',
                            boxShadow: '0 0 8px var(--accent)',
                            animation: 'qrScanLaser 2s infinite ease-in-out',
                          }}
                        />
                      </div>

                      <style jsx>{`
                        @keyframes qrScanLaser {
                          0% { transform: translateY(-80px); opacity: 0.2; }
                          50% { transform: translateY(80px); opacity: 1; }
                          100% { transform: translateY(-80px); opacity: 0.2; }
                        }
                      `}</style>

                      <div
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '999px',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        Point camera at a Municipal QR code
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Upload File */}
              {activeTab === 'upload' && (
                <div>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      height: '220px',
                      border: '2px dashed var(--surface-border)',
                      borderRadius: '16px',
                      background: 'var(--surface-card)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--surface-border)')}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--accent-dim)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Upload size={24} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>
                        Click to select QR Code Image
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Supports PNG, JPG, WEBP formats
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {uploadError && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1rem',
                        background: 'var(--danger-dim)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '10px',
                        color: 'var(--danger)',
                        fontSize: '0.85rem',
                      }}
                    >
                      {uploadError}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Demo QR Tags */}
              {activeTab === 'demo' && (
                <div>
                  <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <Info size={16} color="var(--accent)" />
                    <span>Click any municipal asset card below to simulate instant scanning:</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {DEMO_QR_ASSETS.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => handleScanSuccess(asset.payload)}
                        style={{
                          background: 'var(--surface-card)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: '14px',
                          padding: '0.85rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--surface-border)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {asset.category}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                            {asset.label}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            📍 {asset.location}
                          </div>
                        </div>

                        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                            Scan QR →
                          </span>
                          <div style={{ background: '#ffffff', padding: '0.2rem', borderRadius: '4px' }}>
                            <QRCodeGenerator value={asset.payload} size={36} showActions={false} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
