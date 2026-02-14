import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

const STATUT_LABELS = {
  brouillon: { label: 'Brouillon', color: '#888', icon: '📝' },
  en_attente: { label: 'En attente', color: '#e67e22', icon: '⏳' },
  publie: { label: 'Publié', color: '#27ae60', icon: '✅' },
  refuse: { label: 'Refusé', color: '#e74c3c', icon: '❌' },
}

export default function JournalList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])
  const [pending, setPending] = useState([])
  const [tab, setTab] = useState('published') // published | mine | pending
  const [msg, setMsg] = useState('')

  const canValidate = user?.isAdmin || user?.isEtatMajor || user?.isOfficier || (user?.grade_rang >= 35)
  const canCreate = !!user?.effectif_id && !user?.isGuest

  useEffect(() => { load() }, [])

  const load = () => {
    api.get('/journal').then(r => setArticles(r.data.data || [])).catch(() => {})
    if (canValidate) {
      api.get('/journal/pending').then(r => setPending(r.data.data || [])).catch(() => {})
    }
  }

  const published = articles.filter(a => a.statut === 'publie')
  const mine = articles.filter(a => a.auteur_id === user?.effectif_id)

  const createArticle = async () => {
    try {
      const res = await api.post('/journal', { titre: 'Nouvel article' })
      navigate(`/journal/${res.data.data.id}/edit`)
    } catch (err) { setMsg('Erreur: ' + (err.response?.data?.error || err.message)) }
  }

  const validate = async (id, action) => {
    try {
      await api.put(`/journal/${id}/validate`, { action })
      setMsg(action === 'approve' ? '✅ Article publié !' : '❌ Article refusé')
      setTimeout(() => setMsg(''), 3000)
      load()
    } catch (err) { setMsg('Erreur') }
  }

  const renderArticleRow = (a, showActions = false) => (
    <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/journal/${a.id}`)}>
      <td style={{ fontWeight: 600 }}>{a.titre}</td>
      <td>{a.auteur_grade ? `${a.auteur_grade} ` : ''}{a.auteur_prenom} {a.auteur_nom}</td>
      <td>{a.auteur_unite || '—'}</td>
      <td>
        <span style={{ fontSize: '0.78rem', color: STATUT_LABELS[a.statut]?.color, fontWeight: 600 }}>
          {STATUT_LABELS[a.statut]?.icon} {STATUT_LABELS[a.statut]?.label}
        </span>
      </td>
      <td style={{ fontSize: '0.8rem' }}>{new Date(a.date_publication || a.created_at).toLocaleDateString('fr-FR')}</td>
      {showActions && (
        <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-primary btn-sm" onClick={() => validate(a.id, 'approve')}>✅</button>
          <button className="btn btn-danger btn-sm" onClick={() => validate(a.id, 'refuse')}>❌</button>
        </td>
      )}
    </tr>
  )

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 8 }}>
        <BackButton label="← Tableau de bord" />
        {canCreate && <button className="btn btn-primary btn-small" onClick={createArticle}>📰 Nouvel article</button>}
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-sm)' }}>
        <span style={{ fontSize: '0.65rem', letterSpacing: 6, display: 'block', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nachrichtenblatt</span>
        📰 Journal du 7. Armeekorps
      </h1>
      <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
        Publication officielle des nouvelles et récits du corps d'armée
      </p>

      {msg && <div className="alert alert-success">{msg}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--space-xs)' }}>
        <button className={`btn btn-sm ${tab === 'published' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('published')}>
          📰 Articles publiés ({published.length})
        </button>
        {canCreate && (
          <button className={`btn btn-sm ${tab === 'mine' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('mine')}>
            ✍️ Mes articles ({mine.length})
          </button>
        )}
        {canValidate && pending.length > 0 && (
          <button className={`btn btn-sm ${tab === 'pending' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('pending')}>
            ⏳ À valider ({pending.length})
          </button>
        )}
      </div>

      <div className="paper-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Auteur</th>
              <th>Unité</th>
              <th>Statut</th>
              <th>Date</th>
              {tab === 'pending' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {tab === 'published' && published.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucun article publié</td></tr>
            )}
            {tab === 'published' && published.map(a => renderArticleRow(a))}
            {tab === 'mine' && mine.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucun article</td></tr>
            )}
            {tab === 'mine' && mine.map(a => renderArticleRow(a))}
            {tab === 'pending' && pending.map(a => renderArticleRow(a, true))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
