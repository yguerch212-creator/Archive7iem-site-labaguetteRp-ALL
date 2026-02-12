import React from 'react'

function TypeTag({ type, children, className = '', ...props }) {
  const getTypeClass = () => {
    switch (type) {
      case 'rapport': return 'type-tag rapport'
      case 'incident': return 'type-tag incident'
      case 'recommandation': return 'type-tag recommandation'
      case 'mission': return 'type-tag mission'
      case 'personnel': return 'type-tag personnel'
      default: return 'type-tag'
    }
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'rapport': return 'Rapport'
      case 'incident': return 'Incident'
      case 'recommandation': return 'Recommandation'
      case 'mission': return 'Mission'
      case 'personnel': return 'Personnel'
      default: return type
    }
  }

  const classes = [getTypeClass(), className].filter(Boolean).join(' ')

  return (
    <span className={classes} {...props}>
      {children || getTypeLabel()}
    </span>
  )
}

export default TypeTag