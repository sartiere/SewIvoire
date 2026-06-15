from decimal import Decimal
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APITestCase
from rest_framework import status
from .models import (
    Utilisateur, Categorie, Modele, Materiau, Commande,
    Consomme, Paiement, Mesure, Notification, MouvementStock,
)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def creer_modele(nom='Robe wax', prix='15000', libelle='Robes', delai=7):
    cat, _ = Categorie.objects.get_or_create(libelle=libelle)
    return Modele.objects.create(nom=nom, prix=Decimal(prix), delai=delai, categorie=cat)


def creer_user(username, role='CLIENT', is_staff=False, **kwargs):
    return Utilisateur.objects.create_user(
        username=username, password='TestPass123!',
        first_name=kwargs.get('first_name', username),
        last_name=kwargs.get('last_name', 'Test'),
        role=role, is_staff=is_staff,
    )


# ──────────────────────────────────────────────────────────────────────────────
# 1. INSCRIPTION PUBLIQUE (Bug 5 + sécurité)
# ──────────────────────────────────────────────────────────────────────────────

class InscriptionTests(APITestCase):
    """L'endpoint POST /api/utilisateurs/register/ est public et force role=CLIENT."""

    URL = None

    def setUp(self):
        self.URL = reverse('utilisateurs-register')

    def test_role_force_client_meme_si_couturier_demande(self):
        resp = self.client.post(self.URL, {
            'username': 'koffi', 'password': 'TestPass123!', 'role': 'COUTURIER',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['role'], 'CLIENT')

    def test_role_force_client_meme_si_livreur_demande(self):
        resp = self.client.post(self.URL, {
            'username': 'ama', 'password': 'TestPass123!', 'role': 'LIVREUR',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['role'], 'CLIENT')

    def test_password_absent_de_la_reponse(self):
        resp = self.client.post(self.URL, {'username': 'sali', 'password': 'TestPass123!'})
        self.assertNotIn('password', resp.data)

    def test_username_duplique_rejete(self):
        creer_user('existe')
        resp = self.client.post(self.URL, {'username': 'existe', 'password': 'TestPass123!'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sans_authentification_accessible(self):
        resp = self.client.post(self.URL, {'username': 'nouveau', 'password': 'TestPass123!'})
        self.assertNotEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ──────────────────────────────────────────────────────────────────────────────
# 2. VISIBILITÉ DES COMMANDES (Bug 2)
# ──────────────────────────────────────────────────────────────────────────────

class CommandeVisibiliteTests(APITestCase):
    """Un client ne voit que ses commandes. Un couturier/staff voit tout."""

    def setUp(self):
        self.modele = creer_modele()
        self.client1 = creer_user('client1', 'CLIENT')
        self.client2 = creer_user('client2', 'CLIENT')
        self.couturier = creer_user('couturier1', 'COUTURIER')
        self.cmd = Commande.objects.create(utilisateur=self.client1, modele=self.modele)

    def _ids(self, user):
        self.client.force_authenticate(user=user)
        resp = self.client.get(reverse('commandes-list'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        return [c['id_commande'] for c in resp.data['results']]

    def test_client2_ne_voit_pas_commande_de_client1(self):
        self.assertNotIn(self.cmd.id_commande, self._ids(self.client2))

    def test_client1_voit_sa_propre_commande(self):
        self.assertIn(self.cmd.id_commande, self._ids(self.client1))

    def test_couturier_voit_toutes_les_commandes(self):
        self.assertIn(self.cmd.id_commande, self._ids(self.couturier))

    def test_staff_voit_toutes_les_commandes(self):
        staff = creer_user('admin1', 'CLIENT', is_staff=True)
        self.assertIn(self.cmd.id_commande, self._ids(staff))

    def test_non_authentifie_refuse(self):
        resp = self.client.get(reverse('commandes-list'))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ──────────────────────────────────────────────────────────────────────────────
# 3. WORKFLOW DES TRANSITIONS DE STATUT (Bug 13)
# ──────────────────────────────────────────────────────────────────────────────

class TransitionStatutTests(APITestCase):
    """Seules les transitions définies dans TRANSITIONS_VALIDES sont autorisées."""

    def setUp(self):
        modele = creer_modele('Chemise', '8000', 'Chemises', 5)
        self.couturier = creer_user('couturier', 'COUTURIER')
        self.commande = Commande.objects.create(utilisateur=self.couturier, modele=modele)
        self.client.force_authenticate(user=self.couturier)

    def _changer(self, nouveau_statut, commande=None):
        cmd = commande or self.commande
        return self.client.post(
            reverse('commandes-changer-statut', kwargs={'pk': cmd.pk}),
            {'statut': nouveau_statut},
        )

    def test_en_attente_vers_confirmee_accepte(self):
        resp = self._changer('CONFIRMEE')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, 'CONFIRMEE')

    def test_en_attente_vers_annulee_accepte(self):
        resp = self._changer('ANNULEE')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_en_attente_vers_livree_refuse(self):
        resp = self._changer('LIVREE')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('transitions_possibles', resp.data)

    def test_statut_inconnu_refuse(self):
        resp = self._changer('ZOMBIE')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_etat_terminal_annulee_bloque_toute_transition(self):
        self.commande.statut = 'ANNULEE'
        self.commande.save()
        resp = self._changer('EN_ATTENTE')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Aucune', str(resp.data.get('transitions_possibles', '')))

    def test_etat_terminal_livree_bloque_toute_transition(self):
        self.commande.statut = 'LIVREE'
        self.commande.save()
        resp = self._changer('EN_COURS')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────────────────────
# 4. DÉDUCTION DE STOCK (Bug 4)
# ──────────────────────────────────────────────────────────────────────────────

class StockDeductionTests(APITestCase):
    """Le passage EN_COURS décrémente le stock. Double-déduction et stock insuffisant bloqués."""

    def setUp(self):
        modele = creer_modele('Pantalon', '12000', 'Pantalons', 6)
        self.tissu = Materiau.objects.create(
            nom_materiau='Tissu jean', quantite_stock=Decimal('10.00'), unite='METRE',
        )
        Consomme.objects.create(modele=modele, materiau=self.tissu, quantite_necessaire=Decimal('2.50'))
        self.couturier = creer_user('coutou', 'COUTURIER')
        self.commande = Commande.objects.create(
            utilisateur=self.couturier, modele=modele, statut='CONFIRMEE',
        )
        self.client.force_authenticate(user=self.couturier)

    def _url(self):
        return reverse('commandes-changer-statut', kwargs={'pk': self.commande.pk})

    def test_stock_decremente_au_passage_en_cours(self):
        self.client.post(self._url(), {'statut': 'EN_COURS'})
        self.tissu.refresh_from_db()
        self.assertEqual(self.tissu.quantite_stock, Decimal('7.50'))

    def test_stock_insuffisant_bloque_transition(self):
        self.tissu.quantite_stock = Decimal('1.00')
        self.tissu.save()
        resp = self.client.post(self._url(), {'statut': 'EN_COURS'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Stock insuffisant', resp.data['error'])
        self.tissu.refresh_from_db()
        self.assertEqual(self.tissu.quantite_stock, Decimal('1.00'))  # inchangé

    def test_double_deduction_impossible(self):
        """EN_COURS → EN_COURS est une transition invalide : le stock ne bouge pas."""
        self.client.post(self._url(), {'statut': 'EN_COURS'})
        resp = self.client.post(self._url(), {'statut': 'EN_COURS'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.tissu.refresh_from_db()
        self.assertEqual(self.tissu.quantite_stock, Decimal('7.50'))  # déduit une seule fois


# ──────────────────────────────────────────────────────────────────────────────
# 5. VALIDATION DES PAIEMENTS — surpaiement bloqué (Bug 15)
# ──────────────────────────────────────────────────────────────────────────────

class PaiementValidationTests(APITestCase):
    """Le montant d'un paiement ne peut pas dépasser le reste à payer."""

    def setUp(self):
        modele = creer_modele('Boubou', '10000', 'Boubous', 10)
        self.client_user = creer_user('clientp', 'CLIENT')
        self.commande = Commande.objects.create(utilisateur=self.client_user, modele=modele)
        self.client.force_authenticate(user=self.client_user)
        self.url = reverse('paiements-list')

    def _payer(self, montant, type_='ACOMPTE', methode='ESPECES'):
        return self.client.post(self.url, {
            'commande': self.commande.pk,
            'montant': str(montant),
            'type': type_,
            'methode': methode,
        })

    def test_surpaiement_bloque(self):
        resp = self._payer('11000.00', 'TOTAL')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('montant', resp.data)

    def test_paiement_exact_accepte(self):
        resp = self._payer('10000.00', 'TOTAL')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_acompte_puis_solde_cumul_valide(self):
        self._payer('4000.00', 'ACOMPTE')
        resp = self._payer('6000.00', 'SOLDE')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_depassement_apres_acompte_bloque(self):
        self._payer('4000.00', 'ACOMPTE')
        resp = self._payer('7000.00', 'SOLDE')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('montant', resp.data)

    def test_montant_negatif_rejete(self):
        resp = self._payer('-500.00')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_montant_zero_rejete(self):
        resp = self._payer('0.00')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────────────────────
# 6. VALIDATION DES MESURES (Bug 12)
# ──────────────────────────────────────────────────────────────────────────────

class MesureValidationTests(APITestCase):
    """Le JSONField mesures exige les 4 clés obligatoires avec des valeurs > 0."""

    def setUp(self):
        self.user = creer_user('mesure_user', 'CLIENT')
        self.client.force_authenticate(user=self.user)
        self.url = reverse('mesures-list')

    def _post(self, mesures):
        return self.client.post(self.url, {'mesures': mesures}, format='json')

    def test_mesures_completes_valides_acceptees(self):
        resp = self._post({'poitrine': 90, 'taille': 70, 'hanches': 95, 'longueur': 120})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_cle_manquante_rejetee(self):
        resp = self._post({'poitrine': 90, 'taille': 70})  # hanches + longueur manquants
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valeur_negative_rejetee(self):
        resp = self._post({'poitrine': -5, 'taille': 70, 'hanches': 95, 'longueur': 120})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valeur_zero_rejetee(self):
        resp = self._post({'poitrine': 0, 'taille': 70, 'hanches': 95, 'longueur': 120})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valeur_texte_rejetee(self):
        resp = self._post({'poitrine': 'grand', 'taille': 70, 'hanches': 95, 'longueur': 120})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_json_non_dict_rejete(self):
        resp = self._post([90, 70, 95, 120])
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_champs_supplementaires_acceptes(self):
        resp = self._post({
            'poitrine': 90, 'taille': 70, 'hanches': 95, 'longueur': 120,
            'epaule': 40,  # champ optionnel supplémentaire — autorisé
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────────────────────────────
# 7. ALERTES STOCK (Bug 10)
# ──────────────────────────────────────────────────────────────────────────────

class AlerteStockTests(APITestCase):
    """L'endpoint alertes_stock ne renvoie que les matériaux sous le seuil d'alerte."""

    def setUp(self):
        self.user = creer_user('gestionnaire', 'COUTURIER')
        self.client.force_authenticate(user=self.user)
        Materiau.objects.create(
            nom_materiau='Tissu rouge', quantite_stock=Decimal('5.00'),
            seuil_alerte=Decimal('10.00'), unite='METRE',
        )
        Materiau.objects.create(
            nom_materiau='Tissu bleu', quantite_stock=Decimal('15.00'),
            seuil_alerte=Decimal('10.00'), unite='METRE',
        )
        Materiau.objects.create(
            nom_materiau='Fil blanc', quantite_stock=Decimal('2.00'),
            seuil_alerte=None, unite='BOBINE',  # pas de seuil → jamais en alerte
        )

    def test_retourne_uniquement_les_articles_sous_seuil(self):
        resp = self.client.get(reverse('materiaux-alertes-stock'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        noms = [m['nom_materiau'] for m in resp.data]
        self.assertIn('Tissu rouge', noms)
        self.assertNotIn('Tissu bleu', noms)
        self.assertNotIn('Fil blanc', noms)

    def test_stock_egal_au_seuil_est_en_alerte(self):
        Materiau.objects.create(
            nom_materiau='Tissu exact', quantite_stock=Decimal('10.00'),
            seuil_alerte=Decimal('10.00'), unite='METRE',
        )
        resp = self.client.get(reverse('materiaux-alertes-stock'))
        noms = [m['nom_materiau'] for m in resp.data]
        self.assertIn('Tissu exact', noms)


# ──────────────────────────────────────────────────────────────────────────────
# 8. ENDPOINT DÉDIÉ /api/register/ (Feature A)
# ──────────────────────────────────────────────────────────────────────────────

class RegisterEndpointTests(APITestCase):
    """Le raccourci /api/register/ pointe vers la même logique que /api/utilisateurs/register/."""

    def test_url_register_accessible_sans_auth(self):
        resp = self.client.post(reverse('register'), {
            'username': 'nouveau_client', 'password': 'TestPass123!',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_url_register_force_role_client(self):
        resp = self.client.post(reverse('register'), {
            'username': 'hacker', 'password': 'TestPass123!', 'role': 'COUTURIER',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['role'], 'CLIENT')

    def test_url_register_password_absent_reponse(self):
        resp = self.client.post(reverse('register'), {
            'username': 'user_ok', 'password': 'TestPass123!',
        })
        self.assertNotIn('password', resp.data)

    def test_url_register_et_utilisateurs_register_coherents(self):
        """Les deux URLs créent le même type de compte."""
        r1 = self.client.post(reverse('register'), {
            'username': 'via_register', 'password': 'TestPass123!',
        })
        r2 = self.client.post(reverse('utilisateurs-register'), {
            'username': 'via_utilisateurs', 'password': 'TestPass123!',
        })
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r1.data['role'], r2.data['role'])


# ──────────────────────────────────────────────────────────────────────────────
# 9. LOGOUT / INVALIDATION JWT (Feature B)
# ──────────────────────────────────────────────────────────────────────────────

class LogoutTests(APITestCase):
    """POST /api/logout/ blackliste le refresh token ; il ne peut plus être utilisé."""

    def setUp(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        self.user = creer_user('logout_user', 'CLIENT')
        self.refresh = RefreshToken.for_user(self.user)

    def test_logout_accepte_un_refresh_token_valide(self):
        resp = self.client.post(reverse('token_blacklist'), {'refresh': str(self.refresh)})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_refresh_token_inutilisable_apres_logout(self):
        self.client.post(reverse('token_blacklist'), {'refresh': str(self.refresh)})
        resp = self.client.post(reverse('token_refresh'), {'refresh': str(self.refresh)})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_sans_token_renvoie_erreur(self):
        resp = self.client.post(reverse('token_blacklist'), {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_avec_token_invalide_renvoie_erreur(self):
        resp = self.client.post(reverse('token_blacklist'), {'refresh': 'token.faux.invalide'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_double_logout_refuse(self):
        """Un token déjà blacklisté ne peut pas être réutilisé."""
        self.client.post(reverse('token_blacklist'), {'refresh': str(self.refresh)})
        resp = self.client.post(reverse('token_blacklist'), {'refresh': str(self.refresh)})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ──────────────────────────────────────────────────────────────────────────────
# 10. RÉINITIALISATION DE MOT DE PASSE (Feature C)
# ──────────────────────────────────────────────────────────────────────────────

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PasswordResetTests(APITestCase):
    """
    POST /api/password/reset/ envoie un email.
    POST /api/password/reset/confirm/ valide le token et change le mot de passe.
    """

    def setUp(self):
        self.user = creer_user('reset_user', 'CLIENT')
        self.user.email = 'reset_user@example.com'
        self.user.save()

    def _uid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        return uid, token

    def test_demande_reset_email_existant_envoie_email(self):
        mail.outbox = []
        resp = self.client.post(reverse('password_reset'), {'email': 'reset_user@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('reset_user@example.com', mail.outbox[0].to)

    def test_demande_reset_email_inconnu_ne_revele_rien(self):
        """Même réponse 200 si l'email n'existe pas — évite l'énumération."""
        mail.outbox = []
        resp = self.client.post(reverse('password_reset'), {'email': 'fantome@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_confirm_avec_token_valide_change_le_mot_de_passe(self):
        uid, token = self._uid_token()
        resp = self.client.post(reverse('password_reset_confirm'), {
            'uid': uid, 'token': token,
            'new_password': 'NouveauPass456!',
            'new_password_confirm': 'NouveauPass456!',
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NouveauPass456!'))

    def test_confirm_token_invalide_rejete(self):
        uid, _ = self._uid_token()
        resp = self.client.post(reverse('password_reset_confirm'), {
            'uid': uid, 'token': 'token-completement-faux',
            'new_password': 'NouveauPass456!',
            'new_password_confirm': 'NouveauPass456!',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_uid_invalide_rejete(self):
        _, token = self._uid_token()
        resp = self.client.post(reverse('password_reset_confirm'), {
            'uid': 'uid-invalide', 'token': token,
            'new_password': 'NouveauPass456!',
            'new_password_confirm': 'NouveauPass456!',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_mots_de_passe_differents_rejete(self):
        uid, token = self._uid_token()
        resp = self.client.post(reverse('password_reset_confirm'), {
            'uid': uid, 'token': token,
            'new_password': 'NouveauPass456!',
            'new_password_confirm': 'AutrePass789!',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password_confirm', resp.data)

    def test_confirm_mot_de_passe_trop_court_rejete(self):
        uid, token = self._uid_token()
        resp = self.client.post(reverse('password_reset_confirm'), {
            'uid': uid, 'token': token,
            'new_password': 'abc',
            'new_password_confirm': 'abc',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_email_contient_lien_avec_uid_et_token(self):
        mail.outbox = []
        self.client.post(reverse('password_reset'), {'email': 'reset_user@example.com'})
        corps = mail.outbox[0].body
        self.assertIn('uid=', corps)
        self.assertIn('token=', corps)


# ──────────────────────────────────────────────────────────────────────────────
# 11. ASSIGNATION DE COUTURIER (Feature D)
# ──────────────────────────────────────────────────────────────────────────────

class AssignerCouturierTests(APITestCase):
    """POST /api/commandes/{id}/assigner_couturier/ réserve une commande à un couturier."""

    def setUp(self):
        modele = creer_modele('Robe', '20000', 'Tenues', 10)
        self.client_user = creer_user('clientc', 'CLIENT')
        self.couturier1 = creer_user('cou1', 'COUTURIER', first_name='Marie', last_name='K')
        self.couturier2 = creer_user('cou2', 'COUTURIER', first_name='Jean', last_name='D')
        self.admin = creer_user('admin', 'CLIENT', is_staff=True)
        self.commande = Commande.objects.create(utilisateur=self.client_user, modele=modele)

    def _url(self):
        return reverse('commandes-assigner-couturier', kwargs={'pk': self.commande.pk})

    def test_admin_peut_assigner(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self._url(), {'couturier_id': self.couturier1.pk})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.couturier, self.couturier1)

    def test_couturier_peut_assigner(self):
        self.client.force_authenticate(user=self.couturier1)
        resp = self.client.post(self._url(), {'couturier_id': self.couturier1.pk})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_client_ne_peut_pas_assigner(self):
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.post(self._url(), {'couturier_id': self.couturier1.pk})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_couturier_id_manquant_rejete(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self._url(), {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_id_inexistant_rejete(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self._url(), {'couturier_id': 99999})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_comme_couturier_rejete(self):
        """Un utilisateur CLIENT ne peut pas être assigné comme couturier."""
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self._url(), {'couturier_id': self.client_user.pk})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reassignation_change_le_couturier(self):
        self.commande.couturier = self.couturier1
        self.commande.save()
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self._url(), {'couturier_id': self.couturier2.pk})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['remplacement'], self.couturier1.username)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.couturier, self.couturier2)

    def test_notification_envoyee_au_couturier(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(self._url(), {'couturier_id': self.couturier1.pk})
        notif = Notification.objects.filter(utilisateur=self.couturier1).last()
        self.assertIsNotNone(notif)
        self.assertIn(str(self.commande.id_commande), notif.message)

    def test_commande_detail_inclut_couturier(self):
        self.commande.couturier = self.couturier1
        self.commande.save()
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(reverse('commandes-detail', kwargs={'pk': self.commande.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('couturier', resp.data)
        self.assertEqual(resp.data['couturier']['username'], self.couturier1.username)


# ──────────────────────────────────────────────────────────────────────────────
# 12. FILTRES ET RECHERCHE SUR MODÈLE (Feature E)
# ──────────────────────────────────────────────────────────────────────────────

class ModeleFiltrageTests(APITestCase):
    """
    GET /api/modeles/ supporte ?categorie=, ?prix_min=, ?prix_max=,
    ?delai_max=, ?search=, ?ordering=
    """

    def setUp(self):
        self.user = creer_user('u', 'CLIENT')
        self.client.force_authenticate(user=self.user)

        cat_robe   = Categorie.objects.create(libelle='Robes')
        cat_chemise = Categorie.objects.create(libelle='Chemises')

        Modele.objects.create(nom='Robe wax',       prix=Decimal('15000'), delai=7,  categorie=cat_robe)
        Modele.objects.create(nom='Robe traditionnelle', prix=Decimal('25000'), delai=14, categorie=cat_robe)
        Modele.objects.create(nom='Chemise basique', prix=Decimal('8000'),  delai=3,  categorie=cat_chemise)
        self.url = reverse('modeles-list')

    def _get(self, **params):
        return self.client.get(self.url, params)

    def _noms(self, resp):
        return [m['nom'] for m in resp.data['results']]

    def test_filtre_par_categorie(self):
        cat = Categorie.objects.get(libelle='Robes')
        resp = self._get(categorie=cat.pk)
        noms = self._noms(resp)
        self.assertIn('Robe wax', noms)
        self.assertNotIn('Chemise basique', noms)

    def test_filtre_prix_min(self):
        resp = self._get(prix_min=15000)
        noms = self._noms(resp)
        self.assertIn('Robe wax', noms)
        self.assertIn('Robe traditionnelle', noms)
        self.assertNotIn('Chemise basique', noms)

    def test_filtre_prix_max(self):
        resp = self._get(prix_max=10000)
        noms = self._noms(resp)
        self.assertIn('Chemise basique', noms)
        self.assertNotIn('Robe wax', noms)

    def test_filtre_prix_range(self):
        resp = self._get(prix_min=10000, prix_max=20000)
        noms = self._noms(resp)
        self.assertIn('Robe wax', noms)
        self.assertNotIn('Chemise basique', noms)
        self.assertNotIn('Robe traditionnelle', noms)

    def test_filtre_delai_max(self):
        resp = self._get(delai_max=7)
        noms = self._noms(resp)
        self.assertIn('Robe wax', noms)
        self.assertIn('Chemise basique', noms)
        self.assertNotIn('Robe traditionnelle', noms)

    def test_recherche_par_nom(self):
        resp = self._get(search='chemise')
        noms = self._noms(resp)
        self.assertIn('Chemise basique', noms)
        self.assertNotIn('Robe wax', noms)

    def test_recherche_par_libelle_categorie(self):
        resp = self._get(search='Robes')
        noms = self._noms(resp)
        self.assertIn('Robe wax', noms)
        self.assertIn('Robe traditionnelle', noms)
        self.assertNotIn('Chemise basique', noms)

    def test_tri_par_prix_croissant(self):
        resp = self._get(ordering='prix')
        # Convertir en Decimal pour un tri numérique (sorted() sur strings serait lexicographique)
        prix = [Decimal(m['prix']) for m in resp.data['results']]
        self.assertEqual(prix, sorted(prix))

    def test_tri_par_prix_decroissant(self):
        resp = self._get(ordering='-prix')
        prix = [Decimal(m['prix']) for m in resp.data['results']]
        self.assertEqual(prix, sorted(prix, reverse=True))


# ──────────────────────────────────────────────────────────────────────────────
# 13. HISTORIQUE DES MOUVEMENTS DE STOCK (Feature F)
# ──────────────────────────────────────────────────────────────────────────────

class MouvementStockTests(APITestCase):
    """
    POST /api/mouvements-stock/ crée un mouvement et met à jour quantite_stock.
    GET  /api/mouvements-stock/ liste les mouvements (admin/couturier seulement).
    """

    def setUp(self):
        self.couturier = creer_user('geststock', 'COUTURIER')
        self.client_user = creer_user('clientstock', 'CLIENT')
        self.tissu = Materiau.objects.create(
            nom_materiau='Tissu bazin', quantite_stock=Decimal('20.00'), unite='METRE',
        )
        self.client.force_authenticate(user=self.couturier)
        self.url = reverse('mouvements-stock-list')

    def _post(self, type_mouvement, quantite, **extra):
        return self.client.post(self.url, {
            'materiau': self.tissu.pk,
            'type_mouvement': type_mouvement,
            'quantite': str(quantite),
            **extra,
        })

    # ── ENTREE ──────────────────────────────────────────────────────────────

    def test_entree_incremente_stock(self):
        self._post('ENTREE', '5.00')
        self.tissu.refresh_from_db()
        self.assertEqual(self.tissu.quantite_stock, Decimal('25.00'))

    def test_entree_cree_mouvement(self):
        self._post('ENTREE', '5.00', reference='BL-001')
        self.assertEqual(MouvementStock.objects.filter(type_mouvement='ENTREE').count(), 1)

    # ── SORTIE ──────────────────────────────────────────────────────────────

    def test_sortie_decremente_stock(self):
        self._post('SORTIE', '8.00')
        self.tissu.refresh_from_db()
        self.assertEqual(self.tissu.quantite_stock, Decimal('12.00'))

    def test_sortie_stock_insuffisant_rejete(self):
        resp = self._post('SORTIE', '50.00')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.tissu.refresh_from_db()
        self.assertEqual(self.tissu.quantite_stock, Decimal('20.00'))  # inchangé

    # ── AJUSTEMENT ──────────────────────────────────────────────────────────

    def test_ajustement_fixe_stock_a_valeur_absolue(self):
        self._post('AJUSTEMENT', '42.50')
        self.tissu.refresh_from_db()
        self.assertEqual(self.tissu.quantite_stock, Decimal('42.50'))

    # ── LOG AUTOMATIQUE (changer_statut → EN_COURS) ─────────────────────────

    def test_changer_statut_en_cours_cree_mouvement_sortie(self):
        modele = creer_modele('Boubou', '12000', 'Boubous', 8)
        Consomme.objects.create(modele=modele, materiau=self.tissu, quantite_necessaire=Decimal('3.00'))
        commande = Commande.objects.create(
            utilisateur=self.client_user, modele=modele, statut='CONFIRMEE',
        )
        self.client.post(
            reverse('commandes-changer-statut', kwargs={'pk': commande.pk}),
            {'statut': 'EN_COURS'},
        )
        mvt = MouvementStock.objects.filter(
            materiau=self.tissu, type_mouvement='SORTIE', commande=commande,
        ).first()
        self.assertIsNotNone(mvt)
        self.assertEqual(mvt.quantite, Decimal('3.00'))

    # ── PERMISSIONS ─────────────────────────────────────────────────────────

    def test_client_ne_peut_pas_acceder(self):
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_couturier_peut_lister(self):
        self._post('ENTREE', '2.00')
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(resp.data['count'], 1)

    # ── IMMUABILITÉ ─────────────────────────────────────────────────────────

    def test_mouvement_non_modifiable(self):
        resp = self._post('ENTREE', '2.00')
        mvt_id = resp.data['id']
        resp_put = self.client.put(
            reverse('mouvements-stock-detail', kwargs={'pk': mvt_id}),
            {'type_mouvement': 'SORTIE', 'quantite': '1.00', 'materiau': self.tissu.pk},
        )
        self.assertEqual(resp_put.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_mouvement_non_supprimable(self):
        resp = self._post('ENTREE', '2.00')
        mvt_id = resp.data['id']
        resp_del = self.client.delete(
            reverse('mouvements-stock-detail', kwargs={'pk': mvt_id}),
        )
        self.assertEqual(resp_del.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    # ── FILTRES ─────────────────────────────────────────────────────────────

    def test_filtre_par_type_mouvement(self):
        self._post('ENTREE', '3.00')
        self._post('SORTIE', '1.00')
        resp = self.client.get(self.url, {'type_mouvement': 'ENTREE'})
        types = [m['type_mouvement'] for m in resp.data['results']]
        self.assertTrue(all(t == 'ENTREE' for t in types))

    def test_filtre_par_materiau(self):
        autre = Materiau.objects.create(nom_materiau='Fil', quantite_stock=Decimal('100'), unite='BOBINE')
        self._post('ENTREE', '5.00')
        self.client.post(self.url, {'materiau': autre.pk, 'type_mouvement': 'ENTREE', 'quantite': '10'})
        resp = self.client.get(self.url, {'materiau': self.tissu.pk})
        ids = [m['materiau'] for m in resp.data['results']]
        self.assertTrue(all(i == self.tissu.pk for i in ids))
