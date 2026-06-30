import axios from 'axios'

// En prod, VITE_API_URL n'est pas défini → baseURL '' → URLs relatives (même domaine).
// En dev local, .env.development fournit http://127.0.0.1:8000
const API_BASE = import.meta.env.VITE_API_URL || ''

const API = axios.create({
  baseURL: API_BASE,
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshEnCours = false
let fileAttente = []

const traiterFile = (erreur, token) => {
  fileAttente.forEach(cb => (erreur ? cb.reject(erreur) : cb.resolve(token)))
  fileAttente = []
}

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requeteOriginale = error.config

    if (error.response?.status !== 401 || requeteOriginale._retry) {
      return Promise.reject(error)
    }

    // Sur l'endpoint de login (/api/token/) : mauvais identifiants → laisser
    // l'erreur remonter au formulaire, ne pas rediriger ni supprimer de tokens.
    // Sur l'endpoint de refresh (/api/token/refresh/) : le refresh a échoué →
    // purger les tokens et rediriger.
    if (requeteOriginale.url?.includes('/api/token/refresh/')) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    if (requeteOriginale.url?.includes('/api/token/')) {
      return Promise.reject(error)
    }

    if (refreshEnCours) {
      return new Promise((resolve, reject) => {
        fileAttente.push({
          resolve: (token) => {
            requeteOriginale.headers.Authorization = `Bearer ${token}`
            resolve(API(requeteOriginale))
          },
          reject,
        })
      })
    }

    requeteOriginale._retry = true
    refreshEnCours = true

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      refreshEnCours = false
      // Pas de token du tout → l'utilisateur n'était pas connecté, on laisse
      // l'erreur remonter normalement sans rediriger vers /login
      return Promise.reject(error)
    }

    try {
      const res = await axios.post(`${API_BASE}/api/token/refresh/`, {
        refresh: refreshToken,
      })
      const newAccess = res.data.access
      localStorage.setItem('access_token', newAccess)
      API.defaults.headers.common.Authorization = `Bearer ${newAccess}`
      traiterFile(null, newAccess)
      requeteOriginale.headers.Authorization = `Bearer ${newAccess}`
      return API(requeteOriginale)
    } catch (erreurRefresh) {
      traiterFile(erreurRefresh, null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(erreurRefresh)
    } finally {
      refreshEnCours = false
    }
  }
)

// Récupère TOUTES les pages d'un endpoint paginé (DRF PageNumberPagination).
// Renvoie un tableau complet. Garde-fou de 50 pages.
export async function fetchAll(url, params = {}) {
  const out = []
  let page = 1
  for (let i = 0; i < 50; i++) {
    const { data } = await API.get(url, { params: { ...params, page } })
    if (Array.isArray(data)) { out.push(...data); break }
    out.push(...(data.results || []))
    if (!data.next) break
    page++
  }
  return out
}

export default API
