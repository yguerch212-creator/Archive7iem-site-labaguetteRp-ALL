import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if it's a real auth failure (not a network hiccup)
      // Don't redirect if we're already on login or change-password page
      const path = window.location.pathname
      if (path !== '/login' && path !== '/change-password') {
        const msg = error.response?.data?.message || ''
        // Only clear token if the server explicitly says token is invalid
        if (msg.includes('Token') || msg.includes('invalide') || msg.includes('expiré') || msg.includes('manquant')) {
          localStorage.removeItem('authToken')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient