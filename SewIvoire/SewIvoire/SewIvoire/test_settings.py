from .settings import *

# Base SQLite en mémoire pour les tests CI — pas besoin de serveur MySQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}
