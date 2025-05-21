import requests
import jwt
from jwt import PyJWKClient
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from users.models import ClerkUser

# Set this to your actual Clerk domain
CLERK_JWKS_URL = "https://tender-sponge-70.clerk.accounts.dev/.well-known/jwks.json"

class ClerkAuthMiddleware(MiddlewareMixin):
    def process_request(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            request.clerk_user = None
            return
        token = auth_header.split(' ')[1]
        try:
            jwks_client = PyJWKClient(CLERK_JWKS_URL)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=None,
                options={
                    "verify_aud": False,
                    "verify_iat": False  # Disable "issued at" validation which can cause problems with clock skew
                }
            )
            request.clerk_user = payload
            # Try to get ClerkUser if already in database
            try:
                clerk_user = ClerkUser.objects.get(clerk_id=payload['sub'])
                # Associate this ClerkUser with the request
                request.clerk_db_user = clerk_user
            except ClerkUser.DoesNotExist:
                request.clerk_db_user = None
            # Patch request.user so DRF IsAuthenticated permission works
            request.user = type('ClerkAuthedUser', (), {
                'is_authenticated': True, 
                'is_active': True,
                'is_staff': getattr(request.clerk_db_user, 'user_type', '') == 'admin'  # Add is_staff attribute based on user_type
            })()
        except Exception as e:
            return JsonResponse({'error': 'Invalid authentication token', 'details': str(e)}, status=401)