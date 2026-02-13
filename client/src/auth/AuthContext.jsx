import React, { createContext, useState, useEffect } from 'react'
import apiClient from '../api/client'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        const response = await apiClient.get('/auth/me')
        setUser(response.data.user)
      }
    } catch (error) {
      localStorage.removeItem('authToken')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials)
      const { token, user: userData, mustChangePassword } = response.data
      
      localStorage.setItem('authToken', token)
      setUser(userData)
      
      return { success: true, mustChangePassword: !!mustChangePassword }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Erreur de connexion'
      }
    }
  }

  const loginAsGuest = () => {
    const guestUser = {
      id: 0, nom: 'Invité', prenom: '', username: 'guest',
      isGuest: true, isAdmin: false, isRecenseur: false, isOfficier: false,
      isFeldgendarmerie: false, isSanitaets: false
    }
    localStorage.setItem('guestMode', 'true')
    setUser(guestUser)
    return { success: true }
  }

  const logout = async () => {
    try {
      if (!localStorage.getItem('guestMode')) {
        await apiClient.post('/auth/logout')
      }
    } catch (error) {
      console.log('Logout error:', error)
    } finally {
      localStorage.removeItem('authToken')
      localStorage.removeItem('guestMode')
      setUser(null)
    }
  }

  // Restore guest mode on refresh
  useEffect(() => {
    if (!user && !loading && localStorage.getItem('guestMode')) {
      loginAsGuest()
    }
  }, [loading])

  const value = {
    user,
    login,
    loginAsGuest,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext