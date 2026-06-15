import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// roles : liste des rôles autorisés (optionnel)
function PrivateRoute({ children, roles }) {
  const { user } = useAuth()

  // Si non connecté → redirige vers login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Si un rôle est requis et que l'utilisateur n'a pas ce rôle
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  // Sinon → affiche la page normalement
  return children
}

export default PrivateRoute