import { Link } from 'react-router-dom'
import { Shirt, Clock } from 'lucide-react'

function ModeleCard({ modele }) {
  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group">

      {/* Image du modèle */}
      <div className="relative h-64 overflow-hidden" style={{background: 'linear-gradient(135deg, #1A1A2E, #2d2d4e)'}}>
        {modele.image ? (
          <img
            src={modele.image}
            alt={modele.nom}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Shirt className="w-16 h-16 text-gray-400" />
            <span className="text-gray-400 text-sm">Pas d'image</span>
          </div>
        )}

        {/* Badge catégorie */}
        {modele.categorie_nom && (
          <span className="absolute top-3 left-3 bg-or text-nuit text-xs font-semibold px-3 py-1 rounded-full">
            {modele.categorie_nom}
          </span>
        )}
      </div>

      {/* Infos */}
      <div className="p-5">
        <h3 className="font-titre text-lg font-semibold text-nuit mb-1 truncate">
          {modele.nom}
        </h3>

        <div className="flex items-center justify-between mb-4">
          <span className="text-or font-bold text-xl">
            {Number(modele.prix).toLocaleString('fr-FR')} FCFA
          </span>
          <span className="text-gray-500 text-sm flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {modele.delai} jours
          </span>
        </div>

        <Link
          to={`/modeles/${modele.id_modele}`}
          className="block w-full text-center text-white py-2.5 rounded-xl font-medium transition-colors duration-300"
          style={{backgroundColor: '#1A1A2E'}}
        >
          Voir le modèle
        </Link>
      </div>
    </div>
  )
}

export default ModeleCard
