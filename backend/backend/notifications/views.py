from django.shortcuts import render
from django.utils import timezone
import datetime
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics, viewsets
from users.models import ClerkUser
from .models import NotificationSettings, AdminNotification, UserNotification
from .serializers import NotificationSettingsSerializer, AdminNotificationSerializer, UserNotificationSerializer
from admin_panel.views import IsClerkAdminUser, IsAnyAdmin
from events.models import Event
import time

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def notification_settings_api(request):
    # Get the clerk_user from the request (added by middleware)
    clerk_user_info = getattr(request, 'clerk_user', None)
    if not clerk_user_info or not isinstance(clerk_user_info, dict):
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
    clerk_id = clerk_user_info.get('sub')
    if not clerk_id:
        return Response({'error': 'Invalid authentication'}, status=status.HTTP_401_UNAUTHORIZED)
        
    try:
        user = ClerkUser.objects.get(clerk_id=clerk_id)
    except ClerkUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get or create notification settings for this user
    settings, created = NotificationSettings.objects.get_or_create(user=user)
    
    if request.method == 'GET':
        serializer = NotificationSettingsSerializer(settings)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = NotificationSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminNotificationListView(generics.ListAPIView):
    """List view for admin notifications"""
    permission_classes = [IsClerkAdminUser]
    serializer_class = AdminNotificationSerializer
    
    def get_queryset(self):
        clerk_user_info = getattr(self.request, 'clerk_user', None)
        if not clerk_user_info or not isinstance(clerk_user_info, dict):
            return AdminNotification.objects.none()
            
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id:
            return AdminNotification.objects.none()
            
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            # Filter notifications by target role
            if user.admin_role == ClerkUser.ADMIN_ROLE_SUPER:
                # Super admins can see all notifications
                return AdminNotification.objects.all().order_by('-timestamp')
            else:
                # Other admins only see notifications targeted at all admins
                return AdminNotification.objects.filter(
                    target_role=AdminNotification.TARGET_ALL_ADMINS
                ).order_by('-timestamp')
        except ClerkUser.DoesNotExist:
            return AdminNotification.objects.none()


class UserNotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for user notifications"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserNotificationSerializer
    
    def get_queryset(self):
        # Get the clerk_user from the request (added by middleware)
        clerk_user_info = getattr(self.request, 'clerk_user', None)
        if not clerk_user_info or not isinstance(clerk_user_info, dict):
            return UserNotification.objects.none()
            
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id:
            return UserNotification.objects.none()
            
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            return UserNotification.objects.filter(user=user).order_by('-created_at')
        except ClerkUser.DoesNotExist:
            return UserNotification.objects.none()
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        user_jwt = getattr(self.request, 'clerk_user', None)
        if not user_jwt or not user_jwt.get('sub'):
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        clerk_id = user_jwt['sub']
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            UserNotification.objects.filter(user=user, is_read=False).update(is_read=True)
            return Response({'status': 'all notifications marked as read'}, status=status.HTTP_200_OK)
        except ClerkUser.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ensure_event_reminder_notification(request):
    user_jwt = getattr(request, 'clerk_user', None)
    if not user_jwt or not user_jwt.get('sub'):
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    clerk_id = user_jwt['sub']
    try:
        user = ClerkUser.objects.get(clerk_id=clerk_id)
    except ClerkUser.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    event_id_str = request.data.get('event_id')
    event_title = request.data.get('event_title')
    event_date_str = request.data.get('event_date_string') # Expecting ISO format string e.g. "2024-05-15T19:00:00.000Z"
    is_test = request.data.get('is_test', False)

    # We require title and date, but event_id can be optional for test/direct notifications
    if not all([event_title, event_date_str]):
        return Response({'error': 'Missing event_title or event_date_string.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Ensure correct parsing of ISO string, especially with 'Z'
        event_date = datetime.datetime.fromisoformat(event_date_str.replace('Z', '+00:00'))
    except ValueError:
        return Response({'error': 'Invalid event_date_string format.'}, status=status.HTTP_400_BAD_REQUEST)

    # For reference_id, use event_id if available, otherwise generate a unique reference for this notification
    reference_id = str(event_id_str) if event_id_str else f"direct-{user.id}-{int(time.time())}"

    existing_reminder = UserNotification.objects.filter(
        user=user,
        notification_type=UserNotification.TYPE_EVENT_REMINDER,
        reference_id=reference_id
    ).order_by('-created_at').first()

    if existing_reminder:
        if event_date > timezone.now():
            return Response({'status': 'Reminder already exists for upcoming event.', 'notification_id': existing_reminder.id}, status=status.HTTP_200_OK)

    if event_date > timezone.now():
        time_until_event = event_date - timezone.now()
        formatted_date = event_date.strftime("%B %d, %Y at %I:%M %p")
        
        message = f"Reminder: Your event '{event_title}' is on {formatted_date}."
        if time_until_event.days == 0:
            hours_left = time_until_event.seconds // 3600
            if hours_left > 0:
                 message = f"Reminder: Your event '{event_title}' is today in about {hours_left} hour(s) at {event_date.strftime('%I:%M %p')}. "
            else:
                 minutes_left = (time_until_event.seconds // 60) % 60 # Ensure minutes are within 0-59
                 if time_until_event.seconds < 60: # If less than a minute, say starting now
                    message = f"Reminder: Your event '{event_title}' is starting now! "
                 elif minutes_left == 0 and hours_left == 0: # If exactly on the hour but less than an hour left
                    message = f"Reminder: Your event '{event_title}' is starting very soon! "
                 else:
                    message = f"Reminder: Your event '{event_title}' is starting very soon (in {minutes_left} minutes)! "
       
        notification = UserNotification.objects.create(
            user=user,
            notification_type=UserNotification.TYPE_EVENT_REMINDER,
            message=message,
            reference_id=reference_id,
        )
        
        # Only notify organizer if this is a real event (not a test) and we have a valid event_id
        if not is_test and event_id_str and event_id_str.isdigit():
            try:
                event = Event.objects.get(pk=int(event_id_str))
                if event.organizer and event.organizer != user:
                    organizer_message = ""
                    if time_until_event.days > 0:
                        organizer_message = f"Reminder: Your event '{event_title}' is scheduled for {formatted_date}."
                    elif time_until_event.days == 0:
                        hours_left = time_until_event.seconds // 3600
                        if hours_left > 0:
                            organizer_message = f"Reminder: Your event '{event_title}' is today in about {hours_left} hour(s) at {event_date.strftime('%I:%M %p')}."
                        else:
                            minutes_left = (time_until_event.seconds // 60) % 60
                            if time_until_event.seconds < 60:
                                organizer_message = f"Reminder: Your event '{event_title}' is starting now!"
                            elif minutes_left == 0 and hours_left == 0:
                                organizer_message = f"Reminder: Your event '{event_title}' is starting very soon!"
                            else:
                                organizer_message = f"Reminder: Your event '{event_title}' is starting very soon (in {minutes_left} minutes)!"
                    
                    # Check if organizer already has a recent reminder for this event
                    existing_organizer_reminder = UserNotification.objects.filter(
                        user=event.organizer,
                        notification_type=UserNotification.TYPE_EVENT_REMINDER_ORGANIZER,
                        reference_id=reference_id,
                        created_at__gte=timezone.now() - datetime.timedelta(hours=6)  # Within last 6 hours
                    ).exists()
                    
                    if not existing_organizer_reminder:
                        UserNotification.objects.create(
                            user=event.organizer,
                            notification_type=UserNotification.TYPE_EVENT_REMINDER_ORGANIZER,
                            message=organizer_message,
                            reference_id=reference_id,
                            link=f"/organizer/events/{event_id_str}"
                        )
            except Event.DoesNotExist:
                # Event might not exist, continue without organizer notification
                pass
            except ValueError:
                # Invalid event ID, continue without organizer notification
                pass
        
        return Response(UserNotificationSerializer(notification).data, status=status.HTTP_201_CREATED)
    else:
        return Response({'status': 'Event has already passed, no reminder created.'}, status=status.HTTP_200_OK)
