'use client'

import { useState, useRef, useCallback } from 'react'

export interface TranscribeResult {
  text: string
  language?: string
  model?: string
  status?: string
  note?: string
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    setError(null)
    setRecordingSeconds(0)
    audioChunksRef.current = []

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Audio recording is not supported in this browser environment.')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(250)
      setIsRecording(true)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)

      return true
    } catch (err: any) {
      console.error('Error starting audio recording:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone permissions.')
      } else {
        setError('Failed to access microphone.')
      }
      return false
    }
  }, [])

  const stopAndTranscribe = useCallback(async (model = 'whisper-1'): Promise<TranscribeResult | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsRecording(false)
        resolve(null)
        return
      }

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false)
        setIsTranscribing(true)

        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || 'audio/webm',
          })

          const formData = new FormData()
          formData.append('file', audioBlob, 'recording.webm')
          formData.append('model', model) // whisper-1 (language auto-detected)

          const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
          const res = await fetch(`${baseUrl}/complaints/transcribe`, {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) {
            throw new Error(`Transcription request failed with status ${res.status}`)
          }

          const data: TranscribeResult = await res.json()
          setIsTranscribing(false)
          resolve(data)
        } catch (err: any) {
          console.error('Transcription error:', err)
          setError(err.message || 'Failed to transcribe audio.')
          setIsTranscribing(false)
          resolve(null)
        }
      }

      mediaRecorderRef.current.stop()
    })
  }, [])

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    audioChunksRef.current = []
    setIsRecording(false)
    setRecordingSeconds(0)
  }, [])

  return {
    isRecording,
    recordingSeconds,
    isTranscribing,
    error,
    startRecording,
    stopAndTranscribe,
    cancelRecording,
  }
}
