# Backend Restructuring Migration Instructions

This document outlines the steps needed to migrate the database after restructuring the backend apps.

## Database Migration Steps

1. First, make a backup of your database:
   ```
   mysqldump -u root -p event_finder > event_finder_backup.sql
   ```

2. **Handling Migration Dependencies**
   
   Due to existing migration dependencies, we need a special approach:

   a. Keep 'clerk_sync' in INSTALLED_APPS temporarily (this is already done)
   
   b. Create fake migrations for the new apps without actually applying database changes:
   ```
   python manage.py makemigrations users 
   python manage.py makemigrations calendar_app
   python manage.py makemigrations tickets 
   python manage.py makemigrations billing 
   python manage.py makemigrations saved 
   python manage.py makemigrations notifications 
   python manage.py makemigrations admin_panel 
   ```

3. Create data migration files for each app to copy data from clerk_sync tables:
   ```
   python manage.py makemigrations users --empty --name=migrate_clerk_users
   python manage.py makemigrations tickets --empty --name=migrate_tickets_data
   python manage.py makemigrations saved --empty --name=migrate_saved_events
   python manage.py makemigrations notifications --empty --name=migrate_notifications
   python manage.py makemigrations billing --empty --name=migrate_billing_data
   python manage.py makemigrations calendar_app --empty --name=migrate_calendar_events
   ```

4. Edit each migration file to include operations that copy data from clerk_sync tables to the new app tables. Example for users migration:
   ```python
   from django.db import migrations
   
   def migrate_users_forward(apps, schema_editor):
       ClerkUser = apps.get_model('clerk_sync', 'ClerkUser')
       NewClerkUser = apps.get_model('users', 'ClerkUser')
       
       for user in ClerkUser.objects.all():
           NewClerkUser.objects.create(
               id=user.id,
               clerk_id=user.clerk_id,
               email=user.email,
               # Copy all other fields
           )
   
   def migrate_users_backward(apps, schema_editor):
       # Optional: Add reverse migration logic here
       pass
   
   class Migration(migrations.Migration):
       dependencies = [
           ('users', '0001_initial'),
           ('clerk_sync', '0006_event_eventtickettype_ticket'),  # Make sure this matches your last clerk_sync migration
       ]
       operations = [
           migrations.RunPython(migrate_users_forward, migrate_users_backward),
       ]
   ```

5. Apply the migrations:
   ```
   python manage.py migrate
   ```

6. Finally, remove clerk_sync from INSTALLED_APPS and run migrations again:
   ```
   # After updating settings.py to remove clerk_sync
   python manage.py migrate --fake clerk_sync zero
   ```

## Testing Plan

After migration, test the following functionality:

1. **User Authentication**
   - Login with Clerk
   - User profile fetching and updating

2. **Events**
   - Creating events
   - Viewing events
   - Updating events

3. **Calendar**
   - Adding calendar events
   - Viewing calendar events

4. **Tickets**
   - Purchasing tickets
   - Viewing tickets 
   - QR code generation

5. **Saved Events**
   - Saving events
   - Unsaving events
   - Viewing saved events

6. **Notifications**
   - User notifications
   - Admin notifications
   - Notification settings

7. **Billing**
   - Payment initialization
   - Webhook handling
   - Billing history

8. **Admin**
   - Dashboard stats
   - User management
   - Analytics

## Rollback Plan

If issues are encountered, restore the database backup:

```
mysql -u root -p event_finder < event_finder_backup.sql
```

Then revert code changes:
```
git reset --hard HEAD~1
```

## Cleanup Steps

Once everything is working properly:

1. Remove the clerk_sync app:
   ```
   rm -rf backend/backend/clerk_sync
   ```

2. Remove clerk_sync from INSTALLED_APPS in settings.py

3. Remove the clerk_sync URL patterns from backend/urls.py
