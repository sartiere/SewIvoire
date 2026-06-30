"""
Génère un jeu de données de démonstration réaliste et cohérent pour SewIvoire.

Usage :
    python manage.py seed_demo            # ajoute les données de démo
    python manage.py seed_demo --flush    # purge d'abord (sauf superusers) puis recrée

Toutes les données respectent la logique métier :
- avis uniquement sur des commandes LIVREE, par leur propre client ;
- paiements cohérents avec le prix (acompte selon ParametreAtelier, puis solde) ;
- livraisons synchronisées avec le statut de la commande ;
- mesures JSON valides (poitrine, taille, hanches, longueur) ;
- couturiers assignés ayant bien le rôle COUTURIER ;
- dates étalées sur les ~6 derniers mois.

Comptes de démo créés avec le mot de passe : demo1234
"""
import random
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.utils import timezone

from Sew.models import (
    Utilisateur, Categorie, Materiau, Modele, Consomme, Livreur,
    Mesure, Commande, Livraison, Paiement, Notification, Message,
    MouvementStock, Devis, CodePromo, Avis, Favoris, ParametreAtelier,
)

MOT_DE_PASSE_DEMO = "demo1234"

PRENOMS_F = [
    "Aya", "Adjoua", "Affoué", "Akissi", "Aké", "Fatou", "Mariam", "Awa",
    "Aminata", "Rokia", "Kadiatou", "Mawa", "Nadège", "Grâce", "Estelle",
    "Sarah", "Chantal", "Bintou", "Salimata", "Yveline", "Carine", "Olga",
]
PRENOMS_M = [
    "Kouadio", "Konan", "Yao", "Koffi", "Kouassi", "Ibrahim", "Moussa",
    "Sékou", "Bakary", "Brou", "Aka", "N'Dri", "Serge", "Jean-Marc",
    "Hervé", "Patrick", "Cédric", "Aboubacar", "Souleymane", "Désiré",
]
NOMS = [
    "Kouassi", "Koné", "Traoré", "Diabaté", "Bamba", "Ouattara", "Touré",
    "Coulibaly", "Yao", "Kouadio", "Aka", "Brou", "N'Guessan", "Gnagne",
    "Tanoh", "Konaté", "Doumbia", "Cissé", "Fofana", "Sangaré", "Bakayoko",
    "Adingra", "Assi", "Kacou", "Méité",
]

CATEGORIES = [
    "Mode Femme", "Mode Homme", "Enfant", "Tenues Traditionnelles",
    "Mariage & Cérémonie", "Tenues Professionnelles", "Accessoires", "Sur-mesure",
]

# (nom, unité, stock initial, seuil d'alerte)
MATERIAUX = [
    ("Wax Hollandais", "METRE", 320, 40),
    ("Super Wax", "METRE", 210, 30),
    ("Wax Java", "METRE", 180, 25),
    ("Pagne Baoulé", "METRE", 95, 20),
    ("Bazin Riche", "METRE", 140, 25),
    ("Kente", "METRE", 60, 15),
    ("Bogolan", "METRE", 70, 15),
    ("Tissu Lin", "METRE", 110, 20),
    ("Soie", "METRE", 45, 10),
    ("Satin", "METRE", 130, 20),
    ("Dentelle", "METRE", 55, 12),
    ("Doublure", "METRE", 260, 40),
    ("Fil à coudre", "BOBINE", 480, 60),
    ("Bouton nacré", "BOUTON", 1500, 200),
    ("Bouton bois", "BOUTON", 900, 150),
    ("Fermeture éclair 20cm", "FERMETURE", 350, 50),
    ("Fermeture éclair 50cm", "FERMETURE", 220, 40),
    ("Perles décoratives", "PIECE", 2000, 300),
    ("Strass", "PIECE", 1800, 250),
    ("Ruban gros-grain", "METRE", 300, 40),
]

