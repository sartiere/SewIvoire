from rest_framework import serializers
from .models import (
    Utilisateur, Categorie, Modele, Materiau, Commande,
    Mesure, Livraison, Livreur, Paiement, Notification,
    Message, Consomme, Favoris, MouvementStock, Avis, CodePromo, Devis,
    ParametreAtelier,
)
from django.db import transaction


# ==============================================
# 1. SERIALIZERS DE BASE
# ==============================================

class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ['id_categorie', 'libelle']


class LivreurSerializer(serializers.ModelSerializer):
    utilisateur_username = serializers.CharField(
        source='utilisateur.username', read_only=True
    )

    class Meta:
        model = Livreur
        fields = [
            'id_livreur', 'utilisateur', 'utilisateur_username',
            'nom_livreur', 'telephone', 'est_disponible'
        ]


class UtilisateurSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'telephone', 'role', 'password'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user


class MateriauSerializer(serializers.ModelSerializer):
    alerte_stock = serializers.BooleanField(source='est_en_alerte', read_only=True)

    class Meta:
        model = Materiau
        fields = [
            'id_materiau', 'nom_materiau', 'quantite_stock',
            'seuil_alerte', 'unite', 'alerte_stock'
        ]


# ==============================================
# 2. SERIALIZERS AVEC RELATIONS
# ==============================================

class ConsommeSerializer(serializers.ModelSerializer):
    nom_materiau = serializers.CharField(source='materiau.nom_materiau', read_only=True)
    unite = serializers.CharField(source='materiau.get_unite_display', read_only=True)

    class Meta:
        model = Consomme
        # ✅ CORRIGÉ : 'modele' et 'materiau' sont les vrais noms des FK (pas id_modele/id_materiau)
        fields = ['modele', 'materiau', 'quantite_necessaire', 'nom_materiau', 'unite']


class ModeleListSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source='categorie.libelle', read_only=True)

    class Meta:
        model = Modele
        fields = ['id_modele', 'nom', 'prix', 'delai', 'categorie_nom', 'image']


