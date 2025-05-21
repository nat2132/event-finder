from django.db import models
from users.models import ClerkUser
from events.models import Event

class SavedEvent(models.Model):
    user = models.ForeignKey(ClerkUser, on_delete=models.CASCADE, related_name='saved_events')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='saved_by', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    source = models.CharField(max_length=50, default='manual', help_text="Source of the event (manual, ticketmaster, eventbrite, etc.)")
    external_id = models.CharField(max_length=128, blank=True, null=True, help_text='External event ID from the source platform')
    external_event_id = models.CharField(max_length=128, blank=True, null=True, help_text="External event ID for Ticketmaster, Eventbrite, etc.")
    external_event_data = models.JSONField(blank=True, null=True, help_text="Raw event data for external events.")

    class Meta:
        unique_together = (
            ('user', 'event'),
            ('user', 'external_event_id'),
        )

    def __str__(self):
        if self.event:
            return f"{self.user} saved {self.event}"
        elif self.external_event_id:
            return f"{self.user} saved external event {self.external_event_id}"
        else:
            return f"{self.user} saved unknown event"
