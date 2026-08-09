// Mock AI Complaint Analyzer
// In production, replace with real LLM API call

export interface AIAnalysisResult {
  category: string
  categoryDisplay: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  priorityScore: number
  priorityReason: string
  department: string
  language: 'english' | 'tamil' | 'tanglish'
  translatedText: string
  confidence: number
  ward: string
  municipality: string
  slaHours: number
  title: string
}

const KEYWORDS: Record<string, { category: string; dept: string; keywords: string[]; sla: number }> = {
  POTHOLE: {
    category: 'POTHOLE',
    dept: 'Roads Department',
    keywords: ['pothole', 'hole', 'pit', 'road damage', 'bump', 'crater', 'falling', 'bike', 'vehicle', 'accident', 'pavement'],
    sla: 48,
  },
  GARBAGE: {
    category: 'GARBAGE',
    dept: 'Sanitation Department',
    keywords: ['garbage', 'trash', 'waste', 'dump', 'smell', 'bin', 'litter', 'collection', 'sanitation', 'overflowing', 'filth', 'kuruvai', 'thookkam'],
    sla: 24,
  },
  DRAINAGE: {
    category: 'DRAINAGE',
    dept: 'Drainage Department',
    keywords: ['drainage', 'drain', 'stagnant', 'waterlog', 'flood', 'block', 'clog', 'kaluvaai', 'thanneer', 'overflow', 'mosquito'],
    sla: 24,
  },
  SEWAGE: {
    category: 'SEWAGE',
    dept: 'Drainage Department',
    keywords: ['sewage', 'sewer', 'manhole', 'open drain', 'smell', 'sanitation', 'septic', 'dirty water'],
    sla: 24,
  },
  STREET_LIGHT: {
    category: 'STREET_LIGHT',
    dept: 'Street Light Department',
    keywords: ['street light', 'light', 'lamp', 'dark', 'electricity', 'bulb', 'night', 'unsafe', 'broken light', 'lamp post', 'vizhakku'],
    sla: 72,
  },
  WATER_LEAKAGE: {
    category: 'WATER_LEAKAGE',
    dept: 'Water Department',
    keywords: ['water leak', 'pipe', 'leakage', 'burst', 'supply', 'contamination', 'muddy water', 'water waste', 'pipeline', 'metre'],
    sla: 12,
  },
  ROAD_DAMAGE: {
    category: 'ROAD_DAMAGE',
    dept: 'Roads Department',
    keywords: ['road damage', 'road broken', 'highway', 'tar', 'asphalt', 'crack', 'cave', 'sinkhole', 'surface', 'road condition'],
    sla: 72,
  },
  ILLEGAL_DUMPING: {
    category: 'ILLEGAL_DUMPING',
    dept: 'Sanitation Department',
    keywords: ['illegal', 'dump', 'construction', 'debris', 'waste disposal', 'rubble', 'building material', 'throw'],
    sla: 48,
  },
}

const SEVERITY_KEYWORDS = {
  CRITICAL: ['infection', 'infections', 'disease', 'illness', 'sick', 'dengue', 'malaria', 'fever', 'mosquito', 'exposed wire', 'electric shock', 'gas leak', 'fire hazard', 'high voltage', 'building collapse', 'emergency', 'urgent', 'critical', 'dangerous', 'accident', 'injury', 'children', 'school', 'hospital', 'overflow', 'burst', 'collaps'],
  HIGH: ['smell', 'stink', 'foul', 'health', 'blocked', 'clogged', 'choked', 'stagnant', 'many', 'multiple', 'daily', 'week', 'bad', 'severe', 'serious', 'major', 'several', 'affected', 'falling'],
  MEDIUM: ['few', 'some', 'inconvenient', 'issue', 'problem', 'need', 'fix'],
  LOW: ['minor', 'small', 'little', 'slight'],
}

function detectLanguage(text: string): 'english' | 'tamil' | 'tanglish' {
  const tamilPattern = /[\u0B80-\u0BFF]/
  if (tamilPattern.test(text)) return 'tamil'
  const tanglishWords = ['la', 'lla', 'nga', 'pa', 'ma', 'da', 'ra', 'kaluvaai', 'thanneer', 'vizhakku', 'pothu', 'enga', 'inge', 'onga', 'aagiruku', 'pakkathe', 'romba', 'paaru']
  const lowerText = text.toLowerCase()
  if (tanglishWords.some((w) => lowerText.includes(w))) return 'tanglish'
  return 'english'
}

