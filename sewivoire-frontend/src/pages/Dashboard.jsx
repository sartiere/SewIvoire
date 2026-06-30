import { useState, useEffect, useCallback } from 'react'
import {
  Scissors, Shirt, ClipboardList, FileText, Layers, Package, CreditCard, Ruler, BarChart2,
  AlertTriangle, CheckCircle, XCircle, Clock, Download, Printer, Send, Award,
  Calendar, TrendingUp, User, Inbox, DollarSign, Settings, Truck, Store, MapPin, ChevronDown, Search,
} from 'lucide-react'
import API, { fetchAll } from '../api/axios'
import ConfirmModal from '../components/ConfirmModal'
import ModelesOnglet from '../components/ModelesOnglet'
import StocksOnglet from '../components/StocksOnglet'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

async function telechargerFichier(url, nomFichier) {
  const res = await API.get(url, { responseType: 'blob' })
  const blob = new Blob([res.data], { type: res.headers['content-type'] })
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(blob)
  lien.download = nomFichier
  lien.click()
  URL.revokeObjectURL(lien.href)
}

const TYPE_PAIEMENT = {
  ACOMPTE: { label: 'Acompte', cls: 'bg-yellow-100 text-yellow-700' },
  SOLDE:   { label: 'Solde',   cls: 'bg-blue-100 text-blue-700' },
  TOTAL:   { label: 'Total',   cls: 'bg-green-100 text-green-700' },
}
const METHODE_LABEL = { ESPECES: 'Espèces', MOBILE_MONEY: 'Mobile Money', CARTE: 'Carte' }

