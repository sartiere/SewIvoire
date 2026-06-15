from django.db import migrations


def migrer_role_admin(apps, schema_editor):
    """
    La migration 0002 a supprimé le choix 'ADMIN' du champ role, mais les
    utilisateurs existants ayant role='ADMIN' gardent cette valeur orpheline
    dans la base. On les convertit : is_staff=True + role='COUTURIER', ce qui
    leur conserve l'accès élevé via is_admin_or_couturier().
    """
    Utilisateur = apps.get_model('Sew', 'Utilisateur')
    Utilisateur.objects.filter(role='ADMIN').update(role='COUTURIER', is_staff=True)


class Migration(migrations.Migration):

    dependencies = [
        ('Sew', '0005_paiement_montant_positif'),
    ]

    operations = [
        migrations.RunPython(migrer_role_admin, migrations.RunPython.noop),
    ]
