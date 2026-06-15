import { useState, useEffect } from 'react'
import { Ruler, CheckCircle, XCircle, Pencil, Plus, Trash2, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Navigation from '../components/Navigation'
import API from '../api/axios'

const TYPES_MESURES = [
  { key: 'poitrine', label: 'Poitrine'  },
  { key: 'taille',   label: 'Taille'    },
  { key: 'hanches',  label: 'Hanches'   },
  { key: 'epaules',  label: 'Épaules'   },
  { key: 'longueur', label: 'Longueur'  },
  { key: 'bras',     label: 'Bras'      },
  { key: 'cuisse',   label: 'Cuisse'    },
  { key: 'cou',      label: 'Cou'       },
]

const mesuresVides = () => TYPES_MESURES.reduce((acc, t) => ({ ...acc, [t.key]: '' }), {})

function Mesures() {
  const { user } = useAuth()
  const [mesures, setMesures]           = useState([])
  const [chargement, setChargement]     = useState(true)
  const [afficherForm, setAfficherForm] = useState(false)
  const [modeEdition, setModeEdition]   = useState(null)
  const [formData, setFormData]         = useState(mesuresVides())
  const [notes, setNotes]               = useState('')
  const [succes, setSucces]             = useState('')
  const [erreur, setErreur]             = useState('')
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    API.get('/api/mesures/')
      .then(res => setMesures(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const ouvrirFormulaire = () => {
    setFormData(mesuresVides()); setNotes(''); setModeEdition(null)
    setAfficherForm(true); setSucces(''); setErreur('')
  }

  const ouvrirEdition = (mesure) => {
    setFormData({ ...mesuresVides(), ...mesure.mesures }); setNotes(mesure.notes || '')
    setModeEdition(mesure.id_mesure); setAfficherForm(true); setSucces(''); setErreur('')
  }

  const annuler = () => {
    setAfficherForm(false); setModeEdition(null)
    setFormData(mesuresVides()); setNotes(''); setErreur('')
  }

  const sauvegarder = async (e) => {
    e.preventDefault(); setSaving(true); setErreur(''); setSucces('')
    const mesuresFiltrees = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== '' && v !== null)
    )
    if (Object.keys(mesuresFiltrees).length === 0) {
      setErreur('Veuillez remplir au moins une mesure.'); setSaving(false); return
    }
    try {
      if (modeEdition) {
        const res = await API.patch(`/api/mesures/${modeEdition}/`, { mesures: mesuresFiltrees, notes })
        setMesures(prev => prev.map(m => m.id_mesure === modeEdition ? res.data : m))
        setSucces('Mesures modifiées avec succès !')
      } else {
        const res = await API.post('/api/mesures/', { mesures: mesuresFiltrees, notes })
        setMesures(prev => [res.data, ...prev])
        setSucces('Mesures enregistrées avec succès !')
      }
      setAfficherForm(false); setModeEdition(null)
    } catch {
      setErreur('Erreur lors de la sauvegarde. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  const supprimer = async (id) => {
    if (!window.confirm('Supprimer ces mesures ?')) return
    try {
      await API.delete(`/api/mesures/${id}/`)
      setMesures(prev => prev.filter(m => m.id_mesure !== id))
      setSucces('Mesures supprimées.')
    } catch {
      setErreur('Erreur lors de la suppression.')
    }
  }

  return (
    <div className="min-h-screen bg-ivoire">

      {/* En-tête */}
      <div className="bg-nuit py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-titre text-3xl font-bold text-white flex items-center gap-3">
                <Ruler className="w-8 h-8 text-or" /> Mes mesures
              </h1>
              <p className="text-gray-300 mt-1">
                Gérez vos mensurations pour des vêtements parfaitement ajustés
              </p>
            </div>
            <button
              onClick={ouvrirFormulaire}
              className="flex items-center gap-2 bg-or text-nuit px-5 py-2.5 rounded-xl font-semibold hover:bg-yellow-500 transition-colors"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6"><Navigation /></div>

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

        {/* Formulaire */}
        {afficherForm && (
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
            <h2 className="font-titre text-xl font-bold text-nuit mb-6 flex items-center gap-2">
              {modeEdition
                ? <><Pencil className="w-5 h-5" /> Modifier les mesures</>
                : <><Plus className="w-5 h-5" /> Nouvelles mesures</>
              }
            </h2>
            <form onSubmit={sauvegarder}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {TYPES_MESURES.map(type => (
                  <div key={type.key}>
                    <label className="block text-sm font-medium text-nuit mb-1.5">
                      {type.label} <span className="text-gray-400 font-normal">(cm)</span>
                    </label>
                    <input
                      type="number" name={type.key} value={formData[type.key]}
                      onChange={handleChange} placeholder="0" min="0" max="300" step="0.5"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or text-center text-lg font-semibold"
                    />
                  </div>
                ))}
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-nuit mb-1.5">Notes (optionnel)</label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: préférence pour vêtements amples, remarques particulières..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-or resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={annuler} className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="bg-nuit text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors disabled:opacity-50">
                  {saving ? 'Sauvegarde...' : modeEdition ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste */}
        {chargement ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />)}
          </div>
        ) : mesures.length === 0 && !afficherForm ? (
          <div className="text-center py-20 bg-white rounded-2xl">
            <Ruler className="w-20 h-20 mx-auto mb-4 text-gray-200" />
            <h3 className="font-titre text-2xl font-bold text-nuit mb-2">Aucune mesure enregistrée</h3>
            <p className="text-gray-400 mb-8 max-w-sm mx-auto">
              Enregistrez vos mensurations pour que le couturier puisse confectionner
              vos vêtements à votre taille exacte.
            </p>
            <button onClick={ouvrirFormulaire} className="inline-flex items-center gap-2 bg-nuit text-white px-8 py-3 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors">
              <Plus className="w-4 h-4" /> Ajouter mes mesures
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {mesures.map((mesure, index) => (
              <div key={mesure.id_mesure} className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-semibold text-nuit text-lg">
                      Mesures {mesures.length - index}
                      {index === 0 && (
                        <span className="ml-2 bg-or/20 text-or text-xs font-semibold px-2 py-0.5 rounded-full">Dernières</span>
                      )}
                    </h3>
                    <p className="text-gray-400 text-sm mt-0.5">
                      Enregistrées le {new Date(mesure.date_prise).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => ouvrirEdition(mesure)} className="flex items-center gap-1.5 bg-ivoire text-nuit px-4 py-2 rounded-xl text-sm font-medium hover:bg-or hover:text-nuit transition-colors">
                      <Pencil className="w-3.5 h-3.5" /> Modifier
                    </button>
                    <button onClick={() => supprimer(mesure.id_mesure)} className="flex items-center justify-center bg-red-50 text-red-500 p-2 rounded-xl hover:bg-red-100 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {TYPES_MESURES.map(type => {
                    const valeur = mesure.mesures[type.key]
                    if (!valeur) return null
                    return (
                      <div key={type.key} className="bg-ivoire rounded-xl p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">{type.label}</p>
                        <p className="text-nuit font-bold text-xl">{valeur}</p>
                        <p className="text-gray-400 text-xs">cm</p>
                      </div>
                    )
                  })}
                </div>

                {mesure.notes && (
                  <div className="mt-4 flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                    <FileText className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 text-sm"><span className="font-medium">Note :</span> {mesure.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Mesures
