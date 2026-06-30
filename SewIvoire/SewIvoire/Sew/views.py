import csv
import io
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import viewsets, mixins, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from decimal import Decimal, InvalidOperation
from django.db.models import Sum, Q, F, Value, DecimalField, Count
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from datetime import timedelta

from .models import (
    Utilisateur, Categorie, Modele, Materiau, Commande,
    Mesure, Livraison, Livreur, Paiement, Notification,
    Message, Favoris, Consomme, MouvementStock, Avis, CodePromo, Devis,
    ParametreAtelier, Recours,
)
from .serializers import (
    UtilisateurSerializer, CategorieSerializer, ModeleListSerializer,
    ModeleDetailSerializer, MateriauSerializer, CommandeListSerializer,
    CommandeDetailSerializer, CommandeCreateSerializer, MesureSerializer,
    LivraisonSerializer, LivreurSerializer, PaiementSerializer,
    NotificationSerializer, MessageSerializer, FavorisSerializer,
    ConsommeSerializer, MouvementStockSerializer, AvisSerializer,
    CodePromoSerializer,
    DevisListSerializer, DevisDetailSerializer, DevisCreateSerializer,
    PasswordResetSerializer, PasswordResetConfirmSerializer,
    ParametreAtelierSerializer,
)
from .filters import ModeleFilter, MouvementStockFilter


# ==============================================
# VUE D'ACCUEIL / FRONTEND REACT
# ==============================================

def serve_frontend(request, *args, **kwargs):
    frontend_dist = getattr(settings, 'FRONTEND_DIST', None)
    if frontend_dist:
        index_path = frontend_dist / 'index.html'
        if index_path.exists():
            with open(index_path, 'r', encoding='utf-8') as f:
                return HttpResponse(f.read(), content_type='text/html')
    return JsonResponse({
        'message': "Bienvenue sur l'API SewIvoire",
        'version': '1.0',
        'endpoints': {
            'api': '/api/',
            'admin': '/admin/',
            'documentation': '/api/docs/',
            'token': '/api/token/',
        },
        'status': 'online'
    })


def home(request):
    return serve_frontend(request)


# ==============================================
# PERMISSIONS PERSONNALISÉES
# ==============================================

def is_admin_or_couturier(user):
    """Vérifie si l'utilisateur est couturier"""
    return user.is_staff or user.role == 'COUTURIER'

# ==============================================
# 1. UTILISATEUR
# ==============================================

