# SewIvoire/Sew/admin.py
from django.contrib import admin

admin.site.site_header  = "SewIvoire — Espace Couturier"
admin.site.site_title   = "Espace Couturier"
admin.site.index_title  = "Tableau de bord"
from django.contrib.auth.admin import UserAdmin
from .models import (
    Utilisateur, Categorie, Modele, Materiau, Commande,
    Mesure, Livraison, Livreur, Paiement, Notification,
    Message, Favoris, Consomme, Avis, CodePromo, MouvementStock, Devis,
    ParametreAtelier,
)


# ──────────────────────────────────────────────
# UTILISATEUR PERSONNALISÉ
# ──────────────────────────────────────────────

@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'telephone']
    list_filter = ['role', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Informations supplémentaires', {'fields': ('telephone', 'role')}),
    )


# ──────────────────────────────────────────────
# MODÈLES PRINCIPAUX
# ──────────────────────────────────────────────

@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ['id_categorie', 'libelle']
    search_fields = ['libelle']


class ConsommeInline(admin.TabularInline):
    model = Consomme
    extra = 1


@admin.register(Modele)
class ModeleAdmin(admin.ModelAdmin):
    list_display = ['id_modele', 'nom', 'prix', 'delai', 'categorie']
    list_filter = ['categorie']
    search_fields = ['nom']
    inlines = [ConsommeInline]


@admin.register(Materiau)
class MateriauAdmin(admin.ModelAdmin):
    list_display = ['id_materiau', 'nom_materiau', 'quantite_stock', 'seuil_alerte', 'unite', 'est_en_alerte']
    list_filter = ['unite']
    search_fields = ['nom_materiau']

    def est_en_alerte(self, obj):
        return obj.est_en_alerte
    est_en_alerte.boolean = True
    est_en_alerte.short_description = 'Alerte stock'


# ──────────────────────────────────────────────
# COMMANDE ET ÉLÉMENTS ASSOCIÉS
# ──────────────────────────────────────────────

class PaiementInline(admin.TabularInline):
    model = Paiement
    extra = 0
    readonly_fields = ['date']


class LivraisonInline(admin.StackedInline):
    model = Livraison
    extra = 0


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ['id_commande', 'utilisateur', 'modele', 'statut', 'date_commande', 'total_paye', 'reste_a_payer']
    list_filter = ['statut', 'date_commande']
    search_fields = ['utilisateur__username', 'modele__nom']
    inlines = [PaiementInline, LivraisonInline]
    readonly_fields = ['date_commande']

    def total_paye(self, obj):
        return obj.total_paye
    total_paye.short_description = 'Total payé'

    def reste_a_payer(self, obj):
        return obj.reste_a_payer
    reste_a_payer.short_description = 'Reste à payer'


@admin.register(Mesure)
class MesureAdmin(admin.ModelAdmin):
    list_display = ['id_mesure', 'utilisateur', 'date_prise']
    search_fields = ['utilisateur__username']


@admin.register(Livreur)
class LivreurAdmin(admin.ModelAdmin):
    list_display = ['id_livreur', 'nom_livreur', 'utilisateur', 'telephone', 'est_disponible']
    list_filter = ['est_disponible']
    autocomplete_fields = ['utilisateur']


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ['id_paiement', 'commande', 'montant', 'type', 'methode', 'date']
    list_filter = ['type', 'methode', 'date']


@admin.register(Livraison)
class LivraisonAdmin(admin.ModelAdmin):
    list_display = ['id_livraison', 'commande', 'adresse_client', 'status_livraison', 'livreur']
    list_filter = ['status_livraison']


# ──────────────────────────────────────────────
# NOTIFICATIONS ET MESSAGES
# ──────────────────────────────────────────────

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id_notif', 'utilisateur', 'type_message', 'est_lue', 'date']
    list_filter = ['type_message', 'est_lue', 'date']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id_message', 'expediteur', 'destinataire', 'est_lu', 'date_envoi']
    list_filter = ['est_lu', 'date_envoi']


@admin.register(Favoris)
class FavorisAdmin(admin.ModelAdmin):
    list_display = ['id_favori', 'utilisateur', 'modele', 'date_ajout']


# ──────────────────────────────────────────────
# DEVIS
# ──────────────────────────────────────────────

@admin.register(Devis)
class DevisAdmin(admin.ModelAdmin):
    list_display  = ['id_devis', 'client', 'modele', 'statut', 'prix_propose', 'delai_propose', 'date_creation']
    list_filter   = ['statut', 'date_creation']
    search_fields = ['client__username', 'client__first_name', 'modele__nom']
    readonly_fields = ['date_creation']


# ──────────────────────────────────────────────
# AVIS
# ──────────────────────────────────────────────

@admin.register(Avis)
class AvisAdmin(admin.ModelAdmin):
    list_display  = ['commande', 'client', 'note', 'date_creation']
    list_filter   = ['note', 'date_creation']
    search_fields = ['commande__utilisateur__username']
    readonly_fields = ['date_creation']


# ──────────────────────────────────────────────
# CODES PROMO
# ──────────────────────────────────────────────

@admin.register(CodePromo)
class CodePromoAdmin(admin.ModelAdmin):
    list_display  = ['code', 'valeur', 'type_remise', 'valide_du', 'valide_jusqu_au', 'actif', 'nb_utilisations', 'valide']
    list_filter   = ['type_remise', 'actif']
    search_fields = ['code']

    def valide(self, obj):
        return obj.est_valide()
    valide.boolean = True
    valide.short_description = 'Valide'


# ──────────────────────────────────────────────
# MOUVEMENTS DE STOCK
# ──────────────────────────────────────────────

@admin.register(MouvementStock)
class MouvementStockAdmin(admin.ModelAdmin):
    list_display  = ['id', 'materiau', 'type_mouvement', 'quantite', 'commande', 'date']
    list_filter   = ['type_mouvement', 'date']
    search_fields = ['materiau__nom_materiau']
    readonly_fields = ['date']


# ──────────────────────────────────────────────
# PARAMÈTRES ATELIER
# ──────────────────────────────────────────────

@admin.register(ParametreAtelier)
class ParametreAtelierAdmin(admin.ModelAdmin):
    list_display = ['acompte_pourcentage']

    def has_add_permission(self, request):
        return not ParametreAtelier.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False