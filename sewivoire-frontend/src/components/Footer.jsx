import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail } from 'lucide-react'

function Footer() {
  return (
    <footer className="bg-nuit text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Logo et description */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-or font-titre text-xl font-bold">Sew</span>
              <span className="text-white font-titre text-xl">Ivoire</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              L'atelier de couture ivoirien qui allie tradition et modernité.
            </p>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="text-or font-semibold mb-3 text-sm">Liens rapides</h3>
            <ul className="space-y-1.5">
              <li><Link to="/" className="hover:text-or transition-colors duration-200 text-sm">Accueil</Link></li>
              <li><Link to="/catalogue" className="hover:text-or transition-colors duration-200 text-sm">Catalogue</Link></li>
              <li><Link to="/login" className="hover:text-or transition-colors duration-200 text-sm">Connexion</Link></li>
              <li><Link to="/register" className="hover:text-or transition-colors duration-200 text-sm">S'inscrire</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-or font-semibold mb-3 text-sm">Contact</h3>
            <ul className="space-y-1.5 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" /> Abidjan, Côte d'Ivoire
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" /> +225 07 00 00 00 00
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" /> contact@sewivoire.com
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-5 pt-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} SewIvoire. Tous droits réservés.
        </div>
      </div>
    </footer>
  )
}

export default Footer
