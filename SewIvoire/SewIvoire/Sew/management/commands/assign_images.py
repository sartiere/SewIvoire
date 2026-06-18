"""
Commande interactive pour assigner les images aux modèles de vêtements.

Usage :
    python manage.py assign_images            # mode interactif
    python manage.py assign_images --list     # affiche seulement la liste
    python manage.py assign_images --auto     # tente un matching automatique par nom
"""
import os
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from Sew.models import Modele


IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.jfif', '.png', '.webp', '.gif', '.bmp'}

MEDIA_MODELES = Path(settings.MEDIA_ROOT) / 'modeles'


def _get_images():
    """Retourne la liste triée des fichiers image dans media/modeles/."""
    if not MEDIA_MODELES.exists():
        return []
    return sorted(
        f for f in MEDIA_MODELES.iterdir()
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
    )


def _normalize(text):
    """Normalise un texte pour comparaison floue."""
    import unicodedata
    text = unicodedata.normalize('NFD', text.lower())
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    for car in ('-', '_', '.', ' '):
        text = text.replace(car, ' ')
    return text.strip()


def _score(modele_nom, image_nom):
    """Score de similarité entre un nom de modèle et un nom de fichier (0-100)."""
    nm = _normalize(modele_nom)
    ni = _normalize(image_nom)
    mots_modele = set(nm.split())
    mots_image = set(ni.split())
    communs = mots_modele & mots_image
    if not mots_modele:
        return 0
    return int(100 * len(communs) / len(mots_modele))


