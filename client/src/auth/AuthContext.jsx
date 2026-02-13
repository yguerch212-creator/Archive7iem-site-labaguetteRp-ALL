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

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      console.log('Logout error:', error)
    } finally {
      localStorage.removeItem('authToken')
      setUser(null)
    }
  }

  const value = {
    user,
    login,
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