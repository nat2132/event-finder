import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Import the ClerkUser model
from users.models import ClerkUser

# Check if any users exist
users = ClerkUser.objects.all()
print(f"Total users found: {users.count()}")
for user in users:
    print(f"ID: {user.id}, Email: {user.email}, Name: {user.full_name}, Plan: {user.plan}") 