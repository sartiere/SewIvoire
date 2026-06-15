from django.urls import path, include
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
    TokenBlacklistView,
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

from .throttles import LoginRateThrottle
from .views import (
    UtilisateurViewSet, CategorieViewSet, ModeleViewSet,
    MateriauViewSet, CommandeViewSet, MesureViewSet,
    LivraisonViewSet, LivreurViewSet, PaiementViewSet,
    NotificationViewSet, MessageViewSet, FavorisViewSet,
    MouvementStockViewSet, AvisViewSet, CodePromoViewSet, DevisViewSet,
    PasswordResetView, PasswordResetConfirmView,
    ParametreAtelierView,
    home,
)


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Vue JWT avec rate-limiting : 5 tentatives/minute par IP."""
    throttle_classes = [LoginRateThrottle]


class ThrottledTokenRefreshView(TokenRefreshView):
    """Refresh JWT avec rate-limiting identique."""
    throttle_classes = [LoginRateThrottle]

router = DefaultRouter()

router.register(r'utilisateurs', UtilisateurViewSet, basename='utilisateurs')
router.register(r'categories', CategorieViewSet, basename='categories')
router.register(r'modeles', ModeleViewSet, basename='modeles')
router.register(r'materiaux', MateriauViewSet, basename='materiaux')
router.register(r'commandes', CommandeViewSet, basename='commandes')
router.register(r'mesures', MesureViewSet, basename='mesures')
router.register(r'livraisons', LivraisonViewSet, basename='livraisons')
router.register(r'livreurs', LivreurViewSet, basename='livreurs')
router.register(r'paiements', PaiementViewSet, basename='paiements')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'messages', MessageViewSet, basename='messages')
router.register(r'favoris',           FavorisViewSet,        basename='favoris')
router.register(r'mouvements-stock',  MouvementStockViewSet, basename='mouvements-stock')
router.register(r'avis',             AvisViewSet,           basename='avis')
router.register(r'code-promos',      CodePromoViewSet,      basename='code-promos')
router.register(r'devis',            DevisViewSet,          basename='devis')

urlpatterns = [
    # Page d'accueil de l'API
    path('', home, name='home'),

    # API REST
    path('api/', include(router.urls)),
    path('api/auth/', include('rest_framework.urls')),

    # Inscription publique — raccourci direct.
    # AllowAny doit être passé ici explicitement : as_view() n'extrait pas
    # automatiquement le permission_classes du décorateur @action.
    path('api/register/',
         UtilisateurViewSet.as_view({'post': 'register'}, permission_classes=[AllowAny]),
         name='register'),

    # JWT Authentication — throttlé à 5 req/min par IP
    path('api/token/', ThrottledTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', ThrottledTokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # Déconnexion — invalide le refresh token via la blacklist JWT
    path('api/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),

    # Paramètres atelier
    path('api/parametres/', ParametreAtelierView.as_view(), name='parametres-atelier'),

    # Réinitialisation de mot de passe
    path('api/password/reset/', PasswordResetView.as_view(), name='password_reset'),
    path('api/password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # Documentation API
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]