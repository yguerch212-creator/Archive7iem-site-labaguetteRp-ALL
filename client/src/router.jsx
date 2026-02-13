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
import PDS from './pages/pds/PDS'
import InterditsFront from './pages/interdits/InterditsFront'
import VisitesMedicales from './pages/medical/VisitesMedicales'
import Documentation from './pages/documentation/Documentation'

function AppRouter() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      
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
      
      {/* Interdits de front */}
      <Route path="/interdits" element={<ProtectedRoute><InterditsFront /></ProtectedRoute>} />
      
      {/* Médical */}
      <Route path="/medical" element={<ProtectedRoute><VisitesMedicales /></ProtectedRoute>} />
      
      {/* Documentation */}
      <Route path="/documentation" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
      
      {/* Search */}
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      
      {/* Admin */}
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
      
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRouter
