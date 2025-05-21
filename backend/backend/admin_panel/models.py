from django.db import models
from users.models import ClerkUser

class AdminDashboardStat(models.Model):
    # Key metrics for the admin dashboard
    total_users = models.IntegerField(default=0)
    total_events = models.IntegerField(default=0)
    total_tickets_sold = models.IntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    active_events = models.IntegerField(default=0)
    timestamp = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Admin Dashboard Statistic'
        verbose_name_plural = 'Admin Dashboard Statistics'
    
    def __str__(self):
        return f"Dashboard Stats {self.timestamp}"

class AdminActionLog(models.Model):
    ACTION_CREATE = 'create'
    ACTION_UPDATE = 'update'
    ACTION_DELETE = 'delete'
    ACTION_VIEW = 'view'
    
    ACTION_CHOICES = [
        (ACTION_CREATE, 'Create'),
        (ACTION_UPDATE, 'Update'),
        (ACTION_DELETE, 'Delete'),
        (ACTION_VIEW, 'View'),
    ]
    
    admin_user = models.ForeignKey(ClerkUser, on_delete=models.CASCADE, related_name='admin_actions')
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50)  # e.g., 'user', 'event', 'ticket'
    resource_id = models.CharField(max_length=255)  # ID of the resource being acted upon
    details = models.JSONField(blank=True, null=True)  # Additional details about the action
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Admin Action Log'
        verbose_name_plural = 'Admin Action Logs'
    
    def __str__(self):
        return f"{self.admin_user.email} {self.action_type} {self.resource_type} {self.resource_id} at {self.timestamp}"
