from django.contrib import admin
from .models import Event
from users.models import ClerkUser

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'category', 'location', 'status', 'start_time', 'end_time',
        'tickets_sold', 'attendees', 'rating', 'organizer_name', 'source', 'created_at'
    )
    list_filter = (
        'category', 'status', 'source', 'start_time', 'end_time',
        'created_at', 'organizer'
    )
    search_fields = (
        'title', 'category', 'location', 'address',
        'organizer_name', 'description'
    )
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Basic Info', {
            'fields': (
                'title', 'description', 'category', 'location', 'address',
                'image', 'status', 'source'
            )
        }),
        ('Timing', {
            'fields': (
                'date', 'time', 'start_time', 'end_time'
            )
        }),
        ('Organizer Info', {
            'fields': (
                'organizer', 'organizer_name', 'organizer_image'
            )
        }),
        ('Metrics', {
            'fields': (
                'tickets_sold', 'attendees', 'rating', 'ticketTypes',
                'comments'
            )
        }),
        ('System Info', {
            'fields': (
                'created_at',
            )
        })
    )
    ordering = ('-start_time',)
    filter_horizontal = ()
    filter_vertical = ()
