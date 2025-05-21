from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions

class ClerkJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        clerk_user = getattr(request, 'clerk_user', None)
        if not clerk_user:
            return None  # DRF will treat as not authenticated
        # Return a dummy user object and None for auth
        user = type('ClerkAuthedUser', (), {'is_authenticated': True, 'is_active': True})()
        return (user, None)
