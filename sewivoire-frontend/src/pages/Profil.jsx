import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Clock, Scissors, Package, User, Lock, Heart, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import API from '../api/axios'
import Navigation from '../components/Navigation'

function Profil() {
  const { user } = useAuth()
  const [onglet, setOnglet] = useState('infos')
  const [chargement, setChargement] = useState(false)
  const [succes, setSucces] = useState('')
  const [erreur, setErreur] = useState('')
  const [stats, setStats] = useState(null)
  const [favoris, setFavoris] = useState([])

  const [formInfos, setFormInfos] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
  })

  const [formPassword, setFormPassword] = useState({
    password: '',
    password2: '',
  })

  useEffect(() => {
    Promise.all([
      API.get('/api/commandes/mes_commandes/'),
      API.get('/api/favoris/'),
    ]).then(([resCommandes, resFavoris]) => {
      const commandes = resCommandes.data.results || resCommandes.data
      const favorisData = resFavoris.data.results || resFavoris.data
      setFavoris(favorisData)
      setStats({
        total: commandes.length,
        en_attente: commandes.filter(c => c.statut === 'EN_ATTENTE').length,
        en_cours: commandes.filter(c => c.statut === 'EN_COURS' || c.statut === 'CONFIRMEE').length,
        livrees: commandes.filter(c => c.statut === 'LIVREE').length,
      })
    }).catch(err => console.error(err))
  }, [])

  const handleInfosChange = (e) => {
    setFormInfos({ ...formInfos, [e.target.name]: e.target.value })
  }

  const handlePasswordChange = (e) => {
    setFormPassword({ ...formPassword, [e.target.name]: e.target.value })
  }

  const sauvegarderInfos = async (e) => {
    e.preventDefault()
    setChargement(true)
    setSucces('')
    setErreur('')
    try {
      await API.patch(`/api/utilisateurs/${user.id}/`, formInfos)
      setSucces('Profil mis à jour avec succès !')
    } catch {
      setErreur('Erreur lors de la mise à jour.')
    } finally {
      setChargement(false)
    }
  }

  const changerMotDePasse = async (e) => {
    e.preventDefault()
    if (formPassword.password !== formPassword.password2) {
      setErreur('Les mots de passe ne correspondent pas.')
      return
    }
    if (formPassword.password.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setChargement(true)
    setSucces('')
    setErreur('')
    try {
      await API.patch(`/api/utilisateurs/${user.id}/`, {
        password: formPassword.password
      })
      setSucces('Mot de passe changé avec succès !')
      setFormPassword({ password: '', password2: '' })
    } catch {
      setErreur('Erreur lors du changement de mot de passe.')
    } finally {
      setChargement(false)
    }
  }

  const retirerFavori = async (modeleId) => {
    try {
      await API.post('/api/favoris/toggle/', { modele_id: modeleId })
      setFavoris(prev => prev.filter(f => f.modele !== modeleId))
    } catch (err) {
      console.error(err)
    }
  }

  const statItems = stats ? [
    { label: 'Total commandes', valeur: stats.total,      Icon: ClipboardList },
    { label: 'En attente',      valeur: stats.en_attente, Icon: Clock },
    { label: 'En cours',        valeur: stats.en_cours,   Icon: Scissors },
    { label: 'Livrées',         valeur: stats.livrees,    Icon: Package },
  ] : []

  const tabs = [
    { key: 'infos',    label: 'Mes informations', Icon: User },
    { key: 'password', label: 'Mot de passe',     Icon: Lock },
    { key: 'favoris',  label: `Favoris (${favoris.length})`, Icon: Heart },
  ]

  return (
    <div className="min-h-screen bg-ivoire">
      <div className="max-w-4xl mx-auto px-4 pt-4">
       <Navigation />
      </div>

      <div className="bg-nuit py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-nuit flex-shrink-0"
              style={{ backgroundColor: '#C8962E' }}>
              {user?.first_name?.[0] || user?.username?.[0] || '?'}
            </div>
            <div>
              <h1 className="font-titre text-3xl font-bold text-white">
                {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-gray-300 mt-1">{user?.email}</p>
              <span className="inline-block mt-2 bg-or/20 text-or text-xs font-semibold px-3 py-1 rounded-full">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {statItems.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 text-center shadow-sm">
                <s.Icon className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                <div className="text-2xl font-bold text-nuit font-titre">{s.valeur}</div>
                <div className="text-gray-400 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setOnglet(tab.key); setSucces(''); setErreur('') }}
              className={`flex items-center gap-1.5 px-5 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
                onglet === tab.key
                  ? 'border-or text-or'
                  : 'border-transparent text-gray-500 hover:text-nuit'
              }`}
            >
              <tab.Icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {succes && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {succes}
          </div>
        )}
        {erreur && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            <XCircle className="w-4 h-4 flex-shrink-0" /> {erreur}
          </div>
        )}

        {/* Onglet Infos */}
        {onglet === 'infos' && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="font-titre text-xl font-bold text-nuit mb-6">
              Mes informations personnelles
            </h2>
            <form onSubmit={sauvegarderInfos} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-nuit mb-1.5">Prénom</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formInfos.first_name}
                    onChange={handleInfosChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-nuit mb-1.5">Nom</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formInfos.last_name}
                    onChange={handleInfosChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formInfos.email}
                  onChange={handleInfosChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={formInfos.telephone}
                  onChange={handleInfosChange}
                  placeholder="+225 07 00 00 00 00"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>
              <div className="flex justify-between items-center pt-2">
                <Link to="/mes-commandes" className="text-or text-sm hover:underline">
                  Voir mes commandes →
                </Link>
                <button
                  type="submit"
                  disabled={chargement}
                  className="bg-nuit text-white px-8 py-3 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
                >
                  {chargement ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Onglet Mot de passe */}
        {onglet === 'password' && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="font-titre text-xl font-bold text-nuit mb-2">
              Changer le mot de passe
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Le mot de passe doit contenir au moins 8 caractères.
            </p>
            <form onSubmit={changerMotDePasse} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  name="password"
                  value={formPassword.password}
                  onChange={handlePasswordChange}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  name="password2"
                  value={formPassword.password2}
                  onChange={handlePasswordChange}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={chargement}
                  className="bg-nuit text-white px-8 py-3 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
                >
                  {chargement ? 'Modification...' : 'Changer le mot de passe'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Onglet Favoris */}
        {onglet === 'favoris' && (
          <div>
            {favoris.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl">
                <Heart className="w-20 h-20 mx-auto mb-4 text-gray-200" />
                <h3 className="font-titre text-xl font-bold text-nuit mb-2">
                  Aucun favori
                </h3>
                <p className="text-gray-400 mb-6">
                  Ajoutez des modèles à vos favoris depuis le catalogue.
                </p>
                <Link
                  to="/catalogue"
                  className="inline-block bg-nuit text-white px-8 py-3 rounded-xl hover:bg-or hover:text-nuit transition-colors font-semibold"
                >
                  Découvrir le catalogue
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favoris.map(favori => (
                  <div key={favori.id_favori} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-nuit">{favori.modele_nom}</h3>
                      <p className="text-or font-bold mt-1">
                        {Number(favori.modele_prix).toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/modeles/${favori.modele}`}
                        className="bg-nuit text-white px-4 py-2 rounded-xl text-sm hover:bg-or hover:text-nuit transition-colors"
                      >
                        Voir
                      </Link>
                      <button
                        onClick={() => retirerFavori(favori.modele)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Heart className="w-5 h-5 fill-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profil
