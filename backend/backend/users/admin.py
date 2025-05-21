from django.contrib import admin
from .models import ClerkUser

@admin.register(ClerkUser)
class ClerkUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'plan', 'user_type', 'admin_role', 'created_at')
    list_filter = ('plan', 'user_type', 'admin_role', 'created_at')
    search_fields = ('email', 'full_name', 'clerk_id')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Info', {
            'fields': ('clerk_id', 'email', 'full_name', 'provider', 'profile_image')
        }),
        ('Account Info', {
            'fields': ('plan', 'language', 'bio')
        }),
        ('Admin Info', {
            'fields': ('user_type', 'admin_role')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        })
    )
    ordering = ('-created_at',)
