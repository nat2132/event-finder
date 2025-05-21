from django.contrib import admin
from .models import SavedEvent
from users.models import ClerkUser
from events.models import Event

@admin.register(SavedEvent)
class SavedEventAdmin(admin.ModelAdmin):
    list_display = ('user', 'event')
    list_filter = ('user', 'event')
    search_fields = ('user__email', 'event__title')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
