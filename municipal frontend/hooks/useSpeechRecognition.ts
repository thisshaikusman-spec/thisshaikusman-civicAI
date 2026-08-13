'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type LanguageCode =
  | 'en-IN'
  | 'ta-IN'
  | 'hi-IN'
  | 'te-IN'
  | 'kn-IN'
  | 'ml-IN'
  | 'mr-IN'
  | 'bn-IN'
  | 'gu-IN'
  | 'en-US'

export interface UseSpeechRecognitionOptions {
  lang?: LanguageCode
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

export function useSpeechRecognition({
  lang = 'en-IN',
  continuous = false,
  interimResults = false,
  onResult,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setIsSupported(!!SpeechRecognition)
    }
  }, [])

  const startListening = useCallback(
    (overrideLang?: LanguageCode) => {
      if (typeof window === 'undefined') return
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (!SpeechRecognition) {
        const errMsg = 'Speech Recognition API is not supported in this browser environment.'
        setError(errMsg)
        if (onError) onError(errMsg)
        return
      }

      // Stop any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (_) {}
      }

      try {
        const recognition = new SpeechRecognition()
        recognition.lang = overrideLang || lang
        recognition.continuous = continuous
        recognition.interimResults = interimResults
        recognition.maxAlternatives = 1

        recognition.onstart = () => {
          setIsListening(true)
          setError(null)
        }

        recognition.onresult = (event: any) => {
          let currentTranscript = ''
          let isFinal = false

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript
            if (event.results[i].isFinal) {
              isFinal = true
            }
          }

          setTranscript(currentTranscript)
          if (onResult) {
            onResult(currentTranscript, isFinal)
          }
        }

        recognition.onerror = (event: any) => {
          const errReason = event.error || 'Unknown speech recognition error'
          setError(errReason)
          setIsListening(false)
          if (onError) onError(errReason)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
        recognition.start()
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to initiate speech recognition.'
        setError(errMsg)
        setIsListening(false)
        if (onError) onError(errMsg)
      }
    },
    [lang, continuous, interimResults, onResult, onError]
  )

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (_) {}
      setIsListening(false)
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  }
}
