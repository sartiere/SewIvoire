import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import API from '../api/axios'
import { useAuth } from '../context/AuthContext'

function NotificationBell() {
  const [notifs, setNotifs]   = useState([])
  const [nonLues, setNonLues] = useState(0)
  const [ouvert, setOuvert]   = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Espace principal de l'utilisateur (où on l'amène en cliquant une notif)
  const destination = user?.role === 'COUTURIER' ? '/dashboard'
    : user?.role === 'LIVREUR' ? '/mes-livraisons'
    : '/mes-commandes'

  const ouvrirNotif = (n) => {
    setOuvert(false)
    navigate(n.type_message === 'PROMO' && user?.role === 'CLIENT' ? '/catalogue' : destination)
  }

  const chargerCompteur = () => {
    API.get('/api/notifications/non_lues/')
      .then(r => setNonLues(r.data.non_lues || 0))
      .catch(() => {})
  }

  // Compteur au montage + rafraîchissement périodique (pour voir arriver les notifs en direct)
  useEffect(() => {
    chargerCompteur()
    const id = setInterval(chargerCompteur, 20000)
    return () => clearInterval(id)
  }, [])

  // Fermer le panneau au clic à l'extérieur
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const basculer = async () => {
    const prochain = !ouvert
    setOuvert(prochain)
    if (!prochain) return
    try {
      const r = await API.get('/api/notifications/')
      const liste = r.data.results || r.data
      setNotifs(liste)
      // On efface le badge (mais on garde la surbrillance des non-lues pour CETTE ouverture)
      if (liste.some(n => !n.est_lue)) {
        await API.post('/api/notifications/marquer_toutes_lues/')
        setNonLues(0)
      }
    } catch { /* silencieux */ }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={basculer} className="relative text-gray-300 hover:text-or transition-colors p-1" aria-label="Notifications">
        <Bell className="w-5 h-5" />
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-titre font-bold text-nuit">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-400 text-sm">
                <Bell className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                Aucune notification pour le moment
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id_notif}
                  onClick={() => ouvrirNotif(n)}
                  className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.est_lue ? 'bg-or/5' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.est_lue && <span className="mt-1.5 w-2 h-2 rounded-full bg-or flex-shrink-0" />}
                    <div className={!n.est_lue ? '' : 'pl-4'}>
                      <p className="text-sm text-nuit leading-snug">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
