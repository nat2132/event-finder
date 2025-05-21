from django.contrib import admin
from .models import CalendarEvent

@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'date', 'location', 'category')
    list_filter = ('user', 'date', 'category')
    search_fields = ('title', 'location', 'description')
    readonly_fields = ('created_at',)
    ordering = ('-date',)
    