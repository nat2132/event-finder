"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def root_view(request):
    return JsonResponse({'message': 'Welcome to the API. See /api/ for endpoints.'})

@csrf_exempt
def admin_redirect(request):
    from django.http import HttpResponsePermanentRedirect
    return HttpResponsePermanentRedirect('/admin/')

urlpatterns = [
    path('', root_view),  # Handles the root URL
    path('admin', admin_redirect),  # Redirect /admin to /admin/
    path('admin/', admin.site.urls),
    # Include all app-specific URL patterns
    path('api/', include('events.urls')),
    path('api/', include('users.urls')),
    path('api/', include('tickets.urls')),
    path('api/', include('saved.urls')),
    path('api/', include('billing.urls')),
    path('api/', include('calendar_app.urls')),
    path('api/', include('notifications.urls')),
    path('api/admin/', include('admin_panel.urls')),
    # clerk_sync URLs have been removed as functionality was migrated to dedicated apps
]

# Catch-all pattern for debugging unmatched URLs
@csrf_exempt
def debug_404_view(request, *args, **kwargs):
    print(f"[DEBUG 404] Path: {request.path} Method: {request.method}")
    return JsonResponse({'error': 'Not Found', 'path': request.path, 'method': request.method}, status=404)

from django.urls import re_path

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += [
    re_path(r'^.*$', debug_404_view),
]
