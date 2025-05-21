from django.contrib import admin
from .models import AdminDashboardStat, AdminActionLog
from users.models import ClerkUser

@admin.register(AdminDashboardStat)
class AdminDashboardStatAdmin(admin.ModelAdmin):
    list_display = (
        'total_users', 'total_events', 'total_tickets_sold',
        'total_revenue', 'active_events', 'timestamp'
    )
    list_filter = ('timestamp',)
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)

@admin.register(AdminActionLog)
class AdminActionLogAdmin(admin.ModelAdmin):
    list_display = (
        'admin_user', 'action_type', 'resource_type',
        'resource_id', 'ip_address', 'timestamp'
    )
    list_filter = (
        'action_type', 'resource_type', 'timestamp',
        'admin_user'
    )
    search_fields = (
        'admin_user__email', 'resource_type',
        'resource_id', 'details'
    )
    readonly_fields = ('timestamp', 'ip_address')
    ordering = ('-timestamp',)
    fieldsets = (
        ('Action Info', {
            'fields': (
                'admin_user', 'action_type', 'resource_type',
                'resource_id', 'details'
            )
        }),
        ('System Info', {
            'fields': (
                'ip_address', 'timestamp'
            )
        })
    )
