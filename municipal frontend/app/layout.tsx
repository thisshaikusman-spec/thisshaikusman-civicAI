import type { Metadata } from 'next'
import type { Viewport } from 'next'
import './globals.css'

import PageTransition from '@/components/motion/PageTransition'

export const metadata: Metadata = {
  title: 'CivicAI — AI-Powered Municipal Complaint Management',
  description: 'Report and track civic issues. CivicAI uses AI to automatically categorize, prioritize, and route municipal complaints for faster resolution.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col antialiased">
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  )
}

