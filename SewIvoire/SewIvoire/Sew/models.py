from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator

# ==============================================
# 1. MODÈLE UTILISATEUR PERSONNALISÉ
# ==============================================

class Utilisateur(AbstractUser):
    """Extension du modèle User Django"""
    telephone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=[
            ('CLIENT', 'Client'),
            ('COUTURIER', 'Couturier'),
            ('LIVREUR', 'Livreur'),
            
        ],
        default='CLIENT'
    )

    class Meta:
        db_table = 'utilisateur'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"


# ==============================================
# 2. MODÈLES DE BASE
# ==============================================

class Categorie(models.Model):
    id_categorie = models.AutoField(primary_key=True)
    libelle = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'categorie'
        verbose_name = 'Catégorie'
        verbose_name_plural = 'Catégories'

    def __str__(self):
        return self.libelle


class Materiau(models.Model):
    id_materiau = models.AutoField(primary_key=True)
    nom_materiau = models.CharField(max_length=100, unique=True)
    quantite_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    seuil_alerte = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unite = models.CharField(
        max_length=20,
        choices=[
            ('METRE', 'Mètre'),
            ('PIECE', 'Pièce'),
            ('BOUTON', 'Bouton'),
            ('FERMETURE', 'Fermeture Éclair'),
            ('BOBINE', 'Bobine de fil'),
        ],
        default='METRE'
    )

    class Meta:
        db_table = 'materiau'
        verbose_name = 'Matériau'
        verbose_name_plural = 'Matériaux'

    def __str__(self):
        return f"{self.nom_materiau} ({self.quantite_stock} {self.get_unite_display()})"

    @property
    def est_en_alerte(self):
        """Vérifie si le stock est sous le seuil d'alerte"""
        if self.seuil_alerte:
            return self.quantite_stock <= self.seuil_alerte
        return False


class Modele(models.Model):
    id_modele = models.AutoField(primary_key=True)
    nom = models.CharField(max_length=200)
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    delai = models.IntegerField(help_text="Délai de confection en jours")
    categorie = models.ForeignKey(
        Categorie,
        on_delete=models.SET_NULL,
        null=True,
        related_name='modeles'
    )
    materiaux = models.ManyToManyField(
        Materiau,
        through='Consomme',
        related_name='modeles'
    )
    image = models.ImageField(upload_to='modeles/', blank=True, null=True)

    class Meta:
        db_table = 'modele'
        verbose_name = 'Modèle'
        verbose_name_plural = 'Modèles'

    def __str__(self):
        return f"{self.nom} - {self.prix} FCFA"


class Livreur(models.Model):
    id_livreur = models.AutoField(primary_key=True)
    utilisateur = models.OneToOneField(
        'Utilisateur',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='profil_livreur',
        help_text="Compte applicatif associé à ce livreur"
    )
    nom_livreur = models.CharField(max_length=200)
    telephone = models.CharField(max_length=20)
    est_disponible = models.BooleanField(default=True)

    class Meta:
        db_table = 'livreur'
        verbose_name = 'Livreur'
        verbose_name_plural = 'Livreurs'

    def __str__(self):
        return f"{self.nom_livreur} {'(Disponible)' if self.est_disponible else '(Occupé)'}"


# ==============================================
# 3. MODÈLES MÉTIERS
# ==============================================

# Mesures corporelles obligatoires (en centimètres, valeur positive)
MESURES_REQUISES = frozenset({'poitrine', 'taille', 'hanches', 'longueur'})


def valider_mesures(value):
    """Valide le JSON des mesures corporelles."""
    if not isinstance(value, dict):
        raise ValidationError("Les mesures doivent être un objet JSON (dictionnaire).")

    manquantes = MESURES_REQUISES - set(value.keys())
    if manquantes:
        raise ValidationError(
            f"Mesures obligatoires manquantes : {', '.join(sorted(manquantes))}."
        )

    for cle, val in value.items():
        if not isinstance(val, (int, float)) or val <= 0:
            raise ValidationError(
                f"La mesure '{cle}' doit être un nombre positif (reçu : {val!r})."
            )


