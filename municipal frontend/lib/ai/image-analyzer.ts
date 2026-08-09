// Mock AI Image Analyzer
// In production, replace with a real computer vision API (e.g., Google Vision, Clarifai)
// This is a demo-only mock that produces realistic results

export interface ImageAnalysisResult {
  category: string
  categoryDisplay: string
  confidence: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  isMock: true
}

const IMAGE_ANALYSIS_RESULTS = [
  {
    category: 'POTHOLE',
    categoryDisplay: 'Pothole / Road Pit',
    confidence: 0.95,
    severity: 'HIGH' as const,
    description: 'Road surface damage detected. Multiple potholes visible with significant depth. Immediate road repair recommended.',
  },
  {
    category: 'GARBAGE',
    categoryDisplay: 'Garbage Accumulation',
    confidence: 0.91,
    severity: 'HIGH' as const,
    description: 'Large accumulation of solid waste detected. Mixed garbage including organic and inorganic material. Health hazard risk.',
  },
  {
    category: 'DRAINAGE',
    categoryDisplay: 'Drainage Blockage',
    confidence: 0.88,
    severity: 'HIGH' as const,
    description: 'Stagnant water visible indicating drainage blockage. Standing water can be a mosquito breeding ground.',
  },
  {
    category: 'WATER_LEAKAGE',
    categoryDisplay: 'Water Leakage',
    confidence: 0.93,
    severity: 'CRITICAL' as const,
    description: 'Water pipeline leak detected. Significant water loss and road waterlogging visible. Urgent repair required.',
  },
  {
    category: 'STREET_LIGHT',
    categoryDisplay: 'Street Light Issue',
    confidence: 0.82,
    severity: 'MEDIUM' as const,
    description: 'Damaged street light infrastructure detected. Dark zone identified posing safety risk for pedestrians.',
  },
  {
    category: 'ROAD_DAMAGE',
    categoryDisplay: 'Road Surface Damage',
    confidence: 0.89,
    severity: 'HIGH' as const,
    description: 'Severe road surface deterioration detected. Cracking and subsidence visible across a large area.',
  },
]

export function analyzeImage(filename?: string, filesize?: number): ImageAnalysisResult {
  // Use filename hints if available for deterministic demo
  if (filename) {
    const lower = filename.toLowerCase()
    if (lower.includes('pothole') || lower.includes('road') || lower.includes('pit')) return { ...IMAGE_ANALYSIS_RESULTS[0], isMock: true }
    if (lower.includes('garbage') || lower.includes('trash') || lower.includes('waste')) return { ...IMAGE_ANALYSIS_RESULTS[1], isMock: true }
    if (lower.includes('drain') || lower.includes('water') || lower.includes('flood')) return { ...IMAGE_ANALYSIS_RESULTS[2], isMock: true }
    if (lower.includes('leak') || lower.includes('pipe')) return { ...IMAGE_ANALYSIS_RESULTS[3], isMock: true }
    if (lower.includes('light') || lower.includes('lamp')) return { ...IMAGE_ANALYSIS_RESULTS[4], isMock: true }
  }

  // Random result with slight bias toward common categories
  const result = IMAGE_ANALYSIS_RESULTS[Math.floor(Math.random() * IMAGE_ANALYSIS_RESULTS.length)]
  return { ...result, isMock: true }
}
