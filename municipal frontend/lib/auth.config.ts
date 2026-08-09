import type { NextAuthConfig } from 'next-auth'

/**
 * Auth configuration that is SAFE to use in middleware (Edge runtime).
 * Must NOT import Prisma or any Node.js-only modules.
 * Only JWT session strategy and callback logic here.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role as string
      }
      return session
    },
    authorized({ auth, request }) {
      // This is called by the middleware-safe auth()
      // The actual route protection logic lives in middleware.ts
      return true
    },
  },
}