class Mesure(models.Model):
    id_mesure = models.AutoField(primary_key=True)
    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='mesures'
    )
    mesures = models.JSONField(
        validators=[valider_mesures],
        help_text=(
            "Objet JSON avec au minimum : poitrine, taille, hanches, longueur (en cm). "
            "Exemple : {\"poitrine\": 90, \"taille\": 70, \"hanches\": 95, \"longueur\": 120}"
        )
    )
    date_prise = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'mesure'
        verbose_name = 'Mesure'
        verbose_name_plural = 'Mesures'
        ordering = ['-date_prise']

    def __str__(self):
        return f"Mesures de {self.utilisateur} - {self.date_prise}"


class Commande(models.Model):
    id_commande = models.AutoField(primary_key=True)
    statut = models.CharField(
        max_length=20,
        choices=[
            ('EN_ATTENTE', 'En attente'),
            ('CONFIRMEE', 'Confirmée'),
            ('EN_COURS', 'En cours'),
            ('LIVREE', 'Livrée'),
            ('ANNULEE', 'Annulée'),
        ],
        default='EN_ATTENTE'
    )
    date_commande = models.DateTimeField(auto_now_add=True)
    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='commandes'
    )
    modele = models.ForeignKey(
        Modele,
        on_delete=models.PROTECT,
        related_name='commandes'
    )
    mesures_utilisees = models.ForeignKey(
        Mesure,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Mesures spécifiques pour cette commande"
    )
    couturier = models.ForeignKey(
        'Utilisateur',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='commandes_assignees',
        limit_choices_to={'role': 'COUTURIER'},
        verbose_name='Couturier assigné',
    )
    code_promo = models.ForeignKey(
        'CodePromo',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='commandes',
    )
    remise_appliquee = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'commande'
        verbose_name = 'Commande'
        verbose_name_plural = 'Commandes'
        ordering = ['-date_commande']

    def __str__(self):
        return f"Commande #{self.id_commande} - {self.utilisateur}"

    @property
    def total_paye(self):
        return sum(p.montant for p in self.paiements.all())

    @property
    def reste_a_payer(self):
        return self.modele.prix - self.total_paye


class Livraison(models.Model):
    id_livraison = models.AutoField(primary_key=True)
    commande = models.OneToOneField(
        Commande,
        on_delete=models.CASCADE,
        related_name='livraison'
    )
    adresse_client = models.TextField()
    date_livraison = models.DateField(null=True, blank=True)
    status_livraison = models.CharField(
        max_length=20,
        choices=[
            ('EN_PREPARATION', 'En préparation'),
            ('EN_ROUTE', 'En route'),
            ('LIVREE', 'Livrée'),
        ],
        default='EN_PREPARATION'
    )
    livreur = models.ForeignKey(
        Livreur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='livraisons'
    )

    class Meta:
        db_table = 'livraison'
        verbose_name = 'Livraison'
        verbose_name_plural = 'Livraisons'

    def __str__(self):
        return f"Livraison #{self.id_livraison} - Commande #{self.commande.id_commande}"


class Paiement(models.Model):
    id_paiement = models.AutoField(primary_key=True)
    commande = models.ForeignKey(
        Commande,
        on_delete=models.CASCADE,
        related_name='paiements'
    )
    montant = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    type = models.CharField(
        max_length=20,
        choices=[
            ('ACOMPTE', 'Acompte'),
            ('SOLDE', 'Solde'),
            ('TOTAL', 'Total'),
        ],
        default='ACOMPTE'
    )
    methode = models.CharField(
        max_length=20,
        choices=[
            ('ESPECES', 'Espèces'),
            ('MOBILE_MONEY', 'Mobile Money'),
            ('CARTE', 'Carte bancaire'),
        ],
        default='ESPECES'
    )
    date = models.DateTimeField(auto_now_add=True)
    reference = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'paiement'
        verbose_name = 'Paiement'
        verbose_name_plural = 'Paiements'

    def __str__(self):
        return f"Paiement {self.montant} FCFA - Commande #{self.commande.id_commande}"


# ==============================================
# 4. MODÈLES DE COMMUNICATION
# ==============================================

