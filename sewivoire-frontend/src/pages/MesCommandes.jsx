import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle, XCircle, Scissors, Package, Star, Ruler, ClipboardList, Shirt, Trash2, CreditCard, Smartphone, Banknote, Loader2, X, MapPin, Truck } from 'lucide-react'
import API from '../api/axios'
import Navigation from '../components/Navigation'

const statutConfig = {
  EN_ATTENTE: { label: 'En attente', couleur: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  CONFIRMEE:  { label: 'Confirmée',  couleur: 'bg-blue-100 text-blue-700',    Icon: CheckCircle },
  EN_COURS:   { label: 'En cours',   couleur: 'bg-purple-100 text-purple-700', Icon: Scissors },
  LIVREE:     { label: 'Livrée',     couleur: 'bg-green-100 text-green-700',  Icon: Package },
  ANNULEE:    { label: 'Annulée',    couleur: 'bg-red-100 text-red-700',      Icon: XCircle },
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

function Etoiles({ note, onChange, readonly = false }) {
  const [survol, setSurvol] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange && onChange(n)}
          onMouseEnter={() => !readonly && setSurvol(n)}
          onMouseLeave={() => !readonly && setSurvol(0)}
          className={`transition-transform ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star className={`w-6 h-6 ${n <= (survol || note) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  )
}

function FormulaireAvis({ commandeId, onAvisSoumis }) {
  const [note, setNote]               = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [envoi, setEnvoi]             = useState(false)
  const [erreur, setErreur]           = useState('')

  const soumettre = async (e) => {
    e.preventDefault()
    if (note === 0) { setErreur('Veuillez choisir une note.'); return }
    setEnvoi(true)
    setErreur('')
    try {
      const res = await API.post('/api/avis/', { commande: commandeId, note, commentaire })
      onAvisSoumis(res.data)
    } catch (err) {
      const msg = err.response?.data?.commande?.[0]
        || err.response?.data?.note?.[0]
        || 'Une erreur est survenue.'
      setErreur(msg)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form onSubmit={soumettre} className="mt-5 border-t border-gray-100 pt-5">
      <p className="text-sm font-semibold text-nuit mb-3">Donnez votre avis sur cette commande</p>
      <div className="mb-3">
        <Etoiles note={note} onChange={setNote} />
      </div>
      <textarea
        value={commentaire}
        onChange={e => setCommentaire(e.target.value)}
        placeholder="Partagez votre expérience (optionnel)..."
        rows={3}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-or"
      />
      {erreur && <p className="text-red-500 text-xs mt-1">{erreur}</p>}
      <button
        type="submit"
        disabled={envoi || note === 0}
        className="mt-3 bg-nuit text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-or hover:text-nuit transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {envoi ? 'Envoi…' : 'Publier mon avis'}
      </button>
    </form>
  )
}

function AvisExistant({ avis }) {
  return (
    <div className="mt-5 border-t border-gray-100 pt-5">
      <p className="text-sm font-semibold text-nuit mb-2">Votre avis</p>
      <Etoiles note={avis.note} readonly />
      {avis.commentaire && (
        <p className="text-gray-600 text-sm mt-2 italic">"{avis.commentaire}"</p>
      )}
      <p className="text-gray-400 text-xs mt-1">
        Publié le {new Date(avis.date_creation).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </p>
    </div>
  )
}

const METHODES = [
  { id: 'MOBILE_MONEY', label: 'Mobile Money', sous: ['Orange Money', 'MTN MoMo', 'Wave'], Icon: Smartphone },
  { id: 'CARTE',        label: 'Carte bancaire', sous: [],                                  Icon: CreditCard },
  { id: 'ESPECES',      label: 'Espèces (en boutique)', sous: [],                           Icon: Banknote },
]

function genRef() {
  return 'SIV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
}

function ModalPaiement({ commande, onFermer, onPaiementOk }) {
  const prix      = Number(commande.modele_prix)
  const remise    = Number(commande.remise_appliquee || 0)
  const prixFinal = prix - remise
  const deja      = Number(commande.total_paye)
  const reste     = prixFinal - deja

  // etapes : mode → methode → details → traitement → succes
  const [etape, setEtape]           = useState('mode')
  const [mode, setMode]             = useState(null)      // 'total' | 'avance'
  const [methode, setMethode]       = useState(null)
  const [sous, setSous]             = useState('')
  const [montant, setMontant]       = useState(reste)
  const [telephone, setTelephone]   = useState('')
  const [carte, setCarte]           = useState({ numero: '', expiry: '', cvv: '' })
  const [erreur, setErreur]         = useState('')
  const [ref, setRef]               = useState('')
  const [acomptePct, setAcomptePct] = useState(50)

  useEffect(() => {
    API.get('/api/parametres/').then(r => setAcomptePct(r.data.acompte_pourcentage)).catch(() => {})
  }, [])

  const montantMinAvance = Math.ceil(reste * acomptePct / 100)

  const choisirMode = (m) => {
    setMode(m)
    setMontant(m === 'total' ? reste : montantMinAvance)
    setEtape('methode')
  }

  const choisirMethode = (m) => {
    setMethode(m)
    setSous(m.sous[0] || '')
    setEtape('details')
  }

  const validerPaiement = async () => {
    if (!montant || montant <= 0 || montant > reste) {
      setErreur(`Montant invalide. Maximum : ${reste.toLocaleString('fr-FR')} FCFA`)
      return
    }
    if (mode === 'avance' && montant >= reste) {
      setErreur(`Pour payer en totalité, choisissez l'option "Tout payer".`)
      return
    }
    if (mode === 'avance' && montant < montantMinAvance) {
      setErreur(`L'acompte minimum est de ${montantMinAvance.toLocaleString('fr-FR')} FCFA (${acomptePct}% du reste).`)
      return
    }
    if (methode.id === 'MOBILE_MONEY' && telephone.replace(/\s/g, '').length < 8) {
      setErreur('Numéro de téléphone invalide.')
      return
    }
    if (methode.id === 'CARTE') {
      if (carte.numero.replace(/\s/g, '').length < 16) { setErreur('Numéro de carte invalide.'); return }
      if (!carte.expiry.match(/^\d{2}\/\d{2}$/))       { setErreur("Date d'expiration invalide (MM/AA)."); return }
      if (carte.cvv.length < 3)                         { setErreur('CVV invalide.'); return }
    }
    setErreur('')
    setEtape('traitement')
    await new Promise(r => setTimeout(r, 2500))
    try {
      const type      = mode === 'total' ? 'TOTAL' : deja === 0 ? 'ACOMPTE' : 'SOLDE'
      const reference = genRef()
      await API.post('/api/paiements/', {
        commande: commande.id_commande,
        montant,
        type,
        methode: methode.id,
        reference,
      })
      setRef(reference)
      setEtape('succes')
      onPaiementOk(commande.id_commande, montant)
    } catch (err) {
      setErreur(err.response?.data?.montant?.[0] || 'Une erreur est survenue.')
      setEtape('details')
    }
  }

  const formatCarte  = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length >= 3 ? d.slice(0, 2) + '/' + d.slice(2) : d
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">

        {/* En-tête */}
        {etape !== 'succes' && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div>
              <p className="font-titre text-lg font-bold text-nuit">Paiement</p>
              <p className="text-gray-400 text-sm">{commande.modele_nom} — commande #{commande.id_commande}</p>
            </div>
            <button onClick={onFermer} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="px-6 py-5">

          {/* Résumé montants */}
          {etape !== 'succes' && etape !== 'traitement' && (
            <div className="bg-ivoire rounded-xl p-4 mb-5 flex justify-between text-sm">
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-0.5">Prix total</p>
                <p className="font-bold text-nuit">{prixFinal.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-0.5">Déjà payé</p>
                <p className="font-bold text-green-600">{deja.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-0.5">Reste à payer</p>
                <p className="font-bold text-or text-base">{reste.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          )}

          {/* ── Étape 1 : Choix du mode ── */}
          {etape === 'mode' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-nuit mb-4">Comment souhaitez-vous payer ?</p>
              <button
                onClick={() => choisirMode('total')}
                className="w-full flex items-start gap-4 p-5 border-2 border-gray-100 rounded-xl hover:border-or hover:bg-yellow-50 transition-all text-left"
              >
                <div className="w-10 h-10 bg-nuit rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-or" />
                </div>
                <div>
                  <p className="font-bold text-nuit">Tout payer maintenant</p>
                  <p className="text-gray-400 text-sm mt-0.5">
                    Réglez la totalité : <span className="text-or font-bold">{reste.toLocaleString('fr-FR')} FCFA</span>
                  </p>
                </div>
              </button>
              <button
                onClick={() => choisirMode('avance')}
                className="w-full flex items-start gap-4 p-5 border-2 border-gray-100 rounded-xl hover:border-or hover:bg-yellow-50 transition-all text-left"
              >
                <div className="w-10 h-10 bg-nuit rounded-xl flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-5 h-5 text-or" />
                </div>
                <div>
                  <p className="font-bold text-nuit">Payer une avance</p>
                  <p className="text-gray-400 text-sm mt-0.5">
                    Versez au minimum <span className="text-or font-semibold">{montantMinAvance.toLocaleString('fr-FR')} FCFA ({acomptePct}%)</span> maintenant, le reste à la livraison.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ── Étape 2 : Choix méthode ── */}
          {etape === 'methode' && (
            <div className="space-y-3">
              <button onClick={() => setEtape('mode')} className="text-sm text-or hover:underline">← Retour</button>
              <p className="text-sm font-semibold text-nuit mb-2">Choisissez votre mode de paiement</p>
              {METHODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => choisirMethode(m)}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl hover:border-or hover:bg-yellow-50 transition-all text-left"
                >
                  <div className="w-10 h-10 bg-nuit rounded-xl flex items-center justify-center flex-shrink-0">
                    <m.Icon className="w-5 h-5 text-or" />
                  </div>
                  <div>
                    <p className="font-semibold text-nuit text-sm">{m.label}</p>
                    {m.sous.length > 0 && <p className="text-gray-400 text-xs">{m.sous.join(' · ')}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Étape 3 : Détails ── */}
          {etape === 'details' && (
            <div className="space-y-4">
              <button onClick={() => setEtape('methode')} className="text-sm text-or hover:underline">← Changer de méthode</button>

              {/* Montant */}
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Montant à payer (FCFA)</label>
                <input
                  type="number"
                  value={montant}
                  onChange={e => setMontant(Number(e.target.value))}
                  max={mode === 'total' ? reste : reste - 1}
                  min={mode === 'total' ? reste : montantMinAvance}
                  readOnly={mode === 'total'}
                  className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or text-lg font-bold ${mode === 'total' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                />
                {mode === 'total'
                  ? <p className="text-green-600 text-xs mt-1">Paiement complet — montant fixe.</p>
                  : <p className="text-gray-400 text-xs mt-1">Minimum : {montantMinAvance.toLocaleString('fr-FR')} FCFA ({acomptePct}%) — Maximum : {(reste - 1).toLocaleString('fr-FR')} FCFA</p>
                }
              </div>

              {/* Mobile Money */}
              {methode?.id === 'MOBILE_MONEY' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-nuit mb-1.5">Réseau</label>
                    <div className="flex gap-2">
                      {methode.sous.map(s => (
                        <button
                          key={s}
                          onClick={() => setSous(s)}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${sous === s ? 'border-or bg-yellow-50 text-nuit' : 'border-gray-200 text-gray-500'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nuit mb-1.5">Numéro de téléphone</label>
                    <input
                      type="tel"
                      value={telephone}
                      onChange={e => setTelephone(e.target.value)}
                      placeholder="+225 07 00 00 00 00"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or"
                    />
                  </div>
                </>
              )}

              {/* Carte */}
              {methode?.id === 'CARTE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-nuit mb-1.5">Numéro de carte</label>
                    <input
                      type="text"
                      value={carte.numero}
                      onChange={e => setCarte(c => ({ ...c, numero: formatCarte(e.target.value) }))}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or font-mono tracking-widest"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-nuit mb-1.5">Date d'expiration</label>
                      <input
                        type="text"
                        value={carte.expiry}
                        onChange={e => setCarte(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                        placeholder="MM/AA"
                        maxLength={5}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nuit mb-1.5">CVV</label>
                      <input
                        type="text"
                        value={carte.cvv}
                        onChange={e => setCarte(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Espèces */}
              {methode?.id === 'ESPECES' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  Vous pouvez régler en espèces directement à notre boutique. Ce paiement sera enregistré à titre de confirmation.
                </div>
              )}

              {erreur && <p className="text-red-500 text-sm">{erreur}</p>}

              <button
                onClick={validerPaiement}
                className="w-full bg-nuit text-white py-3.5 rounded-xl font-bold text-sm hover:bg-or hover:text-nuit transition-colors mt-2"
              >
                Payer {Number(montant).toLocaleString('fr-FR')} FCFA
              </button>
            </div>
          )}

          {/* ── Étape 4 : Traitement ── */}
          {etape === 'traitement' && (
            <div className="py-10 text-center">
              <Loader2 className="w-14 h-14 mx-auto text-or animate-spin mb-5" />
              <p className="font-semibold text-nuit text-lg">Traitement en cours…</p>
              <p className="text-gray-400 text-sm mt-1">Veuillez patienter, ne fermez pas cette fenêtre.</p>
            </div>
          )}

          {/* ── Étape 5 : Succès ── */}
          {etape === 'succes' && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="font-titre text-2xl font-bold text-nuit mb-2">Paiement confirmé !</h3>
              <p className="text-gray-400 text-sm mb-1">
                {Number(montant).toLocaleString('fr-FR')} FCFA reçus via {methode?.label}{sous ? ` (${sous})` : ''}
              </p>
              {mode === 'avance' && (
                <p className="text-amber-600 text-sm font-medium mb-4">
                  Reste à payer à la livraison : {(reste - Number(montant)).toLocaleString('fr-FR')} FCFA
                </p>
              )}
              <div className="bg-gray-50 rounded-xl px-5 py-3 mb-6 text-sm">
                <p className="text-gray-400 text-xs mb-0.5">Référence de transaction</p>
                <p className="font-mono font-bold text-nuit">{ref}</p>
              </div>
              <button
                onClick={onFermer}
                className="w-full bg-nuit text-white py-3 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CarteCommande({ commande, avis, confirmerAnnulation, annulationEnCours, onDemanderAnnulation, onAnnuler, onAnnulerRetour, onSupprimer, onPayer, onAvisSoumis }) {
  const config   = statutConfig[commande.statut] || statutConfig.EN_ATTENTE
  const prixFinal = Number(commande.modele_prix) - Number(commande.remise_appliquee || 0)
  const reste     = prixFinal - Number(commande.total_paye)
  const peutPayer = ['CONFIRMEE', 'EN_COURS'].includes(commande.statut) && reste > 0

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-ivoire rounded-xl flex-shrink-0 overflow-hidden">
            {commande.modele_image
              ? <img src={commande.modele_image} alt={commande.modele_nom} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Shirt className="w-7 h-7 text-gray-400" /></div>
            }
          </div>
          <div>
            <h3 className="font-semibold text-nuit text-lg">{commande.modele_nom}</h3>
            <p className="text-gray-400 text-sm mt-0.5">
              Commande #{commande.id_commande} •{' '}
              {new Date(commande.date_commande).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
            <p className="text-or font-semibold mt-1">
              {Number(commande.total_paye).toLocaleString('fr-FR')} FCFA payés
            </p>
            {commande.couturier_nom && (
              <p className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                <Scissors className="w-3.5 h-3.5" />
                Couturier : <span className="font-medium text-gray-600 ml-0.5">{commande.couturier_nom}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${config.couleur}`}>
            <config.Icon className="w-3.5 h-3.5" /> {config.label}
          </span>
          {commande.modele_id && (
            <Link to={`/modeles/${commande.modele_id}`} className="text-or text-sm hover:underline">
              Voir le modèle →
            </Link>
          )}
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mt-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          {['En attente', 'Confirmée', 'En cours', 'Livrée'].map((etape, i) => (
            <span key={i} className={
              ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS', 'LIVREE'].indexOf(commande.statut) >= i
                ? 'text-or font-semibold' : ''
            }>
              {etape}
            </span>
          ))}
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-or rounded-full transition-all duration-500"
            style={{
              width: { EN_ATTENTE: '10%', CONFIRMEE: '35%', EN_COURS: '65%', LIVREE: '100%', ANNULEE: '0%' }[commande.statut] || '0%',
            }}
          />
        </div>
      </div>

      {/* Suivi livraison */}
      {commande.livraison_statut && commande.statut !== 'ANNULEE' && (
        <div className="mt-4 border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Livraison
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className={`flex items-center gap-1.5 font-medium ${
              commande.livraison_statut === 'LIVREE'       ? 'text-green-600' :
              commande.livraison_statut === 'EN_ROUTE'     ? 'text-blue-600'  :
              'text-gray-500'
            }`}>
              {{
                EN_PREPARATION : '🧵 En préparation',
                EN_ROUTE       : '🚚 En route',
                LIVREE         : '✅ Livrée',
              }[commande.livraison_statut] || commande.livraison_statut}
            </span>
            {commande.livraison_livreur && (
              <span className="text-gray-500">Livreur : <strong className="text-nuit">{commande.livraison_livreur}</strong></span>
            )}
          </div>
          {commande.livraison_adresse && (
            <p className="flex items-start gap-1.5 text-gray-500 text-xs">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {commande.livraison_adresse}
            </p>
          )}
          {commande.livraison_date && (
            <p className="text-xs text-gray-400">
              Date estimée : {new Date(commande.livraison_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {/* Bouton payer */}
      {peutPayer && (
        <div className="mt-4 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-nuit">Reste à payer</p>
            <p className="text-or font-bold text-lg">{reste.toLocaleString('fr-FR')} FCFA</p>
          </div>
          <button
            onClick={() => onPayer(commande)}
            className="bg-nuit text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-or hover:text-nuit transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" /> Payer
          </button>
        </div>
      )}

      {/* Bouton supprimer (commandes annulées) */}
      {commande.statut === 'ANNULEE' && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onSupprimer(commande.id_commande)}
            className="flex items-center gap-1.5 text-red-400 text-sm font-medium hover:text-red-600 transition-colors border border-red-100 hover:border-red-300 px-4 py-2 rounded-xl"
          >
            <Trash2 className="w-4 h-4" /> Supprimer
          </button>
        </div>
      )}

      {/* Bouton annulation */}
      {commande.statut === 'EN_ATTENTE' && (
        confirmerAnnulation === commande.id_commande ? (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="text-red-700 text-sm font-medium flex-1">
              Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => onAnnuler(commande.id_commande)}
                disabled={annulationEnCours}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {annulationEnCours ? 'Annulation…' : 'Confirmer'}
              </button>
              <button
                onClick={onAnnulerRetour}
                className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onDemanderAnnulation(commande.id_commande)}
              className="text-red-500 text-sm font-medium hover:text-red-700 transition-colors border border-red-200 hover:border-red-400 px-4 py-2 rounded-xl"
            >
              Annuler la commande
            </button>
          </div>
        )
      )}

      {/* Avis */}
      {commande.statut === 'LIVREE' && (
        avis
          ? <AvisExistant avis={avis} />
          : <FormulaireAvis commandeId={commande.id_commande} onAvisSoumis={onAvisSoumis} />
      )}
    </div>
  )
}

function MesCommandes() {
  const [commandes, setCommandes]                     = useState([])
  const [avisMap, setAvisMap]                         = useState({})
  const [chargement, setChargement]                   = useState(true)
  const [filtreStatut, setFiltreStatut]               = useState('tous')
  const [aMesures, setAMesures]                       = useState(true)
  const [confirmerAnnulation, setConfirmerAnnulation] = useState(null)
  const [annulationEnCours, setAnnulationEnCours]     = useState(false)
  const [pageCourante, setPageCourante]               = useState(1)
  const [commandePaiement, setCommandePaiement]       = useState(null)

  useEffect(() => {
    Promise.all([
      API.get('/api/commandes/mes_commandes/'),
      API.get('/api/avis/'),
      API.get('/api/mesures/'),
    ]).then(([resCommandes, resAvis, resMesures]) => {
      setCommandes(resCommandes.data.results || resCommandes.data)
      const map = {}
      const listeAvis = resAvis.data.results || resAvis.data
      listeAvis.forEach(a => { map[a.commande] = a })
      setAvisMap(map)
      const mesures = resMesures.data.results || resMesures.data
      setAMesures(mesures.length > 0)
    }).catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [])

  useEffect(() => {
    setPageCourante(1)
  }, [filtreStatut])

  const commandesFiltrees = filtreStatut === 'tous'
    ? commandes
    : commandes.filter(c => c.statut === filtreStatut)

  const totalPages    = Math.ceil(commandesFiltrees.length / PAR_PAGE)
  const commandesPage = commandesFiltrees.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE)

  const allerPage = (p) => {
    setPageCourante(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAvisSoumis = (nouvelAvis) => {
    setAvisMap(prev => ({ ...prev, [nouvelAvis.commande]: nouvelAvis }))
  }

  const handleAnnuler = async (id) => {
    setAnnulationEnCours(true)
    try {
      await API.post(`/api/commandes/${id}/annuler/`)
      setCommandes(prev => prev.filter(c => c.id_commande !== id))
      setConfirmerAnnulation(null)
    } catch (err) {
      console.error(err)
    } finally {
      setAnnulationEnCours(false)
    }
  }

  const handlePaiementOk = (commandeId, montant) => {
    setCommandes(prev => prev.map(c => {
      if (c.id_commande !== commandeId) return c
      return { ...c, total_paye: String(Number(c.total_paye) + montant) }
    }))
  }

  const handleSupprimer = async (id) => {
    try {
      await API.delete(`/api/commandes/${id}/`)
      setCommandes(prev => prev.filter(c => c.id_commande !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
    <div className="min-h-screen bg-ivoire">
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Navigation />
      </div>

      <div className="bg-nuit py-12 text-center">
        <h1 className="font-titre text-4xl font-bold text-white">Mes commandes</h1>
        <p className="text-gray-300 mt-2">Suivez l'état de vos commandes en temps réel</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Bannière mesures manquantes */}
        {!aMesures && commandes.some(c => c.statut === 'EN_ATTENTE') && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 mb-6">
            <Ruler className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800">Mesures requises pour confirmer votre commande</p>
              <p className="text-amber-700 text-sm mt-0.5">
                Le couturier ne pourra pas confirmer votre commande tant que vous n'avez pas renseigné vos mensurations.
              </p>
            </div>
            <Link to="/mesures" className="flex-shrink-0 bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-800 transition-colors">
              Renseigner mes mesures →
            </Link>
          </div>
        )}

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setFiltreStatut('tous')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filtreStatut === 'tous' ? 'bg-nuit text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            Toutes ({commandes.length})
          </button>
          {Object.entries(statutConfig).map(([key, val]) => {
            const count = commandes.filter(c => c.statut === key).length
            if (count === 0) return null
            return (
              <button
                key={key}
                onClick={() => setFiltreStatut(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filtreStatut === key ? 'bg-nuit text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <val.Icon className="w-3.5 h-3.5" /> {val.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Liste */}
        {chargement ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        ) : commandesFiltrees.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-20 h-20 mx-auto mb-4 text-gray-200" />
            <h3 className="font-titre text-2xl font-bold text-nuit mb-2">Aucune commande</h3>
            <p className="text-gray-400 mb-8">Vous n'avez pas encore passé de commande.</p>
            <Link to="/catalogue" className="inline-block bg-nuit text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors">
              Découvrir le catalogue
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {commandesPage.map(commande => (
                <CarteCommande
                  key={commande.id_commande}
                  commande={commande}
                  avis={avisMap[commande.id_commande]}
                  confirmerAnnulation={confirmerAnnulation}
                  annulationEnCours={annulationEnCours}
                  onDemanderAnnulation={setConfirmerAnnulation}
                  onAnnuler={handleAnnuler}
                  onAnnulerRetour={() => setConfirmerAnnulation(null)}
                  onSupprimer={handleSupprimer}
                  onPayer={setCommandePaiement}
                  onAvisSoumis={handleAvisSoumis}
                />
              ))}
            </div>
            <Pagination page={pageCourante} total={totalPages} onChanger={allerPage} />
          </>
        )}
      </div>
    </div>

    {commandePaiement && (
      <ModalPaiement
        commande={commandePaiement}
        onFermer={() => setCommandePaiement(null)}
        onPaiementOk={handlePaiementOk}
      />
    )}
    </>
  )
}

export default MesCommandes
