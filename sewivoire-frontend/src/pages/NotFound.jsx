import { Link } from 'react-router-dom'
import { Scissors } from 'lucide-react'

function NotFound() {
  return (
    <div className="min-h-screen bg-ivoire flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Scissors className="w-20 h-20 text-or" />
        </div>
        <h1 className="font-titre text-6xl font-bold text-nuit mb-2">404</h1>
        <p className="text-gray-500 text-xl mb-8">Cette page n'existe pas.</p>
        <Link
          to="/"
          className="inline-block bg-nuit text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}

export default NotFound
