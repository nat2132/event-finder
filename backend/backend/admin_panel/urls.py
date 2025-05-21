from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    admin_dashboard_stats, AdminUserListView, AdminUserDetailView,
    AdminActionLogViewSet, plan_distribution, revenue_summary
)
from notifications.views import UserNotificationViewSet

# Create router for viewsets
router = DefaultRouter()
router.register(r'action-logs', AdminActionLogViewSet, basename='admin-action-log')
router.register(r'user-notifications', UserNotificationViewSet, basename='admin-user-notification')

urlpatterns = [
    # Dashboard stats
    path('stats/', admin_dashboard_stats, name='admin-stats'),
    
    # Plan distribution analytics
    path('plan-distribution/', plan_distribution, name='admin-plan-distribution'),
    
    # Revenue summary analytics
    path('revenue-summary/', revenue_summary, name='admin-revenue-summary'),
    
    # User management
    path('users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('users/<str:clerk_id>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    
    # Include router URLs
    path('', include(router.urls)),
]
