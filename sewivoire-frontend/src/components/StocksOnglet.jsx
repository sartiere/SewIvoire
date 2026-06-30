import { useState, useEffect } from 'react'
import { Plus, AlertTriangle, CheckCircle, Layers, X } from 'lucide-react'
import API from '../api/axios'

const UNITES = [
  { v: 'METRE', l: 'Mètre' },
  { v: 'PIECE', l: 'Pièce' },
  { v: 'BOUTON', l: 'Bouton' },
  { v: 'FERMETURE', l: 'Fermeture Éclair' },
  { v: 'BOBINE', l: 'Bobine de fil' },
]
const MAT_VIDE = { nom_materiau: '', unite: 'METRE', quantite_stock: '', seuil_alerte: '' }

const MVT = {
  ENTREE:     { label: 'Entrée (réappro)', q: 'Quantité à ajouter (+)' },
  SORTIE:     { label: 'Sortie (perte/casse)', q: 'Quantité à retirer (−)' },
  AJUSTEMENT: { label: 'Ajuster (inventaire)', q: 'Nouveau stock (valeur exacte)' },
}

function StocksOnglet() {
  const [materiaux, setMateriaux]   = useState([])
  const [chargement, setChargement] = useState(true)

  const [modalMat, setModalMat] = useState(false)
  const [formMat, setFormMat]   = useState(MAT_VIDE)

  const [modalMvt, setModalMvt] = useState(null)  // matériau ciblé
  const [typeMvt, setTypeMvt]   = useState('ENTREE')
  const [quantite, setQuantite] = useState('')
  const [reference, setReference] = useState('')

  const [envoi, setEnvoi]   = useState(false)
  const [erreur, setErreur] = useState('')

  const charger = async () => {
    setChargement(true)
    try {
      // On récupère TOUTES les pages (inventaire complet, pas seulement les 20 premiers)
      const tout = []
      let page = 1
      while (true) {
        const r = await API.get('/api/materiaux/', { params: { page } })
        const d = r.data
        if (Array.isArray(d)) { tout.push(...d); break }
        tout.push(...(d.results || []))
        if (!d.next) break
        page++
      }
      setMateriaux(tout)
    } catch { /* silencieux */ } finally {
      setChargement(false)
    }
  }
  useEffect(() => { charger() }, [])

  const ouvrirAjout = () => { setFormMat(MAT_VIDE); setErreur(''); setModalMat(true) }

  const creerMateriau = async () => {
    if (!formMat.nom_materiau.trim() || formMat.quantite_stock === '') {
      setErreur('Le nom et le stock initial sont obligatoires.'); return
    }
    setEnvoi(true); setErreur('')
    try {
      await API.post('/api/materiaux/', {
        nom_materiau: formMat.nom_materiau.trim(),
        unite: formMat.unite,
        quantite_stock: formMat.quantite_stock,
        seuil_alerte: formMat.seuil_alerte === '' ? null : formMat.seuil_alerte,
      })
      setModalMat(false); charger()
    } catch (err) {
      const d = err.response?.data
      setErreur(d && typeof d === 'object' ? Object.values(d).flat().join(' ') : "Erreur lors de l'ajout.")
    } finally { setEnvoi(false) }
  }

  const ouvrirMvt = (m) => { setModalMvt(m); setTypeMvt('ENTREE'); setQuantite(''); setReference(''); setErreur('') }

  const enregistrerMvt = async () => {
    if (quantite === '' || Number(quantite) <= 0) { setErreur('Entrez une quantité positive.'); return }
    setEnvoi(true); setErreur('')
    try {
      await API.post(`/api/materiaux/${modalMvt.id_materiau}/mouvement/`, {
        type_mouvement: typeMvt,
        quantite,
        reference: reference.trim() || undefined,
      })
      setModalMvt(null); charger()
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'opération.")
    } finally { setEnvoi(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{materiaux.length} matériau{materiaux.length > 1 ? 'x' : ''} en stock</p>
        <button
          onClick={ouvrirAjout}
          className="inline-flex items-center gap-1.5 bg-nuit text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-or hover:text-nuit transition-colors"
        >
          <Plus className="w-4 h-4" /> Ajouter un matériau
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-nuit text-white">
            <tr>
              {['Matériau', 'Stock actuel', 'Seuil alerte', 'Unité', 'État', ''].map((h, i) => (
                <th key={i} className="px-6 py-4 text-left text-sm font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {chargement ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Chargement…</td></tr>
            ) : materiaux.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                <Layers className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                Aucun matériau. Cliquez sur « Ajouter un matériau ».
              </td></tr>
            ) : materiaux.map(m => (
              <tr key={m.id_materiau} className="hover:bg-ivoire transition-colors">
                <td className="px-6 py-4 font-medium text-nuit">{m.nom_materiau}</td>
                <td className="px-6 py-4 text-gray-600 font-semibold">{m.quantite_stock}</td>
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
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => ouvrirMvt(m)}
                    className="border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Gérer le stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal : ajouter un matériau */}
      {modalMat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !envoi && setModalMat(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <p className="font-titre text-lg font-bold text-nuit">Nouveau matériau</p>
              <button onClick={() => setModalMat(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Nom du matériau *</label>
                <input
                  value={formMat.nom_materiau}
                  onChange={e => setFormMat({ ...formMat, nom_materiau: e.target.value })}
                  placeholder="Ex : Tissu Wax bleu"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-nuit mb-1.5">Stock initial *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={formMat.quantite_stock}
                    onChange={e => setFormMat({ ...formMat, quantite_stock: e.target.value })}
                    placeholder="50"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-nuit mb-1.5">Unité</label>
                  <select
                    value={formMat.unite}
                    onChange={e => setFormMat({ ...formMat, unite: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or bg-white"
                  >
                    {UNITES.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Seuil d'alerte (optionnel)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={formMat.seuil_alerte}
                  onChange={e => setFormMat({ ...formMat, seuil_alerte: e.target.value })}
                  placeholder="Ex : 10 — alerte sous ce niveau"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>
              {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
              <button onClick={creerMateriau} disabled={envoi} className="w-full bg-nuit text-white py-3 rounded-xl font-bold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50">
                {envoi ? 'Ajout…' : 'Ajouter au stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal : mouvement de stock */}
      {modalMvt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !envoi && setModalMvt(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <p className="font-titre text-lg font-bold text-nuit">Gérer le stock</p>
                <p className="text-gray-400 text-xs">{modalMvt.nom_materiau} — stock actuel : <strong>{modalMvt.quantite_stock} {modalMvt.unite}</strong></p>
              </div>
              <button onClick={() => setModalMvt(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-nuit mb-2">Type d'opération</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(MVT).map(([k, cfg]) => (
                    <button
                      key={k}
                      onClick={() => setTypeMvt(k)}
                      className={`rounded-xl border-2 px-2 py-2 text-xs font-semibold transition-colors ${typeMvt === k ? 'border-or bg-or/5 text-nuit' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">{MVT[typeMvt].q} *</label>
                <input
                  type="number" min="0" step="0.01"
                  value={quantite}
                  onChange={e => setQuantite(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Référence (optionnel)</label>
                <input
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="N° bon fournisseur, ticket d'inventaire…"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>
              {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
              <button onClick={enregistrerMvt} disabled={envoi} className="w-full bg-nuit text-white py-3 rounded-xl font-bold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50">
                {envoi ? 'Enregistrement…' : 'Valider le mouvement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StocksOnglet