function translateToEnglish(text: string, lang: string): string {
  if (lang === 'english') return text
  const translations: Record<string, string> = {
    'enga street la drainage block aagiruku': 'The drainage in our street is blocked.',
    'romba mosam': 'very bad',
    'kaluvaai': 'drainage channel',
    'thanneer': 'water',
    'vizhakku': 'street light',
    'pothu road': 'public road',
    'la': 'in/at',
    'nga': 'respectful suffix',
    'inge': 'here',
    'onga': 'your',
    'aagiruku': 'is happening',
  }
  let translated = text
  Object.entries(translations).forEach(([k, v]) => {
    translated = translated.replace(new RegExp(k, 'gi'), v)
  })
  return `[Translated from ${lang}]: ${translated}`
}

function detectCategory(text: string): typeof KEYWORDS[string] | null {
  const lower = text.toLowerCase()
  let bestMatch: (typeof KEYWORDS[string] & { score: number }) | null = null

  for (const [, config] of Object.entries(KEYWORDS)) {
    let score = 0
    for (const kw of config.keywords) {
      if (lower.includes(kw)) score += kw.split(' ').length
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { ...config, score }
    }
  }
  return bestMatch
}

function detectSeverity(text: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const lower = text.toLowerCase()
  if (SEVERITY_KEYWORDS.CRITICAL.some((k) => lower.includes(k))) return 'CRITICAL'
  if (SEVERITY_KEYWORDS.HIGH.some((k) => lower.includes(k))) return 'HIGH'
  if (SEVERITY_KEYWORDS.MEDIUM.some((k) => lower.includes(k))) return 'MEDIUM'
  return 'LOW'
}

function calculatePriorityScore(
  severity: string,
  supportCount: number,
  slaHours: number,
  hasChildren: boolean,
  hasHospital: boolean
): number {
  let score = 0
  const severityScore = { CRITICAL: 40, HIGH: 30, MEDIUM: 20, LOW: 10 }[severity] ?? 20
  score += severityScore
  score += Math.min(supportCount * 2, 20)
  score += slaHours <= 12 ? 15 : slaHours <= 24 ? 10 : 5
  if (hasChildren) score += 10
  if (hasHospital) score += 10
  score += Math.floor(Math.random() * 5)
  return Math.min(score, 100)
}

const CATEGORY_DISPLAY: Record<string, string> = {
  POTHOLE: 'Pothole / Road Pit',
  GARBAGE: 'Garbage Accumulation',
  DRAINAGE: 'Drainage Blockage',
  SEWAGE: 'Sewage Overflow',
  STREET_LIGHT: 'Street Light Issue',
  WATER_LEAKAGE: 'Water Leakage / Pipe Burst',
  ROAD_DAMAGE: 'Road Surface Damage',
  ILLEGAL_DUMPING: 'Illegal Dumping',
  OTHER: 'Other Municipal Issue',
}

export function analyzeComplaint(
  text: string,
  ward: string = '12',
  supportCount: number = 0
): AIAnalysisResult {
  const language = detectLanguage(text)
  const translatedText = translateToEnglish(text, language)
  const workingText = language === 'english' ? text : translatedText

  const categoryData = detectCategory(workingText) ?? {
    category: 'OTHER',
    dept: 'Municipal Corporation',
    keywords: [],
    sla: 72,
  }

  const severity = detectSeverity(workingText)
  const lower = workingText.toLowerCase()
  const hasChildren = lower.includes('child') || lower.includes('school') || lower.includes('kid')
  const hasHospital = lower.includes('hospital') || lower.includes('clinic')

  const priorityScore = calculatePriorityScore(severity, supportCount, categoryData.sla, hasChildren, hasHospital)
  const priority =
    priorityScore >= 80 ? 'CRITICAL' : priorityScore >= 60 ? 'HIGH' : priorityScore >= 40 ? 'MEDIUM' : 'LOW'

  const priorityReasons = []
  if (severity === 'CRITICAL' || severity === 'HIGH') priorityReasons.push(`${severity.toLowerCase()} severity issue`)
  if (supportCount > 10) priorityReasons.push(`${supportCount} citizens affected`)
  if (hasChildren) priorityReasons.push('issue near children/school zone')
  if (hasHospital) priorityReasons.push('issue near hospital')
  if (categoryData.sla <= 24) priorityReasons.push('short SLA category')

  const title = `${CATEGORY_DISPLAY[categoryData.category] ?? categoryData.category} – Ward ${ward}`

  return {
    category: categoryData.category,
    categoryDisplay: CATEGORY_DISPLAY[categoryData.category] ?? categoryData.category,
    severity,
    priority,
    priorityScore,
    priorityReason: priorityReasons.length
      ? `${priority} priority because: ${priorityReasons.join(', ')}.`
      : `Standard ${priority.toLowerCase()} priority based on issue type.`,
    department: categoryData.dept,
    language,
    translatedText,
    confidence: 0.88 + Math.random() * 0.1,
    ward,
    municipality: 'Demo Municipal Corporation',
    slaHours: categoryData.sla,
    title,
  }
}
