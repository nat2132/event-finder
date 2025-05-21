from django.contrib import admin
from .models import NotificationSettings, AdminNotification, UserNotification
from users.models import ClerkUser

@admin.register(NotificationSettings)
class NotificationSettingsAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'email_ticket_sales', 'email_event_reminders',
        'email_new_features', 'email_promotions', 'push_ticket_sales',
        'push_event_reminders', 'push_new_features', 'push_new_events',
        'freq_realtime', 'freq_daily', 'freq_weekly'
    )
    list_filter = ('user__email',)
    search_fields = ('user__email',)
    fieldsets = (
        ('Email Notifications', {
            'fields': (
                'email_ticket_sales', 'email_event_reminders',
                'email_new_features', 'email_promotions'
            )
        }),
        ('Push Notifications', {
            'fields': (
                'push_ticket_sales', 'push_event_reminders',
                'push_new_features', 'push_new_events'
            )
        }),
        ('Frequency Settings', {
            'fields': (
                'freq_realtime', 'freq_daily', 'freq_weekly'
            )
        })
    )

@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):
    list_display = (
        'message', 'notification_type', 'target_role',
        'timestamp', 'actor', 'is_read', 'link'
    )
    list_filter = (
        'notification_type', 'target_role', 'timestamp',
        'is_read', 'actor'
    )
    search_fields = ('message', 'actor__email')
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)

@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'message', 'notification_type', 'is_read',
        'created_at', 'link', 'reference_id'
    )
    list_filter = (
        'notification_type', 'is_read', 'created_at',
        'user__email'
    )
    search_fields = (
        'user__email', 'message', 'reference_id'
    )
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
