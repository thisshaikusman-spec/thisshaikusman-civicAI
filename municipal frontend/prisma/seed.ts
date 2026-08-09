import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { addHours, subHours, subDays } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding CivicAI database...')

  // Clear existing data
  await prisma.aIAnalysis.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.complaintSupport.deleteMany()
  await prisma.complaintStatusHistory.deleteMany()
  await prisma.complaintEvidence.deleteMany()
  await prisma.complaint.deleteMany()
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()
  await prisma.sLAConfig.deleteMany()
  await prisma.ward.deleteMany()

  // SLA Config
  await prisma.sLAConfig.createMany({
    data: [
      { category: 'POTHOLE', hours: 48 },
      { category: 'GARBAGE', hours: 24 },
      { category: 'DRAINAGE', hours: 24 },
      { category: 'STREET_LIGHT', hours: 72 },
      { category: 'WATER_LEAKAGE', hours: 12 },
      { category: 'SEWAGE', hours: 24 },
      { category: 'ROAD_DAMAGE', hours: 72 },
      { category: 'ILLEGAL_DUMPING', hours: 48 },
      { category: 'OTHER', hours: 72 },
    ],
  })

  // Wards
  await prisma.ward.createMany({
    data: Array.from({ length: 20 }, (_, i) => ({
      number: String(i + 1),
      name: `Ward ${i + 1}`,
      municipality: 'Demo Municipal Corporation',
    })),
  })

  // Users
  const hash = (pw: string) => bcrypt.hashSync(pw, 10)

  const citizen = await prisma.user.create({
    data: {
      name: 'Arjun Kumar',
      email: 'citizen@demo.com',
      passwordHash: hash('demo123'),
      role: 'CITIZEN',
      phone: '9876543210',
      ward: '12',
    },
  })

  const citizen2 = await prisma.user.create({
    data: {
      name: 'Priya Devi',
      email: 'priya@demo.com',
      passwordHash: hash('demo123'),
      role: 'CITIZEN',
      phone: '9876543211',
      ward: '8',
    },
  })

  const officer = await prisma.user.create({
    data: {
      name: 'Rajesh Murugan',
      email: 'officer@demo.com',
      passwordHash: hash('demo123'),
      role: 'OFFICER',
      phone: '9876543212',
      ward: '12',
    },
  })

  const admin = await prisma.user.create({
    data: {
      name: 'Commissioner Venkat',
      email: 'admin@demo.com',
      passwordHash: hash('demo123'),
      role: 'ADMIN',
      phone: '9876543213',
    },
  })

  // Extra citizens for support counts
  const extraCitizens = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.user.create({
        data: {
          name: `Citizen ${i + 3}`,
          email: `citizen${i + 3}@demo.com`,
          passwordHash: hash('demo123'),
          role: 'CITIZEN',
          ward: String(Math.floor(Math.random() * 20) + 1),
        },
      })
    )
  )

  // Departments
  await prisma.department.createMany({
    data: [
      { name: 'Roads Department', category: 'POTHOLE', ward: '12', municipality: 'Demo Municipal Corporation', phone: '044-12345678', email: 'roads@dmc.gov' },
      { name: 'Roads Department', category: 'ROAD_DAMAGE', ward: '12', municipality: 'Demo Municipal Corporation', phone: '044-12345678', email: 'roads@dmc.gov' },
      { name: 'Drainage Department', category: 'DRAINAGE', ward: '12', municipality: 'Demo Municipal Corporation', phone: '044-12345679', email: 'drainage@dmc.gov' },
      { name: 'Drainage Department', category: 'SEWAGE', ward: '12', municipality: 'Demo Municipal Corporation', phone: '044-12345679', email: 'drainage@dmc.gov' },
      { name: 'Sanitation Department', category: 'GARBAGE', ward: '12', municipality: 'Demo Municipal Corporation', phone: '044-12345680', email: 'sanitation@dmc.gov' },
      { name: 'Sanitation Department', category: 'ILLEGAL_DUMPING', ward: '12', municipality: 'Demo Municipal Corporation', phone: '044-12345680', email: 'sanitation@dmc.gov' },
      { name: 'Street Light Department', category: 'STREET_LIGHT', ward: '12', municipality: 'Demo Municipal Corporation', phone: '044-12345681', email: 'lights@dmc.gov' },
      { name: 'Water Department', category: 'WATER_LEAKAGE', ward: '12', municipality: 'Demo Municipal Corporation', phone: '044-12345682', email: 'water@dmc.gov' },
    ],
  })

  // Helper to build civic ID
  let counter = 10270
  const nextCivicId = () => `CIV-${++counter}`

  // Helper to create complaint with all relations
  async function createComplaint(data: {
    title: string
    description: string
    category: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    priorityScore: number
    status: 'SUBMITTED' | 'AI_VERIFIED' | 'DUPLICATE' | 'ROUTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ESCALATED'
    ward: string
    department: string
    address: string
    latitude: number
    longitude: number
    citizenId: string
    officerId?: string
    supportCount: number
    slaHours: number
    slaBreached?: boolean
    escalationLevel?: 'NONE' | 'LEVEL1' | 'LEVEL2' | 'LEVEL3'
    daysAgo: number
    language?: string
    aiConfidence?: number
    hasBeforeAfter?: boolean
    resolutionNote?: string
    duplicateOfId?: string
  }) {
    const createdAt = subDays(new Date(), data.daysAgo)
    const slaDeadline = addHours(createdAt, data.slaHours)
    const slaBreached = data.slaBreached ?? (new Date() > slaDeadline && data.status !== 'RESOLVED')

    const complaint = await prisma.complaint.create({
      data: {
        civicId: nextCivicId(),
        title: data.title,
        description: data.description,
        originalText: data.description,
        category: data.category,
        severity: data.severity,
        priority: data.priority,
        priorityScore: data.priorityScore,
        status: data.status,
        ward: data.ward,
        municipality: 'Demo Municipal Corporation',
        department: data.department,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        aiConfidence: data.aiConfidence ?? 0.92,
        language: data.language ?? 'english',
        supportCount: data.supportCount,
        slaHours: data.slaHours,
        slaDeadline,
        slaBreached,
        escalationLevel: data.escalationLevel ?? 'NONE',
        duplicateOfId: data.duplicateOfId,
        citizenId: data.citizenId,
        officerId: data.officerId,
        resolutionNote: data.resolutionNote,
        resolvedAt: data.status === 'RESOLVED' ? subDays(new Date(), Math.max(0, data.daysAgo - 1)) : null,
        createdAt,
        updatedAt: createdAt,
        officialComplaint: `Complaint ID: ${nextCivicId()}\n\nSubject: ${data.title}\n\nDear Municipal Authority,\n\nA ${data.category.toLowerCase()} issue has been reported at ${data.address}.\n\nCategory: ${data.category}\nPriority: ${data.priority}\nWard: ${data.ward}\n\nPlease take necessary action at the earliest.\n\nRegards,\nCitizen`,
      },
    })

    // AI Analysis
    await prisma.aIAnalysis.create({
      data: {
        complaintId: complaint.id,
        category: data.category,
        severity: data.severity,
        confidence: data.aiConfidence ?? 0.92,
        reasoning: `Detected ${data.category.toLowerCase()} based on description. ${data.supportCount} citizens affected. Priority score: ${data.priorityScore}.`,
        department: data.department,
        language: data.language ?? 'english',
      },
    })

    // Status history
    const statuses: Array<'SUBMITTED' | 'AI_VERIFIED' | 'DUPLICATE' | 'ROUTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ESCALATED'> = ['SUBMITTED', 'AI_VERIFIED', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED']
    const statusOrder = ['SUBMITTED', 'AI_VERIFIED', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
    const currentIdx = statusOrder.indexOf(data.status)
    const reachedStatuses = currentIdx >= 0 ? statusOrder.slice(0, currentIdx + 1) : ['SUBMITTED']

    for (let i = 0; i < reachedStatuses.length; i++) {
      await prisma.complaintStatusHistory.create({
        data: {
          complaintId: complaint.id,
          status: reachedStatuses[i] as any,
          comment: reachedStatuses[i] === 'ASSIGNED' ? `Assigned to ${data.department}` :
            reachedStatuses[i] === 'IN_PROGRESS' ? 'Work order created. Field team dispatched.' :
            reachedStatuses[i] === 'RESOLVED' ? data.resolutionNote ?? 'Issue resolved successfully.' : undefined,
          changedById: i === 0 ? data.citizenId : (data.officerId ?? officer.id),
          changedAt: addHours(createdAt, i * 2),
        },
      })
    }

    // Evidence
    if (data.hasBeforeAfter && data.status === 'RESOLVED') {
      await prisma.complaintEvidence.createMany({
        data: [
          { complaintId: complaint.id, url: '/uploads/before-sample.jpg', type: 'BEFORE', caption: 'Before resolution' },
          { complaintId: complaint.id, url: '/uploads/after-sample.jpg', type: 'AFTER', caption: 'After resolution' },
        ],
      })
    }

    // Support records (subset of supportCount)
    const supporters = extraCitizens.slice(0, Math.min(data.supportCount, extraCitizens.length))
    for (const supporter of supporters) {
      await prisma.complaintSupport.create({
        data: { complaintId: complaint.id, userId: supporter.id },
      })
    }

    return complaint
  }

  // === SEEDED COMPLAINTS ===

  // 1. Critical drainage - in progress (Ward 12)
  const c1 = await createComplaint({
    title: 'Drainage Overflow Near Residential Area',
    description: 'Sewage and drainage water overflowing on Main Road near the residential apartments. Very bad smell and health hazard for children.',
    category: 'DRAINAGE', severity: 'CRITICAL', priority: 'CRITICAL', priorityScore: 94,
    status: 'IN_PROGRESS', ward: '12', department: 'Drainage Department',
    address: 'Main Road, Kattur, Ward 12', latitude: 10.7905, longitude: 78.7047,
    citizenId: citizen.id, officerId: officer.id, supportCount: 17,
    slaHours: 24, daysAgo: 3, aiConfidence: 0.97,
  })

  // 2. Pothole - assigned (Ward 12) - this is the "demo flow" complaint
  const c2 = await createComplaint({
    title: 'Large Pothole Near Government School',
    description: 'There is a huge pothole near the school on Anna Salai. Many bikes are almost falling. Very dangerous for school children.',
    category: 'POTHOLE', severity: 'HIGH', priority: 'HIGH', priorityScore: 88,
    status: 'ASSIGNED', ward: '12', department: 'Roads Department',
    address: 'Anna Salai, Near Govt School, Ward 12', latitude: 10.7920, longitude: 78.7060,
    citizenId: citizen.id, officerId: officer.id, supportCount: 14,
    slaHours: 48, daysAgo: 2, aiConfidence: 0.95,
    language: 'english',
  })

  // 3. Street light - resolved (Ward 8)
  await createComplaint({
    title: 'Street Light Not Working',
    description: 'Street light near bus stop not working for past 5 days. Area is very dark at night, unsafe.',
    category: 'STREET_LIGHT', severity: 'MEDIUM', priority: 'MEDIUM', priorityScore: 62,
    status: 'RESOLVED', ward: '8', department: 'Street Light Department',
    address: 'Bus Stop Road, Ward 8', latitude: 10.7870, longitude: 78.7030,
    citizenId: citizen.id, officerId: officer.id, supportCount: 7,
    slaHours: 72, daysAgo: 5, hasBeforeAfter: true,
    resolutionNote: 'Street light bulb replaced. Tested and working.',
  })

  // 4. Garbage - pending (Ward 14)
  await createComplaint({
    title: 'Garbage Accumulation at Street Corner',
    description: 'Huge pile of garbage accumulated at the corner of Market Street. No collection for 4 days.',
    category: 'GARBAGE', severity: 'HIGH', priority: 'HIGH', priorityScore: 78,
    status: 'SUBMITTED', ward: '14', department: 'Sanitation Department',
    address: 'Market Street Corner, Ward 14', latitude: 10.7945, longitude: 78.7080,
    citizenId: citizen2.id, supportCount: 23,
    slaHours: 24, daysAgo: 1, slaBreached: true,
  })

  // 5. Water leakage - in progress
  await createComplaint({
    title: 'Water Pipeline Leakage on NH Road',
    description: 'Water leaking from underground pipeline on NH road. Road is waterlogged and creating traffic problems.',
    category: 'WATER_LEAKAGE', severity: 'CRITICAL', priority: 'CRITICAL', priorityScore: 96,
    status: 'IN_PROGRESS', ward: '5', department: 'Water Department',
    address: 'NH Bypass Road, Ward 5', latitude: 10.7855, longitude: 78.7015,
    citizenId: citizen2.id, officerId: officer.id, supportCount: 31,
    slaHours: 12, daysAgo: 1, slaBreached: true, escalationLevel: 'LEVEL1',
  })

  // 6. Sewage - escalated
  await createComplaint({
    title: 'Sewage Overflow Blocking School Road',
    description: 'Sewage overflow completely blocking the road near elementary school. Parents and children unable to access school.',
    category: 'SEWAGE', severity: 'CRITICAL', priority: 'CRITICAL', priorityScore: 98,
    status: 'ESCALATED', ward: '3', department: 'Drainage Department',
    address: 'School Road, Ward 3', latitude: 10.7835, longitude: 78.7000,
    citizenId: citizen2.id, officerId: officer.id, supportCount: 42,
    slaHours: 24, daysAgo: 4, slaBreached: true, escalationLevel: 'LEVEL2',
  })

  // 7. Road damage - assigned
  await createComplaint({
    title: 'Road Surface Completely Damaged After Rain',
    description: 'Heavy rain has completely damaged the road surface. Multiple potholes and loose gravel. Accidents happening daily.',
    category: 'ROAD_DAMAGE', severity: 'HIGH', priority: 'HIGH', priorityScore: 82,
    status: 'ASSIGNED', ward: '7', department: 'Roads Department',
    address: 'Colony Main Road, Ward 7', latitude: 10.7890, longitude: 78.7065,
    citizenId: citizen.id, officerId: officer.id, supportCount: 19,
    slaHours: 72, daysAgo: 3,
  })

  // 8. Illegal dumping - submitted
  await createComplaint({
    title: 'Illegal Dumping of Construction Waste',
    description: 'Someone is illegally dumping construction debris on the roadside. Blocking footpath and causing pollution.',
    category: 'ILLEGAL_DUMPING', severity: 'MEDIUM', priority: 'MEDIUM', priorityScore: 55,
    status: 'SUBMITTED', ward: '9', department: 'Sanitation Department',
    address: 'Industrial Area Road, Ward 9', latitude: 10.7960, longitude: 78.7090,
    citizenId: citizen2.id, supportCount: 5,
    slaHours: 48, daysAgo: 0,
  })

  // 9. Resolved pothole (Ward 6)
  await createComplaint({
    title: 'Deep Pothole on Bus Route',
    description: 'Deep pothole on main bus route. Buses are getting damaged and passengers are injured.',
    category: 'POTHOLE', severity: 'HIGH', priority: 'HIGH', priorityScore: 85,
    status: 'RESOLVED', ward: '6', department: 'Roads Department',
    address: 'Bus Route Road, Ward 6', latitude: 10.7865, longitude: 78.7025,
    citizenId: citizen.id, officerId: officer.id, supportCount: 28,
    slaHours: 48, daysAgo: 7, hasBeforeAfter: true,
    resolutionNote: 'Pothole filled with hot mix asphalt. Road surface leveled.',
  })

  // 10. Duplicate pothole (ward 12 - same area as c2)
  await createComplaint({
    title: 'Pothole Causing Accidents Near School',
    description: 'Large pothole near the school is very dangerous. Two wheelers falling daily.',
    category: 'POTHOLE', severity: 'HIGH', priority: 'HIGH', priorityScore: 72,
    status: 'DUPLICATE', ward: '12', department: 'Roads Department',
    address: 'Anna Salai, Ward 12', latitude: 10.7922, longitude: 78.7062,
    citizenId: citizen2.id, supportCount: 0,
    slaHours: 48, daysAgo: 1, duplicateOfId: c2.id,
  })

  // 11-20: More complaints across wards
  const moreComplaints = [
    { title: 'Stagnant Water Near Park', desc: 'Water stagnating near the park entrance for weeks. Mosquito breeding.', cat: 'DRAINAGE', sev: 'HIGH', pri: 'HIGH', score: 76, status: 'IN_PROGRESS', ward: '11', dept: 'Drainage Department', addr: 'Park Road, Ward 11', lat: 10.7912, lng: 78.7055, days: 4, sup: 9 },
    { title: 'Broken Street Light Pole', desc: 'A broken street light pole is lying on the footpath. Very dangerous.', cat: 'STREET_LIGHT', sev: 'HIGH', pri: 'HIGH', score: 80, status: 'ASSIGNED', ward: '15', dept: 'Street Light Department', addr: 'College Road, Ward 15', lat: 10.7950, lng: 78.7085, days: 2, sup: 6 },
    { title: 'Water Supply Contamination', desc: 'Water supply is contaminated with mud. Residents falling sick.', cat: 'WATER_LEAKAGE', sev: 'CRITICAL', pri: 'CRITICAL', score: 97, status: 'IN_PROGRESS', ward: '2', dept: 'Water Department', addr: 'South Street, Ward 2', lat: 10.7820, lng: 78.6990, days: 2, sup: 56 },
    { title: 'Multiple Potholes on Ring Road', desc: 'Ring road has developed multiple potholes making driving very difficult.', cat: 'POTHOLE', sev: 'HIGH', pri: 'HIGH', score: 79, status: 'SUBMITTED', ward: '18', dept: 'Roads Department', addr: 'Ring Road, Ward 18', lat: 10.7980, lng: 78.7110, days: 0, sup: 12 },
    { title: 'Overflowing Dustbin on Market Street', desc: 'Dustbin overflowing. Garbage spread all over. Very unhygienic.', cat: 'GARBAGE', sev: 'MEDIUM', pri: 'MEDIUM', score: 60, status: 'RESOLVED', ward: '4', dept: 'Sanitation Department', addr: 'Market Street, Ward 4', lat: 10.7840, lng: 78.7005, days: 6, sup: 4 },
    { title: 'Drainage Pipe Broken Underground', desc: 'Underground drainage pipe broken causing road to sink slowly.', cat: 'DRAINAGE', sev: 'HIGH', pri: 'HIGH', score: 83, status: 'IN_PROGRESS', ward: '16', dept: 'Drainage Department', addr: 'Temple Road, Ward 16', lat: 10.7958, lng: 78.7095, days: 5, sup: 11 },
    { title: 'Street Light Dim - Safety Issue', desc: 'Street lights very dim on hospital road. Patients and visitors at risk at night.', cat: 'STREET_LIGHT', sev: 'MEDIUM', pri: 'MEDIUM', score: 65, status: 'ASSIGNED', ward: '10', dept: 'Street Light Department', addr: 'Hospital Road, Ward 10', lat: 10.7900, lng: 78.7050, days: 3, sup: 8 },
    { title: 'Road Cave-in Risk Near Bridge', desc: 'Road showing signs of cave-in near the old bridge. Immediate action needed.', cat: 'ROAD_DAMAGE', sev: 'CRITICAL', pri: 'CRITICAL', score: 95, status: 'IN_PROGRESS', ward: '1', dept: 'Roads Department', addr: 'Bridge Road, Ward 1', lat: 10.7810, lng: 78.6980, days: 1, sup: 38 },
    { title: 'Garbage Dump Near School', desc: 'Illegal garbage dump has developed near the school. Health risk for children.', cat: 'GARBAGE', sev: 'HIGH', pri: 'HIGH', score: 88, status: 'ESCALATED', ward: '13', dept: 'Sanitation Department', addr: 'School Lane, Ward 13', lat: 10.7935, lng: 78.7075, days: 8, sup: 67 },
    { title: 'Water Meter Leaking', desc: 'Municipal water meter leaking at junction. Water wasted continuously.', cat: 'WATER_LEAKAGE', sev: 'MEDIUM', pri: 'MEDIUM', score: 58, status: 'RESOLVED', ward: '20', dept: 'Water Department', addr: 'Junction Road, Ward 20', lat: 10.7998, lng: 78.7130, days: 4, sup: 3 },
  ]

  for (const c of moreComplaints) {
    await createComplaint({
      title: c.title, description: c.desc,
      category: c.cat, severity: c.sev as any, priority: c.pri as any,
      priorityScore: c.score, status: c.status as any,
      ward: c.ward, department: c.dept, address: c.addr,
      latitude: c.lat, longitude: c.lng,
      citizenId: Math.random() > 0.5 ? citizen.id : citizen2.id,
      officerId: c.status !== 'SUBMITTED' ? officer.id : undefined,
      supportCount: c.sup, slaHours: 48, daysAgo: c.days,
      hasBeforeAfter: c.status === 'RESOLVED',
      resolutionNote: c.status === 'RESOLVED' ? 'Issue resolved and verified.' : undefined,
    })
  }

  // Notifications for citizen
  await prisma.notification.createMany({
    data: [
      {
        userId: citizen.id, type: 'STATUS_CHANGE', read: false,
        title: 'Complaint Assigned',
        message: 'Your complaint CIV-10271 has been assigned to the Drainage Department.',
        complaintId: c1.id,
      },
      {
        userId: citizen.id, type: 'STATUS_CHANGE', read: false,
        title: 'Work In Progress',
        message: 'Field team has been dispatched for complaint CIV-10271.',
        complaintId: c1.id,
      },
      {
        userId: citizen.id, type: 'ASSIGNED', read: true,
        title: 'Complaint Assigned',
        message: 'Your pothole complaint CIV-10272 has been assigned to Roads Department.',
        complaintId: c2.id,
      },
      {
        userId: citizen.id, type: 'SLA_BREACH', read: false,
        title: '⚠️ SLA Breached',
        message: 'Complaint CIV-10274 has exceeded its SLA deadline and has been escalated.',
        complaintId: c1.id,
      },
    ],
  })

  console.log('✅ Seeding complete!')
  console.log('Demo accounts:')
  console.log('  citizen@demo.com / demo123')
  console.log('  officer@demo.com / demo123')
  console.log('  admin@demo.com / demo123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
