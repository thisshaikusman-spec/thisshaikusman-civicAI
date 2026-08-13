'use client'

import dynamic from 'next/dynamic'
import React from 'react'
import type { ComplaintForMap } from './ComplaintMapLocation'

const ComplaintMapLocation = dynamic(
  () => import('./ComplaintMapLocation'),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
        <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          <span>🗺️ Complaint Map View</span>
        </div>
        <div className="h-60 rounded-xl border flex items-center justify-center text-xs text-emerald-400 gap-2" style={{ background: 'var(--bg-primary)', borderColor: 'var(--surface-border)' }}>
          <span className="animate-spin">⏳</span> Loading interactive map engine…
        </div>
      </div>
    )
  }
)

export default function ComplaintMapWrapper({ complaint }: { complaint: ComplaintForMap | null }) {
  return <ComplaintMapLocation complaint={complaint} />
}
