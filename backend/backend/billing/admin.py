from django.contrib import admin
from .models import BillingHistory
from users.models import ClerkUser


@admin.register(BillingHistory)
class BillingHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'plan', 'status', 'created_at')
    list_filter = ('user', 'plan', 'status', 'created_at')
    search_fields = ('user__email', 'plan', 'status')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)

