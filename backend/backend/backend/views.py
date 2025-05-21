from django.http import JsonResponse

def protected_view(request):
    if not getattr(request, 'clerk_user', None):
        return JsonResponse({'error': 'Authentication required'}, status=401)
    clerk_id = request.clerk_user['sub']
    email = request.clerk_user.get('email_addresses', [{}])[0].get('email_address')
    return JsonResponse({'message': 'Authenticated!', 'clerk_id': clerk_id, 'email': email})
