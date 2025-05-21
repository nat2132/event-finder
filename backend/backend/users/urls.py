from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    update_profile, user_language_api, AdminUserListView, AdminUserDetailView,
    AdminManagementViewSet, clerk_user_webhook, AdminUserCreateView
)

router = DefaultRouter()
router.register(r'manage/users', AdminManagementViewSet, basename='admin-manage-users')

urlpatterns = [
    # User profile and authentication routes - multiple URL patterns for compatibility
    path('user/profile/', update_profile),
    path('user/profile', update_profile),
    path('users/profile/', update_profile),  # Add new preferred URL format
    path('users/profile', update_profile),   # Add without trailing slash too
    
    path('user/language/', user_language_api),
    path('user/language', user_language_api),
    
    path('clerk-user-webhook/', clerk_user_webhook),
    
    # Admin user management routes
    path('users/', AdminUserCreateView.as_view(), name='user-create-list'),
    path('users/<str:clerk_id>/', AdminUserDetailView.as_view(), name='user-detail'),
    
    # Include router URLs
    path('', include(router.urls)),
]
