import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../api/axios'

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    telephone: '',
    password: '',
    password2: '',
  })
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')

    if (formData.password !== formData.password2) {
      setErreur('Les mots de passe ne correspondent pas.')
      return
    }

    setChargement(true)
    try {
      await API.post('/api/register/', {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        telephone: formData.telephone,
        password: formData.password,
      })
      navigate('/login', { replace: true })
    } catch (err) {
      setErreur("Erreur lors de l'inscription. Vérifiez vos informations.")
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="min-h-screen bg-ivoire flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">

        {/* En-tête */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 mb-6">
            <span className="text-or font-titre text-3xl font-bold">Sew</span>
            <span className="text-nuit font-titre text-3xl">Ivoire</span>
          </Link>
          <h1 className="text-2xl font-titre font-bold text-nuit">Créer un compte</h1>
          <p className="text-gray-500 mt-1">Rejoignez la communauté SewIvoire</p>
        </div>

        {/* Carte formulaire */}
        <div className="bg-white rounded-2xl shadow-lg p-8">

          {erreur && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {erreur}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nom et Prénom */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Prénom</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="Kouamé"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Nom</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  placeholder="Koné"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-nuit mb-1.5">Nom d'utilisateur</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="kouame_kone"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or focus:border-transparent transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-nuit mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="kouame@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or focus:border-transparent transition-all"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-nuit mb-1.5">Téléphone</label>
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                placeholder="+225 07 00 00 00 00"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or focus:border-transparent transition-all"
              />
            </div>

            {/* Mots de passe */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Mot de passe</label>
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
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Confirmer</label>
                <input
                  type="password"
                  name="password2"
                  value={formData.password2}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={chargement}
              className="w-full bg-nuit text-white py-3 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors duration-300 disabled:opacity-50 mt-2"
            >
              {chargement ? 'Inscription...' : "S'inscrire"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-or font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register