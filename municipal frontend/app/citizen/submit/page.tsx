'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import ProfileMenu from '@/components/ProfileMenu'
import PageContainer from '@/components/PageContainer'
import AnimatedButton from '@/components/motion/AnimatedButton'

import VoiceAssistantToolbar, { SupportedLang } from '@/components/VoiceAssistantToolbar'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { geocodeAddress } from '@/lib/geo'
import QRCodeGenerator from '@/components/QRCodeGenerator'
import QRScannerButton from '@/components/QRScannerButton'

export interface PhotoMetadata {
  photo_url?: string
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  captured_at: string
  is_verified: boolean
  source: 'camera' | 'gallery'
}

export interface PhotoItem {
  file: File
  previewUrl: string
  metadata: PhotoMetadata
}

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
  photos?: string[]
  photos_metadata?: PhotoMetadata[]
  is_duplicate?: boolean
  duplicate_of_id?: string | null
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

  const [lang, setLang] = useState<SupportedLang>('en')
  const [activeListeningField, setActiveListeningField] = useState<string | null>(null)
  const [recordingTargetField, setRecordingTargetField] = useState<'title' | 'description' | 'location' | null>(null)

  // Holds the active SpeechRecognition instance so it can be aborted on unmount
  const recognitionRef = useRef<any>(null)

  // Cleanup: abort any in-flight speech recognition and synthesis when the page unmounts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
        recognitionRef.current = null
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const {
    isRecording,
    recordingSeconds,
    isTranscribing,
    error: recorderError,
    startRecording,
    stopAndTranscribe,
    cancelRecording,
  } = useAudioRecorder()

  const handleStartWhisperRecord = async (targetField: 'title' | 'description' | 'location') => {
    if (isRecording) {
      if (recordingTargetField === targetField) {
        // Stop & transcribe using FormData -> Whisper
        const result = await stopAndTranscribe('whisper-1')
        setRecordingTargetField(null)
        if (result && result.text) {
          if (targetField === 'title') setTitle(result.text)
          else if (targetField === 'description') setDescription(result.text)
          else if (targetField === 'location') setLocation(result.text)

          if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(`Transcribed: ${result.text}`)
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(u)
          }
        }
      } else {
        cancelRecording()
        setRecordingTargetField(null)
      }
    } else {
      setRecordingTargetField(targetField)
      const ok = await startRecording()
      if (!ok) {
        setRecordingTargetField(null)
      }
    }
  }

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdComplaint, setCreatedComplaint] = useState<CreatedComplaintResponse | null>(null)

  const getRecognitionLangCode = (selectedLang: SupportedLang): string => {
    switch (selectedLang) {
      case 'ta': return 'ta-IN'
      case 'hi': return 'hi-IN'
      case 'te': return 'te-IN'
      case 'en': default: return 'en-IN'
    }
  }

  const handleStartSpeechToText = (targetField: 'title' | 'description' | 'location') => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Speech-to-Text is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    if (activeListeningField === targetField) {
      setActiveListeningField(null)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.lang = getRecognitionLangCode(lang)
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setActiveListeningField(targetField)
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0]?.transcript || ''
        if (targetField === 'title') setTitle(transcript)
        else if (targetField === 'description') setDescription(transcript)
        else if (targetField === 'location') setLocation(transcript)

        // Read confirmation back to user
        if ('speechSynthesis' in window) {
          const langCode = getRecognitionLangCode(lang)
          const fieldLabel = lang === 'ta'
            ? (targetField === 'title' ? 'தலைப்பு' : targetField === 'description' ? 'விளக்கம்' : 'இடம்')
            : lang === 'hi'
            ? (targetField === 'title' ? 'शीर्षक' : targetField === 'description' ? 'विवरण' : 'स्थान')
            : lang === 'te'
            ? (targetField === 'title' ? 'శీర్షిక' : targetField === 'description' ? 'వివరాలు' : 'ప్రాంతం')
            : targetField.toUpperCase()

          const speakMsg = `${fieldLabel} recorded: ${transcript}`
          const u = new SpeechSynthesisUtterance(speakMsg)
          u.lang = langCode
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(u)
        }
      }

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err.error || err.message || err)

        if (err.error === 'not-allowed' || err.error === 'permission-denied') {
          alert('Mic access denied. Please allow microphone permission in browser settings.')
        } else if (err.error === 'no-speech') {
          console.warn('No speech detected. Please try speaking again.')
        } else if (err.error === 'network') {
          alert('Network error during speech recognition. Please check your internet connection.')
        } else if (err.error === 'aborted') {
          // Intentional abort on unmount — not an error
          return
        }

        recognitionRef.current = null
        setActiveListeningField(null)
      }

      recognition.onend = () => {
        recognitionRef.current = null
        setActiveListeningField(null)
      }

      recognition.start()
    } catch (e) {
      console.error('Failed to start speech recognition:', e)
      recognitionRef.current = null
      setActiveListeningField(null)
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

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const qTitle = params.get('title')
      const qLoc = params.get('location')
      if (qTitle) setTitle(qTitle)
      if (qLoc) setLocation(qLoc)
    }
  }, [router])

  const handleQRScanResult = (result: any) => {
    if (result.title) setTitle(result.title)
    if (result.location) setLocation(result.location)
  }

  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([])
  const [uploadError, setUploadError] = useState('')
  const [geoNotice, setGeoNotice] = useState('')
  const [isGettingGps, setIsGettingGps] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const fetchGPSLocation = (): Promise<{ lat: number | null; lng: number | null; accuracy: number | null; error?: string }> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        resolve({ lat: null, lng: null, accuracy: null, error: 'Browser does not support Geolocation API.' })
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          })
        },
        (err) => {
          let msg = 'Enable location access to verify photo'
          if (err.code === err.POSITION_UNAVAILABLE) msg = 'Location information unavailable.'
          else if (err.code === err.TIMEOUT) msg = 'Location request timed out.'
          resolve({ lat: null, lng: null, accuracy: null, error: msg })
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  const handleFileSelect = async (filesToProcess: FileList | File[], source: 'camera' | 'gallery' = 'gallery') => {
    setUploadError('')
    setGeoNotice('')
    const fileArray = Array.from(filesToProcess)

    if (photoItems.length + fileArray.length > 3) {
      setUploadError('Maximum 3 photo evidence images allowed.')
      return
    }

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        setUploadError(`File '${file.name}' is not a valid image format (JPG, PNG, WEBP allowed).`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`File '${file.name}' exceeds the maximum allowed size of 5MB.`)
        return
      }
    }

    setIsGettingGps(true)
    const gpsRes = await fetchGPSLocation()
    setIsGettingGps(false)

    if (gpsRes.error) {
      setGeoNotice(gpsRes.error)
    }

    const timestamp = new Date().toISOString()
    const newItems: PhotoItem[] = fileArray.map((file) => {
      const hasGps = gpsRes.lat !== null && gpsRes.lng !== null
      const isVerified = source === 'camera' && hasGps
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        metadata: {
          latitude: gpsRes.lat,
          longitude: gpsRes.lng,
          accuracy: gpsRes.accuracy,
          captured_at: timestamp,
          is_verified: isVerified,
          source,
        },
      }
    })

    setPhotoItems((prev) => [...prev, ...newItems])
  }

  const handleRemovePhoto = (index: number) => {
    setPhotoItems((prev) => {
      const target = prev[index]
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
    setUploadError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setUploadError('')

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const confirmText = lang === 'ta'
        ? `உங்கள் புகார் சமர்ப்பிக்கப்படுகிறது. தலைப்பு: ${title}. இடம்: ${location}.`
        : `Confirming complaint. Title set to: ${title}. Location set to: ${location}. Submitting to backend.`
      const u = new SpeechSynthesisUtterance(confirmText)
      u.lang = lang === 'ta' ? 'ta-IN' : 'en-US'
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'

      let uploadedPhotoUrls: string[] = []

      // 1. Upload photos if attached
      if (photoItems.length > 0) {
        const formData = new FormData()
        photoItems.forEach((item) => formData.append('files', item.file))

        try {
          const uploadRes = await fetch(`${baseUrl}/complaints/upload-evidence`, {
            method: 'POST',
            body: formData,
          })
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            uploadedPhotoUrls = uploadData.photos || []
          } else {
            console.warn('Upload endpoint error, using local previews as fallback')
            uploadedPhotoUrls = photoItems.map((pi) => pi.previewUrl)
          }
        } catch (uploadErr) {
          console.warn('Failed backend photo upload, falling back:', uploadErr)
          uploadedPhotoUrls = photoItems.map((pi) => pi.previewUrl)
        }
      }

      const photosMetadataPayload = uploadedPhotoUrls.map((url, idx) => ({
        photo_url: url,
        latitude: photoItems[idx]?.metadata.latitude ?? null,
        longitude: photoItems[idx]?.metadata.longitude ?? null,
        accuracy: photoItems[idx]?.metadata.accuracy ?? null,
        captured_at: photoItems[idx]?.metadata.captured_at || new Date().toISOString(),
        is_verified: photoItems[idx]?.metadata.is_verified ?? false,
        source: photoItems[idx]?.metadata.source || 'gallery',
      }))

      // Determine submission lat/lng (from photo GPS metadata or address geocoding)
      let submitLat: number | null = null
      let submitLng: number | null = null

      const photoWithGps = photoItems.find(p => p.metadata.latitude !== null && p.metadata.longitude !== null)
      if (photoWithGps) {
        submitLat = photoWithGps.metadata.latitude
        submitLng = photoWithGps.metadata.longitude
      } else {
        const geoRes = geocodeAddress(location.trim())
        submitLat = geoRes.lat
        submitLng = geoRes.lng
      }

      // 2. Submit Complaint
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
          latitude: submitLat,
          longitude: submitLng,
          image_url: uploadedPhotoUrls[0] || null,
          photos: uploadedPhotoUrls,
          photos_metadata: photosMetadataPayload,
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

            {(createdComplaint.is_duplicate || createdComplaint.duplicate_of_id) && (
              <div 
                style={{
                  background: 'var(--warning-dim)',
                  borderColor: 'rgba(200,130,25,0.4)',
                  color: 'var(--warning)',
                }}
                className="mb-6 p-4 rounded-xl border text-sm text-left font-medium"
              >
                ⚠️ <strong>Duplicate Issue Detected:</strong> This complaint matches an existing issue reported at this location and has been auto-linked to existing Complaint ID <strong>{createdComplaint.duplicate_of_id || createdComplaint.complaint_id}</strong>. No redundant record was created.
              </div>
            )}

            <div className="mb-6 flex flex-col items-center justify-center">
              <QRCodeGenerator
                value={createdComplaint.complaint_id}
                size={160}
                title="Official Complaint QR Code"
                subtitle="Save or scan to track status on mobile"
                downloadFilename={`civicai-${createdComplaint.complaint_id}.png`}
              />
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
              {photoItems.length > 0 && (
                <div className="pt-2 text-left">
                  <span className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Photo Evidence ({photoItems.length})</span>
                  <div className="flex gap-2">
                    {photoItems.map((item, i) => (
                      <div key={i} className="relative">
                        <img src={item.previewUrl} alt="Evidence" className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: 'var(--surface-border)' }} />
                        <span className="absolute -bottom-1 -right-1 text-[9px] px-1 py-0.2 rounded font-bold" style={{ background: item.metadata.is_verified ? 'var(--success)' : 'rgba(217,119,6,0.9)', color: '#fff' }}>
                          {item.metadata.is_verified ? '📍 Verified' : '📁 Gallery'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  setPhotoItems([])
                  setUploadError('')
                  setGeoNotice('')
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
        background: 'var(--nav-bg)',
      }}>
        <div style={{ width: '100%', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
          <Link href="/citizen/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--accent)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.35rem', boxShadow: '0 4px 16px rgba(0,168,150,0.35)' }}>C</div>
            <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', letterSpacing: '-0.01em' }}>CivicAI</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <QRScannerButton onScanResult={handleQRScanResult} />
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
            {/* AI Voice Assistant & Accessibility Toolbar */}
            <VoiceAssistantToolbar 
              lang={lang}
              onLangChange={setLang}
              speakText={
                lang === 'ta'
                  ? 'புகார் படிவம். உங்கள் புகாரின் தலைப்பு, விளக்கம் மற்றும் இடத்தை தட்டச்சு செய்யவும் அல்லது ஒலிவாங்கி பொத்தானை அழுத்தவும்.'
                  : 'Submit a Complaint form. You can type your complaint or click the microphone buttons to speak your title, description, and location.'
              }
            />

            {/* Quick QR Scanner Asset Banner */}
            <div 
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--accent-border)',
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '1.5rem' }}>📷</div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Scanning a Public Municipal QR Code?
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Scan QR tags on streetlights, dumpsters, or public assets to auto-fill location & details!
                  </p>
                </div>
              </div>
              <QRScannerButton variant="inline" onScanResult={handleQRScanResult} />
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>Submit a Complaint</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Fill in the details below or use the 🎙️ mic buttons to speak. Backend AI will automatically classify and assign priority.</p>
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
                <div className="flex items-center justify-between">
                  <h2 className="section-label">Complaint Details</h2>
                  <span className="text-xs font-semibold text-emerald-400">🎙️ Speak fields available</span>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Title *</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartSpeechToText('title')}
                        style={{
                          background: activeListeningField === 'title' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                          color: activeListeningField === 'title' ? '#ef4444' : 'var(--accent)',
                          border: activeListeningField === 'title' ? '1px solid #ef4444' : '1px solid rgba(0,168,150,0.35)',
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span className={activeListeningField === 'title' ? 'animate-ping' : ''}>🎙️</span>
                        {activeListeningField === 'title' ? (lang === 'ta' ? 'கேட்கிறது...' : 'Listening...') : (lang === 'ta' ? 'தலைப்பைப் பேசு' : 'Web Voice')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartWhisperRecord('title')}
                        style={{
                          background: isRecording && recordingTargetField === 'title' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                          color: isRecording && recordingTargetField === 'title' ? '#ef4444' : '#3b82f6',
                          border: isRecording && recordingTargetField === 'title' ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>🤖</span>
                        {isTranscribing && recordingTargetField === 'title'
                          ? 'Transcribing (Whisper)...'
                          : isRecording && recordingTargetField === 'title'
                          ? `Stop & Transcribe (${recordingSeconds}s)`
                          : 'Record Whisper Audio'}
                      </button>
                    </div>
                  </div>
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
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Description *</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartSpeechToText('description')}
                        style={{
                          background: activeListeningField === 'description' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                          color: activeListeningField === 'description' ? '#ef4444' : 'var(--accent)',
                          border: activeListeningField === 'description' ? '1px solid #ef4444' : '1px solid rgba(0,168,150,0.35)',
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span className={activeListeningField === 'description' ? 'animate-ping' : ''}>🎙️</span>
                        {activeListeningField === 'description' ? (lang === 'ta' ? 'கேட்கிறது...' : 'Listening...') : (lang === 'ta' ? 'விளக்கம் பேசு' : 'Web Voice')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartWhisperRecord('description')}
                        style={{
                          background: isRecording && recordingTargetField === 'description' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                          color: isRecording && recordingTargetField === 'description' ? '#ef4444' : '#3b82f6',
                          border: isRecording && recordingTargetField === 'description' ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>🤖</span>
                        {isTranscribing && recordingTargetField === 'description'
                          ? 'Transcribing (Whisper)...'
                          : isRecording && recordingTargetField === 'description'
                          ? `Stop & Transcribe (${recordingSeconds}s)`
                          : 'Record Whisper Audio'}
                      </button>
                    </div>
                  </div>
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
                <h2 className="section-label">Location Details</h2>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Address / Landmark *</label>
                    <button
                      type="button"
                      onClick={() => handleStartSpeechToText('location')}
                      style={{
                        background: activeListeningField === 'location' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                        color: activeListeningField === 'location' ? '#ef4444' : 'var(--accent)',
                        border: activeListeningField === 'location' ? '1px solid #ef4444' : '1px solid rgba(0,168,150,0.35)',
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className={activeListeningField === 'location' ? 'animate-ping' : ''}>🎙️</span>
                      {activeListeningField === 'location' ? (lang === 'ta' ? 'கேட்கிறது...' : 'Listening...') : (lang === 'ta' ? 'இடத்தைப் பேசு' : 'Speak Location')}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Near Bus Stand, Ward 12, Main Road"
                    className="field"
                  />
                </div>
              </div>

              {/* Photo Evidence */}
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="section-label">PHOTO EVIDENCE & GPS PROOF</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Take live photos to capture automatic GPS verification proof
                    </p>
                  </div>
                  <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                    (Optional • Max 3 images • Max 5MB each)
                  </span>
                </div>

                {uploadError && (
                  <div 
                    style={{
                      background: 'var(--danger-dim)',
                      borderColor: 'rgba(160,64,64,0.3)',
                      color: 'var(--danger)',
                    }}
                    className="p-3 rounded-xl border text-xs flex items-center justify-between"
                  >
                    <span>⚠️ {uploadError}</span>
                    <button type="button" onClick={() => setUploadError('')} className="text-xs font-bold px-2 py-0.5 cursor-pointer">✕</button>
                  </div>
                )}

                {geoNotice && (
                  <div 
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                    }}
                    className="p-3 rounded-xl border text-xs flex items-center justify-between"
                  >
                    <span>📍 <strong>Location Status:</strong> {geoNotice}</span>
                    <button type="button" onClick={() => setGeoNotice('')} className="text-xs font-bold px-2 py-0.5 cursor-pointer">✕</button>
                  </div>
                )}

                {isGettingGps && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Fetching live device GPS location proof...
                  </div>
                )}

                {/* Intake Options & Drag/Drop Zone */}
                {photoItems.length < 3 && (
                  <div className="space-y-3">
                    <div className="flex gap-3 flex-col sm:flex-row">
                      {/* Live Camera Button */}
                      <button
                        type="button"
                        onClick={() => document.getElementById('camera-capture-input')?.click()}
                        style={{
                          background: 'linear-gradient(135deg, rgba(0,168,150,0.15) 0%, rgba(0,133,121,0.25) 100%)',
                          border: '1px solid rgba(0,168,150,0.45)',
                        }}
                        className="flex-1 py-3.5 px-4 rounded-xl text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-lg"
                      >
                        <span className="text-lg">📷</span>
                        <div className="text-left">
                          <div className="font-extrabold text-sm text-emerald-300">Take Live Photo</div>
                          <div className="text-[10px] text-emerald-400/80 font-normal">📍 GPS Verified Proof</div>
                        </div>
                      </button>

                      {/* Gallery Upload Button */}
                      <button
                        type="button"
                        onClick={() => document.getElementById('gallery-upload-input')?.click()}
                        style={{
                          background: 'var(--surface-card)',
                          border: '1px solid var(--surface-border)',
                        }}
                        className="flex-1 py-3.5 px-4 rounded-xl text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-slate-800/50 transition-all cursor-pointer"
                      >
                        <span className="text-lg">📁</span>
                        <div className="text-left">
                          <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Upload from Gallery</div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Unverified Proof</div>
                        </div>
                      </button>
                    </div>

                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                        if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files, 'gallery')
                      }}
                      style={{
                        border: isDragging ? '2px dashed var(--accent)' : '2px dashed var(--surface-border)',
                        background: isDragging ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-primary)',
                        transition: 'all 0.2s ease',
                      }}
                      className="p-4 rounded-xl text-center flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50"
                      onClick={() => document.getElementById('gallery-upload-input')?.click()}
                    >
                      <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-main)' }}>
                        Or Drag & Drop photos here
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Supported formats: JPG, PNG, WEBP (Max 5MB per file)
                      </p>
                    </div>

                    {/* Hidden Inputs */}
                    <input
                      id="camera-capture-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleFileSelect(e.target.files, 'camera')
                        e.target.value = ''
                      }}
                    />
                    <input
                      id="gallery-upload-input"
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleFileSelect(e.target.files, 'gallery')
                        e.target.value = ''
                      }}
                    />
                  </div>
                )}

                {/* Thumbnail Previews with GPS Badges */}
                {photoItems.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Attached Photos ({photoItems.length}/3)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {photoItems.map((item, idx) => {
                        const { latitude, longitude, accuracy, is_verified, source } = item.metadata
                        const hasGps = latitude !== null && longitude !== null

                        return (
                          <div 
                            key={idx} 
                            className="relative rounded-xl overflow-hidden group border flex flex-col"
                            style={{ borderColor: 'var(--surface-border)', background: 'var(--bg-primary)' }}
                          >
                            <div className="relative aspect-square w-full">
                              <img 
                                src={item.previewUrl} 
                                alt={`Evidence thumbnail ${idx + 1}`} 
                                className="w-full h-full object-cover"
                              />

                              {/* GPS Verification Badge Overlay */}
                              <div className="absolute top-2 left-2 flex flex-col gap-1">
                                {is_verified ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-lg border border-emerald-400/40" style={{ background: 'rgba(16, 185, 129, 0.95)', color: '#ffffff' }}>
                                    <span>📍</span> GPS Verified
                                  </span>
                                ) : hasGps ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg border border-amber-400/40" style={{ background: 'rgba(245, 158, 11, 0.95)', color: '#ffffff' }}>
                                    <span>📁</span> Gallery (Unverified)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg border border-red-500/40" style={{ background: 'rgba(239, 68, 68, 0.95)', color: '#ffffff' }}>
                                    <span>⚠️</span> No location
                                  </span>
                                )}
                              </div>

                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemovePhoto(idx)
                                }}
                                title="Remove Photo"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.95)',
                                  color: '#ffffff',
                                }}
                                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg hover:scale-110 transition-transform cursor-pointer border-0 z-10"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Metadata Footer */}
                            <div className="p-2 bg-slate-900/90 text-[11px] space-y-0.5 border-t border-white/10" style={{ color: 'var(--text-muted)' }}>
                              <div className="flex justify-between items-center text-white/90 font-medium">
                                <span>Photo #{idx + 1}</span>
                                <span className="uppercase text-[9px] px-1 rounded bg-slate-800 text-slate-300 font-bold">{source}</span>
                              </div>
                              {hasGps ? (
                                <div className="text-[10px] font-mono text-emerald-400 truncate">
                                  Lat: {latitude?.toFixed(4)}, Lng: {longitude?.toFixed(4)} {accuracy ? `(±${Math.round(accuracy)}m)` : ''}
                                </div>
                              ) : (
                                <div className="text-[10px] text-red-400">
                                  No GPS tag attached
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <AnimatedButton
                type="submit"
                isLoading={submitting}
                loadingText="Submitting to Backend..."
                className="btn-primary w-full py-4 text-base font-semibold cursor-pointer"
                style={{ minHeight: '54px' }}
              >
                Submit Complaint
              </AnimatedButton>
            </form>
          </div>
        </PageContainer>
      </main>
    </div>
  )
}

