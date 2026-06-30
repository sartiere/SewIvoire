import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import API, { fetchAll } from '../api/axios'
import ModeleCard from '../components/ModeleCard'

function Catalogue() {
  const [modeles, setModeles] = useState([])
  const [categories, setCategories] = useState([])
  const [chargement, setChargement] = useState(true)
  const [categorieActive, setCategorieActive] = useState('')
  const [recherche, setRecherche] = useState('')
  const [rechercheDebouncee, setRechercheDebouncee] = useState('')
  const [prixMin, setPrixMin] = useState('')
  const [prixMax, setPrixMax] = useState('')
  const [delaiMax, setDelaiMax] = useState('')
  const [tri, setTri] = useState('nom')
  const [total, setTotal] = useState(0)
  const [filtresOuverts, setFiltresOuverts] = useState(false)

  useEffect(() => {
    API.get('/api/categories/')
      .then(res => setCategories(res.data.results || res.data))
      .catch(err => console.error(err))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setRechercheDebouncee(recherche), 400)
    return () => clearTimeout(t)
  }, [recherche])

  useEffect(() => {
    let actif = true
    setChargement(true)

    const params = {}
    if (rechercheDebouncee) params.search    = rechercheDebouncee
    if (categorieActive)    params.categorie = categorieActive
    if (prixMin)            params.prix_min  = prixMin
    if (prixMax)            params.prix_max  = prixMax
    if (delaiMax)           params.delai_max = delaiMax
    if (tri)                params.ordering  = tri

    fetchAll('/api/modeles/', params)
      .then(data => {
        if (!actif) return
        setModeles(data)
        setTotal(data.length)
      })
      .catch(err => console.error(err))
      .finally(() => { if (actif) setChargement(false) })

    return () => { actif = false }
  }, [rechercheDebouncee, categorieActive, prixMin, prixMax, delaiMax, tri])

  const reinitialiser = () => {
    setRecherche('')
    setRechercheDebouncee('')
    setCategorieActive('')
    setPrixMin('')
    setPrixMax('')
    setDelaiMax('')
    setTri('nom')
  }

  const nbFiltresAvances = [prixMin, prixMax, delaiMax].filter(Boolean).length
  const filtresActifs = recherche || categorieActive || prixMin || prixMax || delaiMax || tri !== 'nom'

  return (
    <div className="min-h-screen bg-ivoire">

      {/* En-tête */}
      <div className="bg-nuit py-14 text-center">
        <span className="text-or font-semibold text-sm uppercase tracking-widest">Notre collection</span>
        <h1 className="font-titre text-4xl font-bold text-white mt-2">Catalogue de modèles</h1>
        <p className="text-gray-300 mt-3 max-w-xl mx-auto">
          Explorez nos créations et trouvez le modèle qui vous correspond.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Barre de recherche */}
        <div className="relative mb-6 max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher un modèle..."
            className="w-full pl-12 pr-10 py-3.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-or shadow-sm"
          />
          {recherche && (
            <button
              onClick={() => setRecherche('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtres par catégorie */}
        <div className="flex flex-wrap gap-3 mb-6 justify-center">
          <button
            onClick={() => setCategorieActive('')}
            className={`px-5 py-2 rounded-full font-medium transition-colors duration-200 ${
              categorieActive === ''
                ? 'bg-nuit text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Toutes
          </button>
          {categories.map(cat => (
            <button
              key={cat.id_categorie}
              onClick={() => setCategorieActive(cat.id_categorie)}
              className={`px-5 py-2 rounded-full font-medium transition-colors duration-200 ${
                categorieActive === cat.id_categorie
                  ? 'bg-or text-nuit'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat.libelle}
            </button>
          ))}
        </div>

        {/* Barre filtres avancés + tri */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <button
            onClick={() => setFiltresOuverts(o => !o)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filtresOuverts
                ? 'bg-nuit text-white border-nuit'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filtres avancés
            {nbFiltresAvances > 0 && (
              <span className="bg-or text-nuit text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {nbFiltresAvances}
              </span>
            )}
          </button>

          <select
            value={tri}
            onChange={e => setTri(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-or"
          >
            <option value="nom">Nom A → Z</option>
            <option value="-nom">Nom Z → A</option>
            <option value="prix">Prix croissant</option>
            <option value="-prix">Prix décroissant</option>
            <option value="delai">Délai le plus court</option>
          </select>
        </div>

        {/* Panneau filtres avancés */}
        {filtresOuverts && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Prix minimum (FCFA)</label>
              <input type="number" value={prixMin} onChange={e => setPrixMin(e.target.value)} placeholder="Ex : 5 000" min="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Prix maximum (FCFA)</label>
              <input type="number" value={prixMax} onChange={e => setPrixMax(e.target.value)} placeholder="Ex : 50 000" min="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Délai maximum (jours)</label>
              <input type="number" value={delaiMax} onChange={e => setDelaiMax(e.target.value)} placeholder="Ex : 14" min="1" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or" />
            </div>
          </div>
        )}

        {/* Résultats */}
        {chargement ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse">
                <div className="bg-gray-200 h-64 rounded-t-2xl"></div>
                <div className="p-4 space-y-2">
                  <div className="bg-gray-200 h-4 rounded w-3/4"></div>
                  <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : modeles.length > 0 ? (
          <>
            <p className="text-gray-500 text-sm mb-6">
              {total} modèle{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {modeles.map(modele => (
                <ModeleCard key={modele.id_modele} modele={modele} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="font-titre text-xl text-nuit font-semibold mb-2">Aucun modèle trouvé</h3>
            <p className="text-gray-400">Essayez une autre recherche ou modifiez vos filtres.</p>
            {filtresActifs && (
              <button onClick={reinitialiser} className="mt-6 bg-nuit text-white px-6 py-2.5 rounded-xl hover:bg-or hover:text-nuit transition-colors">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Catalogue
