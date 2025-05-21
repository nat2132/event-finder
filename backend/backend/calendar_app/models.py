from django.db import models
from users.models import ClerkUser

class CalendarEvent(models.Model):
    user = models.ForeignKey(ClerkUser, on_delete=models.CASCADE, related_name='calendar_events')
    title = models.CharField(max_length=255)
    date = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    location = models.CharField(max_length=255)
    category = models.CharField(max_length=64)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.user.email}"
