import django_filters
from .models import Modele, MouvementStock


class ModeleFilter(django_filters.FilterSet):
    prix_min  = django_filters.NumberFilter(field_name='prix',  lookup_expr='gte')
    prix_max  = django_filters.NumberFilter(field_name='prix',  lookup_expr='lte')
    delai_max = django_filters.NumberFilter(field_name='delai', lookup_expr='lte')

    class Meta:
        model  = Modele
        fields = ['categorie', 'prix_min', 'prix_max', 'delai_max']


class MouvementStockFilter(django_filters.FilterSet):
    date_apres = django_filters.DateTimeFilter(field_name='date', lookup_expr='gte')
    date_avant = django_filters.DateTimeFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model  = MouvementStock
        fields = ['materiau', 'type_mouvement', 'commande']