class Notification(models.Model):
    id_notif = models.AutoField(primary_key=True)
    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    message = models.TextField()
    type_message = models.CharField(
        max_length=20,
        choices=[
            ('PROMO', 'Promotion'),
            ('ALERTE', 'Alerte'),
            ('STATUT', 'Statut commande'),
            ('INFO', 'Information'),
        ],
        default='INFO'
    )
    date = models.DateTimeField(auto_now_add=True)
    est_lue = models.BooleanField(default=False)

    class Meta:
        db_table = 'notification'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-date']

    def __str__(self):
        return f"Notification pour {self.utilisateur} - {self.date.strftime('%d/%m/%Y')}"


class Message(models.Model):
    id_message = models.AutoField(primary_key=True)
    expediteur = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='messages_envoyes'
    )
    destinataire = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='messages_recus'
    )
    contenu = models.TextField()
    date_envoi = models.DateTimeField(auto_now_add=True)
    est_lu = models.BooleanField(default=False)

    class Meta:
        db_table = 'message'
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
        ordering = ['-date_envoi']

    def __str__(self):
        return f"Message de {self.expediteur} à {self.destinataire}"


# ==============================================
# 5. TABLES DE LIAISON (N:N)
# ==============================================

class Consomme(models.Model):
    """Relation ManyToMany avec attribut : quantité nécessaire par modèle"""
    modele = models.ForeignKey(Modele, on_delete=models.CASCADE)
    materiau = models.ForeignKey(Materiau, on_delete=models.CASCADE)
    quantite_necessaire = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'consomme'
        unique_together = ['modele', 'materiau']
        verbose_name = 'Consommation matière'
        verbose_name_plural = 'Consommations matières'

    def __str__(self):
        return f"{self.modele.nom} nécessite {self.quantite_necessaire} {self.materiau.unite} de {self.materiau.nom_materiau}"


