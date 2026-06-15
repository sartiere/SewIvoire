import axios from 'axios'

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000',
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
      const res = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
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

export default API
