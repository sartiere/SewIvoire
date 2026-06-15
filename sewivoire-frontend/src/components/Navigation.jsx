import { useEffect, useState } from 'react'

function Navigation() {
  const [peutReculer, setPeutReculer] = useState(false)
  const [peutAvancer, setPeutAvancer] = useState(false)

  useEffect(() => {
    // Vérifie si on peut reculer — l'historique a plus d'une entrée
    setPeutReculer(window.history.length > 1)

    // Vérifie si on peut avancer — en écoutant les changements de navigation
    const verifierNavigation = () => {
      setPeutReculer(window.history.length > 1)
    }

    window.addEventListener('popstate', verifierNavigation)
    return () => window.removeEventListener('popstate', verifierNavigation)
  }, [])

  const handleRetour = () => {
    window.history.back()
    setTimeout(() => setPeutAvancer(true), 100)
  }

  const handleSuivant = () => {
    window.history.forward()
    setTimeout(() => setPeutAvancer(false), 100)
  }

  // Si aucun bouton à afficher
  if (!peutReculer && !peutAvancer) return null

  return (
    <div className="flex items-center gap-3">
      {peutReculer && (
        <button
          onClick={handleRetour}
          className="flex items-center gap-1.5 text-gray-500 hover:text-or transition-colors duration-200 font-medium text-sm bg-white px-3 py-2 rounded-lg shadow-sm hover:shadow-md"
        >
          <span className="text-base">←</span>
          Retour
        </button>
      )}
      {peutAvancer && (
        <button
          onClick={handleSuivant}
          className="flex items-center gap-1.5 text-gray-500 hover:text-or transition-colors duration-200 font-medium text-sm bg-white px-3 py-2 rounded-lg shadow-sm hover:shadow-md"
        >
          Suivant
          <span className="text-base">→</span>
        </button>
      )}
    </div>
  )
}

export default Navigation