class MouvementStock(models.Model):
    """
    Audit trail immuable de chaque entrée, sortie ou correction de stock.
    - ENTREE    : ajoute `quantite` au stock
    - SORTIE    : retire `quantite` du stock
    - AJUSTEMENT: fixe le stock à `quantite` (correction inventaire)
    Les mouvements générés automatiquement lors d'un passage EN_COURS ont une
    commande associée ; les mouvements manuels laissent ce champ vide.
    """
    TYPE_CHOICES = [
        ('ENTREE',     'Entrée de stock'),
        ('SORTIE',     'Sortie de stock'),
        ('AJUSTEMENT', 'Ajustement inventaire'),
    ]

    materiau = models.ForeignKey(
        Materiau,
        on_delete=models.CASCADE,
        related_name='mouvements',
    )
    type_mouvement = models.CharField(max_length=20, choices=TYPE_CHOICES)
    quantite = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Quantité ajoutée / retirée, ou nouvelle valeur absolue pour AJUSTEMENT",
    )
    date = models.DateTimeField(auto_now_add=True)
    commande = models.ForeignKey(
        'Commande',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='mouvements_stock',
        help_text="Renseigné automatiquement pour les sorties liées à une commande",
    )
    reference = models.CharField(
        max_length=100, blank=True, null=True,
        help_text="N° de bon de commande fournisseur, ticket d'inventaire, etc.",
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'mouvement_stock'
        verbose_name = 'Mouvement de stock'
        verbose_name_plural = 'Mouvements de stock'
        ordering = ['-date']

    def __str__(self):
        return (
            f"{self.get_type_mouvement_display()} — "
            f"{self.quantite} {self.materiau.get_unite_display()} "
            f"de {self.materiau.nom_materiau}"
        )


class Devis(models.Model):
    STATUT_CHOICES = [
        ('DEMANDE', 'Demande reçue'),
        ('PROPOSE', 'Devis proposé'),
        ('ACCEPTE', 'Accepté'),
        ('REFUSE',  'Refusé'),
        ('ANNULE',  'Annulé'),
    ]

    id_devis              = models.AutoField(primary_key=True)
    modele                = models.ForeignKey('Modele',      on_delete=models.PROTECT,  related_name='devis')
    client                = models.ForeignKey(Utilisateur,   on_delete=models.CASCADE,  related_name='devis')
    mesures               = models.ForeignKey('Mesure',      on_delete=models.SET_NULL, null=True, blank=True)
    notes_client          = models.TextField(blank=True)

    # Renseignés par le couturier
    prix_propose          = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    delai_propose         = models.PositiveIntegerField(null=True, blank=True, help_text="Délai en jours")
    commentaire_couturier = models.TextField(blank=True)
    date_expiration       = models.DateTimeField(null=True, blank=True)

    statut       = models.CharField(max_length=20, choices=STATUT_CHOICES, default='DEMANDE')
    date_creation = models.DateTimeField(auto_now_add=True)

    # Commande créée si le devis est accepté
    commande = models.OneToOneField(
        'Commande', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='devis_source'
    )

    class Meta:
        db_table = 'devis'
        verbose_name = 'Devis'
        verbose_name_plural = 'Devis'
        ordering = ['-date_creation']

    def __str__(self):
        return f"Devis #{self.id_devis} — {self.modele.nom} ({self.get_statut_display()})"


class CodePromo(models.Model):
    TYPE_REMISE = [
        ('POURCENTAGE', 'Pourcentage (%)'),
        ('FIXE',        'Montant fixe (FCFA)'),
    ]

    code             = models.CharField(max_length=50, unique=True)
    type_remise      = models.CharField(max_length=20, choices=TYPE_REMISE)
    valeur           = models.DecimalField(max_digits=10, decimal_places=2)
    valide_du        = models.DateTimeField(null=True, blank=True)
    valide_jusqu_au  = models.DateTimeField(null=True, blank=True)
    usage_max        = models.PositiveIntegerField(null=True, blank=True, help_text="Vide = illimité")
    nb_utilisations  = models.PositiveIntegerField(default=0)
    actif            = models.BooleanField(default=True)

    class Meta:
        db_table = 'code_promo'
        verbose_name = 'Code promo'
        verbose_name_plural = 'Codes promo'

    def __str__(self):
        suffixe = '%' if self.type_remise == 'POURCENTAGE' else ' FCFA'
        return f"{self.code} — {self.valeur}{suffixe}"

    def est_valide(self):
        from django.utils import timezone
        now = timezone.now()
        if not self.actif:
            return False
        if self.valide_du and now < self.valide_du:
            return False
        if self.valide_jusqu_au and now > self.valide_jusqu_au:
            return False
        if self.usage_max is not None and self.nb_utilisations >= self.usage_max:
            return False
        return True

    def calculer_remise(self, prix):
        if self.type_remise == 'POURCENTAGE':
            return (prix * self.valeur / 100).quantize(Decimal('0.01'))
        return min(prix, self.valeur)


class Avis(models.Model):
    commande = models.OneToOneField(
        'Commande',
        on_delete=models.CASCADE,
        related_name='avis',
    )
    client = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='avis_laisses',
    )
    note = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    commentaire = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'avis'
        verbose_name = 'Avis'
        verbose_name_plural = 'Avis'
        ordering = ['-date_creation']

    def __str__(self):
        return f"Avis {self.note}/5 — Commande #{self.commande_id}"


class Favoris(models.Model):
    """Modèles favoris d'un utilisateur"""
    id_favori = models.AutoField(primary_key=True)
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    modele = models.ForeignKey(Modele, on_delete=models.CASCADE)
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'favoris'
        unique_together = ['utilisateur', 'modele']
        verbose_name = 'Favori'
        verbose_name_plural = 'Favoris'

    def __str__(self):
        return f"{self.utilisateur} aime {self.modele.nom}"


class ParametreAtelier(models.Model):
    """Singleton — une seule ligne stocke les paramètres globaux de l'atelier."""
    acompte_pourcentage = models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(1), MaxValueValidator(99)],
        help_text="Pourcentage minimum requis pour le paiement d'avance (1–99 %)"
    )

    class Meta:
        db_table = 'parametre_atelier'
        verbose_name = 'Paramètre atelier'
        verbose_name_plural = 'Paramètres atelier'

    def __str__(self):
        return f"Paramètres atelier — acompte {self.acompte_pourcentage} %"

    @classmethod
    def get_instance(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj