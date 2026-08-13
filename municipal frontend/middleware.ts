import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

// Use the edge-safe auth config (no Prisma, no Node.js-only modules)
const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = ['/', '/login', '/register', '/admin/login', '/api/auth']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))

  if (!req.auth && !isPublic) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based routing
  if (req.auth) {
    const role = (req.auth.user as any)?.role
    if (pathname.startsWith('/officer') && role === 'CITIZEN') {
      return NextResponse.redirect(new URL('/citizen/dashboard', req.url))
    }
    if (pathname.startsWith('/citizen') && (role === 'OFFICER' || role === 'ADMIN')) {
      return NextResponse.redirect(new URL('/officer/dashboard', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|uploads).*)'],
}