# (nom, catégorie, prix mini, prix maxi, délai mini, délai maxi)
MODELES = [
    ("Robe pagne cintrée", "Mode Femme", 18000, 35000, 5, 10),
    ("Robe wax longue", "Mode Femme", 22000, 45000, 6, 12),
    ("Ensemble jupe-top wax", "Mode Femme", 20000, 38000, 5, 9),
    ("Blouse brodée", "Mode Femme", 15000, 28000, 4, 8),
    ("Combinaison wax", "Mode Femme", 25000, 42000, 6, 11),
    ("Tailleur femme bazin", "Tenues Professionnelles", 35000, 65000, 8, 14),
    ("Chemise wax homme", "Mode Homme", 14000, 26000, 4, 7),
    ("Complet 3 pièces homme", "Mode Homme", 45000, 95000, 10, 18),
    ("Pantalon sur-mesure", "Mode Homme", 18000, 32000, 5, 9),
    ("Dashiki brodé", "Mode Homme", 20000, 38000, 5, 10),
    ("Agbada brodé", "Tenues Traditionnelles", 60000, 150000, 12, 21),
    ("Boubou bazin homme", "Tenues Traditionnelles", 40000, 90000, 9, 16),
    ("Grand boubou femme", "Tenues Traditionnelles", 45000, 110000, 10, 18),
    ("Caftan cérémonie", "Mariage & Cérémonie", 55000, 130000, 12, 20),
    ("Robe de mariée traditionnelle", "Mariage & Cérémonie", 90000, 300000, 18, 35),
    ("Tenue de demoiselle d'honneur", "Mariage & Cérémonie", 30000, 60000, 8, 14),
    ("Ensemble enfant wax", "Enfant", 8000, 18000, 3, 6),
    ("Robe fillette cérémonie", "Enfant", 12000, 25000, 4, 8),
    ("Costume garçon", "Enfant", 15000, 28000, 5, 9),
    ("Kimono africain", "Mode Femme", 22000, 40000, 5, 10),
    ("Jupe portefeuille wax", "Mode Femme", 12000, 22000, 3, 6),
    ("Veste blazer wax", "Tenues Professionnelles", 28000, 52000, 7, 12),
    ("Chemisier soie", "Tenues Professionnelles", 20000, 36000, 5, 9),
    ("Foulard assorti", "Accessoires", 4000, 9000, 2, 4),
    ("Pochette wax", "Accessoires", 5000, 12000, 2, 5),
    ("Cravate wax", "Accessoires", 4000, 8000, 2, 4),
    ("Ensemble cérémonie couple", "Mariage & Cérémonie", 70000, 160000, 14, 24),
    ("Robe cocktail", "Mode Femme", 28000, 55000, 7, 13),
    ("Boubou brodé enfant", "Enfant", 10000, 20000, 3, 6),
    ("Tunique unisexe", "Sur-mesure", 16000, 30000, 4, 8),
]

QUARTIERS_ABIDJAN = [
    "Cocody Angré 8e tranche", "Cocody Riviera Palmeraie", "Marcory Zone 4",
    "Yopougon Selmer", "Treichville Av. 12", "Plateau Cité Administrative",
    "Abobo Avocatier", "Koumassi Remblais", "Adjamé Liberté",
    "Cocody II Plateaux Vallon", "Port-Bouët Gonzagueville", "Bingerville centre",
    "Songon Kassemblé", "Riviera Bonoumin", "Angré Château",
]

COMMENTAIRES_AVIS = [
    "Travail impeccable, couture soignée et finitions parfaites !",
    "Très satisfaite, le modèle tombe exactement comme je voulais.",
    "Excellent atelier, délai respecté. Je recommande vivement.",
    "Belle qualité de tissu et de confection, merci beaucoup.",
    "Le rendu est magnifique, conforme à mes mesures.",
    "Bon travail mais livraison un peu en retard.",
    "Couture solide, je reviendrai pour mes prochaines tenues.",
    "Très professionnel, à l'écoute de mes besoins.",
    "Tenue superbe pour la cérémonie, tout le monde a adoré !",
    "Finitions correctes, rapport qualité-prix intéressant.",
]

MESSAGES_CLIENT = [
    "Bonjour, est-il possible d'ajuster un peu la longueur ?",
    "Merci pour le travail, quand puis-je venir récupérer ?",
    "Pouvez-vous me confirmer le délai de confection ?",
    "J'aimerais ajouter une broderie sur les manches, c'est possible ?",
    "Le tissu wax que j'ai choisi est-il toujours disponible ?",
    "Bonjour, j'ai une cérémonie le mois prochain, est-ce jouable ?",
]
MESSAGES_ATELIER = [
    "Bonjour, votre commande est bien enregistrée. Nous démarrons la coupe.",
    "Votre tenue est prête, vous pouvez passer à l'atelier.",
    "Le délai est de 10 jours ouvrés à partir de l'acompte.",
    "Oui c'est possible, cela ajoute 2 jours au délai prévu.",
    "Le tissu est disponible, nous réservons votre métrage.",
    "Pas de souci, on s'adapte à votre date de cérémonie.",
]


