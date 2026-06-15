from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Sew', '0011_devis'),
    ]

    operations = [
        migrations.AlterField(
            model_name='devis',
            name='statut',
            field=models.CharField(
                choices=[
                    ('DEMANDE', 'Demande reçue'),
                    ('PROPOSE', 'Devis proposé'),
                    ('ACCEPTE', 'Accepté'),
                    ('REFUSE', 'Refusé'),
                    ('ANNULE', 'Annulé'),
                ],
                default='DEMANDE',
                max_length=20,
            ),
        ),
    ]
