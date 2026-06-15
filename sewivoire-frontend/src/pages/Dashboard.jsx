import { useState, useEffect, useCallback } from 'react'
import {
  Scissors, ClipboardList, FileText, Layers, Package, CreditCard, Ruler, BarChart2,
  AlertTriangle, CheckCircle, XCircle, Clock, Download, Printer, Send, Award,
  Calendar, TrendingUp, User, Inbox, DollarSign, Settings, Truck, MapPin,
} from 'lucide-react'
import API from '../api/axios'
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

function PaiementsOnglet() {
  const [paiements, setPaiements] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    API.get('/api/paiements/')
      .then(res => setPaiements(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [])

  const total = paiements.reduce((s, p) => s + Number(p.montant), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {chargement ? 'Chargement…' : `${paiements.length} paiement${paiements.length > 1 ? 's' : ''} — Total : ${total.toLocaleString('fr-FR')} FCFA`}
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

      {chargement ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl h-12 animate-pulse" />)}
        </div>
      ) : paiements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <CreditCard className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">Aucun paiement enregistré.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nuit text-white">
                <tr>
                  {['ID', 'Date', 'Commande', 'Client', 'Montant (FCFA)', 'Méthode', 'Statut'].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-sm font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paiements.map(p => (
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
                    <td className="px-5 py-3.5 text-sm text-gray-500">{p.methode}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{p.statut || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

  useEffect(() => {
    API.get('/api/devis/')
      .then(res => setDevisList(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [])

  const setChamp = (id, champ, valeur) => {
    setFormulaire(prev => ({
      ...prev,
      [id]: { ...prev[id], [champ]: valeur }
    }))
  }

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
      setDevisList(prev => prev.map(d => d.id_devis === devis.id_devis ? res.data : d))
    } catch (err) {
      console.error(err)
    } finally {
      setEnvoi(null)
    }
  }

  const statutCfg = {
    DEMANDE: { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
    PROPOSE: { label: 'Proposé',   cls: 'bg-blue-100 text-blue-700' },
    ACCEPTE: { label: 'Accepté',   cls: 'bg-green-100 text-green-700' },
    REFUSE:  { label: 'Refusé',    cls: 'bg-red-100 text-red-700' },
  }

  if (chargement) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
    </div>
  )

  if (devisList.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl">
      <FileText className="w-14 h-14 mx-auto mb-3 text-gray-300" />
      <p className="text-gray-400">Aucune demande de devis.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {devisList.map(devis => {
        const cfg = statutCfg[devis.statut] || statutCfg.DEMANDE
        const f   = formulaire[devis.id_devis] || {}
        return (
          <div key={devis.id_devis} className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-nuit text-lg">{devis.modele_nom}</h3>
                <p className="text-gray-400 text-sm">
                  Client : <span className="font-medium text-nuit">{devis.client_nom}</span>
                  {' · '}Devis #{devis.id_devis}
                  {' · '}{new Date(devis.date_creation).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-gray-500 text-sm mt-0.5">
                  Prix catalogue : <span className="font-medium">{Number(devis.modele_prix).toLocaleString('fr-FR')} FCFA</span>
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold self-start ${cfg.cls}`}>
                {cfg.label}
              </span>
            </div>

            {devis.statut === 'DEMANDE' && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-600 mb-3">Proposer un devis</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Prix (FCFA) *</label>
                    <input
                      type="number" min="0"
                      value={f.prix || ''}
                      onChange={e => setChamp(devis.id_devis, 'prix', e.target.value)}
                      placeholder={Number(devis.modele_prix).toLocaleString('fr-FR')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Délai (jours) *</label>
                    <input
                      type="number" min="1"
                      value={f.delai || ''}
                      onChange={e => setChamp(devis.id_devis, 'delai', e.target.value)}
                      placeholder="Ex : 14"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Expiration de l'offre</label>
                    <input
                      type="date"
                      value={f.expiration || ''}
                      onChange={e => setChamp(devis.id_devis, 'expiration', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
                    <input
                      type="text"
                      value={f.commentaire || ''}
                      onChange={e => setChamp(devis.id_devis, 'commentaire', e.target.value)}
                      placeholder="Précisions optionnelles…"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or"
                    />
                  </div>
                </div>
                <button
                  onClick={() => proposer(devis)}
                  disabled={!f.prix || !f.delai || envoi === devis.id_devis}
                  className="flex items-center gap-1.5 bg-nuit text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {envoi === devis.id_devis ? 'Envoi…' : 'Envoyer le devis'}
                </button>
              </div>
            )}

            {devis.statut === 'PROPOSE' && (
              <div className="border-t border-gray-100 pt-4 text-sm text-gray-500">
                Devis envoyé : <span className="font-semibold text-nuit">{Number(devis.prix_propose).toLocaleString('fr-FR')} FCFA</span>
                {' '} — <span className="font-semibold text-nuit">{devis.delai_propose} jours</span>
                {' '}· En attente de réponse du client
              </div>
            )}

            {devis.statut === 'ACCEPTE' && devis.commande_id && (
              <div className="border-t border-gray-100 pt-4 text-sm flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">Commande #{devis.commande_id} créée</span>
              </div>
            )}
          </div>
        )
      })}
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
      API.get('/api/livraisons/'),
      API.get('/api/livreurs/'),
    ]).then(([rLiv, rLib]) => {
      setLivraisons(rLiv.data.results || rLiv.data)
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

  const [mouvements, setMouvements] = useState([])
  const [chargementMouvements, setChargementMouvements] = useState(false)
  const [filtreType, setFiltreType] = useState('')
  const [filtreMateriauId, setFiltreMateriauId] = useState('')
  const [filtreDateApres, setFiltreDateApres] = useState('')
  const [filtreDataAvant, setFiltreDateAvant] = useState('')
  const [totalMouvements, setTotalMouvements] = useState(0)

  useEffect(() => {
    Promise.all([
      API.get('/api/commandes/stats/'),
      API.get('/api/commandes/en_cours/'),
      API.get('/api/materiaux/'),
      API.get('/api/materiaux/alertes_stock/'),
      API.get('/api/mesures/'),
    ]).then(([resStats, resCommandes, resMateriaux, resAlertes, resMesures]) => {
      setStats(resStats.data)
      setCommandes(resCommandes.data.results || resCommandes.data)
      setMateriaux(resMateriaux.data.results || resMateriaux.data)
      setAlertes(resAlertes.data.results || resAlertes.data)
      setMesuresClients(resMesures.data.results || resMesures.data)
    }).catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [])

  const fetchMouvements = useCallback(() => {
    setChargementMouvements(true)
    const params = {}
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
  }, [filtreType, filtreMateriauId, filtreDateApres, filtreDataAvant])

  useEffect(() => {
    if (onglet === 'historique') fetchMouvements()
  }, [onglet, fetchMouvements])

  const changerStatut = async (commandeId, statut) => {
    setErreurStatut(prev => ({ ...prev, [commandeId]: '' }))
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
    { key: 'commandes',  label: 'Commandes en cours',                    Icon: ClipboardList },
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
            <div className="flex gap-2 justify-end mb-2">
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
            {commandes.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
                <p className="text-gray-500">Aucune commande en cours pour le moment.</p>
              </div>
            ) : (
              commandes.map(commande => {
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
                        </div>
                        <p className="text-gray-400 text-sm">
                          Client : <span className="text-nuit font-medium">{commande.client}</span>
                          {' • '}Commande #{commande.id_commande}
                          {' • '}
                          {new Date(commande.date_commande).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-or font-semibold mt-1">
                          {Number(commande.total_paye).toLocaleString('fr-FR')} FCFA payés
                        </p>
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
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Onglet Stocks */}
        {onglet === 'stocks' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-nuit text-white">
                <tr>
                  {['Matériau', 'Stock actuel', 'Seuil alerte', 'Unité', 'État'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-sm font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materiaux.map(m => (
                  <tr key={m.id_materiau} className="hover:bg-ivoire transition-colors">
                    <td className="px-6 py-4 font-medium text-nuit">{m.nom_materiau}</td>
                    <td className="px-6 py-4 text-gray-600">{m.quantite_stock}</td>
                    <td className="px-6 py-4 text-gray-600">{m.seuil_alerte || '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{m.unite}</td>
                    <td className="px-6 py-4">
                      {m.alerte_stock ? (
                        <span className="flex items-center gap-1.5 w-fit bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Alerte
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 w-fit bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {materiaux.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Layers className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                <p>Aucun matériau enregistré.</p>
              </div>
            )}
          </div>
        )}

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
              </div>
            )}
          </div>
        )}

        {/* Onglet Paiements */}
        {onglet === 'paiements' && <PaiementsOnglet />}

        {/* Onglet Mesures Clients */}
        {onglet === 'mesures' && (
          <div className="space-y-4">
            {mesuresClients.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <Ruler className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="text-gray-500">Aucune mesure enregistrée par les clients.</p>
              </div>
            ) : (
              mesuresClients.map(mesure => (
                <div key={mesure.id_mesure} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-semibold text-nuit text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-400" /> {mesure.client_nom}
                      </h3>
                      <p className="text-gray-400 text-sm mt-0.5">
                        Enregistrées le {new Date(mesure.date_prise).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className="bg-or/20 text-or text-xs font-semibold px-3 py-1 rounded-full">
                      ID #{mesure.id_mesure}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              ))
            )}
          </div>
        )}

        {/* Onglet Livraisons */}
        {onglet === 'livraisons' && <LivraisonsOnglet />}

        {/* Onglet Analytics */}
        {onglet === 'analytics' && <AnalyticsOnglet />}

        {/* Onglet Paramètres */}
        {onglet === 'parametres' && <ParametresOnglet />}

      </div>
    </div>
  )
}

export default Dashboard
