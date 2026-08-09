import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CitizenDashboardClient from '@/components/CitizenDashboardClient'
import { DEMO_NOTIFICATIONS } from '@/lib/demo-data'

interface ComplaintResponse {
  complaint_id: string
  title: string
  description: string
  category: string
  department: string
  priority: string
  confidence: number
  status: string
  location: string
  latitude: number
  longitude: number
  created_at: string
  updated_at: string | null
}

async function getComplaints(email: string): Promise<ComplaintResponse[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
    const res = await fetch(`${baseUrl}/complaints/?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.complaints || []
  } catch (error) {
    console.error('Error fetching complaints for citizen dashboard:', error)
    return []
  }
}

export default async function CitizenDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userName = session.user.name ?? 'Citizen'
  const userEmail = session.user.email ?? ''
  const complaints = await getComplaints(userEmail)

  return (
    <CitizenDashboardClient
      userName={userName}
      complaints={complaints}
      demoNotifications={DEMO_NOTIFICATIONS}
    />
  )
}