function PaiementsOnglet() {
  const [paiements, setPaiements] = useState([])
  const [chargement, setChargement] = useState(true)
  const [confirmation, setConfirmation] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreMethode, setFiltreMethode] = useState('')
  const [page, setPage] = useState(1)
  const PAR_PAGE = 20

  useEffect(() => {
    fetchAll('/api/paiements/')
      .then(setPaiements)
      .catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [])

  useEffect(() => { setPage(1) }, [recherche, filtreStatut, filtreMethode])

  const confirmer = async (id) => {
    setConfirmation(id)
    try {
      await API.post(`/api/paiements/${id}/confirmer/`, {})
      setPaiements(prev => prev.map(p => p.id_paiement === id ? { ...p, statut: 'CONFIRME' } : p))
    } catch (err) { console.error(err) } finally { setConfirmation(null) }
  }

  const total     = paiements.filter(p => p.statut === 'CONFIRME').reduce((s, p) => s + Number(p.montant), 0)
  const enAttente = paiements.filter(p => p.statut === 'EN_ATTENTE').length

  // Filtrage (recherche client / n° commande + statut + méthode)
  const q = recherche.trim().toLowerCase()
  const filtres = paiements.filter(p => {
    if (filtreStatut  && p.statut  !== filtreStatut)  return false
    if (filtreMethode && p.methode !== filtreMethode) return false
    if (q && !`${p.client_nom || ''} #${p.commande_ref}`.toLowerCase().includes(q)) return false
    return true
  })
  // Pagination d'affichage
  const totalPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE))
  const pageColee  = Math.min(page, totalPages)
  const visibles   = filtres.slice((pageColee - 1) * PAR_PAGE, pageColee * PAR_PAGE)

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-gray-500">
          {chargement ? 'Chargement…' : `${paiements.length} paiement${paiements.length > 1 ? 's' : ''} — Total confirmé : ${total.toLocaleString('fr-FR')} FCFA${enAttente ? ` · ${enAttente} en attente` : ''}`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => telechargerFichier('/api/paiements/export_csv/', 'paiements.csv')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => telechargerFichier('/api/paiements/export_pdf/', 'paiements.pdf')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {!chargement && paiements.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher un client ou n° de commande…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or/40"
            />
          </div>
          <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-gray-700">
            <option value="">Tous les statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="CONFIRME">Confirmé</option>
          </select>
          <select value={filtreMethode} onChange={e => setFiltreMethode(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-gray-700">
            <option value="">Toutes les méthodes</option>
            <option value="ESPECES">Espèces</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CARTE">Carte bancaire</option>
          </select>
        </div>
      )}

      {chargement ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl h-12 animate-pulse" />)}
        </div>
      ) : paiements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <CreditCard className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">Aucun paiement enregistré.</p>
        </div>
      ) : filtres.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <CreditCard className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">Aucun paiement ne correspond à ces filtres.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nuit text-white">
                <tr>
                  {['ID', 'Date', 'Commande', 'Client', 'Montant (FCFA)', 'Type', 'Méthode', 'Statut', ''].map((h, i) => (
                    <th key={i} className="px-5 py-4 text-left text-sm font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map(p => (
                  <tr key={p.id_paiement} className="hover:bg-ivoire transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-500">{p.id_paiement}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(p.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-nuit">#{p.commande_ref}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{p.client_nom}</td>
                    <td className="px-5 py-3.5 font-bold text-or whitespace-nowrap">
                      {Number(p.montant).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${(TYPE_PAIEMENT[p.type] || {}).cls || 'bg-gray-100 text-gray-600'}`}>
                        {(TYPE_PAIEMENT[p.type] || {}).label || p.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{METHODE_LABEL[p.methode] || p.methode}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${p.statut === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {p.statut === 'EN_ATTENTE' ? 'En attente' : 'Confirmé'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {p.statut === 'EN_ATTENTE' && (
                        <button
                          onClick={() => confirmer(p.id_paiement)}
                          disabled={confirmation === p.id_paiement}
                          className="bg-nuit text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
                        >
                          {confirmation === p.id_paiement ? '…' : 'Confirmer'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm">
              <span className="text-gray-500">
                {(pageColee - 1) * PAR_PAGE + 1}–{Math.min(pageColee * PAR_PAGE, filtres.length)} sur {filtres.length}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageColee <= 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Précédent
                </button>
                <span className="text-gray-600 whitespace-nowrap">Page {pageColee} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageColee >= totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DevisOnglet() {
  const [devisList, setDevisList] = useState([])
  const [chargement, setChargement] = useState(true)
  const [formulaire, setFormulaire] = useState({})
  const [envoi, setEnvoi] = useState(null)
  const [formOuvert, setFormOuvert] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    fetchAll('/api/devis/')
      .then(setDevisList)
      .catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [])

  const setChamp = (id, champ, valeur) =>
    setFormulaire(prev => ({ ...prev, [id]: { ...prev[id], [champ]: valeur } }))

  const maj = (id, data) =>
    setDevisList(prev => prev.map(d => d.id_devis === id ? { ...d, ...data } : d))

  // Proposer un prix personnalisé (DEMANDE → PROPOSE)
  const proposer = async (devis) => {
    const f = formulaire[devis.id_devis] || {}
    if (!f.prix || !f.delai) return
    setEnvoi(devis.id_devis)
    try {
      const res = await API.post(`/api/devis/${devis.id_devis}/proposer/`, {
        prix_propose: f.prix,
        delai_propose: f.delai,
        commentaire_couturier: f.commentaire || '',
        date_expiration: f.expiration || undefined,
      })
      maj(devis.id_devis, res.data)
      setFormOuvert(null)
    } catch (err) { console.error(err) } finally { setEnvoi(null) }
  }

  // Accepter = proposer au prix + délai catalogue (le client confirmera)
  const accepter = async (devis) => {
    setEnvoi(devis.id_devis)
    try {
      const res = await API.post(`/api/devis/${devis.id_devis}/proposer/`, {
        prix_propose: devis.modele_prix,
        delai_propose: devis.modele_delai || 7,
      })
      maj(devis.id_devis, res.data)
      setConfirm(null)
    } catch (err) { console.error(err) } finally { setEnvoi(null) }
  }

  // Refuser la demande (DEMANDE → REFUSE)
  const refuser = async (devis) => {
    setEnvoi(devis.id_devis)
    try {
      await API.post(`/api/devis/${devis.id_devis}/refuser/`, {})
      maj(devis.id_devis, { statut: 'REFUSE' })
      setConfirm(null)
    } catch (err) { console.error(err) } finally { setEnvoi(null) }
  }

  // Rouvrir le formulaire pré-rempli pour modifier une proposition en attente
  const ouvrirModif = (devis) => {
    setFormulaire(prev => ({
      ...prev,
      [devis.id_devis]: { prix: devis.prix_propose, delai: devis.delai_propose, commentaire: '' },
    }))
    setFormOuvert(devis.id_devis)
  }

  const statutCfg = {
    DEMANDE: { label: 'Demande reçue', cls: 'bg-yellow-100 text-yellow-700' },
    PROPOSE: { label: 'Proposé',       cls: 'bg-blue-100 text-blue-700' },
    ACCEPTE: { label: 'Accepté',       cls: 'bg-green-100 text-green-700' },
    REFUSE:  { label: 'Refusé',        cls: 'bg-red-100 text-red-700' },
    ANNULE:  { label: 'Annulé',        cls: 'bg-gray-100 text-gray-600' },
  }

  if (chargement) return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-52 animate-pulse" />)}
    </div>
  )

  const filtres = devisList.filter(d => {
    const t = recherche.trim().toLowerCase()
    const mt = !t || (d.client_nom || '').toLowerCase().includes(t) || (d.modele_nom || '').toLowerCase().includes(t)
    return mt && (!filtreStatut || d.statut === filtreStatut)
  })

  return (
    <div>
      {/* Recherche + filtre */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text" value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher (client, modèle)…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
          />
        </div>
        <select
          value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="DEMANDE">Demande reçue</option>
          <option value="PROPOSE">Proposé</option>
          <option value="ACCEPTE">Accepté</option>
          <option value="REFUSE">Refusé</option>
        </select>
      </div>

      {filtres.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <FileText className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">
            {devisList.length === 0 ? 'Aucune demande de devis.' : 'Aucun devis ne correspond à la recherche.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtres.map(devis => {
            const cfg = statutCfg[devis.statut] || statutCfg.DEMANDE
            const f = formulaire[devis.id_devis] || {}
            const ouvert = formOuvert === devis.id_devis
            const enCours = envoi === devis.id_devis
            return (
              <div key={devis.id_devis} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col">
                {/* En-tête : client + statut */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-or/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-or" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-nuit text-sm leading-tight truncate">{devis.client_nom}</p>
                      <p className="text-gray-400 text-xs">Devis #{devis.id_devis} · {new Date(devis.date_creation).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
                </div>

                {/* Modèle + prix catalogue */}
                <p className="font-medium text-nuit text-sm">{devis.modele_nom}</p>
                <p className="text-gray-500 text-xs mb-2">
                  Catalogue : <span className="font-semibold text-or">{Number(devis.modele_prix).toLocaleString('fr-FR')} FCFA</span>
                  {' · '}{devis.modele_delai} j
                </p>

                {/* Demande du client */}
                {devis.notes_client
                  ? <div className="bg-ivoire rounded-lg p-2.5 mb-3 text-xs text-gray-600 flex-1">
                      <span className="font-semibold text-nuit">Demande : </span>{devis.notes_client}
                    </div>
                  : <div className="flex-1" />}

                {/* Proposition en attente + bouton Modifier */}
                {devis.statut === 'PROPOSE' && !ouvert && (
                  <div className="text-xs text-blue-700 bg-blue-50 rounded-lg p-2.5">
                    Proposé : <strong>{Number(devis.prix_propose).toLocaleString('fr-FR')} FCFA</strong> · {devis.delai_propose} j
                    <span className="block text-blue-500 mt-0.5 mb-2">En attente de la réponse du client</span>
                    <button onClick={() => ouvrirModif(devis)} disabled={enCours} className="text-nuit font-semibold underline hover:text-or disabled:opacity-50">
                      Modifier ma proposition
                    </button>
                  </div>
                )}
                {devis.statut === 'ACCEPTE' && devis.commande_id && (
                  <div className="text-xs text-green-700 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Commande #{devis.commande_id} créée
                  </div>
                )}
                {devis.statut === 'REFUSE' && (
                  <div className="text-xs text-gray-400">Demande refusée</div>
                )}

                {/* Boutons sur une DEMANDE (hors édition) */}
                {devis.statut === 'DEMANDE' && !ouvert && (
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setConfirm({
                        titre: 'Accepter cette demande ?',
                        message: `Une proposition au prix catalogue (${Number(devis.modele_prix).toLocaleString('fr-FR')} FCFA) sera envoyée à ${devis.client_nom}. Le client devra confirmer.`,
                        confirmLabel: 'Accepter',
                        onConfirm: () => accepter(devis),
                      })} disabled={enCours}
                      className="flex items-center justify-center gap-1 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Accepter
                    </button>
                    <button
                      onClick={() => setFormOuvert(devis.id_devis)} disabled={enCours}
                      className="flex items-center justify-center gap-1 bg-nuit text-white py-2 rounded-lg text-xs font-semibold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> Proposer
                    </button>
                    <button
                      onClick={() => setConfirm({
                        titre: 'Refuser cette demande ?',
                        message: `La demande de ${devis.client_nom} sera définitivement refusée.`,
                        confirmLabel: 'Refuser',
                        danger: true,
                        onConfirm: () => refuser(devis),
                      })} disabled={enCours}
                      className="flex items-center justify-center gap-1 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Refuser
                    </button>
                  </div>
                )}

                {/* Formulaire : nouvelle proposition (DEMANDE) ou modification (PROPOSE) */}
                {ouvert && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-xs font-semibold text-gray-600">
                      {devis.statut === 'PROPOSE' ? 'Modifier la proposition' : 'Proposer un prix'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number" min="0" value={f.prix || ''}
                        onChange={e => setChamp(devis.id_devis, 'prix', e.target.value)}
                        placeholder="Prix (FCFA)"
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-or"
                      />
                      <input
                        type="number" min="1" value={f.delai || ''}
                        onChange={e => setChamp(devis.id_devis, 'delai', e.target.value)}
                        placeholder="Délai (j)"
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-or"
                      />
                    </div>
                    <input
                      type="text" value={f.commentaire || ''}
                      onChange={e => setChamp(devis.id_devis, 'commentaire', e.target.value)}
                      placeholder="Commentaire (optionnel)"
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-or"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => proposer(devis)} disabled={!f.prix || !f.delai || enCours}
                        className="flex-1 bg-nuit text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
                      >
                        {enCours ? 'Envoi…' : 'Envoyer'}
                      </button>
                      <button
                        onClick={() => setFormOuvert(null)}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        titre={confirm?.titre}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        loading={envoi !== null}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

const STATUT_LIV = {
  EN_PREPARATION: { label: 'En préparation', couleur: 'bg-yellow-100 text-yellow-700' },
  EN_ROUTE:       { label: 'En route',        couleur: 'bg-blue-100 text-blue-700'   },
  LIVREE:         { label: 'Livrée',          couleur: 'bg-green-100 text-green-700' },
}

function LivraisonsOnglet() {
  const [livraisons, setLivraisons] = useState([])
  const [livreurs, setLivreurs]     = useState([])
  const [chargement, setChargement] = useState(true)
  const [actionId, setActionId]     = useState(null)
  const [erreur, setErreur]         = useState('')

  const charger = () => {
    setChargement(true)
    Promise.all([
      fetchAll('/api/livraisons/'),
      API.get('/api/livreurs/'),
    ]).then(([allLiv, rLib]) => {
      setLivraisons(allLiv)
      setLivreurs(rLib.data.results || rLib.data)
    }).catch(() => setErreur('Impossible de charger les livraisons.'))
      .finally(() => setChargement(false))
  }

  useEffect(() => { charger() }, [])

  const changerStatut = async (id, statut) => {
    setActionId(id)
    try {
      await API.post(`/api/livraisons/${id}/changer_status/`, { status: statut })
      setLivraisons(prev => prev.map(l => l.id_livraison === id ? { ...l, status_livraison: statut } : l))
    } catch { setErreur('Erreur lors du changement de statut.') }
    finally { setActionId(null) }
  }

  const assignerLivreur = async (id, livreur_id) => {
    setActionId(id)
    try {
      await API.post(`/api/livraisons/${id}/assigner_livreur/`, { livreur_id })
      await charger()
    } catch { setErreur('Impossible d\'assigner ce livreur.') }
    finally { setActionId(null) }
  }

  if (chargement) return <div className="text-center py-12 text-gray-400">Chargement…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{livraisons.length} livraison{livraisons.length > 1 ? 's' : ''}</p>
        {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
      </div>

      {livraisons.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune livraison pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {livraisons.map(l => {
            const config = STATUT_LIV[l.status_livraison] || STATUT_LIV.EN_PREPARATION
            const enAction = actionId === l.id_livraison
            return (
              <div key={l.id_livraison} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-nuit">Commande #{l.commande_ref}</p>
                    <p className="text-gray-500 text-sm">{l.client_nom}{l.modele_nom ? ` · ${l.modele_nom}` : ''}</p>
                    <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {l.adresse_client}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${config.couleur}`}>
                    {config.label}
                  </span>
                </div>

                {l.livreur_nom && (
                  <p className="text-sm text-gray-500 mb-3">
                    Livreur assigné : <strong className="text-nuit">{l.livreur_nom}</strong>
                  </p>
                )}

                {/* Solde que le livreur devra encaisser à la remise */}
                {Number(l.reste_a_payer) > 0 ? (
                  <p className="text-sm mb-2 inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg font-medium">
                    <DollarSign className="w-4 h-4" /> Solde à encaisser à la livraison : {Number(l.reste_a_payer).toLocaleString('fr-FR')} FCFA
                  </p>
                ) : (
                  <p className="text-sm mb-2 inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-medium">
                    <CheckCircle className="w-4 h-4" /> Commande déjà soldée
                  </p>
                )}

                {l.status_livraison !== 'LIVREE' && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">

                    {/* Assigner un livreur */}
                    {livreurs.filter(lv => lv.est_disponible).length > 0 && (
                      <select
                        defaultValue=""
                        onChange={e => e.target.value && assignerLivreur(l.id_livraison, e.target.value)}
                        disabled={enAction}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-or bg-white"
                      >
                        <option value="">Assigner un livreur…</option>
                        {livreurs.filter(lv => lv.est_disponible).map(lv => (
                          <option key={lv.id_livreur} value={lv.id_livreur}>{lv.nom_livreur}</option>
                        ))}
                      </select>
                    )}

                    {/* Changer le statut */}
                    {l.status_livraison === 'EN_PREPARATION' && l.livreur_nom && (
                      <button
                        onClick={() => changerStatut(l.id_livraison, 'EN_ROUTE')}
                        disabled={enAction}
                        className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {enAction ? '…' : '🚚 Marquer En route'}
                      </button>
                    )}
                    {l.status_livraison === 'EN_ROUTE' && (
                      <button
                        onClick={() => changerStatut(l.id_livraison, 'LIVREE')}
                        disabled={enAction}
                        className="bg-green-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {enAction ? '…' : '✅ Marquer Livrée'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ParametresOnglet() {
  const [pourcentage, setPourcentage]   = useState(50)
  const [saisie, setSaisie]             = useState(50)
  const [chargement, setChargement]     = useState(true)
  const [sauvegarde, setSauvegarde]     = useState(false)
  const [succes, setSucces]             = useState(false)
  const [erreur, setErreur]             = useState('')

  useEffect(() => {
    API.get('/api/parametres/')
      .then(r => { setPourcentage(r.data.acompte_pourcentage); setSaisie(r.data.acompte_pourcentage) })
      .catch(() => setErreur('Impossible de charger les paramètres.'))
      .finally(() => setChargement(false))
  }, [])

  const enregistrer = async () => {
    const val = Number(saisie)
    if (!val || val < 1 || val > 99) { setErreur('Valeur invalide (1 à 99).'); return }
    setErreur('')
    setSauvegarde(true)
    try {
      await API.patch('/api/parametres/', { acompte_pourcentage: val })
      setPourcentage(val)
      setSucces(true)
      setTimeout(() => setSucces(false), 3000)
    } catch {
      setErreur('Erreur lors de la sauvegarde.')
    } finally {
      setSauvegarde(false)
    }
  }

  if (chargement) return <div className="text-center py-12 text-gray-400">Chargement…</div>

  return (
    <div className="max-w-lg">
      <h2 className="font-titre text-xl font-bold text-nuit mb-1">Paramètres de paiement</h2>
      <p className="text-gray-400 text-sm mb-8">
        Définissez le pourcentage minimum que le client doit verser comme acompte lorsqu'il choisit de payer en avance.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <label className="block text-sm font-semibold text-nuit mb-3">
          Acompte minimum requis
        </label>

        {/* Slider */}
        <input
          type="range"
          min={1}
          max={99}
          value={saisie}
          onChange={e => setSaisie(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-or mb-4"
        />

        <div className="flex items-center gap-3 mb-6">
          <input
            type="number"
            min={1}
            max={99}
            value={saisie}
            onChange={e => setSaisie(Number(e.target.value))}
            className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-center text-2xl font-bold text-nuit focus:outline-none focus:ring-2 focus:ring-or"
          />
          <span className="text-2xl font-bold text-gray-400">%</span>
          <span className="text-sm text-gray-400 ml-2">du montant restant</span>
        </div>

        <div className="bg-ivoire rounded-xl p-4 mb-5 text-sm text-gray-500">
          Exemple : pour une commande de <strong>50 000 FCFA</strong>, l'acompte minimum sera de{' '}
          <strong className="text-or">{Math.ceil(50000 * saisie / 100).toLocaleString('fr-FR')} FCFA</strong>.
        </div>

        {erreur && <p className="text-red-500 text-sm mb-3">{erreur}</p>}
        {succes && <p className="text-green-600 text-sm mb-3">Paramètres enregistrés avec succès.</p>}

        <button
          onClick={enregistrer}
          disabled={sauvegarde || saisie === pourcentage}
          className="bg-nuit text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-or hover:text-nuit transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sauvegarde ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

const PIE_COLORS = ['#1B2951', '#D4AF37', '#8B5CF6', '#10B981', '#EF4444']

function AnalyticsOnglet() {
  const [data, setData]             = useState(null)
  const [chargement, setChargement] = useState(true)
  const [fenetre, setFenetre]       = useState(12)

  useEffect(() => {
    setChargement(true)
    API.get('/api/commandes/analytics/', { params: { mois: fenetre } })
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [fenetre])

  if (chargement) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-12 h-12 border-4 border-or border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="text-center py-16 text-gray-400">Impossible de charger les analytics.</div>
  )

  const kpis = [
    { label: 'CA total',       valeur: data.ca_total,          Icon: DollarSign, cls: 'bg-nuit text-white' },
    { label: 'CA ce mois',     valeur: data.ca_mois_courant,   Icon: Calendar,   cls: 'bg-or/20 text-or' },
    { label: 'CA cette année', valeur: data.ca_annee_courante, Icon: TrendingUp,  cls: 'bg-green-50 text-green-700' },
  ]

  return (
    <div className="space-y-8">

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`${kpi.cls} rounded-2xl p-6 shadow-sm`}>
            <kpi.Icon className="w-7 h-7 mb-2 opacity-80" />
            <div className="text-2xl font-bold font-titre">
              {Number(kpi.valeur).toLocaleString('fr-FR')} FCFA
            </div>
            <div className="text-sm mt-1 opacity-80">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500 font-medium">Fenêtre :</span>
        {[3, 6, 12, 24].map(m => (
          <button
            key={m}
            onClick={() => setFenetre(m)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              fenetre === m ? 'bg-nuit text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-nuit'
            }`}
          >
            {m} mois
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-nuit mb-5 flex items-center gap-2">
          <BarChart2 className="w-5 h-5" /> Chiffre d'affaires par mois
        </h3>
        {data.ca_par_mois.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Aucune donnée sur cette période.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.ca_par_mois} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`${Number(v).toLocaleString('fr-FR')} FCFA`, 'CA']} />
              <Bar dataKey="total" fill="#1B2951" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-nuit mb-5 flex items-center gap-2">
            <Award className="w-5 h-5" /> Top modèles commandés
          </h3>
          {data.top_modeles.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucune donnée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                layout="vertical"
                data={data.top_modeles}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="nom"
                  tick={{ fontSize: 11 }}
                  width={90}
                  tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v}
                />
                <Tooltip formatter={v => [v, 'Commandes']} />
                <Bar dataKey="commandes" fill="#D4AF37" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-nuit mb-5 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Répartition par statut
          </h3>
          {data.par_statut.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucune donnée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.par_statut}
                  dataKey="nb"
                  nameKey="statut"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  label={({ statut, percent }) =>
                    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                  }
                >
                  {data.par_statut.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-nuit mb-5 flex items-center gap-2">
          <Package className="w-5 h-5" /> Volume de commandes par mois
        </h3>
        {data.commandes_par_mois.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Aucune donnée sur cette période.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.commandes_par_mois} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={v => [v, 'Commandes']} />
              <Bar dataKey="nb" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  )
}

const statutConfig = {
  EN_ATTENTE:  { label: 'En attente',  couleur: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  CONFIRMEE:   { label: 'Confirmée',   couleur: 'bg-blue-100 text-blue-700',     Icon: CheckCircle },
  EN_COURS:    { label: 'En cours',    couleur: 'bg-purple-100 text-purple-700', Icon: Scissors },
  LIVREE:      { label: 'Livrée',      couleur: 'bg-green-100 text-green-700',   Icon: Package },
  ANNULEE:     { label: 'Annulée',     couleur: 'bg-red-100 text-red-700',       Icon: XCircle },
}

// Modal de saisie des consommations de stock à la confirmation d'une commande.
// Les quantités réelles varient selon la taille / les mesures du client.
function ConfirmationStockModal({ commande, onClose, onConfirme }) {
  const [materiaux, setMateriaux]   = useState([])
  const [quantites, setQuantites]   = useState({})
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi]           = useState(false)
  const [erreur, setErreur]         = useState('')

  useEffect(() => {
    API.get(`/api/commandes/${commande.id_commande}/recette/`)
      .then(res => {
        const mats = res.data.materiaux || []
        setMateriaux(mats)
        const init = {}
        mats.forEach(m => { init[m.materiau] = m.quantite_conseillee })
        setQuantites(init)
      })
      .catch(() => setErreur('Impossible de charger la recette du modèle.'))
      .finally(() => setChargement(false))
  }, [commande.id_commande])

  const setQte = (id, val) => setQuantites(prev => ({ ...prev, [id]: val }))

  const valider = async () => {
    setErreur('')
    setEnvoi(true)
    const consommations = materiaux
      .map(m => ({ materiau: m.materiau, quantite: Number(quantites[m.materiau]) || 0 }))
      .filter(c => c.quantite > 0)
    try {
      await API.post(`/api/commandes/${commande.id_commande}/changer_statut/`, {
        statut: 'CONFIRMEE',
        consommations,
      })
      onConfirme(commande.id_commande)
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la confirmation.')
      setEnvoi(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-titre text-lg font-bold text-nuit">Confirmer la commande #{commande.id_commande}</h3>
            <p className="text-sm text-gray-500">{commande.modele_nom} — {commande.client}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-4 flex items-start gap-2">
            <Package className="w-4 h-4 mt-0.5 text-or flex-shrink-0" />
            Indiquez les quantités de matières réellement utilisées pour ce client (selon sa taille). Le stock sera mis à jour automatiquement.
          </p>

          {chargement ? (
            <p className="text-gray-400 text-sm py-6 text-center">Chargement de la recette…</p>
          ) : materiaux.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">Aucune matière définie pour ce modèle — vous pouvez confirmer directement.</p>
          ) : (
            <div className="space-y-3">
              {materiaux.map(m => {
                const q = Number(quantites[m.materiau]) || 0
                const stock = Number(m.stock_actuel)
                const insuffisant = q > stock
                return (
                  <div key={m.materiau} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-nuit truncate">{m.nom}</p>
                      <p className={`text-xs ${insuffisant ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                        Stock : {stock} {m.unite}{insuffisant ? ' — insuffisant !' : ''}
                      </p>
                    </div>
                    <input
                      type="number" min="0" step="0.01"
                      value={quantites[m.materiau] ?? ''}
                      onChange={e => setQte(m.materiau, e.target.value)}
                      className={`w-24 px-3 py-2 border rounded-xl text-sm text-right focus:outline-none focus:ring-2 ${insuffisant ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-or'}`}
                    />
                    <span className="text-xs text-gray-400 w-14">{m.unite}</span>
                  </div>
                )
              })}
            </div>
          )}

          {erreur && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{erreur}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={valider} disabled={envoi || chargement}
            className="flex-1 py-2.5 bg-nuit text-white rounded-xl text-sm font-semibold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50">
            {envoi ? 'Confirmation…' : 'Confirmer & déduire le stock'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [commandes, setCommandes] = useState([])
  const [materiaux, setMateriaux] = useState([])
  const [alertes, setAlertes] = useState([])
  const [mesuresClients, setMesuresClients] = useState([])
  const [chargement, setChargement] = useState(true)
  const [onglet, setOnglet] = useState('commandes')
  const [nouveauStatut, setNouveauStatut] = useState({})
  const [erreurStatut, setErreurStatut] = useState({})
  const [reponseRecours, setReponseRecours] = useState({})
  const [confirmCommande, setConfirmCommande] = useState(null)

  const [mouvements, setMouvements] = useState([])
  const [chargementMouvements, setChargementMouvements] = useState(false)
  const [filtreType, setFiltreType] = useState('')
  const [filtreMateriauId, setFiltreMateriauId] = useState('')
  const [filtreDateApres, setFiltreDateApres] = useState('')
  const [filtreDataAvant, setFiltreDateAvant] = useState('')
  const [totalMouvements, setTotalMouvements] = useState(0)
  const [pageMouvements, setPageMouvements]   = useState(1)

  // Recherche / filtres
  const [rechercheCommande, setRechercheCommande] = useState('')
  const [filtreStatutCmd, setFiltreStatutCmd] = useState('')
  const [rechercheMesure, setRechercheMesure] = useState('')
  const [mesureOuverteId, setMesureOuverteId] = useState(null)

  useEffect(() => {
    Promise.all([
      API.get('/api/commandes/stats/'),
      API.get('/api/commandes/en_cours/'),
      fetchAll('/api/materiaux/'),
      API.get('/api/materiaux/alertes_stock/'),
      fetchAll('/api/mesures/'),
    ]).then(([resStats, resCommandes, allMateriaux, resAlertes, allMesures]) => {
      setStats(resStats.data)
      setCommandes(resCommandes.data.results || resCommandes.data)
      setMateriaux(allMateriaux)
      setAlertes(resAlertes.data.results || resAlertes.data)
      setMesuresClients(allMesures)
    }).catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [])

  const fetchMouvements = useCallback(() => {
    setChargementMouvements(true)
    const params = { page: pageMouvements }
    if (filtreType)        params.type_mouvement = filtreType
    if (filtreMateriauId)  params.materiau       = filtreMateriauId
    if (filtreDateApres)   params.date_apres     = filtreDateApres
    if (filtreDataAvant)   params.date_avant     = filtreDataAvant

    API.get('/api/mouvements-stock/', { params })
      .then(res => {
        const data = res.data.results || res.data
        setMouvements(data)
        setTotalMouvements(res.data.count ?? data.length)
      })
      .catch(err => console.error(err))
      .finally(() => setChargementMouvements(false))
  }, [filtreType, filtreMateriauId, filtreDateApres, filtreDataAvant, pageMouvements])

  useEffect(() => {
    if (onglet === 'historique') fetchMouvements()
  }, [onglet, fetchMouvements])

  // Revenir à la page 1 quand un filtre change
  useEffect(() => {
    setPageMouvements(1)
  }, [filtreType, filtreMateriauId, filtreDateApres, filtreDataAvant])

  const changerStatut = async (commandeId, statut) => {
    setErreurStatut(prev => ({ ...prev, [commandeId]: '' }))
    // Confirmation : on passe d'abord par la saisie des consommations de stock.
    const cmd = commandes.find(c => c.id_commande === commandeId)
    if (statut === 'CONFIRMEE' && cmd && cmd.statut === 'EN_ATTENTE') {
      setConfirmCommande(cmd)
      return
    }
    try {
      await API.post(`/api/commandes/${commandeId}/changer_statut/`, { statut })
      setCommandes(prev => prev.map(c =>
        c.id_commande === commandeId ? { ...c, statut } : c
      ))
      setNouveauStatut(prev => ({ ...prev, [commandeId]: '' }))
      API.get('/api/commandes/stats/').then(res => setStats(res.data)).catch(() => {})
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors du changement de statut.'
      setErreurStatut(prev => ({ ...prev, [commandeId]: msg }))
    }
  }

  // Appelé par le modal après confirmation + déduction du stock réussies.
  const onConfirme = (commandeId) => {
    setCommandes(prev => prev.map(c =>
      c.id_commande === commandeId ? { ...c, statut: 'CONFIRMEE' } : c
    ))
    setNouveauStatut(prev => ({ ...prev, [commandeId]: '' }))
    setConfirmCommande(null)
    API.get('/api/commandes/stats/').then(res => setStats(res.data)).catch(() => {})
  }

  const repondreRecours = async (commandeId, decision) => {
    try {
      await API.post(`/api/commandes/${commandeId}/repondre_recours/`, {
        decision, reponse: reponseRecours[commandeId] || '',
      })
      const res = await API.get('/api/commandes/en_cours/')
      setCommandes(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    }
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-ivoire flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-or border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement du dashboard...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'commandes',  label: 'Commandes',                             Icon: ClipboardList },
    { key: 'modeles',    label: 'Modèles',                                Icon: Shirt },
    { key: 'devis',      label: 'Devis',                                  Icon: FileText },
    { key: 'stocks',     label: 'Gestion des stocks',                     Icon: Layers },
    { key: 'historique', label: 'Historique stock',                       Icon: Package },
    { key: 'paiements',  label: 'Paiements',                              Icon: CreditCard },
    { key: 'mesures',    label: `Mesures clients (${mesuresClients.length})`, Icon: Ruler },
    { key: 'livraisons', label: 'Livraisons',                              Icon: Truck },
    { key: 'analytics',  label: 'Analytics',                              Icon: BarChart2 },
    { key: 'parametres', label: 'Paramètres',                             Icon: Settings },
  ]

  const statsCards = stats ? [
    { label: 'Total commandes', valeur: stats.total_commandes, Icon: ClipboardList, couleur: 'bg-nuit text-white' },
    { label: 'En attente',      valeur: stats.en_attente,      Icon: Clock,         couleur: 'bg-yellow-50 text-yellow-700' },
    { label: 'En cours',        valeur: stats.en_cours,        Icon: Scissors,      couleur: 'bg-purple-50 text-purple-700' },
    { label: 'Livrées',         valeur: stats.livrees,         Icon: Package,       couleur: 'bg-green-50 text-green-700' },
  ] : []

  const commandesFiltrees = commandes.filter(c => {
    const t = rechercheCommande.trim().toLowerCase()
    const matchTexte = !t || (c.client || '').toLowerCase().includes(t) || (c.modele_nom || '').toLowerCase().includes(t)
    return matchTexte && (!filtreStatutCmd || c.statut === filtreStatutCmd)
  })

  return (
    <div className="min-h-screen bg-ivoire">

      <div className="bg-nuit py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-titre text-3xl font-bold text-white flex items-center gap-3">
            <Scissors className="w-8 h-8 text-or" /> Dashboard Couturier
          </h1>
          <p className="text-gray-300 mt-1">Gérez vos commandes et stocks en temps réel</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statsCards.map((card, i) => (
              <div key={i} className={`${card.couleur} rounded-2xl p-5 shadow-sm`}>
                <card.Icon className="w-7 h-7 mb-2 opacity-80" />
                <div className="text-3xl font-bold font-titre">{card.valeur}</div>
                <div className="text-sm mt-1 opacity-80">{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {alertes.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8">
            <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Alerte stock — {alertes.length} matériau{alertes.length > 1 ? 'x' : ''} en rupture
            </h3>
            <div className="flex flex-wrap gap-2">
              {alertes.map(m => (
                <span key={m.id_materiau} className="bg-red-100 text-red-700 text-sm px-3 py-1.5 rounded-lg font-medium">
                  {m.nom_materiau} — {m.quantite_stock} {m.unite}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setOnglet(tab.key)}
              className={`flex items-center gap-1.5 px-5 py-3 font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                onglet === tab.key
                  ? 'border-or text-or'
                  : 'border-transparent text-gray-500 hover:text-nuit'
              }`}
            >
              <tab.Icon className="w-4 h-4 flex-shrink-0" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Onglet Commandes */}
        {onglet === 'commandes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-2">
              <div className="flex flex-1 gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rechercheCommande}
                    onChange={e => setRechercheCommande(e.target.value)}
                    placeholder="Rechercher (client, modèle)…"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
                  />
                </div>
                <select
                  value={filtreStatutCmd}
                  onChange={e => setFiltreStatutCmd(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or bg-white"
                >
                  <option value="">Tous les statuts</option>
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="CONFIRMEE">Confirmée</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="LIVREE">Livrée</option>
                  <option value="ANNULEE">Annulée</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => telechargerFichier('/api/commandes/export_csv/', 'commandes.csv')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button
                  onClick={() => telechargerFichier('/api/commandes/export_pdf/', 'commandes.pdf')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>
            {commandesFiltrees.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
                <p className="text-gray-500">
                  {rechercheCommande || filtreStatutCmd
                    ? 'Aucune commande ne correspond à la recherche.'
                    : 'Aucune commande en cours pour le moment.'}
                </p>
              </div>
            ) : (
              commandesFiltrees.map(commande => {
                const config = statutConfig[commande.statut] || statutConfig.EN_ATTENTE
                return (
                  <div key={commande.id_commande} className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-nuit text-lg">{commande.modele_nom}</h3>
                          <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.couleur}`}>
                            <config.Icon className="w-3 h-3" /> {config.label}
                          </span>
                          {commande.mode_livraison === 'RETRAIT' ? (
                            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                              <Store className="w-3 h-3" /> Retrait
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                              <Truck className="w-3 h-3" /> Livraison
                            </span>
                          )}
                          {!commande.couturier_nom && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                              Non assignée
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">
                          Client : <span className="text-nuit font-medium">{commande.client}</span>
                          {' • '}Commande #{commande.id_commande}
                          {' • '}
                          {new Date(commande.date_commande).toLocaleDateString('fr-FR')}
                        </p>
                        {(() => {
                          const total = Number(commande.modele_prix) - Number(commande.remise_appliquee || 0)
                          const paye  = Number(commande.total_paye)
                          const reste = Math.max(0, total - paye)
                          return (
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                              <span className="text-gray-600">
                                <span className="font-semibold text-nuit">{paye.toLocaleString('fr-FR')}</span>
                                <span className="text-gray-400"> / {total.toLocaleString('fr-FR')} FCFA</span>
                              </span>
                              {reste === 0 ? (
                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                  <CheckCircle className="w-3 h-3" /> Soldé
                                </span>
                              ) : (
                                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                  Reste {reste.toLocaleString('fr-FR')} FCFA
                                </span>
                              )}
                            </div>
                          )
                        })()}
                        <button
                          onClick={() => {
                            setRechercheMesure(commande.client)
                            const m = mesuresClients.find(mm => mm.client_nom === commande.client)
                            setMesureOuverteId(m ? m.id_mesure : null)
                            setOnglet('mesures')
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-or hover:underline font-medium"
                        >
                          <Ruler className="w-3.5 h-3.5" /> Voir les mesures de ce client
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={nouveauStatut[commande.id_commande] || commande.statut}
                          onChange={e => {
                            setNouveauStatut(prev => ({ ...prev, [commande.id_commande]: e.target.value }))
                            setErreurStatut(prev => ({ ...prev, [commande.id_commande]: '' }))
                          }}
                          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-or"
                        >
                          <option value="EN_ATTENTE">En attente</option>
                          <option value="CONFIRMEE">Confirmée</option>
                          <option value="EN_COURS">En cours</option>
                          <option value="LIVREE">Livrée</option>
                          <option value="ANNULEE">Annulée</option>
                        </select>
                        <button
                          onClick={() => changerStatut(
                            commande.id_commande,
                            nouveauStatut[commande.id_commande] || commande.statut
                          )}
                          className="bg-nuit text-white px-4 py-2 rounded-xl text-sm hover:bg-or hover:text-nuit transition-colors font-medium"
                        >
                          Mettre à jour
                        </button>
                      </div>
                    </div>

                    {erreurStatut[commande.id_commande] && (
                      <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{erreurStatut[commande.id_commande]}</span>
                      </div>
                    )}

                    {commande.recours && (
                      <div className={`mt-3 rounded-xl p-4 border ${
                        commande.recours.statut === 'ACCEPTE' ? 'bg-green-50 border-green-200'
                        : commande.recours.statut === 'REFUSE' ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'}`}>
                        <p className="text-sm font-semibold text-nuit flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> Recours client — {
                            commande.recours.statut === 'ACCEPTE' ? 'Accepté'
                            : commande.recours.statut === 'REFUSE' ? 'Refusé' : 'À traiter'}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">{commande.recours.motif}</p>
                        {commande.recours.statut === 'OUVERT' ? (
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={reponseRecours[commande.id_commande] || ''}
                              onChange={e => setReponseRecours(prev => ({ ...prev, [commande.id_commande]: e.target.value }))}
                              rows={2}
                              placeholder="Votre réponse au client (optionnel)…"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-or"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => repondreRecours(commande.id_commande, 'ACCEPTE')} className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-green-700 transition-colors">
                                Accepter
                              </button>
                              <button onClick={() => repondreRecours(commande.id_commande, 'REFUSE')} className="flex-1 bg-red-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-red-700 transition-colors">
                                Refuser
                              </button>
                            </div>
                          </div>
                        ) : commande.recours.reponse_couturier && (
                          <p className="text-gray-500 text-sm mt-1"><span className="text-gray-400">Votre réponse : </span>{commande.recours.reponse_couturier}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Onglet Stocks */}
        {onglet === 'stocks' && <StocksOnglet />}

        {/* Onglet Devis */}
        {onglet === 'devis' && <DevisOnglet />}

        {/* Onglet Historique stock */}
        {onglet === 'historique' && (
          <div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Type de mouvement
                </label>
                <select
                  value={filtreType}
                  onChange={e => setFiltreType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or"
                >
                  <option value="">Tous les types</option>
                  <option value="ENTREE">Entrée</option>
                  <option value="SORTIE">Sortie</option>
                  <option value="AJUSTEMENT">Ajustement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Matériau
                </label>
                <select
                  value={filtreMateriauId}
                  onChange={e => setFiltreMateriauId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or"
                >
                  <option value="">Tous les matériaux</option>
                  {materiaux.map(m => (
                    <option key={m.id_materiau} value={m.id_materiau}>
                      {m.nom_materiau}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  À partir du
                </label>
                <input
                  type="date"
                  value={filtreDateApres}
                  onChange={e => setFiltreDateApres(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Jusqu'au
                </label>
                <input
                  type="date"
                  value={filtreDataAvant}
                  onChange={e => setFiltreDateAvant(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {chargementMouvements ? 'Chargement…' : `${totalMouvements} mouvement${totalMouvements > 1 ? 's' : ''}`}
              </p>
              {(filtreType || filtreMateriauId || filtreDateApres || filtreDataAvant) && (
                <button
                  onClick={() => {
                    setFiltreType('')
                    setFiltreMateriauId('')
                    setFiltreDateApres('')
                    setFiltreDateAvant('')
                  }}
                  className="text-sm text-gray-500 hover:text-red-500 underline"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>

            {chargementMouvements ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl h-14 animate-pulse" />
                ))}
              </div>
            ) : mouvements.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <Inbox className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-400">Aucun mouvement de stock trouvé.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-nuit text-white">
                      <tr>
                        {['Date', 'Matériau', 'Type', 'Quantité', 'Commande', 'Référence', 'Notes'].map(h => (
                          <th key={h} className="px-5 py-4 text-left text-sm font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mouvements.map(mv => {
                        const typeCfg = {
                          ENTREE:      { label: 'Entrée',      cls: 'bg-green-100 text-green-700',  sign: '+' },
                          SORTIE:      { label: 'Sortie',      cls: 'bg-red-100 text-red-700',      sign: '−' },
                          AJUSTEMENT:  { label: 'Ajustement',  cls: 'bg-blue-100 text-blue-700',    sign: '~' },
                        }[mv.type_mouvement] || { label: mv.type_mouvement, cls: 'bg-gray-100 text-gray-600', sign: '' }

                        return (
                          <tr key={mv.id} className="hover:bg-ivoire transition-colors">
                            <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                              {new Date(mv.date).toLocaleString('fr-FR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </td>
                            <td className="px-5 py-3.5 font-medium text-nuit whitespace-nowrap">
                              {mv.materiau_nom}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${typeCfg.cls}`}>
                                {typeCfg.label}
                              </span>
                            </td>
                            <td className={`px-5 py-3.5 font-bold whitespace-nowrap ${
                              mv.type_mouvement === 'ENTREE' ? 'text-green-600' :
                              mv.type_mouvement === 'SORTIE' ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {typeCfg.sign}{mv.quantite} {mv.unite}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-500">
                              {mv.commande ? `#${mv.commande}` : '—'}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">
                              {mv.reference || '—'}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-400 max-w-xs truncate">
                              {mv.notes || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {totalMouvements > 20 && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm">
                    <span className="text-gray-500">Page {pageMouvements} / {Math.ceil(totalMouvements / 20)}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPageMouvements(p => Math.max(1, p - 1))}
                        disabled={pageMouvements <= 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ← Précédent
                      </button>
                      <button
                        onClick={() => setPageMouvements(p => p + 1)}
                        disabled={pageMouvements >= Math.ceil(totalMouvements / 20)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Suivant →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Onglet Paiements */}
        {onglet === 'paiements' && <PaiementsOnglet />}

        {/* Onglet Mesures Clients */}
        {onglet === 'mesures' && (
          <div className="space-y-3">
            {/* Recherche par client */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={rechercheMesure}
                onChange={e => setRechercheMesure(e.target.value)}
                placeholder="Rechercher un client par son nom…"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
              />
            </div>

            {mesuresClients.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <Ruler className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="text-gray-500">Aucune mesure enregistrée par les clients.</p>
              </div>
            ) : (() => {
              const filtrees = mesuresClients.filter(m =>
                (m.client_nom || '').toLowerCase().includes(rechercheMesure.toLowerCase())
              )
              if (filtrees.length === 0) return (
                <div className="text-center py-12 text-gray-400">
                  Aucun client ne correspond à « {rechercheMesure} ».
                </div>
              )
              return filtrees.map(mesure => {
                const ouverte = mesureOuverteId === mesure.id_mesure
                return (
                  <div key={mesure.id_mesure} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => setMesureOuverteId(ouverte ? null : mesure.id_mesure)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-ivoire transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-or/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-or" />
                        </div>
                        <div>
                          <p className="font-semibold text-nuit">
                            Mesures de {mesure.client_nom || `Client #${mesure.id_mesure}`}
                          </p>
                          <p className="text-gray-400 text-xs">
                            Enregistrées le {new Date(mesure.date_prise).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${ouverte ? 'rotate-180' : ''}`} />
                    </button>

                    {ouverte && (
                      <div className="px-5 pb-5 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                          {Object.entries(mesure.mesures).map(([key, valeur]) => (
                            <div key={key} className="bg-ivoire rounded-xl p-3 text-center">
                              <p className="text-gray-400 text-xs mb-1 capitalize">{key}</p>
                              <p className="text-nuit font-bold text-xl">{valeur}</p>
                              <p className="text-gray-400 text-xs">cm</p>
                            </div>
                          ))}
                        </div>
                        {mesure.notes && (
                          <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-xl p-3 flex items-start gap-2">
                            <FileText className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-gray-600 text-sm"><span className="font-medium">Note :</span> {mesure.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        )}

        {/* Onglet Livraisons */}
        {onglet === 'livraisons' && <LivraisonsOnglet />}
        {onglet === 'modeles' && <ModelesOnglet />}

        {/* Onglet Analytics */}
        {onglet === 'analytics' && <AnalyticsOnglet />}

        {/* Onglet Paramètres */}
        {onglet === 'parametres' && <ParametresOnglet />}

        {confirmCommande && (
          <ConfirmationStockModal
            commande={confirmCommande}
            onClose={() => setConfirmCommande(null)}
            onConfirme={onConfirme}
          />
        )}

      </div>
    </div>
  )
}

export default Dashboard
