import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [formData, setFormData] = useState({ username: '', password: '' })
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  // Après login, retourne à la page d'où venait l'utilisateur
  const redirect = location.state?.from || '/profil'

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    try {
      await login(formData.username, formData.password)
      navigate(redirect, { replace: true })
    } catch (err) {
      setErreur('Identifiants incorrects. Veuillez réessayer.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="min-h-screen bg-ivoire flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* En-tête */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 mb-6">
            <span className="text-or font-titre text-3xl font-bold">Sew</span>
            <span className="text-nuit font-titre text-3xl">Ivoire</span>
          </Link>
          <h1 className="text-2xl font-titre font-bold text-nuit">Bon retour !</h1>
          <p className="text-gray-500 mt-1">Connectez-vous à votre compte</p>
        </div>

        {/* Carte formulaire */}
        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* Message d'erreur */}
          {erreur && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {erreur}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-nuit mb-1.5">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="votre_username"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or focus:border-transparent transition-all"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-nuit mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or focus:border-transparent transition-all"
              />
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={chargement}
              className="w-full bg-nuit text-white py-3 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chargement ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Lien inscription */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-or font-semibold hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login