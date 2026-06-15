import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Smile, Shirt, Star, Zap, Scissors, Truck, Gem } from 'lucide-react'
import API from '../api/axios'
import ModeleCard from '../components/ModeleCard'
import heroImage from '../assets/hero.webp'

function Accueil() {
  const [modeles, setModeles] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    API.get('/api/modeles/')
      .then(res => {
        const data = res.data.results || res.data
        setModeles(data.slice(0, 6))
      })
      .catch(err => console.error(err))
      .finally(() => setChargement(false))
  }, [])

  const stats = [
    { chiffre: '500+', label: 'Clients satisfaits',   Icon: Smile },
    { chiffre: '200+', label: 'Modèles disponibles',  Icon: Shirt },
    { chiffre: '5★',   label: 'Note moyenne',          Icon: Star  },
    { chiffre: '48h',  label: 'Délai minimum',         Icon: Zap   },
  ]

  const avantages = [
    { Icon: Scissors, titre: 'Sur mesure',      desc: 'Chaque vêtement est confectionné selon vos mensurations exactes pour un ajustement parfait.' },
    { Icon: Truck,    titre: 'Livraison rapide', desc: 'Livraison à domicile partout à Abidjan. Votre commande arrive directement chez vous.' },
    { Icon: Gem,      titre: 'Qualité premium',  desc: 'Des matériaux soigneusement sélectionnés et un savoir-faire artisanal reconnu.' },
  ]

  return (
    <div>

      {/* ══════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>

        {/* Motif décoratif */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-or rounded-full"></div>
          <div className="absolute top-32 left-32 w-16 h-16 border-2 border-or rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 border-4 border-or rounded-full"></div>
          <div className="absolute bottom-40 right-40 w-24 h-24 border-2 border-or rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-or rounded-full"></div>
          <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-or rounded-full"></div>
        </div>

        <div className="absolute inset-0 bg-black opacity-60"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Texte */}
            <div>
              <span className="inline-flex items-center gap-2 bg-or text-nuit text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                <Scissors className="w-4 h-4" /> Atelier de couture ivoirien
              </span>
              <h1 className="font-titre text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                L'élégance sur{' '}
                <span className="text-or">mesure</span>,{' '}
                à votre image
              </h1>
              <p className="text-gray-300 text-lg leading-relaxed mb-8">
                Découvrez notre collection de vêtements confectionnés à la main,
                alliant le savoir-faire traditionnel ivoirien aux tendances modernes.
                Chaque pièce est unique, comme vous.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/catalogue" className="bg-or text-nuit px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-500 transition-colors duration-300">
                  Voir le catalogue
                </Link>
                <Link to="/register" className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:border-or hover:text-or transition-colors duration-300">
                  Créer un compte
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              {stats.map(({ chiffre, label, Icon }, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center">
                  <Icon className="w-8 h-8 text-or mx-auto mb-2" />
                  <div className="text-or font-titre text-3xl font-bold">{chiffre}</div>
                  <div className="text-gray-300 text-sm mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION AVANTAGES
      ══════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {avantages.map(({ Icon, titre, desc }, i) => (
              <div key={i} className="text-center p-8 rounded-2xl hover:bg-ivoire transition-colors duration-300">
                <div className="flex justify-center mb-4">
                  <Icon className="w-12 h-12 text-or" />
                </div>
                <h3 className="font-titre text-xl font-semibold text-nuit mb-3">{titre}</h3>
                <p className="text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          MODÈLES EN VEDETTE
      ══════════════════════════════════════ */}
      <section className="py-16 bg-ivoire">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-12">
            <span className="text-or font-semibold text-sm uppercase tracking-widest">Notre collection</span>
            <h2 className="font-titre text-4xl font-bold text-nuit mt-2">Modèles en vedette</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Découvrez nos créations les plus populaires, confectionnées avec passion et précision.
            </p>
          </div>

          {chargement ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-80 animate-pulse">
                  <div className="bg-gray-200 h-64 rounded-t-2xl"></div>
                  <div className="p-4 space-y-2">
                    <div className="bg-gray-200 h-4 rounded w-3/4"></div>
                    <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : modeles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {modeles.map(modele => (
                <ModeleCard key={modele.id_modele} modele={modele} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Shirt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Aucun modèle disponible pour le moment.</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link to="/catalogue" className="inline-block bg-nuit text-white px-10 py-4 rounded-xl font-semibold hover:bg-or hover:text-nuit transition-colors duration-300">
              Voir tout le catalogue →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════ */}
      <section className="py-20 bg-nuit text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-titre text-4xl font-bold text-white mb-4">Prêt(e) à créer votre tenue ?</h2>
          <p className="text-gray-300 text-lg mb-8">
            Inscrivez-vous gratuitement et passez votre première commande en quelques minutes.
          </p>
          <Link to="/register" className="inline-block bg-or text-nuit px-10 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-500 transition-colors duration-300">
            Commencer maintenant
          </Link>
        </div>
      </section>

    </div>
  )
}

export default Accueil
