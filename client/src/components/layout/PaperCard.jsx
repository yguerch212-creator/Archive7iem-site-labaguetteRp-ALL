import React from 'react'

function PaperCard({ children, className = '', ...props }) {
  return (
    <div 
      className={`paper-card ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default PaperCard