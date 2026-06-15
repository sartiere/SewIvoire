# SewIvoire

Plateforme de gestion d'atelier de couture ivoirien, conçue pour les couturiers et leurs clients. Permet de commander des modèles, gérer des devis, suivre les livraisons et effectuer des paiements en ligne (simulation).

---

## Technologies utilisées

| Couche | Stack |
|--------|-------|
| Backend | Python 3.13 · Django 6 · Django REST Framework · SimpleJWT · drf-spectacular |
| Base de données | MySQL 8 |
| Frontend | React 19 · Vite · Tailwind CSS · Lucide React · Recharts |
| Auth | JWT (access + refresh token · blacklist) |
| Déploiement | Gunicorn · Nginx (backend) · Vercel (frontend) |

---

## Structure du projet

```
Sew/
├── SewIvoire/                    # Backend Django
│   ├── SewIvoire/                # Configuration Django
│   │   ├── settings.py           # Paramètres (variables via .env)
│   │   ├── urls.py               # Routes globales
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── Sew/                      # Application principale
│   │   ├── models.py             # Tous les modèles (Commande, Devis, Livraison…)
│   │   ├── views.py              # ViewSets DRF + APIViews
│   │   ├── serializers.py        # Sérialiseurs
│   │   ├── urls.py               # Router + routes API
│   │   ├── admin.py              # Interface d'administration
│   │   ├── filters.py            # Filtres django-filter
│   │   └── migrations/           # Migrations de base de données
│   ├── manage.py
│   ├── requirements.txt
│   └── .env                      # Variables d'environnement (non versionné)
├── sewivoire-frontend/           # Frontend React + Vite
│   ├── src/
│   │   ├── api/                  # Configuration Axios
│   │   ├── components/           # Composants réutilisables (Navbar, Footer…)
│   │   ├── context/              # AuthContext (JWT)
│   │   └── pages/                # Pages (Accueil, Catalogue, MesCommandes…)
│   ├── package.json
│   └── vite.config.js
├── .github/
│   └── workflows/
│       └── deploy.yml            # Pipeline CI/CD GitHub Actions
├── .gitignore
└── README.md
```

---

## Fonctionnalités principales

- Catalogue de modèles avec filtres et favoris
- Commande en ligne avec saisie de l'adresse de livraison
- Demande et gestion de devis personnalisés
- Simulation de paiement (Mobile Money · Carte · Espèces) avec choix acompte/total
- Suivi de livraison en temps réel
- Dashboard couturier : commandes, stocks, paiements, analytics, paramètres
- Codes promo, avis clients, export CSV/PDF
- Administration Django personnalisée (SewIvoire — Espace Couturier)

---

## Prérequis

- Python 3.11+
- Node.js 20+
- MySQL 8+
- Git

---

## Exécution en local

### 1. Cloner le dépôt

```bash
git clone https://github.com/<votre-compte>/sewivoire.git
cd sewivoire
```

### 2. Backend Django

```bash
cd SewIvoire/SewIvoire

# Créer et activer l'environnement virtuel
python -m venv env
# Windows
env\Scripts\activate
# Linux / macOS
source env/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

Créer le fichier `.env` dans `SewIvoire/SewIvoire/` :

```env
SECRET_KEY=votre-cle-secrete-django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=sewivoire_db
DB_USER=root
DB_PASSWORD=votre-mot-de-passe
DB_HOST=localhost
DB_PORT=3306
```

Créer la base de données MySQL, puis appliquer les migrations :

```bash
mysql -u root -p -e "CREATE DATABASE sewivoire_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

L'API est disponible sur `http://localhost:8000`.  
Documentation Swagger : `http://localhost:8000/api/docs/`

### 3. Frontend React

```bash
cd sewivoire-frontend

npm install
```

Créer le fichier `.env.local` dans `sewivoire-frontend/` :

```env
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

L'application est disponible sur `http://localhost:5173`.

---

## Variables d'environnement de production

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Clé secrète Django (longue chaîne aléatoire) |
| `DEBUG` | `False` en production |
| `ALLOWED_HOSTS` | Domaine(s) autorisé(s) |
| `DB_NAME` | Nom de la base de données MySQL |
| `DB_USER` | Utilisateur MySQL |
| `DB_PASSWORD` | Mot de passe MySQL |
| `DB_HOST` | Hôte MySQL |
| `DB_PORT` | Port MySQL (défaut : 3306) |

---

## Licence

Projet étudiant — usage éducatif uniquement.
