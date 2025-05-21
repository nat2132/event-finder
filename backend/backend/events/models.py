from django.db import models
from users.models import ClerkUser


class Event(models.Model):
    tickets_sold = models.PositiveIntegerField(default=0, help_text='Number of tickets sold for this event')
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=100, default='other')
    date = models.CharField(max_length=50, blank=True, null=True)  # for compatibility with frontend
    time = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=255)
    address = models.CharField(max_length=255, blank=True, null=True)
    ticketTypes = models.JSONField(blank=True, null=True)  # stores list of ticket types
    image = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=50, default='Upcoming')
    attendees = models.IntegerField(default=0)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    # New fields for richer event details
    comments = models.JSONField(blank=True, null=True, default=list, help_text='List of comments')
    rating = models.FloatField(default=0.0, help_text='Overall event rating')
    organizer = models.ForeignKey(ClerkUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='events_organized')
    organizer_name = models.CharField(max_length=256, blank=True, null=True, help_text='Organizer display name')
    organizer_image = models.URLField(blank=True, null=True, help_text='Organizer profile image URL')
    source = models.CharField(max_length=50, default='manual', help_text='Source of the event (manual, imported, etc.)')

    def __str__(self):
        return self.title
