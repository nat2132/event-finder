from django.db import models
from django.utils import timezone

class ClerkUser(models.Model):
    PLAN_FREE = 'free'
    PLAN_PRO = 'pro'
    PLAN_ORGANIZER = 'organizer'
    PLAN_CHOICES = [
        (PLAN_FREE, 'Free'),
        (PLAN_PRO, 'Pro'),
        (PLAN_ORGANIZER, 'Organizer'),
    ]

    # User Type choices
    USER_TYPE_USER = 'user'
    USER_TYPE_ADMIN = 'admin'
    USER_TYPE_CHOICES = [
        (USER_TYPE_USER, 'User'),
        (USER_TYPE_ADMIN, 'Admin'),
    ]

    # Admin Role choices
    ADMIN_ROLE_SUPER = 'super_admin'
    ADMIN_ROLE_EVENT = 'event_admin'
    ADMIN_ROLE_SUPPORT = 'support_admin'
    ADMIN_ROLE_CHOICES = [
        (ADMIN_ROLE_SUPER, 'Super Admin'),
        (ADMIN_ROLE_EVENT, 'Event Admin'),
        (ADMIN_ROLE_SUPPORT, 'Support Admin'),
    ]

    clerk_id = models.CharField(max_length=128, unique=True)
    email = models.EmailField()
    full_name = models.CharField(max_length=256, blank=True)
    provider = models.CharField(max_length=64, blank=True)  # OAuth provider (google, facebook, etc)
    bio = models.TextField(blank=True)
    profile_image = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_FREE)
    language = models.CharField(max_length=8, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # New fields for user type and admin role
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default=USER_TYPE_USER)
    admin_role = models.CharField(max_length=20, choices=ADMIN_ROLE_CHOICES, null=True, blank=True)

    def __str__(self):
        return self.email
