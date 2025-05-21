from django.contrib import admin
from .models import EventTicketType, Ticket
from users.models import ClerkUser
from events.models import Event

@admin.register(EventTicketType)
class EventTicketTypeAdmin(admin.ModelAdmin):
    list_display = ('event', 'type', 'price', 'available')
    list_filter = ('event', 'type')
    search_fields = ('event__title', 'type')
    ordering = ('event', 'type')

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_id', 'user', 'event', 'ticket_type', 'purchase_time', 'is_active')
    list_filter = ('event', 'is_active', 'purchase_time')
    search_fields = ('ticket_id', 'user__email', 'event__title', 'ticket_type__type')
    readonly_fields = ('ticket_id', 'purchase_time', 'qr_code')
    fieldsets = (
        ('Ticket Info', {
            'fields': ('ticket_id', 'ticket_type', 'ticket_type_name', 'qr_code')
        }),
        ('User Info', {
            'fields': ('user',)
        }),
        ('Event Info', {
            'fields': ('event',)
        }),
        ('Status', {
            'fields': ('is_active', 'purchase_time')
        })
    )
    ordering = ('-purchase_time',)
