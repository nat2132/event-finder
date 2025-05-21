from django.db import models
from users.models import ClerkUser
from events.models import Event

class EventTicketType(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_types_set')
    type = models.CharField(max_length=64)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    available = models.PositiveIntegerField(default=0)
    
    def __str__(self):
        return f"{self.type} for {self.event.title}"

class Ticket(models.Model):
    user = models.ForeignKey(ClerkUser, on_delete=models.CASCADE, related_name='tickets')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='tickets')
    ticket_type = models.ForeignKey(EventTicketType, on_delete=models.CASCADE, related_name='tickets', blank=True, null=True)
    ticket_type_name = models.CharField(max_length=128, blank=True, null=True, help_text='Ticket type name for JSONField-based events')
    ticket_id = models.CharField(max_length=128, unique=True)
    qr_code = models.ImageField(upload_to='ticket_qrcodes/', blank=True, null=True)
    purchase_time = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.ticket_id} - {self.user.email} - {self.event.title}"
