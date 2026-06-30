import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

// Layouts
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import PrivateRoute from './components/PrivateRoute'

// Pages publiques
import Accueil from './pages/Accueil'
import Catalogue from './pages/Catalogue'
import ModeleDetail from './pages/ModeleDetail'
import Login from './pages/Login'
import Register from './pages/Register'

// Pages privées
import MesCommandes from './pages/MesCommandes'
import MesDevis from './pages/MesDevis'
import Dashboard from './pages/Dashboard'
import Profil from './pages/Profil'
import Mesures from './pages/Mesures'
import MesLivraisons from './pages/MesLivraisons'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-ivoire">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Pages publiques */}
              <Route path="/" element={<Accueil />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/modeles/:id" element={<ModeleDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Pages privées */}
              <Route path="/mes-commandes" element={
                <PrivateRoute><MesCommandes /></PrivateRoute>
              } />
              <Route path="/mes-devis" element={
                <PrivateRoute><MesDevis /></PrivateRoute>
              } />
              <Route path="/mesures" element={
                <PrivateRoute><Mesures /></PrivateRoute>
              } />
              <Route path="/dashboard" element={
                <PrivateRoute roles={['COUTURIER']}><Dashboard /></PrivateRoute>
              } />
              <Route path="/mes-livraisons" element={
                <PrivateRoute roles={['LIVREUR']}><MesLivraisons /></PrivateRoute>
              } />
              <Route path="/profil" element={
                <PrivateRoute><Profil /></PrivateRoute>
              } />

              {/* Fallback 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App