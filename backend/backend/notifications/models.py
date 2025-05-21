from django.db import models
from users.models import ClerkUser

class NotificationSettings(models.Model):
    user = models.OneToOneField(ClerkUser, on_delete=models.CASCADE, related_name='notification_settings')
    email_ticket_sales = models.BooleanField(default=True)
    email_event_reminders = models.BooleanField(default=True)
    email_new_features = models.BooleanField(default=True)
    email_promotions = models.BooleanField(default=True)
    push_ticket_sales = models.BooleanField(default=True)
    push_event_reminders = models.BooleanField(default=True)
    push_new_features = models.BooleanField(default=False)
    push_new_events = models.BooleanField(default=True)
    freq_realtime = models.BooleanField(default=True)
    freq_daily = models.BooleanField(default=False)
    freq_weekly = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification Settings for {self.user.email}"

class AdminNotification(models.Model):
    """Model to store notifications for admin users."""

    # Notification Types (for categorization/icons)
    TYPE_USER_SIGNUP = 'user_signup'
    TYPE_ADMIN_CHANGE = 'admin_change'
    TYPE_REVENUE_MILESTONE = 'revenue_milestone' # Placeholder, generation not implemented yet
    TYPE_USER_CREATE = 'user_create'
    TYPE_USER_UPDATE = 'user_update'
    TYPE_USER_DELETE = 'user_delete'
    TYPE_EVENT_CREATE = 'event_create'
    TYPE_EVENT_UPDATE = 'event_update'
    TYPE_EVENT_DELETE = 'event_delete'

    NOTIFICATION_TYPE_CHOICES = [
        (TYPE_USER_SIGNUP, 'User Signup'),
        (TYPE_ADMIN_CHANGE, 'Admin Change'),
        (TYPE_REVENUE_MILESTONE, 'Revenue Milestone'),
        (TYPE_USER_CREATE, 'User Created'), # By Admin
        (TYPE_USER_UPDATE, 'User Updated'), # By Admin
        (TYPE_USER_DELETE, 'User Deleted'), # By Admin
        (TYPE_EVENT_CREATE, 'Event Created'), # By Admin
        (TYPE_EVENT_UPDATE, 'Event Updated'), # By Admin
        (TYPE_EVENT_DELETE, 'Event Deleted'), # By Admin
    ]

    # Target Roles (for visibility)
    TARGET_ALL_ADMINS = 'all'
    TARGET_SUPER_ADMIN_ONLY = 'super_admin'
    TARGET_ROLE_CHOICES = [
        (TARGET_ALL_ADMINS, 'All Admins'),
        (TARGET_SUPER_ADMIN_ONLY, 'Super Admin Only'),
    ]

    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    target_role = models.CharField(max_length=20, choices=TARGET_ROLE_CHOICES, default=TARGET_ALL_ADMINS)
    is_read = models.BooleanField(default=False) # For future use
    link = models.URLField(blank=True, null=True) # Optional link to related object
    actor = models.ForeignKey(ClerkUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='initiated_notifications') # Admin who performed the action

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.get_target_role_display()}] {self.get_notification_type_display()}: {self.message[:50]}..."

class UserNotification(models.Model):
    TYPE_EVENT_REMINDER = 'event_reminder'
    TYPE_PURCHASE_SUCCESS = 'purchase_success'
    TYPE_NEW_TICKET_SALE = 'new_ticket_sale'
    TYPE_SALES_MILESTONE = 'sales_milestone'
    TYPE_EVENT_REMINDER_ORGANIZER = 'event_reminder_organizer'
    # Add more types as needed

    NOTIFICATION_TYPE_CHOICES = [
        (TYPE_EVENT_REMINDER, 'Event Reminder'),
        (TYPE_PURCHASE_SUCCESS, 'Purchase Success'),
        (TYPE_NEW_TICKET_SALE, 'New Ticket Sale'),
        (TYPE_SALES_MILESTONE, 'Sales Milestone'),
        (TYPE_EVENT_REMINDER_ORGANIZER, 'Event Reminder for Organizer'),
    ]

    user = models.ForeignKey(ClerkUser, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPE_CHOICES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    link = models.URLField(blank=True, null=True, help_text="Optional link related to the notification.")
    # To store an ID related to the notification, e.g., event ID or a transaction reference for purchases
    reference_id = models.CharField(max_length=255, blank=True, null=True, help_text="Reference ID (e.g., event ID, transaction ref)")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.email} - Type: {self.get_notification_type_display()}"