class Command(BaseCommand):
    help = "Assigner interactivement des images aux modèles de vêtements."

    def add_arguments(self, parser):
        parser.add_argument(
            '--list', action='store_true',
            help="Affiche uniquement la liste des modèles et images disponibles."
        )
        parser.add_argument(
            '--auto', action='store_true',
            help="Matching automatique par similarité de nom (confirme avant d'appliquer)."
        )
        parser.add_argument(
            '--overwrite', action='store_true',
            help="Re-assigner meme les modeles qui ont deja une image."
        )
        parser.add_argument(
            '--yes', action='store_true',
            help="Confirmer automatiquement sans demander (mode --auto uniquement)."
        )

    def handle(self, *args, **opts):
        images = _get_images()
        if not images:
            self.stdout.write(self.style.ERROR(
                f"Aucune image trouvée dans {MEDIA_MODELES}\n"
                "Vérifiez que MEDIA_ROOT est correctement configuré dans settings.py."
            ))
            return

        modeles = list(Modele.objects.all().order_by('id_modele'))
        if not modeles:
            self.stdout.write(self.style.WARNING("Aucun modèle en base de données."))
            return

        if opts['overwrite']:
            cibles = modeles
        else:
            cibles = [m for m in modeles if not m.image]

        self._afficher_images(images)

        if opts['list']:
            self._afficher_modeles(modeles)
            return

        if opts['auto']:
            self._mode_auto(cibles, images, yes=opts['yes'])
        else:
            self._mode_interactif(cibles, images)

    # ------------------------------------------------------------------ affichage

    def _afficher_images(self, images):
        self.stdout.write(self.style.SUCCESS(
            f"\n{'=' * 60}\n  IMAGES DISPONIBLES ({len(images)} fichiers)\n{'=' * 60}"
        ))
        for i, img in enumerate(images, start=1):
            self.stdout.write(f"  [{i:3d}] {img.name}")
        self.stdout.write("")

    def _afficher_modeles(self, modeles):
        self.stdout.write(self.style.SUCCESS(
            f"\n{'=' * 60}\n  MODÈLES EN BASE ({len(modeles)} modèles)\n{'=' * 60}"
        ))
        for m in modeles:
            statut = self.style.WARNING("SANS IMAGE") if not m.image else self.style.SUCCESS("OK")
            image_actuelle = str(m.image) if m.image else "—"
            self.stdout.write(
                f"  [ID {m.id_modele:3d}] {m.nom:<35s} {statut}  {image_actuelle}"
            )
        self.stdout.write("")

    # ------------------------------------------------------------------ mode interactif

    def _mode_interactif(self, cibles, images):
        if not cibles:
            self.stdout.write(self.style.SUCCESS(
                "Tous les modèles ont déjà une image. "
                "Utilisez --overwrite pour réassigner."
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            f"\n{'=' * 60}\n  MODE INTERACTIF — {len(cibles)} modèle(s) à traiter\n{'=' * 60}"
        ))
        self.stdout.write(
            "  Pour chaque modèle, tapez le numéro de l'image à assigner.\n"
            "  Tapez  0  ou laissez vide pour passer au suivant.\n"
            "  Tapez  q  pour quitter.\n"
        )

        assignes = 0
        for modele in cibles:
            self.stdout.write(
                self.style.MIGRATE_HEADING(f"\n  Modèle : {modele.nom}  (ID {modele.id_modele})")
            )
            if modele.image:
                self.stdout.write(f"  Image actuelle : {modele.image}")

            # Suggère les 3 meilleures correspondances
            suggestions = sorted(
                ((i + 1, img, _score(modele.nom, img.stem)) for i, img in enumerate(images)),
                key=lambda x: -x[2]
            )[:3]
            if suggestions and suggestions[0][2] > 0:
                self.stdout.write("  Suggestions :")
                for num, img, score in suggestions:
                    self.stdout.write(f"    [{num:3d}] {img.name}  (score {score}%)")

            while True:
                choix = input("  > Numéro de l'image (0 = passer, q = quitter) : ").strip()
                if choix.lower() == 'q':
                    self.stdout.write(self.style.WARNING("\nInterrompu par l'utilisateur."))
                    self._resume(assignes)
                    return
                if choix in ('', '0'):
                    self.stdout.write("  → Ignoré.")
                    break
                if choix.isdigit():
                    idx = int(choix)
                    if 1 <= idx <= len(images):
                        chemin_relatif = f"modeles/{images[idx - 1].name}"
                        modele.image = chemin_relatif
                        modele.save(update_fields=['image'])
                        self.stdout.write(
                            self.style.SUCCESS(f"  ✔ Image assignée : {images[idx - 1].name}")
                        )
                        assignes += 1
                        break
                    else:
                        self.stdout.write(
                            self.style.ERROR(f"  Numéro invalide (1–{len(images)}).")
                        )
                else:
                    self.stdout.write(self.style.ERROR("  Entrée invalide."))

        self._resume(assignes)

    # ------------------------------------------------------------------ mode auto

    def _mode_auto(self, cibles, images, yes=False):
        if not cibles:
            self.stdout.write(self.style.SUCCESS(
                "Tous les modèles ont déjà une image. "
                "Utilisez --overwrite pour réassigner."
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            f"\n{'=' * 60}\n  MATCHING AUTOMATIQUE — {len(cibles)} modèle(s)\n{'=' * 60}"
        ))

        propositions = []
        images_utilisees = set()

        for modele in cibles:
            meilleur = None
            meilleur_score = 0
            for i, img in enumerate(images):
                if img.name in images_utilisees:
                    continue
                s = _score(modele.nom, img.stem)
                if s > meilleur_score:
                    meilleur_score = s
                    meilleur = (i + 1, img)

            propositions.append((modele, meilleur, meilleur_score))
            if meilleur and meilleur_score >= 30:
                images_utilisees.add(meilleur[1].name)

        # Affiche les propositions
        self.stdout.write(f"\n  {'NOM DU MODÈLE':<35} {'IMAGE PROPOSÉE':<45} SCORE")
        self.stdout.write("  " + "-" * 90)
        for modele, meilleur, score in propositions:
            if meilleur and score >= 30:
                couleur = self.style.SUCCESS
                img_nom = meilleur[1].name
            else:
                couleur = self.style.WARNING
                img_nom = "(aucune correspondance)"
            self.stdout.write(
                couleur(f"  {modele.nom:<35} {img_nom:<45} {score}%")
            )

        self.stdout.write("")
        if not yes:
            confirm = input(
                "  Appliquer les assignations avec score >= 30% ? [o/N] : "
            ).strip().lower()
            if confirm != 'o':
                self.stdout.write(self.style.WARNING("Annule. Aucune modification."))
                return
        else:
            self.stdout.write("  --yes active : application automatique.")

        assignes = 0
        for modele, meilleur, score in propositions:
            if meilleur and score >= 30:
                chemin_relatif = f"modeles/{meilleur[1].name}"
                modele.image = chemin_relatif
                modele.save(update_fields=['image'])
                assignes += 1

        self._resume(assignes)

    # ------------------------------------------------------------------ résumé

    def _resume(self, assignes):
        total = Modele.objects.filter(image='').count() + \
                Modele.objects.filter(image__isnull=True).count()
        self.stdout.write(self.style.SUCCESS(
            f"\n  {assignes} image(s) assignee(s). "
            f"{total} modele(s) encore sans image.\n"
        ))
