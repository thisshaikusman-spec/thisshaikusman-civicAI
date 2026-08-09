// Official complaint letter generator

interface ComplaintData {
  civicId: string
  title: string
  category: string
  priority: string
  ward: string
  municipality: string
  department: string
  address: string
  description: string
  citizenName: string
  supportCount?: number
  evidenceCount?: number
  createdAt?: Date
}

const CATEGORY_DISPLAY: Record<string, string> = {
  POTHOLE: 'Pothole / Road Damage',
  GARBAGE: 'Garbage Accumulation',
  DRAINAGE: 'Drainage Blockage',
  SEWAGE: 'Sewage Overflow',
  STREET_LIGHT: 'Street Light Issue',
  WATER_LEAKAGE: 'Water Leakage',
  ROAD_DAMAGE: 'Road Surface Damage',
  ILLEGAL_DUMPING: 'Illegal Dumping',
  OTHER: 'Municipal Issue',
}

const OFFICER_SALUTATION: Record<string, string> = {
  Roads: 'The Executive Engineer, Roads & Buildings',
  Drainage: 'The Municipal Engineer, Drainage Division',
  Sanitation: 'The Health Officer, Sanitation Department',
  'Street Light': 'The Electrical Engineer, Street Light Division',
  Water: 'The Executive Engineer, Water Works',
  Municipal: 'The Commissioner, Municipal Corporation',
}

export function generateOfficialComplaint(data: ComplaintData): string {
  const now = data.createdAt ?? new Date()
  const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const categoryDisplay = CATEGORY_DISPLAY[data.category] ?? data.category
  const deptKey = Object.keys(OFFICER_SALUTATION).find((k) => data.department.includes(k)) ?? 'Municipal'
  const salutation = OFFICER_SALUTATION[deptKey]

  const supportNote =
    data.supportCount && data.supportCount > 1
      ? `\nThis issue has been reported and supported by ${data.supportCount} citizens of the ward, indicating it is a widespread community concern.`
      : ''

  const evidenceNote =
    data.evidenceCount && data.evidenceCount > 0
      ? `\nPhotographic evidence (${data.evidenceCount} image${data.evidenceCount > 1 ? 's' : ''}) has been attached to support this complaint.`
      : ''

  return `COMPLAINT ID: ${data.civicId}
DATE: ${dateStr}

TO:
${salutation}
${data.department}
${data.municipality}

SUBJECT: Urgent Complaint Regarding ${categoryDisplay} – ${data.address}, Ward ${data.ward}

Respected Sir/Madam,

I, ${data.citizenName}, a resident of Ward ${data.ward} under the jurisdiction of ${data.municipality}, wish to bring the following civic issue to your immediate attention through the CivicAI platform.

COMPLAINT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue Category  : ${categoryDisplay}
Complaint ID    : ${data.civicId}
Location        : ${data.address}
Ward Number     : ${data.ward}
Priority Level  : ${data.priority}
Department      : ${data.department}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DESCRIPTION OF ISSUE:
${data.description}
${supportNote}${evidenceNote}

REQUEST:
I kindly request your department to take immediate action on the above-mentioned issue, arrange for an inspection at the earliest, and update the resolution status on the CivicAI platform.

This complaint has been registered under the municipal SLA policy and will be automatically escalated if not addressed within the stipulated time.

Thanking you in anticipation of prompt action.

Yours faithfully,
${data.citizenName}
Ward ${data.ward}, ${data.municipality}
[Submitted via CivicAI Platform]
Complaint ID: ${data.civicId}
`
}