def deux_dec(x):
    return Decimal(x).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Command(BaseCommand):
    help = "Génère des données de démonstration cohérentes pour SewIvoire."

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true",
                            help="Supprime les données existantes (sauf superusers) avant de générer.")
        parser.add_argument("--clients", type=int, default=45)
        parser.add_argument("--couturiers", type=int, default=6)
        parser.add_argument("--livreurs", type=int, default=5)
        parser.add_argument("--commandes", type=int, default=130)

    def handle(self, *args, **opt):
        random.seed(2026)
        self.now = timezone.now()
        self.pwd = make_password(MOT_DE_PASSE_DEMO)  # haché une seule fois (perf)

        # Toute la génération est atomique : en cas d'erreur, rien n'est laissé
        # à moitié créé. Le résumé est affiché APRÈS le commit (hors transaction).
        with transaction.atomic():
            if opt["flush"]:
                self._flush()

            self._parametres()
            cats = self._categories()
            clients = self._users(opt["clients"], "CLIENT", "client")
            couturiers = self._users(opt["couturiers"], "COUTURIER", "couturier")
            livreur_users = self._users(opt["livreurs"], "LIVREUR", "livreur")
            livreurs = self._livreurs(livreur_users)
            materiaux = self._materiaux(couturiers)               # chaque couturier a son propre stock
            modeles = self._modeles(cats, materiaux, couturiers)  # chaque modèle appartient à un couturier
            promos = self._promos()
            mesures = self._mesures(clients)
            commandes = self._commandes(opt["commandes"], clients, couturiers, modeles, mesures, promos)
            self._paiements(commandes)
            self._livraisons(commandes, livreurs)
            self._avis(commandes)
            self._favoris(clients, modeles)
            self._notifications(clients + couturiers)
            self._messages(clients, couturiers)
            self._mouvements(materiaux, commandes)
            self._devis(clients, couturiers, modeles, mesures)

        self._resume()

    # ------------------------------------------------------------------ utils
    def _set_date(self, instance, **dates):
        """Force des champs date auto_now_add via UPDATE (contourne auto_now_add)."""
        type(instance).objects.filter(pk=instance.pk).update(**dates)

    def _jours(self, mini, maxi):
        return self.now - timedelta(days=random.randint(mini, maxi),
                                    hours=random.randint(0, 23),
                                    minutes=random.randint(0, 59))

    # ------------------------------------------------------------------ flush
    def _flush(self):
        self.stdout.write("Purge des donnees existantes...")
        models = (Avis, Paiement, Livraison, MouvementStock, Devis, Commande,
                  Mesure, Favoris, Notification, Message, Consomme, Modele,
                  Materiau, Categorie, Livreur, CodePromo)
        if connection.vendor == 'mysql':
            # SQL direct : ne charge aucun objet via l'ORM, donc évite la
            # conversion des dates (une ligne existante peut contenir une
            # date invalide '0000-00-00' que MySQL renvoie comme texte).
            with connection.cursor() as c:
                c.execute('SET FOREIGN_KEY_CHECKS=0')
                for model in models:
                    c.execute(f'DELETE FROM `{model._meta.db_table}`')
                # Garde les superusers (admin), supprime le reste
                c.execute('DELETE FROM `utilisateur` WHERE is_superuser=0')
                c.execute('SET FOREIGN_KEY_CHECKS=1')
        else:
            for model in models:
                model.objects.all().delete()
            Utilisateur.objects.filter(is_superuser=False).delete()

    # ------------------------------------------------------------- référentiels
    def _parametres(self):
        self.param = ParametreAtelier.get_instance()
        self.param.acompte_pourcentage = 50
        self.param.save()

    def _categories(self):
        cats = {}
        for lib in CATEGORIES:
            cats[lib], _ = Categorie.objects.get_or_create(libelle=lib)
        return cats

    def _materiaux(self, couturiers):
        """Chaque couturier possède son propre stock de matériaux."""
        par_couturier = {}
        for cout in couturiers:
            objs = []
            for nom, unite, stock, seuil in MATERIAUX:
                m = Materiau.objects.create(
                    couturier=cout, nom_materiau=nom, unite=unite,
                    quantite_stock=deux_dec(stock), seuil_alerte=deux_dec(seuil),
                )
                objs.append(m)
            par_couturier[cout.pk] = objs
        return par_couturier

    def _modeles(self, cats, materiaux, couturiers):
        """Chaque modèle est publié par un couturier ; sa recette utilise les matériaux de CE couturier."""
        modeles = []
        for i, (nom, cat, pmin, pmax, dmin, dmax) in enumerate(MODELES):
            cout = couturiers[i % len(couturiers)]   # répartition tournante entre couturiers
            mats_cout = materiaux[cout.pk]
            prix = deux_dec(random.randrange(pmin, pmax, 500))
            m = Modele.objects.create(
                couturier=cout, nom=nom, prix=prix,
                delai=random.randint(dmin, dmax),
                categorie=cats[cat],
            )
            # 2 à 4 matériaux DU COUTURIER consommés par modèle
            for mat in random.sample(mats_cout, random.randint(2, min(4, len(mats_cout)))):
                qte = deux_dec(random.uniform(0.5, 6))
                Consomme.objects.get_or_create(
                    modele=m, materiau=mat,
                    defaults=dict(quantite_necessaire=qte),
                )
            modeles.append(m)
        return modeles

    # ---------------------------------------------------------------- users
    def _users(self, n, role, prefixe):
        users = []
        for i in range(1, n + 1):
            if role == "COUTURIER" or random.random() < 0.5:
                prenom = random.choice(PRENOMS_M)
            else:
                prenom = random.choice(PRENOMS_F)
            nom = random.choice(NOMS)
            username = f"{prefixe}{i:03d}"
            email = f"{prefixe}{i:03d}@sewivoire-demo.ci"
            tel = f"+225{random.choice(['07', '05', '01'])}{random.randint(10**6, 10**7 - 1)}"
            u = Utilisateur(
                username=username, first_name=prenom, last_name=nom,
                email=email, telephone=tel, role=role,
                password=self.pwd, is_active=True,
            )
            users.append(u)
        Utilisateur.objects.bulk_create(users)
        # Recharge pour avoir les PK (bulk_create les remplit sur MySQL/SQLite récents,
        # mais on refait un select pour être sûr de l'ordre et des relations)
        return list(Utilisateur.objects.filter(username__startswith=prefixe).order_by("username"))

    def _livreurs(self, livreur_users):
        livreurs = []
        for u in livreur_users:
            lv = Livreur.objects.create(
                utilisateur=u,
                nom_livreur=f"{u.first_name} {u.last_name}",
                telephone=u.telephone or "+2250700000000",
                est_disponible=random.random() < 0.7,
            )
            livreurs.append(lv)
        # Quelques livreurs externes sans compte applicatif
        for prenom, nom in [("Moussa", "Doumbia"), ("Issa", "Koné")]:
            livreurs.append(Livreur.objects.create(
                nom_livreur=f"{prenom} {nom}",
                telephone=f"+225{random.choice(['07', '05'])}{random.randint(10**6, 10**7 - 1)}",
                est_disponible=random.random() < 0.7,
            ))
        return livreurs

    def _promos(self):
        data = [
            ("BIENVENUE10", "POURCENTAGE", 10),
            ("FIDELE15", "POURCENTAGE", 15),
            ("CEREMONIE20", "POURCENTAGE", 20),
            ("NOEL5000", "FIXE", 5000),
            ("PAQUES2026", "FIXE", 3000),
            ("VIP25", "POURCENTAGE", 25),
        ]
        promos = []
        for code, type_r, val in data:
            p = CodePromo.objects.create(
                code=code, type_remise=type_r, valeur=deux_dec(val),
                valide_du=self.now - timedelta(days=120),
                valide_jusqu_au=self.now + timedelta(days=90),
                usage_max=random.choice([None, 50, 100]),
                nb_utilisations=0, actif=True,
            )
            promos.append(p)
        return promos

    def _mesures(self, clients):
        mesures = []
        for client in clients:
            for _ in range(random.randint(1, 2)):
                m = Mesure.objects.create(
                    utilisateur=client,
                    mesures={
                        "poitrine": random.randint(80, 115),
                        "taille": random.randint(60, 95),
                        "hanches": random.randint(85, 120),
                        "longueur": random.randint(95, 150),
                        "epaules": random.randint(36, 48),
                    },
                    notes=random.choice(["", "", "Cliente exigeante sur la taille",
                                         "Prévoir marge aux hanches"]),
                )
                self._set_date(m, date_prise=self._jours(5, 200).date())
                mesures.append(m)
        return mesures

    # ------------------------------------------------------------- commandes
    def _commandes(self, n, clients, couturiers, modeles, mesures, promos):
        statuts = (["EN_ATTENTE"] * 2 + ["CONFIRMEE"] * 3 + ["EN_COURS"] * 4
                   + ["LIVREE"] * 7 + ["ANNULEE"] * 1)
        mesures_par_client = {}
        for m in mesures:
            mesures_par_client.setdefault(m.utilisateur_id, []).append(m)

        commandes = []
        for _ in range(n):
            client = random.choice(clients)
            modele = random.choice(modeles)
            statut = random.choice(statuts)
            # La commande est destinée au couturier qui a publié le modèle
            couturier = modele.couturier
            mes = mesures_par_client.get(client.id)
            mesure = random.choice(mes) if mes else None

            # Code promo appliqué dans ~25 % des cas
            code_promo = None
            remise = Decimal("0")
            if random.random() < 0.25:
                code_promo = random.choice(promos)
                remise = code_promo.calculer_remise(modele.prix)

            cmd = Commande.objects.create(
                statut=statut, utilisateur=client, modele=modele,
                mesures_utilisees=mesure, couturier=couturier,
                code_promo=code_promo, remise_appliquee=deux_dec(remise),
            )
            # Dates : plus la commande est avancée, plus elle est ancienne
            age = {"EN_ATTENTE": (0, 12), "CONFIRMEE": (5, 40), "EN_COURS": (8, 70),
                   "LIVREE": (20, 180), "ANNULEE": (10, 150)}[statut]
            date_cmd = self._jours(*age)
            self._set_date(cmd, date_commande=date_cmd)
            cmd._date_commande = date_cmd  # mémorisé pour les étapes suivantes
            if statut == 'LIVREE':
                cmd.date_livraison = date_cmd + timedelta(days=cmd.modele.delai)
                cmd.save(update_fields=['date_livraison'])
            commandes.append(cmd)

            if code_promo:
                CodePromo.objects.filter(pk=code_promo.pk).update(
                    nb_utilisations=code_promo.nb_utilisations + 1)
        return commandes

    def _prix_net(self, cmd):
        return max(Decimal("0"), cmd.modele.prix - cmd.remise_appliquee)

    def _paiements(self, commandes):
        taux = Decimal(self.param.acompte_pourcentage) / Decimal(100)
        for cmd in commandes:
            net = self._prix_net(cmd)
            base_date = getattr(cmd, "_date_commande", self.now)
            if cmd.statut == "EN_ATTENTE":
                continue  # pas encore payée
            if cmd.statut == "ANNULEE":
                # parfois un acompte avait été versé avant annulation
                if random.random() < 0.4:
                    self._paiement(cmd, deux_dec(net * taux), "ACOMPTE",
                                   base_date + timedelta(days=1))
                continue
            # CONFIRMEE / EN_COURS : acompte versé
            acompte = deux_dec(net * taux)
            self._paiement(cmd, acompte, "ACOMPTE", base_date + timedelta(days=1))
            # LIVREE : solde versé également
            if cmd.statut == "LIVREE":
                solde = deux_dec(net - acompte)
                if solde > 0:
                    self._paiement(cmd, solde, "SOLDE",
                                   base_date + timedelta(days=random.randint(5, 20)))

    def _paiement(self, cmd, montant, type_p, date):
        if montant <= 0:
            return
        p = Paiement.objects.create(
            commande=cmd, montant=montant, type=type_p,
            methode=random.choice(["ESPECES", "MOBILE_MONEY", "MOBILE_MONEY", "CARTE"]),
            reference=f"PAY-{cmd.id_commande:05d}-{random.randint(1000, 9999)}",
        )
        self._set_date(p, date=date)

    def _livraisons(self, commandes, livreurs):
        for cmd in commandes:
            if cmd.statut not in ("EN_COURS", "LIVREE"):
                continue
            base_date = getattr(cmd, "_date_commande", self.now)
            if cmd.statut == "LIVREE":
                status_liv = "LIVREE"
                date_liv = (base_date + timedelta(days=random.randint(7, 20))).date()
            else:  # EN_COURS
                status_liv = random.choice(["EN_PREPARATION", "EN_ROUTE"])
                date_liv = None
            Livraison.objects.create(
                commande=cmd,
                adresse_client=random.choice(QUARTIERS_ABIDJAN) + ", Abidjan",
                date_livraison=date_liv,
                status_livraison=status_liv,
                livreur=random.choice(livreurs),
            )

    def _avis(self, commandes):
        for cmd in commandes:
            if cmd.statut != "LIVREE":
                continue
            if random.random() < 0.7:  # 70 % des commandes livrées sont notées
                base_date = getattr(cmd, "_date_commande", self.now)
                note = random.choices([5, 4, 3, 2], weights=[50, 30, 15, 5])[0]
                a = Avis.objects.create(
                    commande=cmd, client=cmd.utilisateur, note=note,
                    commentaire=random.choice(COMMENTAIRES_AVIS),
                )
                self._set_date(a, date_creation=base_date + timedelta(days=random.randint(8, 25)))

    def _favoris(self, clients, modeles):
        for client in clients:
            for modele in random.sample(modeles, random.randint(0, 5)):
                Favoris.objects.get_or_create(utilisateur=client, modele=modele)

    def _notifications(self, users):
        gabarits_client = [
            ("STATUT", "Votre commande #{n} est passée en confirmation."),
            ("STATUT", "Bonne nouvelle : votre commande #{n} est en cours de confection."),
            ("STATUT", "Votre commande #{n} a été livrée. Merci de votre confiance !"),
            ("PROMO", "Profitez de -15 % avec le code FIDELE15 sur votre prochaine tenue."),
            ("PROMO", "Spécial cérémonie : -20 % avec le code CEREMONIE20 !"),
            ("ALERTE", "Pensez à régler le solde de votre commande."),
            ("INFO", "Bienvenue chez SewIvoire, votre atelier de couture en ligne."),
        ]
        gabarits_atelier = [
            ("STATUT", "Nouvelle commande #{n} reçue — à confirmer."),
            ("STATUT", "Nouvelle demande de devis à traiter."),
            ("ALERTE", "Stock faible sur un matériau — pensez à réapprovisionner."),
            ("INFO", "Un client a laissé un avis sur une commande livrée."),
        ]
        for user in users:
            gabarits = gabarits_atelier if getattr(user, 'role', 'CLIENT') == 'COUTURIER' else gabarits_client
            for _ in range(random.randint(1, 5)):
                type_m, txt = random.choice(gabarits)
                n = Notification.objects.create(
                    utilisateur=user,
                    message=txt.format(n=random.randint(1, 130)),
                    type_message=type_m,
                    est_lue=random.random() < 0.5,
                )
                self._set_date(n, date=self._jours(0, 120))

    def _messages(self, clients, couturiers):
        for _ in range(110):
            client = random.choice(clients)
            couturier = random.choice(couturiers)
            if random.random() < 0.5:
                exp, dest, contenu = client, couturier, random.choice(MESSAGES_CLIENT)
            else:
                exp, dest, contenu = couturier, client, random.choice(MESSAGES_ATELIER)
            m = Message.objects.create(
                expediteur=exp, destinataire=dest, contenu=contenu,
                est_lu=random.random() < 0.6,
            )
            self._set_date(m, date_envoi=self._jours(0, 90))

    def _mouvements(self, materiaux, commandes):
        # materiaux est un dict {couturier_pk: [matériaux]} -> on aplatit
        tous_mats = [m for lst in materiaux.values() for m in lst]
        # Entrées de réapprovisionnement
        for mat in tous_mats:
            for _ in range(random.randint(1, 3)):
                mv = MouvementStock.objects.create(
                    materiau=mat, type_mouvement="ENTREE",
                    quantite=deux_dec(random.uniform(20, 150)),
                    reference=f"BL-FOURN-{random.randint(1000, 9999)}",
                    notes="Réapprovisionnement fournisseur",
                )
                self._set_date(mv, date=self._jours(30, 200))
        # Sorties liées aux commandes en confection / livrées
        for cmd in commandes:
            if cmd.statut not in ("EN_COURS", "LIVREE"):
                continue
            base_date = getattr(cmd, "_date_commande", self.now)
            for cons in Consomme.objects.filter(modele=cmd.modele):
                mv = MouvementStock.objects.create(
                    materiau=cons.materiau, type_mouvement="SORTIE",
                    quantite=cons.quantite_necessaire, commande=cmd,
                    notes=f"Coupe commande #{cmd.id_commande}",
                )
                self._set_date(mv, date=base_date + timedelta(days=random.randint(1, 5)))
        # Quelques ajustements d'inventaire
        for mat in random.sample(tous_mats, 5):
            mv = MouvementStock.objects.create(
                materiau=mat, type_mouvement="AJUSTEMENT",
                quantite=mat.quantite_stock,
                reference="INVENTAIRE-2026", notes="Correction après inventaire",
            )
            self._set_date(mv, date=self._jours(1, 30))

    def _devis(self, clients, couturiers, modeles, mesures):
        mesures_par_client = {}
        for m in mesures:
            mesures_par_client.setdefault(m.utilisateur_id, []).append(m)

        statuts = (["DEMANDE"] * 3 + ["PROPOSE"] * 3 + ["ACCEPTE"] * 2
                   + ["REFUSE"] * 1 + ["ANNULE"] * 1)
        for _ in range(28):
            client = random.choice(clients)
            modele = random.choice(modeles)
            statut = random.choice(statuts)
            mes = mesures_par_client.get(client.id)
            mesure = random.choice(mes) if mes else None

            prix_propose = delai_propose = commentaire = None
            date_exp = None
            if statut in ("PROPOSE", "ACCEPTE", "REFUSE"):
                prix_propose = deux_dec(modele.prix + random.randrange(-3000, 8000, 500))
                delai_propose = modele.delai + random.randint(0, 5)
                commentaire = random.choice([
                    "Tissu premium recommandé pour ce modèle.",
                    "Broderie main incluse dans ce tarif.",
                    "Possibilité de réduire le délai moyennant supplément.",
                ])
                date_exp = self.now + timedelta(days=random.randint(7, 30))

            commande_liee = None
            if statut == "ACCEPTE":
                commande_liee = Commande.objects.create(
                    statut="CONFIRMEE", utilisateur=client, modele=modele,
                    mesures_utilisees=mesure,
                    couturier=modele.couturier,
                    remise_appliquee=Decimal("0"),
                )
                self._set_date(commande_liee, date_commande=self._jours(5, 60))

            d = Devis.objects.create(
                modele=modele, client=client, mesures=mesure,
                notes_client=random.choice([
                    "J'aimerais cette tenue pour un mariage.",
                    "Couleur bleue de préférence.",
                    "Pour une cérémonie de baptême.",
                    "Modèle ample s'il vous plaît.",
                ]),
                prix_propose=prix_propose, delai_propose=delai_propose,
                commentaire_couturier=commentaire or "",
                date_expiration=date_exp,
                statut=statut, commande=commande_liee,
            )
            self._set_date(d, date_creation=self._jours(3, 90))

    # --------------------------------------------------------------- résumé
    def _resume(self):
        self.stdout.write(self.style.SUCCESS("\n== Donnees de demo generees ==\n"))
        lignes = [
            ("Utilisateurs (total)", Utilisateur.objects.count()),
            ("  • Clients", Utilisateur.objects.filter(role="CLIENT").count()),
            ("  • Couturiers", Utilisateur.objects.filter(role="COUTURIER").count()),
            ("  • Livreurs (compte)", Utilisateur.objects.filter(role="LIVREUR").count()),
            ("Livreurs (fiches)", Livreur.objects.count()),
            ("Catégories", Categorie.objects.count()),
            ("Matériaux", Materiau.objects.count()),
            ("Modèles", Modele.objects.count()),
            ("Consommations matière", Consomme.objects.count()),
            ("Mesures", Mesure.objects.count()),
            ("Commandes", Commande.objects.count()),
            ("Paiements", Paiement.objects.count()),
            ("Livraisons", Livraison.objects.count()),
            ("Avis", Avis.objects.count()),
            ("Favoris", Favoris.objects.count()),
            ("Notifications", Notification.objects.count()),
            ("Messages", Message.objects.count()),
            ("Mouvements de stock", MouvementStock.objects.count()),
            ("Codes promo", CodePromo.objects.count()),
            ("Devis", Devis.objects.count()),
        ]
        for label, n in lignes:
            self.stdout.write(f"  {label:.<32} {n}")
        self.stdout.write(self.style.WARNING(
            f"\nConnexion demo -- mot de passe commun : {MOT_DE_PASSE_DEMO}"))
        self.stdout.write("   Exemples : client001 / couturier001 / livreur001\n")
