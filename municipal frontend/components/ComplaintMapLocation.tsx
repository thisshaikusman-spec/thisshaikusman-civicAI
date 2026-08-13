'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface PhotoMetadata {
  photo_url?: string
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  captured_at: string
  is_verified: boolean
  source: 'camera' | 'gallery'
}

export interface ComplaintForMap {
  complaint_id: string
  title: string
  location: string
  latitude: number
  longitude: number
  status?: string
  photos_metadata?: PhotoMetadata[]
}

export interface LocationLogItem {
  id: number
  complaint_id: string
  latitude: number
  longitude: number
  accuracy?: number | null
  tracked_by: string
  source?: string
  timestamp: string
}

const createPinIcon = (color: string, symbol: string) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #ffffff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 13px;
          line-height: 1;
        ">${symbol}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

const createPulsingLivePin = (symbol: string) => {
  return L.divIcon({
    className: 'custom-live-pin',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 36px;
          height: 36px;
          background: rgba(59, 130, 246, 0.45);
          border-radius: 50%;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 24px;
          height: 24px;
          background: #3b82f6;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(59, 130, 246, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 11px;
          font-weight: bold;
        ">${symbol}</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })
}

const primaryPin = createPinIcon('#ef4444', '📍')
const liveOfficerPin = createPulsingLivePin('🏃')
const cameraPhotoPin = createPinIcon('#10b981', '📷')
const galleryPhotoPin = createPinIcon('#f59e0b', '📁')

export default function ComplaintMapLocation({ complaint }: { complaint: ComplaintForMap | null }) {
  const [isLiveTracking, setIsLiveTracking] = useState(false)
  const [locationLogs, setLocationLogs] = useState<LocationLogItem[]>([])
  const [isTrackingActive, setIsTrackingActive] = useState(true)
  const [lastUpdatedText, setLastUpdatedText] = useState<string>('')
  const [simulating, setSimulating] = useState(false)
  const [simulationStep, setSimulationStep] = useState(0)

  if (!complaint) return null

  const lat = Number(complaint.latitude)
  const lng = Number(complaint.longitude)
  const isValidCoord = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  const isUnverified = complaint.status === 'Location Unverified'
  const isResolvedOrRejected = complaint.status?.toLowerCase() === 'resolved' || complaint.status?.toLowerCase() === 'rejected'

  const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'

  // Fetch tracking history
  const fetchTrackingHistory = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/complaints/${complaint.complaint_id}/tracking-history`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      setLocationLogs(data.history || [])
      setIsTrackingActive(data.is_tracking_active ?? !isResolvedOrRejected)

      if (data.is_tracking_active === false) {
        setIsLiveTracking(false)
      }
    } catch (err) {
      console.error('Error fetching location tracking history:', err)
    }
  }, [baseUrl, complaint?.complaint_id, isResolvedOrRejected])

  // Polling hook when live tracking is active
  useEffect(() => {
    if (!isLiveTracking || isResolvedOrRejected) return

    fetchTrackingHistory()
    const intervalId = setInterval(fetchTrackingHistory, 5000)

    return () => clearInterval(intervalId)
  }, [isLiveTracking, isResolvedOrRejected, fetchTrackingHistory])

  // Update "Last updated X ago" label
  useEffect(() => {
    if (!locationLogs.length) {
      setLastUpdatedText('')
      return
    }

    const updateTimer = () => {
      const latest = locationLogs[locationLogs.length - 1]
      if (!latest?.timestamp) return

      const elapsedMs = Date.now() - new Date(latest.timestamp).getTime()
      const seconds = Math.max(0, Math.floor(elapsedMs / 1000))

      if (seconds < 10) {
        setLastUpdatedText('Just now')
      } else if (seconds < 60) {
        setLastUpdatedText(`${seconds}s ago`)
      } else {
        const mins = Math.floor(seconds / 60)
        setLastUpdatedText(`${mins}m ago`)
      }
    }

    updateTimer()
    const timerId = setInterval(updateTimer, 3000)
    return () => clearInterval(timerId)
  }, [locationLogs])

  // Simulation handler: post a mock officer ping moving towards complaint location
  const handleSimulateOfficerPing = async () => {
    if (isResolvedOrRejected) return
    setSimulating(true)

    try {
      // Create path starting ~300 meters away moving toward complaint location
      const nextStep = simulationStep + 1
      setSimulationStep(nextStep)

      const startLat = lat + 0.0040 - (nextStep * 0.0008)
      const startLng = lng + 0.0040 - (nextStep * 0.0008)

      const payload = {
        latitude: Number(startLat.toFixed(5)),
        longitude: Number(startLng.toFixed(5)),
        accuracy: 3.5,
        tracked_by: 'field_officer',
        timestamp: new Date().toISOString(),
      }

      const res = await fetch(`${baseUrl}/complaints/${complaint.complaint_id}/track-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setIsLiveTracking(true)
        await fetchTrackingHistory()
      } else {
        const errJson = await res.json().catch(() => ({}))
        alert(`Failed to log location: ${errJson.detail || res.statusText}`)
      }
    } catch (err) {
      console.error('Error simulating location ping:', err)
    } finally {
      setSimulating(false)
    }
  }

  if (!isValidCoord || isUnverified) {
    return (
      <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
        <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          <span>🗺️ Complaint Location Map</span>
          <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">⚠️ Location Unverified</span>
        </div>
        <div className="h-44 rounded-xl border flex flex-col items-center justify-center text-center p-4 space-y-1" style={{ background: 'var(--bg-primary)', borderColor: 'rgba(245,158,11,0.3)', color: 'var(--text-muted)' }}>
          <div className="text-2xl">⚠️</div>
          <div className="text-xs font-bold text-amber-400">Location Unverified</div>
          <div className="text-[11px] max-w-sm text-slate-300">
            Coordinates missing or mismatched (&gt;5km from landmark).
          </div>
          <div className="text-[11px] font-mono mt-1 text-slate-400">Address: {complaint.location || 'Not specified'}</div>
        </div>
      </div>
    )
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`

  // Photo GPS markers
  const photoGpsMarkers = (complaint.photos_metadata || []).filter(
    (m) => m.latitude !== null && m.longitude !== null && !isNaN(Number(m.latitude)) && !isNaN(Number(m.longitude))
  )

  // Tracking polyline coordinates
  const polylineCoords: [number, number][] = locationLogs.map((log) => [log.latitude, log.longitude])
  const latestLiveLog = locationLogs.length > 0 ? locationLogs[locationLogs.length - 1] : null

  return (
    <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
      {/* Header with Live Tracking Toggle */}
      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>🗺️ Complaint Map View</span>
          <span className="text-[11px] font-mono text-emerald-400 font-medium">({complaint.complaint_id})</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Tracking Toggle Button */}
          {!isResolvedOrRejected ? (
            <button
              type="button"
              onClick={() => {
                const nextState = !isLiveTracking
                setIsLiveTracking(nextState)
                if (nextState) fetchTrackingHistory()
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border"
              style={{
                background: isLiveTracking ? 'rgba(59, 130, 246, 0.2)' : 'var(--surface-hover)',
                color: isLiveTracking ? '#60a5fa' : 'var(--text-muted)',
                borderColor: isLiveTracking ? 'rgba(59, 130, 246, 0.4)' : 'var(--surface-border)',
              }}
            >
              <span className={`w-2 h-2 rounded-full ${isLiveTracking ? 'bg-blue-400 animate-ping' : 'bg-slate-500'}`} />
              {isLiveTracking ? 'Live Tracking: ON' : 'Enable Live Tracking'}
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700">
              Tracking Stopped ({complaint.status})
            </span>
          )}

          {/* Officer Simulation Action */}
          {!isResolvedOrRejected && (
            <button
              type="button"
              onClick={handleSimulateOfficerPing}
              disabled={simulating}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {simulating ? 'Pinging...' : '📡 Simulate Officer Ping'}
            </button>
          )}

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 cursor-pointer"
          >
            Google Maps ↗
          </a>
        </div>
      </div>

      {/* Live Status Bar */}
      <div className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg border bg-slate-900/40 border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">Live Status:</span>
          {locationLogs.length > 0 ? (
            <span className="text-blue-400 font-medium flex items-center gap-1">
              🏃 Field Officer en route ({locationLogs.length} ping{locationLogs.length > 1 ? 's' : ''})
            </span>
          ) : (
            <span className="text-amber-400/90 font-medium">
              No live tracking data recorded for this complaint yet.
            </span>
          )}
        </div>

        {latestLiveLog && lastUpdatedText && (
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <span>Last updated:</span>
            <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/30">
              {lastUpdatedText}
            </span>
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div className="h-64 w-full rounded-xl overflow-hidden border relative z-0" style={{ borderColor: 'var(--surface-border)' }}>
        <MapContainer
          center={latestLiveLog ? [latestLiveLog.latitude, latestLiveLog.longitude] : [lat, lng]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Polyline trail for movement history */}
          {polylineCoords.length > 1 && (
            <Polyline
              positions={polylineCoords}
              color="#3b82f6"
              weight={4}
              opacity={0.85}
              dashArray="6, 8"
            />
          )}

          {/* Historical location ping dots */}
          {locationLogs.map((log, index) => {
            const isLatest = index === locationLogs.length - 1
            if (isLatest) return null // Handled separately by pulsing live pin
            return (
              <Marker
                key={`log-${log.id || index}`}
                position={[log.latitude, log.longitude]}
                icon={L.divIcon({
                  className: 'history-dot',
                  html: `<div style="width: 10px; height: 10px; background: #3b82f6; border: 2px solid white; border-radius: 50%;"></div>`,
                  iconSize: [10, 10],
                  iconAnchor: [5, 5],
                })}
              >
                <Popup>
                  <div className="text-[11px] space-y-1 p-1">
                    <div className="font-bold text-slate-900">Trail Point #{index + 1}</div>
                    <div className="text-slate-600">Tracked by: {log.tracked_by || log.source || 'field_officer'}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Current Live Moving Marker */}
          {latestLiveLog && (
            <Marker position={[latestLiveLog.latitude, latestLiveLog.longitude]} icon={liveOfficerPin}>
              <Tooltip permanent direction="top" offset={[0, -18]}>
                <span className="font-bold text-xs text-blue-600">🏃 Field Officer (Live)</span>
              </Tooltip>
              <Popup>
                <div className="text-xs space-y-1 p-1">
                  <div className="font-bold text-blue-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Field Officer Current Position
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    Lat: {latestLiveLog.latitude.toFixed(5)}, Lng: {latestLiveLog.longitude.toFixed(5)}
                  </div>
                  {latestLiveLog.accuracy && (
                    <div className="text-[10px] text-slate-500">GPS Accuracy: ±{latestLiveLog.accuracy}m</div>
                  )}
                  <div className="text-[10px] text-slate-500 font-mono">
                    Updated: {new Date(latestLiveLog.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Primary Static Reported Location Marker */}
          <Marker position={[lat, lng]} icon={primaryPin}>
            <Tooltip permanent={!latestLiveLog} direction="top" offset={[0, -28]}>
              <span className="font-bold text-xs">📍 {complaint.location}</span>
            </Tooltip>
            <Popup>
              <div className="text-xs space-y-1 p-1">
                <div className="font-bold text-slate-900">{complaint.title}</div>
                <div className="text-slate-600">📍 Reported Location</div>
                <div className="text-[10px] font-mono text-slate-500">Lat: {lat}, Lng: {lng}</div>
              </div>
            </Popup>
          </Marker>

          {/* Photo GPS Markers */}
          {photoGpsMarkers.map((meta, idx) => {
            const pLat = Number(meta.latitude)
            const pLng = Number(meta.longitude)
            const isCam = meta.is_verified || meta.source === 'camera'
            const icon = isCam ? cameraPhotoPin : galleryPhotoPin
            const imgUrl = meta.photo_url
              ? (meta.photo_url.startsWith('/') ? `${baseUrl}${meta.photo_url}` : meta.photo_url)
              : null

            return (
              <Marker key={idx} position={[pLat, pLng]} icon={icon}>
                <Popup>
                  <div className="text-xs space-y-1 p-1 max-w-[180px]">
                    <div className="font-bold text-slate-900">
                      {isCam ? '📷 Live Photo GPS' : '📁 Gallery Photo GPS'}
                    </div>
                    {imgUrl && (
                      <img src={imgUrl} alt="Photo proof" className="w-full h-24 object-cover rounded border" />
                    )}
                    <div className="text-[10px] font-mono text-slate-600">
                      Lat: {pLat.toFixed(4)}, Lng: {pLng.toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Legend & Info Footer */}
      <div className="flex items-center justify-between text-[11px] flex-wrap gap-2 pt-1" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 font-medium"><span className="text-red-500 font-bold">📍</span> Complaint Location</span>
          <span className="flex items-center gap-1 font-medium"><span className="text-blue-400 font-bold">🏃</span> Live Officer Pin</span>
          {locationLogs.length > 1 && (
            <span className="flex items-center gap-1 font-medium"><span className="text-blue-500 font-bold">🟦</span> Polyline Trail</span>
          )}
          {photoGpsMarkers.some((m) => m.is_verified || m.source === 'camera') && (
            <span className="flex items-center gap-1 font-medium"><span className="text-emerald-400 font-bold">📷</span> Camera Proof</span>
          )}
          {photoGpsMarkers.some((m) => !m.is_verified && m.source === 'gallery') && (
            <span className="flex items-center gap-1 font-medium"><span className="text-amber-400 font-bold">📁</span> Gallery Proof</span>
          )}
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>OpenStreetMap + Leaflet</span>
      </div>
    </div>
  )
}

