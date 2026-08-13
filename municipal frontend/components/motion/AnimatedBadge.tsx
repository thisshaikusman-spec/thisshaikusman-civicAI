'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface AnimatedBadgeProps {
  statusKey: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export default function AnimatedBadge({
  statusKey,
  children,
  className = '',
  style = {},
}: AnimatedBadgeProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.span
      key={statusKey}
      initial={shouldReduceMotion ? false : { scale: 0.9, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        transition: 'background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease',
        ...style,
      }}
    >
      {children}
    </motion.span>
  )
}
