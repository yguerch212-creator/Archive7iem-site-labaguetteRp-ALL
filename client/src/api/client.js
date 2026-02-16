import axios from 'axios'

// ============ CACHE EN MÉMOIRE ============
const cache = new Map()
const CACHE_TTL = 30 * 1000  // 30 sec — les données restent fraîches 30s
const MAX_CACHE = 150

function cacheKey(url, params) {
  return url + (params ? '?' + JSON.stringify(params) : '')
}

function invalidate(urlPrefix) {
  // Après un POST/PUT/DELETE, on vide le cache du même endpoint
  const base = urlPrefix?.split('?')[0]?.replace(/\/\d+$/, '') // /api/rapports/5 → /api/rapports
  for (const key of cache.keys()) {
    if (key.startsWith(base)) cache.delete(key)
  }
}

// ============ CLIENT AXIOS ============
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Expose pour forcer un refresh
apiClient.clearCache = () => cache.clear()

// ============ REQUEST INTERCEPTOR ============
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ============ RESPONSE INTERCEPTOR ============
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 → déconnexion si token invalide
    if (error.response?.status === 401) {
      const path = window.location.pathname
      if (path !== '/login' && path !== '/change-password') {
        const msg = error.response?.data?.message || ''
        if (msg.includes('Token') || msg.includes('invalide') || msg.includes('expiré') || msg.includes('manquant')) {
          localStorage.removeItem('authToken')
          window.location.href = '/login'
        }
      }
    }

    // 429 (rate limit) → retry après 2s
    if (error.response?.status === 429 && !error.config.__retried) {
      error.config.__retried = true
      return new Promise(resolve =>
        setTimeout(() => resolve(apiClient(error.config)), 2000)
      )
    }

    return Promise.reject(error)
  }
)

// ============ WRAPPER GET AVEC CACHE ============
const originalGet = apiClient.get.bind(apiClient)

apiClient.get = (url, config = {}) => {
  const key = cacheKey(url, config.params)

  // Servir depuis le cache si frais
  if (!config.noCache) {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Promise.resolve(cached.response)
    }
  }

  // Sinon fetch + mettre en cache
  return originalGet(url, config).then(response => {
    cache.set(key, { response, ts: Date.now() })
    // Nettoyer si trop d'entrées
    if (cache.size > MAX_CACHE) {
      const first = cache.keys().next().value
      cache.delete(first)
    }
    return response
  })
}

// ============ INVALIDATION SUR ÉCRITURE ============
const originalPost = apiClient.post.bind(apiClient)
const originalPut = apiClient.put.bind(apiClient)
const originalDelete = apiClient.delete.bind(apiClient)

apiClient.post = (url, ...args) => originalPost(url, ...args).then(r => { invalidate(url); return r })
apiClient.put = (url, ...args) => originalPut(url, ...args).then(r => { invalidate(url); return r })
apiClient.delete = (url, ...args) => originalDelete(url, ...args).then(r => { invalidate(url); return r })

export default apiClient
