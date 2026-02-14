import { useState } from 'react'

export default function ShareButton({ path }) {
  const [copied, setCopied] = useState(false)

  const share = () => {
    const url = `${window.location.origin}${path || window.location.pathname}?share=1`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Fallback
      prompt('Lien à partager :', url)
    })
  }

  return (
    <button className="btn btn-secondary btn-small" onClick={share} title="Copier le lien de partage">
      {copied ? '✅ Copié !' : '🔗 Partager'}
    </button>
  )
}
