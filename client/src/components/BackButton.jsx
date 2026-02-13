import { useNavigate } from 'react-router-dom'

export default function BackButton({ className = 'btn-back', label = '← Retour' }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(-1)} className={className} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}>
      {label}
    </button>
  )
}
