import React from 'react'

function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  className = '',
  disabled = false,
  loading = false,
  onClick,
  ...props 
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn-primary'
      case 'secondary': return 'btn-secondary'
      case 'danger': return 'btn-danger'
      default: return 'btn-primary'
    }
  }

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'btn-small'
      case 'large': return 'btn-large'
      default: return ''
    }
  }

  const classes = [
    'btn',
    getVariantClass(),
    getSizeClass(),
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-sm">
          <div 
            className="loading-spinner" 
            style={{ width: '16px', height: '16px' }}
          ></div>
          Chargement...
        </div>
      ) : (
        children
      )}
    </button>
  )
}

export default Button