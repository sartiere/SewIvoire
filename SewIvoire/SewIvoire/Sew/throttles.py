from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """5 tentatives de connexion par minute par IP."""
    scope = 'login'


class PasswordResetThrottle(AnonRateThrottle):
    """5 demandes de reset par heure par IP — limite le brute-force de tokens."""
    scope = 'password_reset'
