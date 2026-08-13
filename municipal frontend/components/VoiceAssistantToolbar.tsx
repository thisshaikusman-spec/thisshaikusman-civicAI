'use client'

import { useState, useEffect } from 'react'

import { motion } from 'framer-motion'

export type SupportedLang = 'en' | 'ta' | 'hi' | 'te'

interface VoiceAssistantToolbarProps {
  onSpeakPage?: () => void
  speakText?: string
  lang?: SupportedLang
  onLangChange?: (lang: SupportedLang) => void
}

export default function VoiceAssistantToolbar({
  onSpeakPage,
  speakText = '',
  lang: externalLang,
  onLangChange,
}: VoiceAssistantToolbarProps) {
  const [lang, setLang] = useState<SupportedLang>(externalLang || 'en')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [largeFont, setLargeFont] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)

  useEffect(() => {
    if (externalLang) setLang(externalLang)
  }, [externalLang])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSynthesis = 'speechSynthesis' in window
      setSpeechSupported(hasSynthesis)
    }
  }, [])

  // Apply root accessibility classes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (largeFont) {
        document.documentElement.classList.add('accessibility-large-font')
      } else {
        document.documentElement.classList.remove('accessibility-large-font')
      }

      if (highContrast) {
        document.documentElement.classList.add('accessibility-high-contrast')
      } else {
        document.documentElement.classList.remove('accessibility-high-contrast')
      }
    }
  }, [largeFont, highContrast])

  const handleLangToggle = (newLang: SupportedLang) => {
    setLang(newLang)
    if (onLangChange) onLangChange(newLang)
  }

  const getSpeechSynthesisLangCode = (l: SupportedLang): string => {
    switch (l) {
      case 'ta': return 'ta-IN'
      case 'hi': return 'hi-IN'
      case 'te': return 'te-IN'
      case 'en': default: return 'en-IN'
    }
  }

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.')
      return
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const textToRead = speakText || (
      lang === 'ta'
        ? 'வணக்கம். இது குடிமக்கள் உதவி தளம். உங்கள் புகார்களை குரல் வழியாக சமர்ப்பிக்கலாம்.'
        : lang === 'hi'
        ? 'नमस्कार। यह नागरिक सहायता पोर्टल है। आप बोलकर अपनी शिकायत दर्ज करा सकते हैं।'
        : lang === 'te'
        ? 'నమస్కారం. ఇది పౌర సహాయ పోర్టల్. మీరు మాట్లాడి మీ ఫిర్యాదును సమర్పించవచ్చు.'
        : 'Welcome to CivicAI Citizen Portal. You can view your complaints or speak to submit a new issue.'
    )

    const utterance = new SpeechSynthesisUtterance(textToRead)
    utterance.lang = getSpeechSynthesisLangCode(lang)
    utterance.rate = 0.9 // slightly slower for clarity

    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.cancel() // clear queue
    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)

    if (onSpeakPage) onSpeakPage()
  }

  return (
    <div 
      style={{
        background: highContrast ? '#000000' : 'linear-gradient(135deg, var(--nav-bg) 0%, #0a2040 100%)',
        border: highContrast ? '2px solid #ffff00' : '1px solid rgba(0, 168, 150, 0.35)',
        boxShadow: highContrast ? '0 0 20px rgba(255,255,0,0.4)' : '0 8px 24px rgba(0, 168, 150, 0.18)',
        color: highContrast ? '#ffff00' : '#ffffff',
      }}
      className="p-4 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-4 transition-all"
    >
      {/* Title & Status */}
      <div className="flex items-center gap-3">
        <div 
          style={{
            background: highContrast ? '#ffff00' : 'var(--accent)',
            color: highContrast ? '#000000' : '#ffffff',
          }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg"
        >
          🎙️
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base tracking-wide">
              {lang === 'ta' ? 'குரல் உதவி & அணுகல்தன்மை' : lang === 'hi' ? 'आवाज़ सहायक और पहुंच' : lang === 'te' ? 'వాయిస్ అసిస్టెంట్ & యాక్సెసిబిలిటీ' : 'AI Voice Assistant & Accessibility'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(0,168,150,0.2)', color: '#5EEAD4', border: '1px solid rgba(0,168,150,0.35)' }}>
              Elderly Care Mode
            </span>
          </div>
          <p className="text-xs text-gray-300">
            {lang === 'ta'
              ? 'பக்கத்தைப் படிக்க குரல் பொத்தானைப் அழுத்தவும் அல்லது தமிழில் பேசவும்.'
              : lang === 'hi'
              ? 'पृष्ठ पढ़ने के लिए बटन दबाएं या अपनी भाषा में बोलें।'
              : lang === 'te'
              ? 'పేజీని చదవడానికి బటన్‌ను నొక్కండి లేదా మీ భాషలో మాట్లాడండి.'
              : 'Read page aloud, use large font, high contrast, or speak your complaint.'}
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Language Selector */}
        <div className="relative flex items-center rounded-xl p-1 border border-emerald-500/30 bg-slate-800/80">
          {(['en', 'ta', 'hi', 'te'] as SupportedLang[]).map((l) => {
            const labels: Record<SupportedLang, string> = {
              en: '🇬🇧 EN',
              ta: '🇮🇳 தமிழ்',
              hi: '🇮🇳 हिंदी',
              te: '🇮🇳 తెలుగు',
            }
            const isSelected = lang === l

            return (
              <button
                key={l}
                type="button"
                onClick={() => handleLangToggle(l)}
                style={{ background: 'transparent' }}
                className="relative z-10 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 text-white"
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeLangPill"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '0.5rem',
                      background: 'var(--accent)',
                      zIndex: -1,
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                {labels[l]}
              </button>
            )
          })}
        </div>

        {/* Read Aloud Button */}
        <button
          type="button"
          onClick={handleSpeak}
          style={{
            background: isSpeaking ? '#ef4444' : 'var(--accent)',
            color: '#ffffff',
            boxShadow: isSpeaking ? '0 0 16px rgba(239,68,68,0.4)' : '0 4px 14px rgba(0,168,150,0.35)',
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border-0"
        >
          {isSpeaking ? (
            <>
              <span className="animate-pulse">🔊</span>
              {lang === 'ta' ? 'நிறுத்து' : 'Stop Speaking'}
            </>
          ) : (
            <>
              <span>🔊</span>
              {lang === 'ta' ? 'பக்கத்தைப் படி' : 'Read Aloud'}
            </>
          )}
        </button>

        {/* Large Font Toggle */}
        <button
          type="button"
          onClick={() => setLargeFont(!largeFont)}
          style={{
            background: largeFont ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
            color: '#ffffff',
            border: largeFont ? '1px solid rgba(0,168,150,0.6)' : '1px solid rgba(255,255,255,0.15)',
          }}
          className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span className="text-sm font-black">A+</span>
          {largeFont ? 'Large Font ON' : 'Large Font'}
        </button>

        {/* High Contrast Toggle */}
        <button
          type="button"
          onClick={() => setHighContrast(!highContrast)}
          style={{
            background: highContrast ? '#ffff00' : 'rgba(255,255,255,0.08)',
            color: highContrast ? '#000000' : '#ffffff',
            border: highContrast ? '2px solid #ffff00' : '1px solid rgba(255,255,255,0.15)',
          }}
          className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span>👁️</span>
          {highContrast ? 'High Contrast ON' : 'High Contrast'}
        </button>
      </div>
    </div>
  )
}
