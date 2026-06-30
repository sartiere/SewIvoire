import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, ClipboardList, CheckCircle, XCircle, AlarmClock } from 'lucide-react'
import API from '../api/axios'
import Navigation from '../components/Navigation'
import ConfirmModal from '../components/ConfirmModal'

const statutConfig = {
  DEMANDE: { label: 'En attente', couleur: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  PROPOSE: { label: 'Devis reçu', couleur: 'bg-blue-100 text-blue-700',    Icon: ClipboardList },
  ACCEPTE: { label: 'Accepté',    couleur: 'bg-green-100 text-green-700',  Icon: CheckCircle },
  REFUSE:  { label: 'Refusé',     couleur: 'bg-red-100 text-red-700',      Icon: XCircle },
  ANNULE:  { label: 'Annulé',     couleur: 'bg-gray-100 text-gray-500',    Icon: XCircle },
}

const PAR_PAGE = 5

function Pagination({ page, total, onChanger }) {
  if (total <= 1) return null
  const debut = Math.max(1, page - 2)
  const fin   = Math.min(total, page + 2)
  const pages = []
  for (let i = debut; i <= fin; i++) pages.push(i)

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onChanger(page - 1)}
        disabled={page === 1}
        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Précédent
      </button>
      {debut > 1 && <span className="text-gray-400 text-sm px-1">…</span>}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChanger(p)}
          className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${
            p === page ? 'bg-nuit text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {p}
        </button>
      ))}
      {fin < total && <span className="text-gray-400 text-sm px-1">…</span>}
      <button
        onClick={() => onChanger(page + 1)}
        disabled={page === total}
        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Suivant →
      </button>
    </div>
  )
}

function CarteDevis({ devis, onAccepter, onRefuser, onAnnuler }) {
  const [action, setAction]       = useState(null)
  const [confirmer, setConfirmer] = useState(false)
  const [confirm, setConfirm]     = useState(null)
  const cfg = statutConfig[devis.statut] || statutConfig.DEMANDE
  const { Icon } = cfg

  const handleAccepter = async () => {
    setAction('accepter')
    try { await onAccepter(devis.id_devis); setConfirm(null) }
    finally { setAction(null) }
  }

  const handleRefuser = async () => {
    setAction('refuser')
    try { await onRefuser(devis.id_devis); setConfirm(null) }
    finally { setAction(null) }
  }

  const handleAnnuler = async () => {
    setAction('annuler')
    try { await onAnnuler(devis.id_devis) }
    finally { setAction(null); setConfirmer(false) }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-ivoire rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            {devis.modele_image
              ? <img src={devis.modele_image} alt={devis.modele_nom} className="w-full h-full object-cover" />
              : <ClipboardList className="w-7 h-7 text-gray-400" />
            }
          </div>
          <div>
            <h3 className="font-semibold text-nuit text-lg">{devis.modele_nom}</h3>
            <p className="text-gray-400 text-sm mt-0.5">
              Devis #{devis.id_devis} · {new Date(devis.date_creation).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
            <p className="text-gray-500 text-sm mt-0.5">
              Prix de base : <span className="font-medium text-nuit">{Number(devis.modele_prix).toLocaleString('fr-FR')} FCFA</span>
            </p>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold self-start flex-shrink-0 ${cfg.couleur}`}>
          <Icon className="w-3.5 h-3.5" /> {cfg.label}
        </span>
      </div>

      {/* Proposition du couturier */}
      {devis.statut === 'PROPOSE' && (
        <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-blue-800 font-semibold text-sm mb-3">Proposition du couturier</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400 mb-0.5">Prix proposé</p>
              <p className="text-or font-bold text-xl">{Number(devis.prix_propose).toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400 mb-0.5">Délai</p>
              <p className="text-nuit font-bold text-xl">{devis.delai_propose} jours</p>
            </div>
          </div>
          {devis.commentaire_couturier && (
            <p className="text-blue-700 text-sm italic mb-3">"{devis.commentaire_couturier}"</p>
          )}
          {devis.date_expiration && (
            <p className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
              <AlarmClock className="w-3.5 h-3.5" />
              Offre valable jusqu'au {new Date(devis.date_expiration).toLocaleDateString('fr-FR')}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setConfirm({
                titre: 'Accepter et commander ?',
                message: `Une commande de ${Number(devis.prix_propose).toLocaleString('fr-FR')} FCFA sera créée et envoyée à l'atelier.`,
                confirmLabel: 'Accepter et commander',
                onConfirm: handleAccepter,
              })}
              disabled={action !== null}
              className="flex-1 bg-nuit text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
            >
              {action === 'accepter' ? 'Traitement…' : 'Accepter et commander'}
            </button>
            <button
              onClick={() => setConfirm({
                titre: 'Refuser cette proposition ?',
                message: 'La proposition du couturier sera refusée. Cette action est irréversible.',
                confirmLabel: 'Refuser',
                danger: true,
                onConfirm: handleRefuser,
              })}
              disabled={action !== null}
              className="flex-1 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {action === 'refuser' ? 'Traitement…' : 'Refuser'}
            </button>
          </div>
        </div>
      )}

      {/* Commande créée */}
      {devis.statut === 'ACCEPTE' && devis.commande_id && (
        <div className="mt-4 flex items-center justify-between bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-green-700 text-sm font-medium flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> Commande #{devis.commande_id} créée avec succès
          </p>
          <Link to="/mes-commandes" className="text-or text-sm font-semibold hover:underline">
            Voir la commande →
          </Link>
        </div>
      )}

      {/* Bouton annulation */}
      {devis.statut === 'DEMANDE' && (
        <div className="mt-4">
          {confirmer ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <p className="text-red-700 text-sm font-medium flex-1">
                Annuler cette demande de devis ? Cette action est irréversible.
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleAnnuler}
                  disabled={action !== null}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {action === 'annuler' ? 'Annulation…' : 'Confirmer'}
                </button>
                <button
                  onClick={() => setConfirmer(false)}
                  className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Retour
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => setConfirmer(true)}
                className="text-red-500 text-sm font-medium hover:text-red-700 transition-colors border border-red-200 hover:border-red-400 px-4 py-2 rounded-xl"
              >
                Annuler la demande
              </button>
            </div>
          )}
        </div>
      )}

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

