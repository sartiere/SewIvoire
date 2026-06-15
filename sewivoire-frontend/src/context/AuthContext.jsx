import { createContext, useContext, useState, useEffect } from 'react'
import API from '../api/axios'

// 1. On crée le "contexte" — comme une variable globale accessible partout
const AuthContext = createContext()

// 2. Le Provider — il enveloppe toute l'app et partage les données d'auth
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Au démarrage, on vérifie si l'utilisateur est déjà connecté
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      API.get('/api/utilisateurs/me/')
        .then(res => setUser(res.data))
        .catch((err) => {
          // Ne supprimer les tokens que sur un 401 confirmé — pas sur erreur réseau/5xx
          if (err.response?.status === 401) {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // Fonction de connexion
  const login = async (username, password) => {
    const res = await API.post('/api/token/', { username, password })
    localStorage.setItem('access_token', res.data.access)
    localStorage.setItem('refresh_token', res.data.refresh)
    const profil = await API.get('/api/utilisateurs/me/')
    setUser(profil.data)
    return profil.data
  }

  // Fonction de déconnexion
  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

// 3. Hook personnalisé — pour utiliser le contexte facilement partout
export function useAuth() {
  return useContext(AuthContext)
}