from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

# ==============================================
# SÉCURITÉ — valeurs lues depuis .env
# ==============================================

SECRET_KEY = config('SECRET_KEY')

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# Origines de confiance pour les POST/PUT/DELETE en HTTPS (CSRF).
# Lu depuis .env : ex. https://sewivoire.olt.ci
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='', cast=Csv())

# ==============================================
# APPLICATIONS INSTALLÉES
# ==============================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Packages tiers
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'drf_spectacular',

    # Applications locales
    'Sew',
]

# ==============================================
# MIDDLEWARE
# ==============================================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Doit être avant CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'SewIvoire.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'SewIvoire.wsgi.application'

# ==============================================
# BASE DE DONNÉES — credentials dans .env
# ==============================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('DB_NAME', default='sewivoire_db'),
        'USER': config('DB_USER', default='root'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    }
}

# ==============================================
# VALIDATION DES MOTS DE PASSE
# ==============================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ==============================================
# INTERNATIONALISATION
# ==============================================

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Abidjan'
USE_I18N = True
USE_TZ = True

# ==============================================
# FICHIERS STATIQUES ET MÉDIAS
# ==============================================

STATIC_URL = 'static/'
# Inclus seulement si le dossier existe (évite l'erreur W004 sur les déploiements frais)
_static_src = BASE_DIR / 'static'
STATICFILES_DIRS = [_static_src] if _static_src.exists() else []
STATIC_ROOT = BASE_DIR / 'staticfiles'  # créé automatiquement par collectstatic

# Frontend React — build dans sewivoire-frontend/dist/
# Cherche dans parent (serveur: repo=~/SewIvoire/) puis parent.parent (dev local: working dir=repo root)
_dist_candidates = [
    BASE_DIR.parent / 'sewivoire-frontend' / 'dist',
    BASE_DIR.parent.parent / 'sewivoire-frontend' / 'dist',
]
FRONTEND_DIST = next((p for p in _dist_candidates if p.exists()), None)
if FRONTEND_DIST:
    WHITENOISE_ROOT = str(FRONTEND_DIST)

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'Sew.Utilisateur'

# ==============================================
# DJANGO REST FRAMEWORK
# ==============================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    # Rate limiting global
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '200/day',
        'user': '2000/day',
        'login': '5/minute',          # ThrottledTokenObtainPairView
        'password_reset': '5/hour',   # PasswordResetView
    },
}

# ==============================================
# JWT (JSON Web Token)
# ==============================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
}

# ==============================================
# EMAIL — valeurs lues depuis .env
# ==============================================

EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='SewIvoire <noreply@sewivoire.ci>')

# URL du frontend — utilisée dans les emails de reset pour construire le lien
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# ==============================================
# CORS — valeur lue depuis .env
# ==============================================

CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)

if not CORS_ALLOW_ALL_ORIGINS:
    CORS_ALLOWED_ORIGINS = config(
        'CORS_ALLOWED_ORIGINS',
        default='http://localhost:3000,http://127.0.0.1:5500',
        cast=Csv()
    )
    CORS_ALLOW_CREDENTIALS = True

# ==============================================
# DOCUMENTATION API (drf-spectacular)
# ==============================================

SPECTACULAR_SETTINGS = {
    'TITLE': 'SewIvoire API',
    'DESCRIPTION': '''
    API de gestion d'atelier de couture SewIvoire.

    ## Fonctionnalités
    - Gestion des utilisateurs (clients, couturiers, livreurs, admins)
    - Catalogue de modèles de couture
    - Gestion des commandes et paiements
    - Suivi des livraisons
    - Gestion des stocks de matériaux
    - Messagerie et notifications

    ## Authentification
    Utilisez le endpoint `/api/token/` avec vos identifiants pour obtenir un token JWT.
    Ajoutez ensuite `Authorization: Bearer <token>` dans les headers.
    ''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'CONTACT': {
        'name': 'SewIvoire Support',
        'email': 'support@sewivoire.com',
    },
    'LICENSE': {'name': 'MIT License'},
    'TAGS': [
        {'name': 'utilisateurs', 'description': 'Gestion des utilisateurs'},
        {'name': 'modeles', 'description': 'Catalogue de modèles'},
        {'name': 'commandes', 'description': 'Gestion des commandes'},
        {'name': 'paiements', 'description': 'Gestion des paiements'},
        {'name': 'livraisons', 'description': 'Suivi des livraisons'},
        {'name': 'materiaux', 'description': 'Gestion des stocks'},
        {'name': 'notifications', 'description': 'Notifications utilisateurs'},
        {'name': 'messages', 'description': 'Messagerie interne'},
        {'name': 'favoris', 'description': 'Modèles favoris'},
    ],
}

# ==============================================
# LOGGING
# ==============================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'debug.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'Sew': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

# ==============================================
# SÉCURITÉ RENFORCÉE (Production uniquement)
# ==============================================

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
