import { useState, useEffect } from 'react'
import { Truck, MapPin, User, CheckCircle, Clock, Banknote, Search, Phone, MessageCircle } from 'lucide-react'
import API from '../api/axios'
import ConfirmModal from '../components/ConfirmModal'

const STATUT = {
  EN_PREPARATION: { label: 'En préparation', cls: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  EN_ROUTE:       { label: 'En route',       cls: 'bg-blue-100 text-blue-700',     Icon: Truck },
  LIVREE:         { label: 'Livrée',         cls: 'bg-green-100 text-green-700',   Icon: CheckCircle },
}

const FILTRES = [
  { key: 'TOUTES',         label: 'Toutes' },
  { key: 'EN_PREPARATION', label: 'En préparation' },
  { key: 'EN_ROUTE',       label: 'En route' },
  { key: 'LIVREE',         label: 'Livrées' },
]

function MesLivraisons() {
  const [livraisons, setLivraisons] = useState([])
  const [chargement, setChargement] = useState(true)
  const [action, setAction] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('TOUTES')

  useEffect(() => {
    API.get('/api/livraisons/')
      .then(res => setLivraisons(res.data.results || res.data))
      .catch(() => {})
      .finally(() => setChargement(false))
  }, [])

  const changerStatut = async (id, statut) => {
    setAction(id)
    try {
      await API.post(`/api/livraisons/${id}/changer_status/`, { status: statut })
      setLivraisons(prev => prev.map(l => l.id_livraison === id ? { ...l, status_livraison: statut } : l))
      setConfirm(null)
    } catch (err) { console.error(err) } finally { setAction(null) }
  }

  const demanderLivrer = (liv) => {
    const reste = Number(liv.reste_a_payer)
    setConfirm({
      titre: reste > 0 ? `Encaisser ${reste.toLocaleString('fr-FR')} FCFA ?` : 'Confirmer la livraison ?',
      message: reste > 0
        ? `Avant de remettre le colis à ${liv.client_nom}, assurez-vous d'avoir bien encaissé le solde de ${reste.toLocaleString('fr-FR')} FCFA.`
        : `Le colis est déjà soldé. Confirmez la livraison à ${liv.client_nom} ?`,
      confirmLabel: 'Marquer livrée',
      danger: reste > 0,
      onConfirm: () => changerStatut(liv.id_livraison, 'LIVREE'),
    })
  }

  // Filtrage : statut + recherche, puis non-livrées en premier
  const texte = recherche.trim().toLowerCase()
  const filtrees = livraisons
    .filter(l => filtreStatut === 'TOUTES' || l.status_livraison === filtreStatut)
    .filter(l => !texte
      || (l.client_nom || '').toLowerCase().includes(texte)
      || (l.modele_nom || '').toLowerCase().includes(texte)
      || String(l.commande_ref).includes(texte))
    .sort((a, b) => (a.status_livraison === 'LIVREE' ? 1 : 0) - (b.status_livraison === 'LIVREE' ? 1 : 0))

  const compte = (key) => key === 'TOUTES' ? livraisons.length : livraisons.filter(l => l.status_livraison === key).length
  const enCours = livraisons.filter(l => l.status_livraison !== 'LIVREE').length

  return (
    <div className="min-h-screen bg-ivoire">
      <div className="bg-nuit py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-titre text-3xl font-bold text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-or" /> Mes livraisons
          </h1>
          <p className="text-gray-300 mt-1">{enCours} livraison{enCours > 1 ? 's' : ''} à effectuer</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Barre de filtres */}
        <div className="mb-6 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher un client, un modèle…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-or"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTRES.map(f => (
              <button
                key={f.key}
                onClick={() => setFiltreStatut(f.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filtreStatut === f.key
                    ? 'bg-nuit text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {f.label} ({compte(f.key)})
              </button>
            ))}
          </div>
        </div>

        {/* Grille (trombinoscope) */}
        {chargement ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-56 animate-pulse" />)}
          </div>
        ) : filtrees.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl">
            <Truck className="w-20 h-20 mx-auto mb-4 text-gray-200" />
            <h3 className="font-titre text-2xl font-bold text-nuit mb-2">Aucune livraison</h3>
            <p className="text-gray-400">
              {livraisons.length === 0
                ? "Aucune livraison ne vous est assignée pour le moment."
                : "Aucune livraison ne correspond à ce filtre."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrees.map(liv => {
              const cfg = STATUT[liv.status_livraison] || STATUT.EN_PREPARATION
              const reste = Number(liv.reste_a_payer)
              const enAction = action === liv.id_livraison
              return (
                <div key={liv.id_livraison} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col">
                  {/* Client + statut */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-or/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-or" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-nuit truncate">{liv.client_nom}</p>
                        <p className="text-gray-400 text-xs truncate">#{liv.commande_ref} · {liv.modele_nom}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${cfg.cls}`}>
                      <cfg.Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>

                  {/* Adresse */}
                  <p className="flex items-start gap-1.5 text-gray-500 text-xs mb-3">
                    <MapPin className="w-3.5 h-3.5 text-or mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{liv.adresse_client}</span>
                  </p>

                  {/* Contact client */}
                  {liv.client_telephone && (
                    <div className="mb-3">
                      <p className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
                        <Phone className="w-3.5 h-3.5 text-or flex-shrink-0" /> {liv.client_telephone}
                      </p>
                      <div className="flex gap-2">
                        <a
                          href={`tel:${liv.client_telephone}`}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-nuit/5 hover:bg-nuit/10 text-nuit py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" /> Appeler
                        </a>
                        <a
                          href={`https://wa.me/${liv.client_telephone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Solde à encaisser */}
                  {reste > 0 ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 mb-3 flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="text-red-700 leading-tight">
                        <span className="font-bold text-sm">{reste.toLocaleString('fr-FR')} FCFA</span>
                        <span className="block text-red-600 text-[11px]">à encaisser avant remise</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 mb-3 flex items-center gap-1.5 text-xs text-green-700 font-medium">
                      <CheckCircle className="w-4 h-4" /> Déjà payé
                    </div>
                  )}

                  {/* Actions (en bas de carte) */}
                  <div className="mt-auto">
                    {liv.status_livraison === 'LIVREE' ? (
                      <p className="text-center text-xs text-gray-400 py-1.5">Livraison terminée ✓</p>
                    ) : liv.status_livraison === 'EN_PREPARATION' ? (
                      <button
                        onClick={() => changerStatut(liv.id_livraison, 'EN_ROUTE')}
                        disabled={enAction}
                        className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        Partir en livraison
                      </button>
                    ) : (
                      <button
                        onClick={() => demanderLivrer(liv)}
                        disabled={enAction}
                        className="w-full bg-nuit text-white py-2 rounded-xl text-sm font-semibold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" /> Marquer livrée
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        titre={confirm?.titre}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        loading={action !== null}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

export default MesLivraisons
