import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Shirt, Heart, Layers, CheckCircle, Tag, ShoppingBag, FileText, Send, ClipboardList, MapPin, X } from 'lucide-react'
import API from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Navigation from '../components/Navigation'

function ModeleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [modele, setModele] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [commande, setCommande] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')
  const [estFavori, setEstFavori] = useState(false)

  const [modalAdresse, setModalAdresse] = useState(false)
  const [adresse, setAdresse] = useState('')

  const [demandeDevis, setDemandeDevis] = useState(false)
  const [notesDevis, setNotesDevis] = useState('')
  const [devisEnvoi, setDevisEnvoi] = useState(false)
  const [devisSucces, setDevisSucces] = useState(false)
  const [devisErreur, setDevisErreur] = useState('')

  const [codeInput, setCodeInput] = useState('')
  const [promoChargement, setPromoChargement] = useState(false)
  const [promoResultat, setPromoResultat] = useState(null)
  const [promoErreur, setPromoErreur] = useState('')

  useEffect(() => {
    API.get(`/api/modeles/${id}/`)
      .then(res => setModele(res.data))
      .catch(() => navigate('/catalogue'))
      .finally(() => setChargement(false))
  }, [id])

  const appliquerPromo = async () => {
    if (!codeInput.trim()) return
    setPromoChargement(true)
    setPromoErreur('')
    setPromoResultat(null)
    try {
      const res = await API.post('/api/code-promos/valider/', {
        code: codeInput.trim(),
        modele_id: id,
      })
      setPromoResultat(res.data)
    } catch (err) {
      setPromoErreur(err.response?.data?.error || 'Code invalide.')
    } finally {
      setPromoChargement(false)
    }
  }

  const retirerPromo = () => {
    setPromoResultat(null)
    setCodeInput('')
    setPromoErreur('')
  }

  const soumettreDevis = async () => {
    if (!user) { navigate('/login', { state: { from: `/modeles/${id}` } }); return }
    setDevisEnvoi(true)
    setDevisErreur('')
    try {
      await API.post('/api/devis/', { modele: id, notes_client: notesDevis })
      setDevisSucces(true)
    } catch {
      setDevisErreur('Erreur lors de la demande. Veuillez réessayer.')
    } finally {
      setDevisEnvoi(false)
    }
  }

  const ouvrirCommande = () => {
    if (!user) { navigate('/login', { state: { from: `/modeles/${id}` } }); return }
    setModalAdresse(true)
    setErreur('')
  }

  const confirmerCommande = async () => {
    if (!adresse.trim()) { setErreur("Veuillez saisir votre adresse de livraison."); return }
    setCommande(true)
    setErreur('')
    try {
      const body = { modele: id, adresse_livraison: adresse.trim() }
      if (promoResultat) body.code_promo_code = promoResultat.code
      await API.post('/api/commandes/', body)
      setModalAdresse(false)
      setSucces(true)
    } catch (err) {
      const msg = err.response?.data?.code_promo_code?.[0]
        || err.response?.data?.detail
        || 'Erreur lors de la commande. Veuillez réessayer.'
      setErreur(msg)
    } finally {
      setCommande(false)
    }
  }

  const toggleFavori = async () => {
    if (!user) { navigate('/login'); return }
    try {
      await API.post('/api/favoris/toggle/', { modele_id: id })
      setEstFavori(!estFavori)
    } catch (err) {
      console.error(err)
    }
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-ivoire flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-or border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement du modèle...</p>
        </div>
      </div>
    )
  }

  if (!modele) return null

  const prixAffiche = promoResultat
    ? Number(promoResultat.prix_final)
    : Number(modele.prix)

  return (
    <>
    <div className="min-h-screen bg-ivoire">

      <div className="bg-white border-b border-gray-100 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-or transition-colors">Accueil</Link>
            <span>›</span>
            <Link to="/catalogue" className="hover:text-or transition-colors">Catalogue</Link>
            <span>›</span>
            <span className="text-nuit font-medium">{modele.nom}</span>
          </div>
          <Navigation />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Image */}
          <div className="relative">
            <div className="bg-gradient-to-br from-nuit to-gray-700 rounded-3xl overflow-hidden flex items-center justify-center shadow-xl">
              {modele.image ? (
                <img
                  src={modele.image}
                  alt={modele.nom}
                  className="w-full h-auto object-contain rounded-3xl"
                />
              ) : (
                <div className="text-center py-20">
                  <Shirt className="w-24 h-24 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-400">Image non disponible</p>
                </div>
              )}
            </div>
            <button
              onClick={toggleFavori}
              className="absolute top-4 right-4 bg-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200"
            >
              <Heart className={`w-6 h-6 transition-colors ${estFavori ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
          </div>

          {/* Infos */}
          <div className="flex flex-col justify-between">
            <div>
              {modele.categorie && (
                <span className="inline-block bg-or/20 text-or text-sm font-semibold px-3 py-1 rounded-full mb-3">
                  {modele.categorie.libelle}
                </span>
              )}
              <h1 className="font-titre text-4xl font-bold text-nuit mb-4">
                {modele.nom}
              </h1>

              <div className="flex items-center gap-6 mb-8">
                <div>
                  <p className="text-gray-400 text-sm">Prix</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-or font-bold text-3xl">
                      {prixAffiche.toLocaleString('fr-FR')} FCFA
                    </p>
                    {promoResultat && (
                      <p className="text-gray-400 line-through text-lg">
                        {Number(modele.prix).toLocaleString('fr-FR')} FCFA
                      </p>
                    )}
                  </div>
                  {promoResultat && (
                    <p className="text-green-600 text-sm font-semibold mt-0.5">
                      − {Number(promoResultat.remise).toLocaleString('fr-FR')} FCFA de remise
                    </p>
                  )}
                </div>
                <div className="w-px h-12 bg-gray-200"></div>
                <div>
                  <p className="text-gray-400 text-sm">Délai de confection</p>
                  <p className="text-nuit font-bold text-2xl">{modele.delai} jours</p>
                </div>
              </div>

              {modele.materiaux && modele.materiaux.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-semibold text-nuit mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Matériaux utilisés
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {modele.materiaux.map((m, i) => (
                      <span key={i} className="bg-white border border-gray-200 text-gray-600 text-sm px-3 py-1.5 rounded-lg">
                        {m.nom_materiau} — {m.quantite_necessaire} {m.unite}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 mb-6 space-y-3">
                {[
                  'Confection sur mesure selon vos mensurations',
                  'Matériaux de qualité sélectionnés avec soin',
                  'Livraison à domicile disponible',
                  'Retouches incluses si nécessaire',
                ].map((item, i) => (
                  <p key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </p>
                ))}
              </div>

              {/* Code promo */}
              {!succes && (
                <div className="mb-6">
                  {promoResultat ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-green-700 font-semibold text-sm">
                            Code <span className="font-mono">{promoResultat.code}</span> appliqué
                          </p>
                          <p className="text-green-600 text-xs">
                            {promoResultat.type_remise === 'POURCENTAGE'
                              ? `−${promoResultat.valeur}%`
                              : `−${Number(promoResultat.valeur).toLocaleString('fr-FR')} FCFA`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={retirerPromo}
                        className="text-gray-400 hover:text-red-500 text-sm underline"
                      >
                        Retirer
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Code promo
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={codeInput}
                          onChange={e => { setCodeInput(e.target.value); setPromoErreur('') }}
                          onKeyDown={e => e.key === 'Enter' && appliquerPromo()}
                          placeholder="Ex : SEWPROMO10"
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or font-mono uppercase"
                        />
                        <button
                          onClick={appliquerPromo}
                          disabled={promoChargement || !codeInput.trim()}
                          className="px-4 py-2.5 bg-nuit text-white rounded-xl text-sm font-medium hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
                        >
                          {promoChargement ? '…' : 'Appliquer'}
                        </button>
                      </div>
                      {promoErreur && (
                        <p className="text-red-500 text-xs mt-1.5">{promoErreur}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div>
              {succes ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="font-titre text-xl font-bold text-green-700 mb-1">Commande passée !</h3>
                  <p className="text-green-600 text-sm mb-4">
                    Votre commande a été enregistrée avec succès.
                  </p>
                  <Link
                    to="/mes-commandes"
                    className="inline-block bg-nuit text-white px-6 py-2.5 rounded-xl hover:bg-or hover:text-nuit transition-colors font-medium"
                  >
                    Voir mes commandes →
                  </Link>
                </div>
              ) : (
                <>
                  {erreur && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                      {erreur}
                    </div>
                  )}
                  <button
                    onClick={ouvrirCommande}
                    disabled={commande}
                    className="w-full flex items-center justify-center gap-2 bg-nuit text-white py-4 rounded-xl font-semibold text-lg hover:bg-or hover:text-nuit transition-colors duration-300 disabled:opacity-50 mb-3"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {commande ? 'Commande en cours...' : 'Commander ce modèle'}
                  </button>
                  <p className="text-center text-gray-400 text-sm">
                    {user
                      ? 'Votre commande sera en statut "En attente" jusqu\'à confirmation'
                      : 'Vous devez être connecté pour commander'}
                  </p>

                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-gray-400 text-xs">ou</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {devisSucces ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-blue-700 font-semibold text-sm flex items-center justify-center gap-1.5">
                        <ClipboardList className="w-4 h-4" /> Demande de devis envoyée !
                      </p>
                      <p className="text-blue-600 text-xs mt-1">Le couturier vous répondra sous peu.</p>
                      <Link to="/mes-devis" className="inline-block mt-2 text-or text-sm font-medium hover:underline">
                        Voir mes devis →
                      </Link>
                    </div>
                  ) : demandeDevis ? (
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <p className="text-sm font-semibold text-nuit mb-2">Demande de devis personnalisé</p>
                      <textarea
                        value={notesDevis}
                        onChange={e => setNotesDevis(e.target.value)}
                        placeholder="Décrivez vos besoins spécifiques, modifications souhaitées, occasions particulières…"
                        rows={3}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-or mb-3"
                      />
                      {devisErreur && <p className="text-red-500 text-xs mb-2">{devisErreur}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={soumettreDevis}
                          disabled={devisEnvoi}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-nuit text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          {devisEnvoi ? 'Envoi…' : 'Envoyer la demande'}
                        </button>
                        <button
                          onClick={() => setDemandeDevis(false)}
                          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDemandeDevis(true)}
                      className="w-full flex items-center justify-center gap-2 border-2 border-nuit text-nuit py-3 rounded-xl font-semibold text-sm hover:bg-nuit hover:text-white transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Demander un devis personnalisé
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Modal adresse de livraison */}
    {modalAdresse && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-or" />
              <p className="font-titre text-lg font-bold text-nuit">Adresse de livraison</p>
            </div>
            <button onClick={() => setModalAdresse(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-gray-500 text-sm">Où souhaitez-vous être livré ?</p>
            <textarea
              value={adresse}
              onChange={e => setAdresse(e.target.value)}
              placeholder="Ex : Cocody Riviera 3, en face du carrefour Shell, immeuble bleu, porte 4B — Abidjan"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-or"
            />
            {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
            <button
              onClick={confirmerCommande}
              disabled={commande}
              className="w-full bg-nuit text-white py-3.5 rounded-xl font-bold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
            >
              {commande ? 'Envoi en cours…' : 'Confirmer la commande'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default ModeleDetail