class ModeleDetailSerializer(serializers.ModelSerializer):
    categorie = CategorieSerializer(read_only=True)
    id_categorie = serializers.PrimaryKeyRelatedField(
        queryset=Categorie.objects.all(),
        source='categorie',
        write_only=True
    )
    # ✅ CORRIGÉ : source='consomme_set' est correct car Consomme a une FK vers Modele
    materiaux = ConsommeSerializer(source='consomme_set', many=True, read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Modele
        fields = [
            'id_modele', 'nom', 'prix', 'delai', 'image',
            'categorie', 'id_categorie', 'materiaux'
        ]


class MesureSerializer(serializers.ModelSerializer):
    client_nom = serializers.SerializerMethodField()

    class Meta:
        model = Mesure
        fields = ['id_mesure', 'mesures', 'date_prise', 'utilisateur', 'client_nom', 'notes']
        read_only_fields = ['utilisateur', 'date_prise']

    def get_client_nom(self, obj):
        return f"{obj.utilisateur.first_name} {obj.utilisateur.last_name}"

    def validate_mesures(self, value):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from .models import valider_mesures
        try:
            valider_mesures(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value


class PaiementSerializer(serializers.ModelSerializer):
    commande_ref = serializers.IntegerField(source='commande.id_commande', read_only=True)
    client_nom   = serializers.SerializerMethodField()

    class Meta:
        model = Paiement
        fields = [
            'id_paiement', 'montant', 'type', 'methode', 'date',
            'commande', 'commande_ref', 'client_nom', 'reference',
        ]
        read_only_fields = ['date']

    def get_client_nom(self, obj):
        u = obj.commande.utilisateur
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def validate(self, data):
        commande = data.get('commande') or (self.instance and self.instance.commande)
        montant = data.get('montant')

        if commande and montant is not None:
            # Pour un update, exclure le paiement courant du calcul
            paiements_qs = commande.paiements.all()
            if self.instance:
                paiements_qs = paiements_qs.exclude(pk=self.instance.pk)

            total_deja_paye = sum(p.montant for p in paiements_qs)
            reste = commande.modele.prix - total_deja_paye

            if montant > reste:
                raise serializers.ValidationError({
                    'montant': (
                        f"Le montant saisi ({montant} FCFA) dépasse le reste à payer "
                        f"({reste} FCFA). Prix total : {commande.modele.prix} FCFA."
                    )
                })
        return data


class LivraisonSerializer(serializers.ModelSerializer):
    livreur_nom = serializers.CharField(source='livreur.nom_livreur', read_only=True)
    commande_ref = serializers.IntegerField(source='commande.id_commande', read_only=True)

    class Meta:
        model = Livraison
        fields = [
            'id_livraison', 'adresse_client', 'date_livraison',
            'status_livraison', 'commande', 'livreur',
            'livreur_nom', 'commande_ref'
        ]


# ==============================================
# 3. SERIALIZER COMMANDE (COMPLEXE)
# ==============================================

class CommandeListSerializer(serializers.ModelSerializer):
    client = serializers.SerializerMethodField()
    modele_nom   = serializers.CharField(source='modele.nom', read_only=True)
    modele_id    = serializers.IntegerField(source='modele.id_modele', read_only=True)
    modele_prix  = serializers.DecimalField(source='modele.prix', max_digits=10, decimal_places=2, read_only=True)
    modele_image = serializers.SerializerMethodField()
    total_paye = serializers.DecimalField(
        source='total_paye_sql', max_digits=10, decimal_places=2, read_only=True
    )
    couturier_nom   = serializers.SerializerMethodField()
    code_promo_code = serializers.CharField(source='code_promo.code', read_only=True, default=None)
    livraison_id     = serializers.SerializerMethodField()
    livraison_statut = serializers.SerializerMethodField()
    livraison_adresse = serializers.SerializerMethodField()
    livraison_livreur = serializers.SerializerMethodField()
    livraison_date    = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [
            'id_commande', 'statut', 'date_commande',
            'client', 'modele_id', 'modele_nom', 'modele_prix', 'modele_image', 'total_paye', 'couturier_nom',
            'remise_appliquee', 'code_promo_code',
            'livraison_id', 'livraison_statut', 'livraison_adresse', 'livraison_livreur', 'livraison_date',
        ]

    def get_modele_image(self, obj):
        request = self.context.get('request')
        if obj.modele.image:
            try:
                url = obj.modele.image.url
                return request.build_absolute_uri(url) if request else url
            except ValueError:
                return None
        return None

    def get_client(self, obj):
        return f"{obj.utilisateur.first_name} {obj.utilisateur.last_name}"

    def _livraison(self, obj):
        try:
            return obj.livraison
        except Exception:
            return None

    def get_livraison_id(self, obj):
        l = self._livraison(obj)
        return l.id_livraison if l else None

    def get_livraison_statut(self, obj):
        l = self._livraison(obj)
        return l.status_livraison if l else None

    def get_livraison_adresse(self, obj):
        l = self._livraison(obj)
        return l.adresse_client if l else None

    def get_livraison_livreur(self, obj):
        l = self._livraison(obj)
        return l.livreur.nom_livreur if l and l.livreur else None

    def get_livraison_date(self, obj):
        l = self._livraison(obj)
        return str(l.date_livraison) if l and l.date_livraison else None

    def get_couturier_nom(self, obj):
        if obj.couturier:
            return f"{obj.couturier.first_name} {obj.couturier.last_name}"
        return None


class CommandeDetailSerializer(serializers.ModelSerializer):
    client = UtilisateurSerializer(source='utilisateur', read_only=True)
    modele = ModeleDetailSerializer(read_only=True)
    couturier = UtilisateurSerializer(read_only=True)
    mesures = serializers.SerializerMethodField()
    paiements = PaiementSerializer(many=True, read_only=True)
    livraison = serializers.SerializerMethodField()
    reste_a_payer = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    montant_total = serializers.DecimalField(source='modele.prix', max_digits=10, decimal_places=2, read_only=True)
    code_promo_code = serializers.CharField(source='code_promo.code', read_only=True, default=None)

    class Meta:
        model = Commande
        fields = [
            'id_commande', 'statut', 'date_commande',
            'client', 'couturier', 'modele', 'mesures', 'paiements',
            'livraison', 'montant_total', 'reste_a_payer',
            'remise_appliquee', 'code_promo_code',
        ]

    def get_mesures(self, obj):
        if obj.mesures_utilisees:
            return MesureSerializer(obj.mesures_utilisees).data
        derniere_mesure = Mesure.objects.filter(
            utilisateur=obj.utilisateur
        ).order_by('-date_prise').first()
        if derniere_mesure:
            return MesureSerializer(derniere_mesure).data
        return None

    def get_livraison(self, obj):
        try:
            return LivraisonSerializer(obj.livraison).data
        except Livraison.DoesNotExist:
            return None


class CommandeCreateSerializer(serializers.ModelSerializer):
    code_promo_code   = serializers.CharField(write_only=True, required=False, allow_blank=True)
    adresse_livraison = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    class Meta:
        model = Commande
        fields = ['modele', 'mesures_utilisees', 'code_promo_code', 'adresse_livraison']

    def validate_code_promo_code(self, value):
        if not value:
            return None
        try:
            promo = CodePromo.objects.get(code__iexact=value.strip())
        except CodePromo.DoesNotExist:
            raise serializers.ValidationError("Code promo invalide.")
        if not promo.est_valide():
            raise serializers.ValidationError("Ce code promo a expiré ou n'est plus disponible.")
        return promo

    def create(self, validated_data):
        adresse = validated_data.pop('adresse_livraison', '') or 'À définir'
        promo   = validated_data.pop('code_promo_code', None)
        validated_data['statut'] = 'EN_ATTENTE'
        if promo:
            validated_data['code_promo'] = promo
            validated_data['remise_appliquee'] = promo.calculer_remise(
                validated_data['modele'].prix
            )
            promo.nb_utilisations += 1
            promo.save(update_fields=['nb_utilisations'])
        with transaction.atomic():
            commande = super().create(validated_data)
            Livraison.objects.create(commande=commande, adresse_client=adresse)
        return commande


# ==============================================
# 4. SERIALIZERS NOTIFICATION & MESSAGE
# ==============================================

class NotificationSerializer(serializers.ModelSerializer):
    destinataire = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id_notif', 'message', 'type_message',
            'date', 'est_lue', 'utilisateur', 'destinataire'
        ]
        read_only_fields = ['date']

    def get_destinataire(self, obj):
        return f"{obj.utilisateur.first_name} {obj.utilisateur.last_name}"


class MessageSerializer(serializers.ModelSerializer):
    expediteur_nom = serializers.SerializerMethodField()
    destinataire_nom = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id_message', 'contenu', 'date_envoi',
            'expediteur', 'destinataire',
            'expediteur_nom', 'destinataire_nom', 'est_lu'
        ]
        read_only_fields = ['date_envoi', 'expediteur']

    def get_expediteur_nom(self, obj):
        return f"{obj.expediteur.first_name} {obj.expediteur.last_name}"

    def get_destinataire_nom(self, obj):
        return f"{obj.destinataire.first_name} {obj.destinataire.last_name}"


