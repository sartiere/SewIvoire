import { useState, useEffect } from 'react'
import { Plus, Pencil, Shirt, X } from 'lucide-react'
import API from '../api/axios'

const VIDE = { nom: '', id_categorie: '', prix: '', delai: '' }

function ModelesOnglet() {
  const [modeles, setModeles]       = useState([])
  const [categories, setCategories] = useState([])
  const [chargement, setChargement] = useState(true)
  const [modal, setModal]           = useState(false)
  const [editId, setEditId]         = useState(null)   // null = ajout
  const [form, setForm]             = useState(VIDE)
  const [imageFile, setImageFile]   = useState(null)
  const [apercu, setApercu]         = useState(null)
  const [envoi, setEnvoi]           = useState(false)
  const [erreur, setErreur]         = useState('')

  const charger = () => {
    setChargement(true)
    Promise.all([API.get('/api/modeles/mes_modeles/'), API.get('/api/categories/')])
      .then(([rm, rc]) => {
        setModeles(rm.data.results || rm.data)
        setCategories(rc.data.results || rc.data)
      })
      .catch(() => {})
      .finally(() => setChargement(false))
  }
  useEffect(() => { charger() }, [])

  const ouvrirAjout = () => {
    setEditId(null); setForm(VIDE); setImageFile(null); setApercu(null); setErreur(''); setModal(true)
  }

  const ouvrirModif = async (m) => {
    setErreur('')
    try {
      const { data } = await API.get(`/api/modeles/${m.id_modele}/`)
      setEditId(data.id_modele)
      setForm({ nom: data.nom, id_categorie: data.categorie?.id_categorie || '', prix: data.prix, delai: data.delai })
      setImageFile(null); setApercu(data.image || null); setModal(true)
    } catch { setErreur('Impossible de charger ce modèle.') }
  }

  const choisirImage = (e) => {
    const f = e.target.files?.[0]
    if (f) { setImageFile(f); setApercu(URL.createObjectURL(f)) }
  }

  const enregistrer = async () => {
    if (!form.nom.trim() || !form.id_categorie || !form.prix || !form.delai) {
      setErreur('Nom, catégorie, prix et délai sont obligatoires.'); return
    }
    setEnvoi(true); setErreur('')
    try {
      const fd = new FormData()
      fd.append('nom', form.nom.trim())
      fd.append('id_categorie', form.id_categorie)
      fd.append('prix', form.prix)
      fd.append('delai', form.delai)
      if (imageFile) fd.append('image', imageFile)
      if (editId) await API.patch(`/api/modeles/${editId}/`, fd)
      else        await API.post('/api/modeles/', fd)
      setModal(false); charger()
    } catch (err) {
      const d = err.response?.data
      setErreur(d && typeof d === 'object' ? Object.values(d).flat().join(' ') : "Erreur lors de l'enregistrement.")
    } finally { setEnvoi(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{modeles.length} modèle{modeles.length > 1 ? 's' : ''} publié{modeles.length > 1 ? 's' : ''}</p>
        <button
          onClick={ouvrirAjout}
          className="inline-flex items-center gap-1.5 bg-nuit text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-or hover:text-nuit transition-colors"
        >
          <Plus className="w-4 h-4" /> Ajouter un modèle
        </button>
      </div>

      {chargement ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-56 animate-pulse" />)}
        </div>
      ) : modeles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <Shirt className="w-16 h-16 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400">Vous n'avez pas encore publié de modèle. Cliquez sur « Ajouter un modèle ».</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modeles.map(m => (
            <div key={m.id_modele} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="aspect-square bg-ivoire overflow-hidden">
                {m.image
                  ? <img src={m.image} alt={m.nom} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Shirt className="w-10 h-10 text-gray-300" /></div>}
              </div>
              <div className="p-3 flex flex-col flex-1">
                <p className="font-semibold text-nuit text-sm leading-tight">{m.nom}</p>
                <p className="text-gray-400 text-xs mt-0.5">{m.categorie_nom || 'Sans catégorie'}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-or font-bold text-sm">{Number(m.prix).toLocaleString('fr-FR')} F</span>
                  <span className="text-gray-400 text-xs">{m.delai} j</span>
                </div>
                <button
                  onClick={() => ouvrirModif(m)}
                  className="mt-3 inline-flex items-center justify-center gap-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulaire (ajout / modification) */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !envoi && setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <p className="font-titre text-lg font-bold text-nuit">{editId ? 'Modifier le modèle' : 'Nouveau modèle'}</p>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Photo</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl bg-ivoire overflow-hidden flex-shrink-0">
                    {apercu
                      ? <img src={apercu} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Shirt className="w-8 h-8 text-gray-300" /></div>}
                  </div>
                  <label className="cursor-pointer text-sm text-or hover:underline">
                    Choisir une image
                    <input type="file" accept="image/*" onChange={choisirImage} className="hidden" />
                  </label>
                </div>
              </div>
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Nom du modèle *</label>
                <input
                  value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex : Boubou brodé homme"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
                />
              </div>
              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-nuit mb-1.5">Catégorie *</label>
                <select
                  value={form.id_categorie}
                  onChange={e => setForm({ ...form, id_categorie: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or bg-white"
                >
                  <option value="">— Choisir —</option>
                  {categories.map(c => <option key={c.id_categorie} value={c.id_categorie}>{c.libelle}</option>)}
                </select>
              </div>
              {/* Prix + délai */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-nuit mb-1.5">Prix (FCFA) *</label>
                  <input
                    type="number" min="0"
                    value={form.prix}
                    onChange={e => setForm({ ...form, prix: e.target.value })}
                    placeholder="45000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-nuit mb-1.5">Délai (jours) *</label>
                  <input
                    type="number" min="1"
                    value={form.delai}
                    onChange={e => setForm({ ...form, delai: e.target.value })}
                    placeholder="7"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-or"
                  />
                </div>
              </div>

              {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
              <button
                onClick={enregistrer}
                disabled={envoi}
                className="w-full bg-nuit text-white py-3 rounded-xl font-bold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50"
              >
                {envoi ? 'Enregistrement…' : (editId ? 'Enregistrer les modifications' : 'Ajouter au catalogue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelesOnglet
