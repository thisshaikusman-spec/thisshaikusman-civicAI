'use client'

import React from 'react'
import { motion, useReducedMotion, HTMLMotionProps } from 'framer-motion'

interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode
  isLoading?: boolean
  loadingText?: string
  className?: string
  style?: React.CSSProperties
}

export default function AnimatedButton({
  children,
  isLoading = false,
  loadingText,
  className = '',
  style = {},
  disabled,
  ...props
}: AnimatedButtonProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.button
      whileTap={disabled || isLoading || shouldReduceMotion ? undefined : { scale: 0.95 }}
      whileHover={disabled || isLoading || shouldReduceMotion ? undefined : { scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled || isLoading}
      className={className}
      style={{
        transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {isLoading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <svg
            className="animate-spin"
            style={{ width: '1rem', height: '1rem' }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText || 'Loading...'}
        </span>
      ) : (
        children
      )}
    </motion.button>
  )
}