# ==============================================
# 5. SERIALIZER FAVORIS
# ==============================================

class FavorisSerializer(serializers.ModelSerializer):
    modele_nom = serializers.CharField(source='modele.nom', read_only=True)
    modele_prix = serializers.DecimalField(source='modele.prix', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Favoris
        fields = ['id_favori', 'utilisateur', 'modele', 'date_ajout', 'modele_nom', 'modele_prix']
        read_only_fields = ['date_ajout', 'utilisateur']


# ==============================================
# 6. SERIALIZERS RÉINITIALISATION MOT DE PASSE
# ==============================================

# ==============================================
# 6. SERIALIZER MOUVEMENTS DE STOCK
# ==============================================

class MouvementStockSerializer(serializers.ModelSerializer):
    materiau_nom = serializers.CharField(source='materiau.nom_materiau', read_only=True)
    unite        = serializers.CharField(source='materiau.get_unite_display', read_only=True)

    class Meta:
        model  = MouvementStock
        fields = [
            'id', 'materiau', 'materiau_nom', 'unite',
            'type_mouvement', 'quantite', 'date',
            'commande', 'reference', 'notes',
        ]
        read_only_fields = ['date']

    def create(self, validated_data):
        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            materiau       = validated_data['materiau']
            quantite       = validated_data['quantite']
            type_mouvement = validated_data['type_mouvement']

            if type_mouvement == 'ENTREE':
                materiau.quantite_stock += quantite
            elif type_mouvement == 'SORTIE':
                if materiau.quantite_stock < quantite:
                    raise serializers.ValidationError({
                        'quantite': (
                            f"Stock insuffisant. "
                            f"Disponible : {materiau.quantite_stock} {materiau.get_unite_display()}."
                        )
                    })
                materiau.quantite_stock -= quantite
            elif type_mouvement == 'AJUSTEMENT':
                materiau.quantite_stock = quantite

            materiau.save(update_fields=['quantite_stock'])
            return super().create(validated_data)


# ==============================================
# 7. SERIALIZERS DEVIS
# ==============================================

class DevisListSerializer(serializers.ModelSerializer):
    modele_nom   = serializers.CharField(source='modele.nom',   read_only=True)
    modele_image = serializers.ImageField(source='modele.image', read_only=True)
    modele_prix  = serializers.DecimalField(source='modele.prix', max_digits=10, decimal_places=2, read_only=True)
    client_nom   = serializers.SerializerMethodField()
    commande_id  = serializers.IntegerField(source='commande.id_commande', read_only=True, default=None)

    class Meta:
        model  = Devis
        fields = [
            'id_devis', 'modele_nom', 'modele_image', 'modele_prix',
            'client_nom', 'statut', 'date_creation',
            'prix_propose', 'delai_propose', 'date_expiration', 'commande_id',
        ]

    def get_client_nom(self, obj):
        return f"{obj.client.first_name} {obj.client.last_name}".strip() or obj.client.username


class DevisDetailSerializer(serializers.ModelSerializer):
    modele_nom   = serializers.CharField(source='modele.nom',   read_only=True)
    modele_image = serializers.ImageField(source='modele.image', read_only=True)
    modele_prix  = serializers.DecimalField(source='modele.prix', max_digits=10, decimal_places=2, read_only=True)
    client_nom   = serializers.SerializerMethodField()
    commande_id  = serializers.IntegerField(source='commande.id_commande', read_only=True, default=None)

    class Meta:
        model  = Devis
        fields = [
            'id_devis', 'modele', 'modele_nom', 'modele_image', 'modele_prix',
            'client', 'client_nom', 'mesures', 'notes_client',
            'prix_propose', 'delai_propose', 'commentaire_couturier',
            'date_expiration', 'statut', 'date_creation', 'commande_id',
        ]

    def get_client_nom(self, obj):
        return f"{obj.client.first_name} {obj.client.last_name}".strip() or obj.client.username


class DevisCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Devis
        fields = ['modele', 'mesures', 'notes_client']

    def create(self, validated_data):
        validated_data['client'] = self.context['request'].user
        return super().create(validated_data)


# ==============================================
# 8. SERIALIZER CODE PROMO
# ==============================================

class CodePromoSerializer(serializers.ModelSerializer):
    est_valide = serializers.SerializerMethodField()

    class Meta:
        model = CodePromo
        fields = [
            'id', 'code', 'type_remise', 'valeur',
            'valide_du', 'valide_jusqu_au', 'usage_max',
            'nb_utilisations', 'actif', 'est_valide',
        ]
        read_only_fields = ['nb_utilisations']

    def get_est_valide(self, obj):
        return obj.est_valide()

    def validate(self, data):
        if data.get('type_remise') == 'POURCENTAGE' and data.get('valeur', 0) > 100:
            raise serializers.ValidationError({'valeur': "Un pourcentage ne peut pas dépasser 100."})
        return data


# ==============================================
# 8. SERIALIZER AVIS
# ==============================================

class AvisSerializer(serializers.ModelSerializer):
    client_nom = serializers.SerializerMethodField()

    class Meta:
        model = Avis
        fields = ['id', 'commande', 'client', 'client_nom', 'note', 'commentaire', 'date_creation']
        read_only_fields = ['client', 'date_creation']

    def get_client_nom(self, obj):
        return f"{obj.client.first_name} {obj.client.last_name}".strip() or obj.client.username

    def validate_commande(self, commande):
        request = self.context['request']
        if commande.statut != 'LIVREE':
            raise serializers.ValidationError("Seules les commandes livrées peuvent être notées.")
        if commande.utilisateur != request.user:
            raise serializers.ValidationError("Vous ne pouvez noter que vos propres commandes.")
        return commande

    def create(self, validated_data):
        validated_data['client'] = self.context['request'].user
        return super().create(validated_data)


# ==============================================
# 8. SERIALIZERS RÉINITIALISATION MOT DE PASSE
# ==============================================

class ParametreAtelierSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametreAtelier
        fields = ['acompte_pourcentage']


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)
    new_password_confirm = serializers.CharField(min_length=8, write_only=True)

    def validate(self, data):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError(
                {'new_password_confirm': 'Les deux mots de passe ne correspondent pas.'}
            )
        try:
            validate_password(data['new_password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({'new_password': e.messages})
        return data