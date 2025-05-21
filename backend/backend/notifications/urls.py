from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    notification_settings_api, UserNotificationViewSet, 
    ensure_event_reminder_notification, AdminNotificationListView
)

router = DefaultRouter()
router.register(r'user-notifications', UserNotificationViewSet, basename='user-notification')

urlpatterns = [
    # Notification settings API
    path('notification-settings/', notification_settings_api),
    
    # Admin notifications
    path('admin/notifications/', AdminNotificationListView.as_view(), name='admin-notifications'),
    
    # User notification specific endpoints
    path('user-notifications/ensure-event-reminder/', ensure_event_reminder_notification, name='ensure-event-reminder'),
    
    # Include router URLs
    path('', include(router.urls)),
]
