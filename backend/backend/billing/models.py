from django.db import models
from users.models import ClerkUser

class BillingHistory(models.Model):
    user = models.ForeignKey(ClerkUser, on_delete=models.CASCADE, related_name='billing_history')
    plan = models.CharField(max_length=16)
    amount = models.IntegerField()
    tx_ref = models.CharField(max_length=128)
    status = models.CharField(max_length=32)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.plan} - {self.status} - {self.created_at}"
