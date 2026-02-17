import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import BackButton from '../../components/BackButton'

export default function MedicalDashboard() {
  const { user } = useAuth()

  const isSanit = user?.unite_code === '916S'
  const isPrivileged = user?.isAdmin || user?.isOfficier || user?.isRecenseur

  const cards = [
    { icon: '⚕️', title: 'Soins au front', desc: 'Enregistrement rapide des patients soignés', to: '/medical/soins' },
    { icon: '🏥', title: 'Visites médicales', desc: 'Examens, aptitudes & suivi médical', to: '/medical/visites' },
    { icon: '🏨', title: 'Hospitalisations', desc: 'Lazarettbehandlung — Séjours en infirmerie', to: '/medical/hospitalisations' },
    { icon: '💉', title: 'Vaccinations', desc: 'Schutzimpfungen — Registre des vaccins', to: '/medical/vaccinations' },
    { icon: '🩹', title: 'Blessures', desc: 'Verwundungen — Blessures de guerre & accidents', to: '/medical/blessures' },
    { icon: '📏', title: 'Description personnelle', desc: 'Taille, corpulence, yeux, groupe sanguin, pointure...', to: '/medical/description' },
  ]
  if (isPrivileged || isSanit) {
    cards.push({ icon: '📊', title: 'Statistiques', desc: 'Vue d\'ensemble des soins & activité médicale', to: '/medical/stats' })
  }

  return (
    <div className="container">
      <BackButton label="← Tableau de bord" />
      <h1 style={{ textAlign: 'center', margin: 'var(--space-lg) 0' }}>🏥 Service Médical</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-xl)', fontSize: '0.85rem' }}>
        Gestion sanitaire et données médicales des effectifs
      </p>

      <div className="grid grid-cols-3" style={{ gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        {cards.map((card, i) => (
          <Link to={card.to} key={i} className="paper-card unit-card" style={{ textAlign: 'center', textDecoration: 'none' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>{card.icon}</div>
            <h3 style={{ margin: '0 0 var(--space-xs)' }}>{card.title}</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
