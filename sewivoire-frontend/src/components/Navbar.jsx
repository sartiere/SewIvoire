import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOuvert, setMenuOuvert] = useState(false)

  return (
    <nav className="bg-nuit shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-or font-titre text-2xl font-bold">Sew</span>
            <span className="text-white font-titre text-2xl">Ivoire</span>
          </Link>

          {/* Menu desktop */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'text-or font-semibold' : 'text-gray-300 hover:text-or transition-colors duration-200'}>
              Accueil
            </NavLink>
            <NavLink to="/catalogue" className={({ isActive }) => isActive ? 'text-or font-semibold' : 'text-gray-300 hover:text-or transition-colors duration-200'}>
              Catalogue
            </NavLink>

            {/* Si connecté */}
            {user ? (
              <div className="flex items-center gap-4">
                {user.role === 'COUTURIER' && (
                  <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-or font-semibold' : 'text-gray-300 hover:text-or transition-colors duration-200'}>
                    Dashboard
                  </NavLink>
                )}
                <NavLink to="/mes-commandes" className={({ isActive }) => isActive ? 'text-or font-semibold' : 'text-gray-300 hover:text-or transition-colors duration-200'}>
                  Mes commandes
                </NavLink>
                {user.role !== 'COUTURIER' && (
                  <NavLink to="/mes-devis" className={({ isActive }) => isActive ? 'text-or font-semibold' : 'text-gray-300 hover:text-or transition-colors duration-200'}>
                    Mes devis
                  </NavLink>
                )}
                <NavLink to="/mesures" className={({ isActive }) => isActive ? 'text-or font-semibold' : 'text-gray-300 hover:text-or transition-colors duration-200'}>
                  Mes mesures
                </NavLink>
                <NavLink to="/profil" className={({ isActive }) => isActive ? 'text-or font-semibold' : 'text-gray-300 hover:text-or transition-colors duration-200'}>
                  Mon profil
                </NavLink>
                <div className="flex items-center gap-3">
                  <span className="text-or font-medium">
                    {user.first_name || user.username}
                  </span>
                  <button
                    onClick={logout}
                    className="bg-or text-nuit px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors duration-200"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            ) : (
              /* Si non connecté */
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-or transition-colors duration-200"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="bg-or text-nuit px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors duration-200"
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>

          {/* Bouton menu mobile */}
          <button
            className="md:hidden text-white"
            onClick={() => setMenuOuvert(!menuOuvert)}
          >
            {menuOuvert ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Menu mobile */}
        {menuOuvert && (
          <div className="md:hidden pb-4 flex flex-col gap-3">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'text-or font-semibold py-2' : 'text-gray-300 hover:text-or py-2'} onClick={() => setMenuOuvert(false)}>Accueil</NavLink>
            <NavLink to="/catalogue" className={({ isActive }) => isActive ? 'text-or font-semibold py-2' : 'text-gray-300 hover:text-or py-2'} onClick={() => setMenuOuvert(false)}>Catalogue</NavLink>
            {user ? (
              <>
                {user.role === 'COUTURIER' && (
                  <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-or font-semibold py-2' : 'text-gray-300 hover:text-or py-2'} onClick={() => setMenuOuvert(false)}>Dashboard</NavLink>
                )}
                <NavLink to="/mes-commandes" className={({ isActive }) => isActive ? 'text-or font-semibold py-2' : 'text-gray-300 hover:text-or py-2'} onClick={() => setMenuOuvert(false)}>Mes commandes</NavLink>
                {user.role !== 'COUTURIER' && (
                  <NavLink to="/mes-devis" className={({ isActive }) => isActive ? 'text-or font-semibold py-2' : 'text-gray-300 hover:text-or py-2'} onClick={() => setMenuOuvert(false)}>Mes devis</NavLink>
                )}
                <NavLink to="/mesures" className={({ isActive }) => isActive ? 'text-or font-semibold py-2' : 'text-gray-300 hover:text-or py-2'} onClick={() => setMenuOuvert(false)}>Mes mesures</NavLink>
                <button onClick={logout} className="text-left text-red-400 hover:text-red-300 py-2">Déconnexion</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive }) => isActive ? 'text-or font-semibold py-2' : 'text-gray-300 hover:text-or py-2'} onClick={() => setMenuOuvert(false)}>Connexion</NavLink>
                <NavLink to="/register" className={({ isActive }) => isActive ? 'text-or font-semibold py-2' : 'text-gray-300 hover:text-or py-2'} onClick={() => setMenuOuvert(false)}>S'inscrire</NavLink>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar