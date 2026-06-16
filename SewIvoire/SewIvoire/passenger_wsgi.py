import sys
import os
import pymysql

pymysql.version_info = (2, 2, 7, "final", 0)
pymysql.install_as_MySQLdb()

VENV_PATH = "/home3/sc1zds18/virtualenv/SewIvoire/SewIvoire/SewIvoire/3.12/lib/python3.12/site-packages"

if VENV_PATH not in sys.path:
    sys.path.insert(0, VENV_PATH)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "SewIvoire.settings")

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
