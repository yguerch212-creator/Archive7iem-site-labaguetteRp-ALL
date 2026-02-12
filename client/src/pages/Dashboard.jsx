import React from 'react'
import Topbar from '../components/layout/Topbar'
import PaperCard from '../components/layout/PaperCard'
import TypeTag from '../components/ui/TypeTag'
import { useAuth } from '../auth/useAuth'

function Dashboard() {
  const { user } = useAuth()

  return (
    <div>
      <Topbar />
      
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="paper-card-header">
          <h1>Tableau de bord</h1>
          <p className="text-secondary">
            Bienvenue, {user?.username} - {user?.unite || 'Sans affectation'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-lg">
          <PaperCard>
            <div className="paper-card-header">
              <h3 className="paper-card-title">Effectifs</h3>
            </div>
            <p>Gestion des soldats et de leurs affectations</p>
            <div className="flex gap-sm" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary btn-small">Nouvel effectif</button>
              <button className="btn btn-secondary btn-small">Liste</button>
            </div>
          </PaperCard>

          <PaperCard>
            <div className="paper-card-header">
              <h3 className="paper-card-title">Rapports</h3>
            </div>
            <p>Rédaction et consultation des rapports militaires</p>
            <div className="flex gap-sm" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary btn-small">Nouveau rapport</button>
              <button className="btn btn-secondary btn-small">Archives</button>
            </div>
          </PaperCard>

          <PaperCard>
            <div className="paper-card-header">
              <h3 className="paper-card-title">Casiers</h3>
            </div>
            <p>Dossiers disciplinaires et judiciaires</p>
            <div className="flex gap-sm" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary btn-small">Nouveau casier</button>
              <button className="btn btn-secondary btn-small">Consulter</button>
            </div>
          </PaperCard>
        </div>

        <div className="grid grid-cols-2 gap-lg" style={{ marginTop: '2rem' }}>
          <PaperCard>
            <div className="paper-card-header">
              <h3 className="paper-card-title">Rapports récents</h3>
            </div>
            <div className="flex flex-col gap-md">
              <div className="flex justify-between items-center">
                <span>Mission de reconnaissance - Secteur Nord</span>
                <TypeTag type="rapport" />
              </div>
              <div className="flex justify-between items-center">
                <span>Incident disciplinaire - Soldat Müller</span>
                <TypeTag type="incident" />
              </div>
              <div className="flex justify-between items-center">
                <span>Recommandation d'équipement</span>
                <TypeTag type="recommandation" />
              </div>
            </div>
          </PaperCard>

          <PaperCard>
            <div className="paper-card-header">
              <h3 className="paper-card-title">Statistiques</h3>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div className="text-center">
                <div className="font-bold text-primary" style={{ fontSize: '1.5rem' }}>42</div>
                <div className="text-muted text-sm">Effectifs actifs</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-primary" style={{ fontSize: '1.5rem' }}>18</div>
                <div className="text-muted text-sm">Rapports ce mois</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-primary" style={{ fontSize: '1.5rem' }}>3</div>
                <div className="text-muted text-sm">Incidents ouverts</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-primary" style={{ fontSize: '1.5rem' }}>7</div>
                <div className="text-muted text-sm">Unités actives</div>
              </div>
            </div>
          </PaperCard>
        </div>
      </div>
    </div>
  )
}

export default Dashboard