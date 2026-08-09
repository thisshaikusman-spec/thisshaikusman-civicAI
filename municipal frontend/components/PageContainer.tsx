import React from 'react'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export default function PageContainer({ children, className = '', style }: PageContainerProps) {
  return (
    <div
      className={`w-full px-6 sm:px-10 lg:px-16 ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
