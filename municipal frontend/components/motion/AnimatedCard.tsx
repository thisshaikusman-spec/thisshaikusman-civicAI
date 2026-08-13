'use client'

import React from 'react'
import { motion, useReducedMotion, HTMLMotionProps } from 'framer-motion'

interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  index?: number
  hoverLift?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function AnimatedCard({
  children,
  index = 0,
  hoverLift = true,
  className = '',
  style,
  ...props
}: AnimatedCardProps) {
  const shouldReduceMotion = useReducedMotion()

  const initial = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 15 }

  const animate = { opacity: 1, y: 0 }

  const transition = {
    duration: 0.25,
    delay: shouldReduceMotion ? 0 : Math.min(index * 0.05, 0.3),
    ease: 'easeOut' as const,
  }

  const hoverProps = hoverLift && !shouldReduceMotion
    ? {
        whileHover: {
          scale: 1.02,
          y: -2,
          transition: { duration: 0.2, ease: 'easeOut' as const },
        },
        whileTap: { scale: 0.98 },
      }
    : {}

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition}
      {...hoverProps}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  )
}