function MesDevis() {
  const [devis, setDevis]               = useState([])
  const [chargement, setChargement]     = useState(true)
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [pageCourante, setPageCourante] = useState(1)

  useEffect(() => {
    API.get('/api/devis/')
      .then(res => setDevis(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [])

  useEffect(() => {
    setPageCourante(1)
  }, [filtreStatut])

  const handleAccepter = async (id) => {
    const res = await API.post(`/api/devis/${id}/accepter/`)
    setDevis(prev => prev.map(d => d.id_devis === id ? { ...d, statut: 'ACCEPTE', commande_id: res.data.commande_id } : d))
  }

  const handleRefuser = async (id) => {
    await API.post(`/api/devis/${id}/refuser/`)
    setDevis(prev => prev.map(d => d.id_devis === id ? { ...d, statut: 'REFUSE' } : d))
  }

  const handleAnnuler = async (id) => {
    await API.post(`/api/devis/${id}/annuler/`)
    setDevis(prev => prev.filter(d => d.id_devis !== id))
  }

  const devisFiltres = filtreStatut === 'tous' ? devis : devis.filter(d => d.statut === filtreStatut)
  const nbPropose    = devis.filter(d => d.statut === 'PROPOSE').length
  const totalPages   = Math.ceil(devisFiltres.length / PAR_PAGE)
  const devisPage    = devisFiltres.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE)

  const allerPage = (p) => {
    setPageCourante(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-ivoire">
      <div className="max-w-5xl mx-auto px-4 pt-4"><Navigation /></div>

      <div className="bg-nuit py-12 text-center">
        <h1 className="font-titre text-4xl font-bold text-white">Mes devis</h1>
        <p className="text-gray-300 mt-2">Gérez vos demandes de devis personnalisés</p>
        {nbPropose > 0 && (
          <span className="inline-block mt-3 bg-or text-nuit text-sm font-bold px-4 py-1.5 rounded-full">
            {nbPropose} devis en attente de réponse
          </span>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setFiltreStatut('tous')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filtreStatut === 'tous' ? 'bg-nuit text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            Tous ({devis.length})
          </button>
          {Object.entries(statutConfig).map(([key, val]) => {
            const count = devis.filter(d => d.statut === key).length
            if (count === 0) return null
            return (
              <button
                key={key}
                onClick={() => setFiltreStatut(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${filtreStatut === key ? 'bg-nuit text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                <val.Icon className="w-3.5 h-3.5" /> {val.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Liste */}
        {chargement ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />)}
          </div>
        ) : devisFiltres.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-20 h-20 mx-auto mb-4 text-gray-200" />
            <h3 className="font-titre text-2xl font-bold text-nuit mb-2">Aucun devis</h3>
            <p className="text-gray-400 mb-8">Vous n'avez pas encore demandé de devis.</p>
            <Link to="/catalogue" className="inline-block bg-nuit text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors">
              Voir le catalogue
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {devisPage.map(d => (
                <CarteDevis
                  key={d.id_devis}
                  devis={d}
                  onAccepter={handleAccepter}
                  onRefuser={handleRefuser}
                  onAnnuler={handleAnnuler}
                />
              ))}
            </div>
            <Pagination page={pageCourante} total={totalPages} onChanger={allerPage} />
          </>
        )}
      </div>
    </div>
  )
}

export default MesDevis