class UtilisateurViewSet(viewsets.ModelViewSet):
    serializer_class = UtilisateurSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admins et couturiers voient tous les comptes
        if is_admin_or_couturier(self.request.user):
            return Utilisateur.objects.all()
        # Un client ne peut voir et modifier que son propre profil
        return Utilisateur.objects.filter(pk=self.request.user.pk)

    @action(detail=False, methods=['get'])
    def clients(self, request):
        """Liste des clients (admin/couturier uniquement)"""
        if not is_admin_or_couturier(request.user):
            return Response({'error': 'Accès non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(
            Utilisateur.objects.filter(role='CLIENT'), many=True
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def couturiers(self, request):
        """Liste des couturiers (admin/couturier uniquement)"""
        if not is_admin_or_couturier(request.user):
            return Response({'error': 'Accès non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(
            Utilisateur.objects.filter(role='COUTURIER'), many=True
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def livreurs(self, request):
        """Liste des livreurs utilisateurs (admin/couturier uniquement)"""
        if not is_admin_or_couturier(request.user):
            return Response({'error': 'Accès non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(
            Utilisateur.objects.filter(role='LIVREUR'), many=True
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Retourne le profil de l'utilisateur connecté"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        """Inscription publique — crée uniquement des comptes CLIENT"""
        data = request.data.copy()
        data['role'] = 'CLIENT'
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {k: v for k, v in serializer.data.items() if k != 'password'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==============================================
# 2. CATEGORIE
# ==============================================

class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# ==============================================
# 3. MODELE
# ==============================================

class IsAtelierOrReadOnly(permissions.BasePermission):
    """Lecture publique du catalogue ; création / modification réservée au couturier/admin.
    De plus, un couturier ne peut modifier que SES propres objets (modèle / matériau)."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and is_admin_or_couturier(request.user))

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        proprietaire = getattr(obj, 'couturier', None)
        return proprietaire is None or proprietaire == request.user


class ModeleViewSet(viewsets.ModelViewSet):
    queryset = Modele.objects.select_related('categorie').all()
    permission_classes = [IsAtelierOrReadOnly]
    filterset_class = ModeleFilter
    search_fields   = ['nom', 'categorie__libelle']
    ordering_fields = ['prix', 'nom', 'delai']
    ordering        = ['nom']

    def get_serializer_class(self):
        if self.action == 'list':
            return ModeleListSerializer
        return ModeleDetailSerializer

    def perform_create(self, serializer):
        # Le couturier qui publie devient propriétaire du modèle
        couturier = self.request.user if getattr(self.request.user, 'role', None) == 'COUTURIER' else None
        serializer.save(couturier=couturier)

    @action(detail=False, methods=['get'])
    def mes_modeles(self, request):
        """Les modèles publiés par le couturier connecté."""
        qs = self.get_queryset().filter(couturier=request.user)
        serializer = ModeleListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def materiaux(self, request, pk=None):
        """Liste des matériaux nécessaires pour ce modèle"""
        modele = self.get_object()
        consommations = Consomme.objects.filter(modele=modele).select_related('materiau')
        serializer = ConsommeSerializer(consommations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def par_categorie(self, request):
        """Regroupe les modèles par catégorie"""
        categories = Categorie.objects.prefetch_related('modeles').all()
        data = []
        for cat in categories:
            data.append({
                'categorie': cat.libelle,
                'modeles': ModeleListSerializer(cat.modeles.all(), many=True).data
            })
        return Response(data)


# ==============================================
# 4. MATERIAU
# ==============================================

class MateriauViewSet(viewsets.ModelViewSet):
    queryset = Materiau.objects.all()
    serializer_class = MateriauSerializer
    permission_classes = [IsAtelierOrReadOnly]  # écriture réservée couturier/admin

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Materiau.objects.all()
        if getattr(user, 'role', None) == 'COUTURIER':
            return Materiau.objects.filter(couturier=user)
        return Materiau.objects.none()

    def perform_create(self, serializer):
        couturier = self.request.user if getattr(self.request.user, 'role', None) == 'COUTURIER' else None
        serializer.save(couturier=couturier)

    @action(detail=True, methods=['post'])
    def mouvement(self, request, pk=None):
        """
        Enregistre un mouvement de stock ET met à jour la quantité du matériau.
        ENTREE : +quantite | SORTIE : -quantite | AJUSTEMENT : fixe le stock à quantite.
        """
        if not is_admin_or_couturier(request.user):
            raise PermissionDenied("Réservé à l'atelier.")
        materiau = self.get_object()
        type_mvt = request.data.get('type_mouvement')
        if type_mvt not in ('ENTREE', 'SORTIE', 'AJUSTEMENT'):
            return Response({'error': "Type invalide (ENTREE, SORTIE ou AJUSTEMENT)."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            quantite = Decimal(str(request.data.get('quantite')))
        except (TypeError, InvalidOperation):
            return Response({'error': "Quantité invalide."}, status=status.HTTP_400_BAD_REQUEST)
        if quantite <= 0:
            return Response({'error': "La quantité doit être positive."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if type_mvt == 'ENTREE':
                materiau.quantite_stock += quantite
            elif type_mvt == 'SORTIE':
                if materiau.quantite_stock < quantite:
                    return Response(
                        {'error': f"Stock insuffisant (disponible : {materiau.quantite_stock})."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                materiau.quantite_stock -= quantite
            else:  # AJUSTEMENT : nouvelle valeur absolue
                materiau.quantite_stock = quantite
            materiau.save(update_fields=['quantite_stock'])
            MouvementStock.objects.create(
                materiau=materiau,
                type_mouvement=type_mvt,
                quantite=quantite,
                reference=(request.data.get('reference') or None),
                notes=(request.data.get('notes') or None),
            )
        return Response({'status': 'ok', 'quantite_stock': str(materiau.quantite_stock)})

    @action(detail=False, methods=['get'])
    def alertes_stock(self, request):
        """Matériaux sous le seuil d'alerte — filtrés en SQL, sans chargement Python"""
        alertes = self.get_queryset().filter(
            seuil_alerte__isnull=False,
            quantite_stock__lte=F('seuil_alerte')
        )
        serializer = self.get_serializer(alertes, many=True)
        return Response(serializer.data)


# ==============================================
# 5. COMMANDE
# ==============================================

# Workflow de statut : seules les transitions listées sont autorisées.
# Les états LIVREE et ANNULEE sont terminaux (aucune transition possible).
TRANSITIONS_VALIDES = {
    'EN_ATTENTE': {'CONFIRMEE', 'ANNULEE'},
    'CONFIRMEE':  {'EN_COURS',  'ANNULEE'},
    'EN_COURS':   {'LIVREE',    'ANNULEE'},
    'LIVREE':     set(),
    'ANNULEE':    set(),
}

# Statuts qui déclenchent un email au client
_STATUTS_EMAIL = {'CONFIRMEE', 'EN_COURS', 'LIVREE', 'ANNULEE'}

def _envoyer_email_statut(commande):
    """Envoie un email au client lors d'un changement de statut important."""
    client = commande.utilisateur
    if not client.email or commande.statut not in _STATUTS_EMAIL:
        return

    prenom = client.first_name or client.username
    modele = commande.modele.nom
    num = commande.id_commande
    lien = f"{settings.FRONTEND_URL}/mes-commandes"

    contenu = {
        'CONFIRMEE': (
            f"✅ Commande #{num} confirmée",
            (
                f"Bonjour {prenom},\n\n"
                f"Bonne nouvelle ! Votre commande #{num} ({modele}) a été confirmée "
                f"par notre équipe. La confection va bientôt commencer.\n\n"
                f"Suivez l'avancement ici : {lien}\n\n"
                f"Merci de votre confiance,\nL'équipe SewIvoire"
            ),
        ),
        'EN_COURS': (
            f"🧵 Confection de votre commande #{num} en cours",
            (
                f"Bonjour {prenom},\n\n"
                f"La confection de votre commande #{num} ({modele}) a démarré. "
                f"Vous serez notifié(e) dès qu'elle sera prête pour la livraison.\n\n"
                f"Suivez l'avancement ici : {lien}\n\n"
                f"Cordialement,\nL'équipe SewIvoire"
            ),
        ),
        'LIVREE': (
            f"📦 Votre commande #{num} a été livrée !",
            (
                f"Bonjour {prenom},\n\n"
                f"Votre commande #{num} ({modele}) a été livrée avec succès. "
                f"Nous espérons qu'elle vous plaît !\n\n"
                f"Partagez votre expérience en laissant un avis : {lien}\n\n"
                f"Merci de votre confiance,\nL'équipe SewIvoire"
            ),
        ),
        'ANNULEE': (
            f"❌ Votre commande #{num} a été annulée",
            (
                f"Bonjour {prenom},\n\n"
                f"Nous vous informons que votre commande #{num} ({modele}) a été annulée. "
                f"Si vous avez des questions, n'hésitez pas à nous contacter.\n\n"
                f"Cordialement,\nL'équipe SewIvoire"
            ),
        ),
    }

    sujet, corps = contenu[commande.statut]
    try:
        send_mail(
            subject=sujet,
            message=corps,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[client.email],
            fail_silently=False,
        )
    except Exception:
        pass  # Ne pas bloquer le changement de statut si l'envoi échoue


class CommandeViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _base_commande_qs(self):
        """
        Queryset de base : joint utilisateur + modèle, précharge les paiements,
        et annote total_paye_sql en une seule requête SQL.
        """
        return (
            Commande.objects
            .select_related('utilisateur', 'modele', 'couturier')
            .prefetch_related('paiements')
            .annotate(
                total_paye_sql=Coalesce(
                    Sum('paiements__montant', filter=Q(paiements__statut='CONFIRME')),
                    Value(Decimal('0')),
                    output_field=DecimalField(max_digits=10, decimal_places=2)
                )
            )
        )

    def get_queryset(self):
        qs = self._base_commande_qs()
        if is_admin_or_couturier(self.request.user):
            return qs
        return qs.filter(utilisateur=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return CommandeListSerializer
        elif self.action == 'create':
            return CommandeCreateSerializer
        return CommandeDetailSerializer

    def perform_create(self, serializer):
        # Seuls les clients passent commande (couturiers/livreurs font partie de l'atelier)
        if self.request.user.role != 'CLIENT':
            raise PermissionDenied("Seuls les clients peuvent passer une commande.")
        commande = serializer.save(utilisateur=self.request.user)
        # Prévenir le couturier propriétaire du modèle (la commande lui est destinée)
        client = self.request.user
        nom_client = f"{client.first_name} {client.last_name}".strip() or client.username
        if commande.couturier:
            Notification.objects.create(
                utilisateur=commande.couturier,
                message=f"Nouvelle commande #{commande.id_commande} — {commande.modele.nom} — de {nom_client}",
                type_message='STATUT',
            )

    def destroy(self, request, *args, **kwargs):
        """Un client ne peut supprimer que ses commandes ANNULEE."""
        commande = self.get_object()
        if is_admin_or_couturier(request.user):
            return super().destroy(request, *args, **kwargs)
        if commande.statut != 'ANNULEE':
            return Response(
                {'error': 'Seules les commandes annulées peuvent être supprimées.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def changer_mode_livraison(self, request, pk=None):
        """
        Le client peut changer Livraison <-> Retrait tant que la commande est
        encore « En attente » (rien n'est engagé : ni livreur, ni production).
        """
        commande = self.get_object()

        # Seul le propriétaire de la commande (ou l'atelier) peut modifier
        if commande.utilisateur != request.user and not is_admin_or_couturier(request.user):
            raise PermissionDenied("Vous ne pouvez pas modifier cette commande.")

        # Uniquement tant que la commande n'est pas engagée
        if commande.statut != 'EN_ATTENTE':
            return Response(
                {'error': "Le mode ne peut être changé que tant que la commande est « En attente »."},
                status=status.HTTP_400_BAD_REQUEST
            )

        nouveau_mode = request.data.get('mode_livraison')
        if nouveau_mode not in ('LIVRAISON', 'RETRAIT'):
            return Response(
                {'error': "Mode invalide (attendu : LIVRAISON ou RETRAIT)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            if nouveau_mode == 'LIVRAISON':
                adresse = (request.data.get('adresse_livraison') or '').strip()
                if not adresse:
                    return Response(
                        {'error': "L'adresse de livraison est requise."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                livraison = Livraison.objects.filter(commande=commande).first()
                if livraison:
                    livraison.adresse_client = adresse
                    livraison.save(update_fields=['adresse_client'])
                else:
                    Livraison.objects.create(commande=commande, adresse_client=adresse)
            else:  # RETRAIT : on retire la livraison éventuelle et on libère le livreur
                for liv in Livraison.objects.filter(commande=commande):
                    if liv.livreur:
                        liv.livreur.est_disponible = True
                        liv.livreur.save(update_fields=['est_disponible'])
                    liv.delete()

            commande.mode_livraison = nouveau_mode
            commande.save(update_fields=['mode_livraison'])

        return Response({'status': 'Mode de livraison mis à jour', 'mode_livraison': nouveau_mode})

    @action(detail=True, methods=['post'])
    def archiver(self, request, pk=None):
        """
        Le client archive (masque) une commande terminée de son espace.
        La commande reste en base et visible par l'atelier. Réversible via {'archivee': false}.
        """
        commande = self.get_object()
        if commande.utilisateur != request.user and not is_admin_or_couturier(request.user):
            raise PermissionDenied("Vous ne pouvez pas modifier cette commande.")
        if commande.statut not in ('LIVREE', 'ANNULEE'):
            return Response(
                {'error': "Seules les commandes livrées ou annulées peuvent être archivées."},
                status=status.HTTP_400_BAD_REQUEST
            )
        commande.archivee_client = bool(request.data.get('archivee', True))
        commande.save(update_fields=['archivee_client'])
        return Response({'status': 'ok', 'archivee_client': commande.archivee_client})

    @action(detail=True, methods=['post'])
    def faire_recours(self, request, pk=None):
        """Le client conteste une commande livrée (ne correspond pas au modèle). Valable 72h."""
        from datetime import timedelta
        commande = self.get_object()
        if commande.utilisateur != request.user:
            raise PermissionDenied("Vous ne pouvez faire un recours que sur vos propres commandes.")
        if commande.statut != 'LIVREE':
            return Response({'error': "Un recours n'est possible que sur une commande livrée."},
                            status=status.HTTP_400_BAD_REQUEST)
        if not commande.date_livraison or (timezone.now() - commande.date_livraison) > timedelta(hours=72):
            return Response({'error': "Le délai de recours de 72h est dépassé."},
                            status=status.HTTP_400_BAD_REQUEST)
        if Recours.objects.filter(commande=commande).exists():
            return Response({'error': "Un recours a déjà été déposé pour cette commande."},
                            status=status.HTTP_400_BAD_REQUEST)
        motif = (request.data.get('motif') or '').strip()
        if not motif:
            return Response({'error': "Veuillez décrire ce qui ne correspond pas."},
                            status=status.HTTP_400_BAD_REQUEST)
        recours = Recours.objects.create(commande=commande, motif=motif)
        if commande.couturier:
            Notification.objects.create(
                utilisateur=commande.couturier,
                message=f"Recours sur la commande #{commande.id_commande} ({commande.modele.nom}) — à traiter.",
                type_message='ALERTE',
            )
        return Response({'status': 'Recours enregistré', 'id_recours': recours.id_recours})

    @action(detail=True, methods=['post'])
    def repondre_recours(self, request, pk=None):
        """Le couturier propriétaire traite le recours : ACCEPTE ou REFUSE (+ réponse)."""
        commande = self.get_object()
        if not is_admin_or_couturier(request.user):
            raise PermissionDenied("Réservé à l'atelier.")
        if not request.user.is_staff and commande.couturier != request.user:
            raise PermissionDenied("Cette commande n'est pas la vôtre.")
        if not hasattr(commande, 'recours'):
            return Response({'error': "Aucun recours pour cette commande."},
                            status=status.HTTP_400_BAD_REQUEST)
        decision = request.data.get('decision')
        if decision not in ('ACCEPTE', 'REFUSE'):
            return Response({'error': "Décision invalide (ACCEPTE ou REFUSE)."},
                            status=status.HTTP_400_BAD_REQUEST)
        recours = commande.recours
        recours.statut = decision
        recours.reponse_couturier = (request.data.get('reponse') or '').strip() or None
        recours.date_reponse = timezone.now()
        recours.save()
        Notification.objects.create(
            utilisateur=commande.utilisateur,
            message=f"Votre recours sur la commande #{commande.id_commande} a été {'accepté' if decision == 'ACCEPTE' else 'refusé'}.",
            type_message='STATUT',
        )
        return Response({'status': 'Recours traité', 'statut': recours.statut})

    @action(detail=True, methods=['get'])
    def recette(self, request, pk=None):
        """Matériaux du modèle (quantité conseillée) + stock actuel du couturier.
        Sert à pré-remplir la saisie de consommation à la confirmation.
        Réservé à l'atelier — donnée privée au couturier."""
        commande = self.get_object()
        if not is_admin_or_couturier(request.user):
            raise PermissionDenied("Réservé à l'atelier.")
        consommations = Consomme.objects.filter(
            modele=commande.modele
        ).select_related('materiau')
        materiaux = [{
            'materiau': c.materiau.id_materiau,
            'nom': c.materiau.nom_materiau,
            'unite': c.materiau.get_unite_display(),
            'quantite_conseillee': str(c.quantite_necessaire),
            'stock_actuel': str(c.materiau.quantite_stock),
        } for c in consommations]
        return Response({
            'deja_deduit': commande.mouvements_stock.filter(type_mouvement='SORTIE').exists(),
            'materiaux': materiaux,
        })

    @action(detail=True, methods=['post'])
    def changer_statut(self, request, pk=None):
        """Change le statut d'une commande"""
        commande = self.get_object()
        # Le couturier qui traite une commande non assignée se l'attribue automatiquement
        if (getattr(request.user, 'role', None) == 'COUTURIER'
                and not request.user.is_staff and commande.couturier is None):
            commande.couturier = request.user
            commande.save(update_fields=['couturier'])
        nouveau_statut = request.data.get('statut')
        statuts_valides = dict(Commande._meta.get_field('statut').choices)

        if nouveau_statut not in statuts_valides:
            return Response(
                {'error': f"Statut invalide. Valeurs acceptées : {list(statuts_valides.keys())}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérification du workflow : seules certaines transitions sont autorisées
        transitions_possibles = TRANSITIONS_VALIDES.get(commande.statut, set())
        if nouveau_statut not in transitions_possibles:
            return Response(
                {
                    'error': (
                        f"Transition interdite : '{commande.get_statut_display()}' "
                        f"→ '{dict(Commande._meta.get_field('statut').choices)[nouveau_statut]}'."
                    ),
                    'transitions_possibles': sorted(transitions_possibles) if transitions_possibles
                    else ['Aucune — état terminal'],
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Bloquer la confirmation si le client n'a pas renseigné ses mesures
        if nouveau_statut == 'CONFIRMEE':
            if not Mesure.objects.filter(utilisateur=commande.utilisateur).exists():
                return Response(
                    {
                        'error': (
                            "Impossible de confirmer : le client "
                            f"({commande.utilisateur.first_name} {commande.utilisateur.last_name}) "
                            "n'a pas encore renseigné ses mesures."
                        ),
                        'action_requise': 'mesures_manquantes',
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        with transaction.atomic():
            # Déduction du stock à la CONFIRMATION : le couturier saisit les quantités
            # réellement consommées (elles varient selon la taille / les mesures du client).
            # On ne déduit qu'au premier passage en CONFIRMEE et si rien n'a encore été
            # sorti pour cette commande (évite tout double décompte).
            if (nouveau_statut == 'CONFIRMEE'
                    and commande.statut != 'CONFIRMEE'
                    and not commande.mouvements_stock.filter(type_mouvement='SORTIE').exists()):
                lignes = []
                for item in (request.data.get('consommations') or []):
                    try:
                        mat = Materiau.objects.get(pk=item.get('materiau'))
                        qte = Decimal(str(item.get('quantite')))
                    except (Materiau.DoesNotExist, TypeError, ValueError, InvalidOperation):
                        continue
                    if qte <= 0:
                        continue
                    # Sécurité : le matériau doit appartenir au couturier de la commande
                    if (commande.couturier_id and mat.couturier_id
                            and mat.couturier_id != commande.couturier_id):
                        continue
                    lignes.append((mat, qte))

                # Vérifier les stocks avant de déduire
                insuffisants = [(m, q) for m, q in lignes if m.quantite_stock < q]
                if insuffisants:
                    detail = ', '.join(
                        f"{m.nom_materiau} (disponible : {m.quantite_stock}, demandé : {q})"
                        for m, q in insuffisants
                    )
                    return Response(
                        {'error': f"Stock insuffisant : {detail}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Décrémenter le stock et tracer le mouvement (audit, privé au couturier)
                for m, q in lignes:
                    m.quantite_stock -= q
                    m.save(update_fields=['quantite_stock'])
                    MouvementStock.objects.create(
                        materiau=m,
                        type_mouvement='SORTIE',
                        quantite=q,
                        commande=commande,
                        notes=f"Consommation — commande #{commande.id_commande}",
                    )

            commande.statut = nouveau_statut
            if nouveau_statut == 'LIVREE' and commande.date_livraison is None:
                commande.date_livraison = timezone.now()
            commande.save()

            Notification.objects.create(
                utilisateur=commande.utilisateur,
                message=f"Votre commande #{commande.id_commande} — {commande.modele.nom} — est maintenant « {commande.get_statut_display()} »",
                type_message='STATUT'
            )

        _envoyer_email_statut(commande)

        return Response({'status': 'Statut mis à jour', 'nouveau_statut': nouveau_statut})

    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        """Client annule sa propre commande (EN_ATTENTE uniquement)."""
        commande = self.get_object()
        if commande.utilisateur != request.user and not is_admin_or_couturier(request.user):
            return Response({'error': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        if commande.statut != 'EN_ATTENTE':
            return Response(
                {'error': 'Seules les commandes en attente peuvent être annulées.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        commande.statut = 'ANNULEE'
        commande.save()
        Notification.objects.create(
            utilisateur=commande.utilisateur,
            message=f"Votre commande #{commande.id_commande} — {commande.modele.nom} — a été annulée.",
            type_message='STATUT'
        )
        return Response({'statut': 'ANNULEE'})

    @action(detail=True, methods=['post'])
    def assigner_couturier(self, request, pk=None):
        """Assigne un couturier à une commande (admin/couturier uniquement)."""
        if not is_admin_or_couturier(request.user):
            return Response({'error': 'Accès non autorisé'}, status=status.HTTP_403_FORBIDDEN)

        commande = self.get_object()
        couturier_id = request.data.get('couturier_id')

        if not couturier_id:
            return Response({'error': 'couturier_id requis'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            couturier = Utilisateur.objects.get(pk=couturier_id, role='COUTURIER')
        except Utilisateur.DoesNotExist:
            return Response(
                {'error': 'Utilisateur introuvable ou n\'est pas couturier'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ancien_couturier = commande.couturier
        commande.couturier = couturier
        commande.save(update_fields=['couturier'])

        Notification.objects.create(
            utilisateur=couturier,
            message=(
                f"Vous avez été assigné(e) à la commande #{commande.id_commande} "
                f"de {commande.utilisateur.first_name} {commande.utilisateur.last_name}."
            ),
            type_message='INFO'
        )

        return Response({
            'status': 'Couturier assigné avec succès',
            'commande': commande.id_commande,
            'couturier': {
                'id': couturier.pk,
                'username': couturier.username,
                'nom': f"{couturier.first_name} {couturier.last_name}",
            },
            'remplacement': ancien_couturier.username if ancien_couturier else None,
        })

    @action(detail=False, methods=['get'])
    def mes_commandes(self, request):
        """Commandes de l'utilisateur connecté (quel que soit le rôle)"""
        commandes = self._base_commande_qs().filter(utilisateur=request.user)
        serializer = CommandeListSerializer(commandes, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def en_cours(self, request):
        """Commandes en cours (pour les couturiers et admins)"""
        if not is_admin_or_couturier(request.user):
            return Response({'error': 'Accès non autorisé'}, status=status.HTTP_403_FORBIDDEN)

        # En attente/Confirmée/En cours + les commandes livrées avec un recours ouvert (à traiter)
        commandes = self.get_queryset().filter(
            Q(statut__in=['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'])
            | Q(statut='LIVREE', recours__statut='OUVERT')
        ).distinct()
        commandes = self._scoper_couturier(commandes)
        serializer = CommandeListSerializer(commandes, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des commandes (admin/couturier)"""
        if not is_admin_or_couturier(request.user):
            return Response({'error': 'Accès non autorisé'}, status=status.HTTP_403_FORBIDDEN)

        qs = self._scoper_couturier(self.get_queryset())
        return Response({
            'total_commandes': qs.count(),
            'en_attente': qs.filter(statut='EN_ATTENTE').count(),
            'en_cours': qs.filter(statut__in=['CONFIRMEE', 'EN_COURS']).count(),
            'livrees': qs.filter(statut='LIVREE').count(),
            'annulees': qs.filter(statut='ANNULEE').count(),
        })

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Analytics avancées : CA par mois, top modèles, répartition par statut.
        Paramètre optionnel : ?mois=12 (fenêtre glissante en mois, défaut 12).
        """
        if not is_admin_or_couturier(request.user):
            return Response({'error': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        nb_mois   = max(1, min(int(request.query_params.get('mois', 12)), 36))
        date_debut = timezone.now() - timedelta(days=nb_mois * 30)
        maintenant = timezone.now()

        # ── CA global ──────────────────────────────────────────────────────
        ca_total = Paiement.objects.aggregate(t=Sum('montant'))['t'] or 0
        ca_mois  = Paiement.objects.filter(
            date__year=maintenant.year, date__month=maintenant.month
        ).aggregate(t=Sum('montant'))['t'] or 0
        ca_annee = Paiement.objects.filter(
            date__year=maintenant.year
        ).aggregate(t=Sum('montant'))['t'] or 0

        # ── CA par mois (fenêtre glissante) ───────────────────────────────
        ca_par_mois_qs = (
            Paiement.objects
            .filter(date__gte=date_debut)
            .annotate(mois=TruncMonth('date'))
            .values('mois')
            .annotate(total=Sum('montant'))
            .order_by('mois')
        )
        ca_par_mois = [
            {
                'mois':  item['mois'].strftime('%Y-%m'),
                'label': item['mois'].strftime('%b %Y'),
                'total': float(item['total']),
            }
            for item in ca_par_mois_qs
        ]

        # ── Top 8 modèles les plus commandés ─────────────────────────────
        top_modeles = list(
            Commande.objects
            .filter(date_commande__gte=date_debut)
            .values('modele__nom')
            .annotate(nb=Count('id_commande'))
            .order_by('-nb')[:8]
        )

        # ── Répartition par statut ────────────────────────────────────────
        par_statut_qs = (
            Commande.objects
            .values('statut')
            .annotate(nb=Count('id_commande'))
        )
        labels_statut = {
            'EN_ATTENTE': 'En attente',
            'CONFIRMEE':  'Confirmée',
            'EN_COURS':   'En cours',
            'LIVREE':     'Livrée',
            'ANNULEE':    'Annulée',
        }
        par_statut = [
            {'statut': labels_statut.get(r['statut'], r['statut']), 'nb': r['nb']}
            for r in par_statut_qs
        ]

        # ── Commandes par mois (volume) ───────────────────────────────────
        commandes_par_mois_qs = (
            Commande.objects
            .filter(date_commande__gte=date_debut)
            .annotate(mois=TruncMonth('date_commande'))
            .values('mois')
            .annotate(nb=Count('id_commande'))
            .order_by('mois')
        )
        commandes_par_mois = [
            {
                'mois':  item['mois'].strftime('%Y-%m'),
                'label': item['mois'].strftime('%b %Y'),
                'nb':    item['nb'],
            }
            for item in commandes_par_mois_qs
        ]

        return Response({
            'ca_total':          float(ca_total),
            'ca_mois_courant':   float(ca_mois),
            'ca_annee_courante': float(ca_annee),
            'ca_par_mois':       ca_par_mois,
            'commandes_par_mois': commandes_par_mois,
            'top_modeles':       [{'nom': r['modele__nom'], 'commandes': r['nb']} for r in top_modeles],
            'par_statut':        par_statut,
        })

    def _scoper_couturier(self, qs, inclure_non_assignees=True):
        """Scoping strict : un couturier (non-admin) ne voit que SES commandes.
        Les commandes non assignées restent visibles dans la liste (à prendre),
        mais PAS dans les exports (rapport strictement personnel)."""
        user = self.request.user
        if getattr(user, 'role', None) == 'COUTURIER' and not user.is_staff:
            if inclure_non_assignees:
                return qs.filter(Q(couturier=user) | Q(couturier__isnull=True))
            return qs.filter(couturier=user)
        return qs

    def _commandes_qs_export(self, request):
        qs = self.get_queryset().select_related('utilisateur', 'modele', 'couturier', 'code_promo')
        qs = self._scoper_couturier(qs, inclure_non_assignees=False)
        if d := request.query_params.get('date_debut'):
            qs = qs.filter(date_commande__date__gte=d)
        if d := request.query_params.get('date_fin'):
            qs = qs.filter(date_commande__date__lte=d)
        return qs

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export CSV des commandes — respecte les droits d'accès de l'utilisateur."""
        qs = self._commandes_qs_export(request)
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="commandes.csv"'
        response.write('﻿')  # BOM — Excel détecte l'UTF-8

        writer = csv.writer(response)
        writer.writerow(['ID', 'Date', 'Client', 'Modèle', 'Statut',
                         'Total payé (FCFA)', 'Remise (FCFA)', 'Code promo', 'Couturier'])
        for c in qs:
            writer.writerow([
                c.id_commande,
                c.date_commande.strftime('%d/%m/%Y %H:%M'),
                (f"{c.utilisateur.first_name} {c.utilisateur.last_name}".strip()
                 or c.utilisateur.username),
                c.modele.nom,
                c.get_statut_display(),
                c.total_paye_sql,
                c.remise_appliquee,
                c.code_promo.code if c.code_promo else '',
                (f"{c.couturier.first_name} {c.couturier.last_name}".strip()
                 if c.couturier else ''),
            ])
        return response

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Export PDF des commandes — tableau paysage A4."""
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import cm

        qs = self._commandes_qs_export(request)
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
                                rightMargin=1*cm, leftMargin=1*cm,
                                topMargin=1.5*cm, bottomMargin=1.5*cm)
        styles = getSampleStyleSheet()
        elems = [
            Paragraph("Export des commandes — SewIvoire", styles['Title']),
            Spacer(1, 0.4*cm),
        ]

        entetes = ['ID', 'Date', 'Client', 'Modèle', 'Statut',
                   'Total (FCFA)', 'Remise (FCFA)', 'Code promo']
        lignes = [entetes]
        for c in qs:
            client = (f"{c.utilisateur.first_name} {c.utilisateur.last_name}".strip()
                      or c.utilisateur.username)
            lignes.append([
                str(c.id_commande),
                c.date_commande.strftime('%d/%m/%Y'),
                client[:28],
                c.modele.nom[:28],
                c.get_statut_display(),
                f"{c.total_paye_sql:,.0f}",
                f"{c.remise_appliquee:,.0f}",
                c.code_promo.code if c.code_promo else '—',
            ])

        largeurs = [1.2*cm, 2.5*cm, 4.5*cm, 4.5*cm, 2.8*cm, 3.2*cm, 3.2*cm, 2.5*cm]
        t = Table(lignes, colWidths=largeurs, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, 0), colors.HexColor('#1A1A2E')),
            ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
            ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS',(0, 1), (-1, -1), [colors.white, colors.HexColor('#F7F7FC')]),
            ('GRID',          (0, 0), (-1, -1), 0.4, colors.HexColor('#CCCCCC')),
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',    (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elems.append(t)
        doc.build(elems)
        buf.seek(0)
        response = HttpResponse(buf, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="commandes.pdf"'
        return response


# ==============================================
# 6. MESURE
# ==============================================

class MesureViewSet(viewsets.ModelViewSet):
    queryset = Mesure.objects.all()
    serializer_class = MesureSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admins et couturiers voient tout, les clients voient leurs mesures seulement
        if is_admin_or_couturier(self.request.user):
            return Mesure.objects.all()
        return Mesure.objects.filter(utilisateur=self.request.user)

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)

    @action(detail=False, methods=['get'])
    def dernieres(self, request):
        """Dernière mesure de l'utilisateur connecté"""
        mesure = Mesure.objects.filter(
            utilisateur=request.user
        ).order_by('-date_prise').first()
        if mesure:
            serializer = self.get_serializer(mesure)
            return Response(serializer.data)
        return Response({'detail': 'Aucune mesure trouvée'}, status=status.HTTP_404_NOT_FOUND)


# ==============================================
# 7. LIVRAISON
# ==============================================

class LivraisonViewSet(viewsets.ModelViewSet):
    queryset = Livraison.objects.select_related('commande', 'livreur').all()
    serializer_class = LivraisonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Livraison.objects.select_related(
            'commande', 'commande__utilisateur', 'commande__modele', 'livreur'
        ).prefetch_related('commande__paiements')
        user = self.request.user
        if is_admin_or_couturier(user):
            return qs
        if user.role == 'LIVREUR':
            # Le livreur ne voit que les livraisons qui lui sont assignées
            return qs.filter(livreur__utilisateur=user)
        # Client : livraisons de ses propres commandes
        return qs.filter(commande__utilisateur=user)

    @action(detail=True, methods=['post'])
    def assigner_livreur(self, request, pk=None):
        """Assigne un livreur disponible à une livraison"""
        livraison = self.get_object()
        livreur_id = request.data.get('livreur_id')

        if not livreur_id:
            return Response({'error': 'livreur_id requis'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            livreur = Livreur.objects.get(id_livreur=livreur_id, est_disponible=True)
            livraison.livreur = livreur
            livraison.status_livraison = 'EN_ROUTE'
            livraison.save()

            # Marquer le livreur comme occupé
            livreur.est_disponible = False
            livreur.save()

            return Response({'status': 'Livreur assigné avec succès'})

        except Livreur.DoesNotExist:
            return Response(
                {'error': 'Livreur non disponible ou inexistant'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def changer_status(self, request, pk=None):
        """Change le statut d'une livraison"""
        livraison = self.get_object()
        nouveau_status = request.data.get('status')
        statuts_valides = dict(Livraison._meta.get_field('status_livraison').choices)

        if nouveau_status in statuts_valides:
            livraison.status_livraison = nouveau_status

            # Si livrée, libérer le livreur et mettre à jour la commande
            if nouveau_status == 'LIVREE':
                if livraison.livreur:
                    livraison.livreur.est_disponible = True
                    livraison.livreur.save()

                livraison.commande.statut = 'LIVREE'
                if livraison.commande.date_livraison is None:
                    livraison.commande.date_livraison = timezone.now()
                livraison.commande.save()

                # Notifier le client
                Notification.objects.create(
                    utilisateur=livraison.commande.utilisateur,
                    message=f"Votre commande #{livraison.commande.id_commande} — {livraison.commande.modele.nom} — a été livrée !",
                    type_message='STATUT'
                )

            livraison.save()
            return Response({'status': 'Statut mis à jour'})

        return Response(
            {'error': f"Statut invalide. Valeurs acceptées : {list(statuts_valides.keys())}"},
            status=status.HTTP_400_BAD_REQUEST
        )


# ==============================================
# 8. LIVREUR
# ==============================================

class LivreurViewSet(viewsets.ModelViewSet):
    queryset = Livreur.objects.all()
    serializer_class = LivreurSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]  # ✅ SÉCURISÉ

    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """Liste des livreurs disponibles"""
        livreurs = self.queryset.filter(est_disponible=True)
        serializer = self.get_serializer(livreurs, many=True)
        return Response(serializer.data)


# ==============================================
# 9. PAIEMENT
# ==============================================

class PaiementViewSet(viewsets.ModelViewSet):
    serializer_class = PaiementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Paiement.objects.select_related('commande__utilisateur', 'commande__modele').all()
        user = self.request.user
        if user.is_staff:
            return qs
        if getattr(user, 'role', None) == 'COUTURIER':
            # Un couturier ne voit que les paiements de SES commandes
            return qs.filter(commande__couturier=user)
        return qs.filter(commande__utilisateur=user)

    def perform_create(self, serializer):
        # Espèces → en attente de confirmation par l'atelier ; autres méthodes → confirmé d'office.
        methode = serializer.validated_data.get('methode')
        statut = 'EN_ATTENTE' if methode == 'ESPECES' else 'CONFIRME'
        serializer.save(statut=statut)

    @action(detail=True, methods=['post'])
    def confirmer(self, request, pk=None):
        """Le couturier confirme la réception d'un paiement en espèces."""
        paiement = self.get_object()
        if not is_admin_or_couturier(request.user):
            raise PermissionDenied("Réservé à l'atelier.")
        if not request.user.is_staff and paiement.commande.couturier != request.user:
            raise PermissionDenied("Ce paiement ne concerne pas vos commandes.")
        if paiement.statut == 'CONFIRME':
            return Response({'error': "Ce paiement est déjà confirmé."}, status=status.HTTP_400_BAD_REQUEST)
        paiement.statut = 'CONFIRME'
        paiement.save(update_fields=['statut'])
        Notification.objects.create(
            utilisateur=paiement.commande.utilisateur,
            message=f"Votre paiement de {paiement.montant} FCFA (commande #{paiement.commande.id_commande}) a été confirmé par l'atelier.",
            type_message='STATUT',
        )
        return Response({'status': 'Paiement confirmé', 'statut': 'CONFIRME'})

    @action(detail=False, methods=['get'])
    def par_commande(self, request):
        """Paiements groupés par commande"""
        commande_id = request.query_params.get('commande_id')
        if commande_id:
            paiements = self.queryset.filter(commande_id=commande_id)
            total = paiements.aggregate(Sum('montant'))['montant__sum'] or 0
            serializer = self.get_serializer(paiements, many=True)
            return Response({
                'paiements': serializer.data,
                'total': total
            })
        return Response({'error': 'commande_id requis'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats_journalieres(self, request):
        """Total des paiements du jour"""
        today = timezone.now().date()
        paiements = self.queryset.filter(date__date=today)
        total = paiements.aggregate(Sum('montant'))['montant__sum'] or 0
        return Response({
            'date': today,
            'nombre_paiements': paiements.count(),
            'total': total
        })

    def _paiements_qs_export(self, request):
        qs = self.queryset.select_related('commande__utilisateur', 'commande__modele')
        if not is_admin_or_couturier(request.user):
            qs = qs.filter(commande__utilisateur=request.user)
        if d := request.query_params.get('date_debut'):
            qs = qs.filter(date__date__gte=d)
        if d := request.query_params.get('date_fin'):
            qs = qs.filter(date__date__lte=d)
        return qs

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export CSV des paiements."""
        qs = self._paiements_qs_export(request)
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="paiements.csv"'
        response.write('﻿')  # BOM

        writer = csv.writer(response)
        writer.writerow(['ID', 'Date', 'Commande', 'Client', 'Modèle',
                         'Montant (FCFA)', 'Méthode', 'Statut'])
        for p in qs:
            c = p.commande
            client = (f"{c.utilisateur.first_name} {c.utilisateur.last_name}".strip()
                      or c.utilisateur.username)
            writer.writerow([
                p.id_paiement,
                p.date.strftime('%d/%m/%Y %H:%M'),
                c.id_commande,
                client,
                c.modele.nom,
                p.montant,
                p.get_methode_display() if hasattr(p, 'get_methode_display') else p.methode,
                p.statut if hasattr(p, 'statut') else '',
            ])
        return response

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Export PDF des paiements — tableau portrait A4."""
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import cm

        qs = self._paiements_qs_export(request)
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4,
                                rightMargin=1.5*cm, leftMargin=1.5*cm,
                                topMargin=1.5*cm, bottomMargin=1.5*cm)
        styles = getSampleStyleSheet()
        elems = [
            Paragraph("Export des paiements — SewIvoire", styles['Title']),
            Spacer(1, 0.4*cm),
        ]

        entetes = ['ID', 'Date', 'Commande', 'Client', 'Montant (FCFA)', 'Méthode']
        lignes = [entetes]
        for p in qs:
            c = p.commande
            client = (f"{c.utilisateur.first_name} {c.utilisateur.last_name}".strip()
                      or c.utilisateur.username)
            lignes.append([
                str(p.id_paiement),
                p.date.strftime('%d/%m/%Y'),
                f"#{c.id_commande}",
                client[:30],
                f"{p.montant:,.0f}",
                p.get_methode_display() if hasattr(p, 'get_methode_display') else p.methode,
            ])

        largeurs = [1.2*cm, 2.8*cm, 2.5*cm, 5*cm, 3.5*cm, 3*cm]
        t = Table(lignes, colWidths=largeurs, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, 0), colors.HexColor('#1A1A2E')),
            ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
            ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS',(0, 1), (-1, -1), [colors.white, colors.HexColor('#F7F7FC')]),
            ('GRID',          (0, 0), (-1, -1), 0.4, colors.HexColor('#CCCCCC')),
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',    (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elems.append(t)
        doc.build(elems)
        buf.seek(0)
        response = HttpResponse(buf, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="paiements.pdf"'
        return response


# ==============================================
# 10. NOTIFICATION
# ==============================================

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(utilisateur=self.request.user).order_by('-date')

    @action(detail=True, methods=['post'])
    def marquer_lue(self, request, pk=None):
        """Marque une notification comme lue"""
        notification = self.get_object()
        notification.est_lue = True
        notification.save()
        return Response({'status': 'Notification marquée comme lue'})

    @action(detail=False, methods=['post'])
    def marquer_toutes_lues(self, request):
        """Marque toutes les notifications comme lues"""
        self.get_queryset().update(est_lue=True)
        return Response({'status': 'Toutes les notifications sont marquées comme lues'})

    @action(detail=False, methods=['get'])
    def non_lues(self, request):
        """Nombre de notifications non lues"""
        count = self.get_queryset().filter(est_lue=False).count()
        return Response({'non_lues': count})


# ==============================================
# 11. MESSAGE
# ==============================================

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(
            Q(expediteur=self.request.user) | Q(destinataire=self.request.user)
        ).order_by('-date_envoi')

    def perform_create(self, serializer):
        serializer.save(expediteur=self.request.user)

    @action(detail=False, methods=['get'])
    def conversation(self, request):
        """Messages entre l'utilisateur connecté et un autre utilisateur"""
        autre_id = request.query_params.get('avec')
        if not autre_id:
            return Response(
                {'error': 'Paramètre "avec" requis (ID de l\'autre utilisateur)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        messages = self.get_queryset().filter(
            Q(expediteur_id=autre_id) | Q(destinataire_id=autre_id)
        ).order_by('date_envoi')

        # Marquer les messages reçus comme lus
        messages.filter(destinataire=request.user, est_lu=False).update(est_lu=True)

        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def contacts(self, request):
        """Liste des utilisateurs avec qui l'utilisateur a échangé"""
        messages = self.get_queryset()
        contacts_ids = set()

        for msg in messages:
            if msg.expediteur != request.user:
                contacts_ids.add(msg.expediteur.id)
            if msg.destinataire != request.user:
                contacts_ids.add(msg.destinataire.id)

        contacts = Utilisateur.objects.filter(id__in=contacts_ids)
        serializer = UtilisateurSerializer(contacts, many=True)
        return Response(serializer.data)


# ==============================================
# 12. MOUVEMENTS DE STOCK
# ==============================================

class MouvementStockViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Historique des entrées / sorties / ajustements de stock.
    Lecture + création uniquement : les mouvements passés ne se modifient pas.
    POST crée le mouvement ET met à jour le stock du matériau atomiquement.
    Réservé aux couturiers et administrateurs.
    """
    serializer_class = MouvementStockSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = MouvementStockFilter
    ordering_fields = ['date', 'quantite']
    ordering = ['-date']

    def get_queryset(self):
        user = self.request.user
        if not is_admin_or_couturier(user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Accès réservé aux couturiers et administrateurs.")
        qs = MouvementStock.objects.select_related('materiau', 'commande').all()
        if getattr(user, 'role', None) == 'COUTURIER' and not user.is_staff:
            # Mouvements des matériaux du couturier connecté
            return qs.filter(materiau__couturier=user)
        return qs


# ==============================================
# 13. DEVIS
# ==============================================

class DevisViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Devis.objects.select_related('modele', 'client', 'commande', 'mesures')
        user = self.request.user
        if user.is_staff:
            return qs
        if getattr(user, 'role', None) == 'COUTURIER':
            # Un couturier ne voit que les devis de SES modèles
            return qs.filter(modele__couturier=user)
        return qs.filter(client=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return DevisCreateSerializer
        if self.action == 'list':
            return DevisListSerializer
        return DevisDetailSerializer

    def perform_create(self, serializer):
        # Réservé aux clients (couturiers/livreurs ne demandent pas de devis)
        if self.request.user.role != 'CLIENT':
            raise PermissionDenied("Seuls les clients peuvent demander un devis.")
        serializer.save()

    @action(detail=True, methods=['post'])
    def proposer(self, request, pk=None):
        """Couturier propose un prix et un délai (DEMANDE → PROPOSE)."""
        if not is_admin_or_couturier(request.user):
            return Response({'error': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        devis = self.get_object()
        # DEMANDE → première proposition ; PROPOSE → modification tant que le client n'a pas répondu
        if devis.statut not in ('DEMANDE', 'PROPOSE'):
            return Response(
                {'error': f"Impossible de (re)proposer sur un devis en statut '{devis.get_statut_display()}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        prix    = request.data.get('prix_propose')
        delai   = request.data.get('delai_propose')
        if not prix or not delai:
            return Response({'error': 'prix_propose et delai_propose sont requis.'}, status=status.HTTP_400_BAD_REQUEST)

        devis.prix_propose          = prix
        devis.delai_propose         = delai
        devis.commentaire_couturier = request.data.get('commentaire_couturier', '')
        if exp := request.data.get('date_expiration'):
            devis.date_expiration = exp
        devis.statut = 'PROPOSE'
        devis.save()

        Notification.objects.create(
            utilisateur=devis.client,
            message=(
                f"Votre devis #{devis.id_devis} ({devis.modele.nom}) est prêt : "
                f"{prix} FCFA — délai {delai} jours."
            ),
            type_message='INFO'
        )
        return Response(DevisDetailSerializer(devis, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def accepter(self, request, pk=None):
        """Client accepte le devis → crée une Commande confirmée (PROPOSE → ACCEPTE)."""
        devis = self.get_object()
        if devis.client != request.user:
            return Response({'error': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        if devis.statut != 'PROPOSE':
            return Response(
                {'error': f"Ce devis est en statut '{devis.get_statut_display()}' et ne peut pas être accepté."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            commande = Commande.objects.create(
                utilisateur=request.user,
                modele=devis.modele,
                statut='CONFIRMEE',
                mesures_utilisees=devis.mesures,
            )
            devis.statut   = 'ACCEPTE'
            devis.commande = commande
            devis.save()

        Notification.objects.create(
            utilisateur=request.user,
            message=(
                f"Devis #{devis.id_devis} accepté — commande #{commande.id_commande} créée."
            ),
            type_message='STATUT'
        )
        return Response({
            'statut':      'Devis accepté',
            'commande_id': commande.id_commande,
        })

    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        """Refus d'un devis :
        - le couturier peut refuser une DEMANDE (il décline de la traiter) ;
        - le client peut refuser une PROPOSE (il décline le prix proposé).
        """
        devis = self.get_object()
        if is_admin_or_couturier(request.user):
            if devis.statut != 'DEMANDE':
                return Response(
                    {'error': f"Un couturier ne peut refuser qu'une demande (statut actuel : '{devis.get_statut_display()}')."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif devis.client == request.user:
            if devis.statut != 'PROPOSE':
                return Response(
                    {'error': f"Ce devis est en statut '{devis.get_statut_display()}' et ne peut pas être refusé."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response({'error': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        devis.statut = 'REFUSE'
        devis.save()
        return Response({'statut': 'Devis refusé'})

    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        """Client annule sa demande de devis (DEMANDE uniquement)."""
        devis = self.get_object()
        if devis.client != request.user:
            return Response({'error': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        if devis.statut != 'DEMANDE':
            return Response(
                {'error': 'Seule une demande en attente peut être annulée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        devis.statut = 'ANNULE'
        devis.save()
        return Response({'statut': 'ANNULE'})


# ==============================================
# 14. CODES PROMO
# ==============================================

class CodePromoViewSet(viewsets.ModelViewSet):
    """
    Gestion des codes promo (CRUD réservé couturiers/admin).
    Action publique : POST /api/code-promos/valider/ → vérifie un code et calcule la remise.
    """
    queryset = CodePromo.objects.all()
    serializer_class = CodePromoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not is_admin_or_couturier(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Accès réservé aux couturiers et administrateurs.")
        return CodePromo.objects.all()

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def valider(self, request):
        code = request.data.get('code', '').strip()
        modele_id = request.data.get('modele_id')

        if not code:
            return Response({'error': 'Le champ code est requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            promo = CodePromo.objects.get(code__iexact=code)
        except CodePromo.DoesNotExist:
            return Response({'error': 'Code promo invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if not promo.est_valide():
            return Response(
                {'error': "Ce code promo a expiré ou n'est plus disponible."},
                status=status.HTTP_400_BAD_REQUEST
            )

        remise = None
        prix_final = None
        if modele_id:
            try:
                modele = Modele.objects.get(pk=modele_id)
                remise = promo.calculer_remise(modele.prix)
                prix_final = modele.prix - remise
            except Modele.DoesNotExist:
                pass

        return Response({
            'code':       promo.code,
            'type_remise': promo.type_remise,
            'valeur':     str(promo.valeur),
            'remise':     str(remise) if remise is not None else None,
            'prix_final': str(prix_final) if prix_final is not None else None,
        })


# ==============================================
# 14. AVIS / NOTATION
# ==============================================

class AvisViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AvisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Avis.objects.filter(client=self.request.user).select_related('commande', 'client')


# ==============================================
# 14. RÉINITIALISATION DE MOT DE PASSE
# ==============================================

class PasswordResetView(APIView):
    """
    POST /api/password/reset/  {"email": "..."}
    Envoie un email avec un lien valable PASSWORD_RESET_TIMEOUT secondes (défaut Django : 3 jours).
    La réponse est identique qu'un compte existe ou non (évite l'énumération d'emails).
    """
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'password_reset'

    def post(self, request):
        from .throttles import PasswordResetThrottle
        self.throttle_classes = [PasswordResetThrottle]

        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = Utilisateur.objects.get(email=email, is_active=True)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = (
                f"{settings.FRONTEND_URL}/reset-password"
                f"?uid={uid}&token={token}"
            )
            send_mail(
                subject='Réinitialisation de votre mot de passe SewIvoire',
                message=(
                    f"Bonjour {user.first_name or user.username},\n\n"
                    f"Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe.\n"
                    f"Ce lien expire dans 3 jours.\n\n"
                    f"{reset_link}\n\n"
                    f"Si vous n'avez pas fait cette demande, ignorez cet email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Utilisateur.DoesNotExist:
            pass  # Ne pas révéler si l'email existe

        return Response(
            {'detail': 'Si cet email est associé à un compte actif, un lien de réinitialisation a été envoyé.'},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    """
    POST /api/password/reset/confirm/  {"uid": "...", "token": "...", "new_password": "...", "new_password_confirm": "..."}
    Valide le token et met à jour le mot de passe.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            user_pk = force_str(urlsafe_base64_decode(data['uid']))
            user = Utilisateur.objects.get(pk=user_pk, is_active=True)
        except (TypeError, ValueError, OverflowError, Utilisateur.DoesNotExist):
            return Response(
                {'error': 'Lien de réinitialisation invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not default_token_generator.check_token(user, data['token']):
            return Response(
                {'error': 'Token invalide ou expiré.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(data['new_password'])
        user.save()
        return Response({'detail': 'Mot de passe réinitialisé avec succès.'})


# ==============================================
# 13. FAVORIS
# ==============================================

class FavorisViewSet(viewsets.ModelViewSet):
    queryset = Favoris.objects.all()
    serializer_class = FavorisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favoris.objects.filter(utilisateur=self.request.user).select_related('modele')

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Ajoute ou retire un modèle des favoris"""
        modele_id = request.data.get('modele_id')
        if not modele_id:
            return Response(
                {'error': 'modele_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        favori, created = Favoris.objects.get_or_create(
            utilisateur=request.user,
            modele_id=modele_id
        )

        if not created:
            favori.delete()
            return Response({'status': 'Retiré des favoris', 'favori': False})

        return Response({'status': 'Ajouté aux favoris', 'favori': True})


# ==============================================
# PARAMÈTRES ATELIER
# ==============================================

class ParametreAtelierView(APIView):
    """
    GET  /api/parametres/  — retourne acompte_pourcentage (accès authentifié)
    PATCH /api/parametres/ — met à jour (couturier/admin uniquement)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        parametre = ParametreAtelier.get_instance()
        return Response(ParametreAtelierSerializer(parametre).data)

    def patch(self, request):
        if not is_admin_or_couturier(request.user):
            return Response({'error': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        parametre = ParametreAtelier.get_instance()
        serializer = ParametreAtelierSerializer(parametre, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
