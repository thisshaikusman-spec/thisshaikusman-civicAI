'use client'

import React, { useEffect, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

interface CountUpNumberProps {
  value: number
  duration?: number
  className?: string
  style?: React.CSSProperties
  prefix?: string
  suffix?: string
}

export default function CountUpNumber({
  value,
  duration = 0.8,
  className,
  style,
  prefix = '',
  suffix = '',
}: CountUpNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(0)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value)
      return
    }

    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate(latest) {
        setDisplayValue(Math.round(latest))
      },
    })

    return () => controls.stop()
  }, [value, duration, shouldReduceMotion])

  return (
    <span className={className} style={style}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}
