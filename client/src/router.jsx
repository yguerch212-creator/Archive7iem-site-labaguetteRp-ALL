import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import ProtectedRoute from './auth/ProtectedRoute'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import UnitesList from './pages/effectifs/UnitesList'
import EffectifsList from './pages/effectifs/EffectifsList'
import EffectifNew from './pages/effectifs/EffectifNew'
import Soldbuch from './pages/effectifs/Soldbuch'
import SoldbuchLayout from './pages/effectifs/SoldbuchLayout'
import RapportsList from './pages/rapports/RapportsList'
import RapportNew from './pages/rapports/RapportNew'
import RapportView from './pages/rapports/RapportView'
import RapportLayout from './pages/rapports/RapportLayout'
import Search from './pages/Search'
import AdminUsers from './pages/admin/AdminUsers'
import AdminLogs from './pages/admin/AdminLogs'
import PDS from './pages/pds/PDS'
import PDSRecap from './pages/pds/PDSRecap'
import InterditsFront from './pages/interdits/InterditsFront'
import VisitesMedicales from './pages/medical/VisitesMedicales'
import VisiteMedicaleView from './pages/medical/VisiteMedicaleView'
import Documentation from './pages/documentation/Documentation'
import Bibliotheque from './pages/bibliotheque/Bibliotheque'
import Archives from './pages/archives/Archives'
import PieceView from './pages/sanctions/PieceView'
import DossiersList from './pages/dossiers/DossiersList'
import DossierPersonnel from './pages/dossiers/DossierPersonnel'
import DossierView from './pages/dossiers/DossierView'
import Telegrammes from './pages/telegrammes/Telegrammes'
import Sanctions from './pages/sanctions/Sanctions'
import AffaireView from './pages/sanctions/AffaireView'
import AffaireLayout from './pages/sanctions/AffaireLayout'
import DossierLayout from './pages/dossiers/DossierLayout'
import AdminStats from './pages/admin/AdminStats'
import Moderation from './pages/admin/Moderation'
import Calendrier from './pages/calendrier/Calendrier'
import OrdresList from './pages/ordres/OrdresList'
import OrdreView from './pages/ordres/OrdreView'
import Galerie from './pages/galerie/Galerie'
import Commandement from './pages/commandement/Commandement'
import Gazette from './pages/gazette/Gazette'
import Organigramme from './pages/effectifs/Organigramme'

function AppRouter() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user && !user.isGuest ? <Navigate to="/dashboard" replace /> : <Login />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
      
      {/* Effectifs */}
      <Route path="/effectifs" element={<ProtectedRoute><UnitesList /></ProtectedRoute>} />
      <Route path="/effectifs/unite/:uniteId" element={<ProtectedRoute><EffectifsList /></ProtectedRoute>} />
      <Route path="/effectifs/new" element={<ProtectedRoute><EffectifNew /></ProtectedRoute>} />
      <Route path="/effectifs/:id/edit" element={<ProtectedRoute><EffectifNew /></ProtectedRoute>} />
      <Route path="/effectifs/:id/soldbuch" element={<ProtectedRoute><Soldbuch /></ProtectedRoute>} />
      <Route path="/effectifs/:id/soldbuch/edit" element={<ProtectedRoute><SoldbuchLayout /></ProtectedRoute>} />
      
      {/* Rapports */}
      <Route path="/rapports" element={<ProtectedRoute><RapportsList /></ProtectedRoute>} />
      <Route path="/rapports/new" element={<ProtectedRoute><RapportNew /></ProtectedRoute>} />
      <Route path="/rapports/:id" element={<ProtectedRoute><RapportView /></ProtectedRoute>} />
      <Route path="/rapports/:id/layout" element={<ProtectedRoute><RapportLayout /></ProtectedRoute>} />
      
      {/* PDS */}
      <Route path="/pds" element={<ProtectedRoute><PDS /></ProtectedRoute>} />
      <Route path="/pds/recap" element={<ProtectedRoute><PDSRecap /></ProtectedRoute>} />
      
      {/* Interdits de front */}
      <Route path="/interdits" element={<ProtectedRoute><InterditsFront /></ProtectedRoute>} />
      
      {/* Médical */}
      <Route path="/medical" element={<ProtectedRoute><VisitesMedicales /></ProtectedRoute>} />
      <Route path="/medical/:id" element={<ProtectedRoute><VisiteMedicaleView /></ProtectedRoute>} />
      
      {/* Documentation */}
      <Route path="/documentation" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
      <Route path="/bibliotheque" element={<ProtectedRoute><Bibliotheque /></ProtectedRoute>} />
      <Route path="/archives" element={<ProtectedRoute><Archives /></ProtectedRoute>} />
      <Route path="/pieces/:id" element={<ProtectedRoute><PieceView /></ProtectedRoute>} />
      
      {/* Dossiers */}
      <Route path="/dossiers" element={<ProtectedRoute><DossiersList /></ProtectedRoute>} />
      <Route path="/dossiers/effectif/:effectifId" element={<ProtectedRoute><DossierPersonnel /></ProtectedRoute>} />
      <Route path="/dossiers/:id" element={<ProtectedRoute><DossierView /></ProtectedRoute>} />
      <Route path="/dossiers/:id/layout" element={<ProtectedRoute><DossierLayout /></ProtectedRoute>} />
      <Route path="/telegrammes" element={<ProtectedRoute><Telegrammes /></ProtectedRoute>} />
      <Route path="/sanctions" element={<ProtectedRoute><Sanctions /></ProtectedRoute>} />
      <Route path="/sanctions/:id" element={<ProtectedRoute><AffaireView /></ProtectedRoute>} />
      <Route path="/sanctions/:id/layout" element={<ProtectedRoute><AffaireLayout /></ProtectedRoute>} />
      
      {/* New features */}
      <Route path="/calendrier" element={<ProtectedRoute><Calendrier /></ProtectedRoute>} />
      <Route path="/ordres" element={<ProtectedRoute><OrdresList /></ProtectedRoute>} />
      <Route path="/ordres/:id" element={<ProtectedRoute><OrdreView /></ProtectedRoute>} />
      <Route path="/galerie" element={<ProtectedRoute><Galerie /></ProtectedRoute>} />
      <Route path="/commandement" element={<ProtectedRoute><Commandement /></ProtectedRoute>} />
      <Route path="/gazette" element={<ProtectedRoute><Gazette /></ProtectedRoute>} />
      <Route path="/organigramme" element={<ProtectedRoute><Organigramme /></ProtectedRoute>} />
      
      {/* Search */}
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      
      {/* Admin */}
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/logs" element={<ProtectedRoute><AdminLogs /></ProtectedRoute>} />
      <Route path="/admin/stats" element={<ProtectedRoute><AdminStats /></ProtectedRoute>} />
      <Route path="/admin/moderation" element={<ProtectedRoute><Moderation /></ProtectedRoute>} />
      
      <Route path="/" element={<Navigate to={user && !user.isGuest ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  )
}

export default AppRouter
