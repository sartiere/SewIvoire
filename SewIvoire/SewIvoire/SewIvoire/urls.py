"""
URL configuration for SewIvoire project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# SewIvoire/SewIvoire/urls.py
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve as serve_media
from Sew.views import serve_frontend

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('Sew.urls')),  # Inclusion des URLs de l'app Sew

    # Médias (images des modèles) : servis AVANT le catch-all, sinon celui-ci
    # les intercepte et renvoie index.html. Fonctionne aussi en production
    # (ne dépend pas de DEBUG). /static/ et /assets/ sont servis par WhiteNoise.
    re_path(r'^media/(?P<path>.*)$', serve_media, {'document_root': settings.MEDIA_ROOT}),

    re_path(r'^.*$', serve_frontend, name='frontend'),  # Catch-all pour React Router (DOIT rester en dernier)
]