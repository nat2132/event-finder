from django.shortcuts import render, get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from users.models import ClerkUser
from events.models import Event
from .models import SavedEvent
from .serializers import SavedEventSerializer
import re

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def saved_events_api(request):
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
    
    if request.method == 'GET':
        # Get all saved events for this user
        saved_events = SavedEvent.objects.filter(user=user).select_related('event')
        serializer = SavedEventSerializer(saved_events, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Save a new event
        event_id = request.data.get('event_id')
        external_event_id = request.data.get('external_event_id')
        source = request.data.get('source', 'manual')
        external_event_data = request.data.get('external_event_data', None)
        
        # Check if we have an event_id or external_event_id
        if not (event_id or external_event_id):
            return Response({'error': 'Either event_id or external_event_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # If event_id is provided but isn't numeric, treat it as an external_event_id
        if event_id and not re.match(r'^\d+$', str(event_id)):
            external_event_id = event_id
            event_id = None
        
        # Check if the event is already saved by this user
        if event_id:
            # Ensure event_id is treated as integer
            try:
                event_id = int(event_id)
                if SavedEvent.objects.filter(user=user, event_id=event_id).exists():
                    return Response({'error': 'Event already saved'}, status=status.HTTP_400_BAD_REQUEST)
                    
                # Get the event
                try:
                    event = Event.objects.get(pk=event_id)
                    
                    # Create new saved event
                    saved_event = SavedEvent.objects.create(
                        user=user,
                        event=event,
                        source=source
                    )
                    serializer = SavedEventSerializer(saved_event)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                    
                except Event.DoesNotExist:
                    return Response({'error': 'Event not found'}, status=status.HTTP_404_NOT_FOUND)
            except ValueError:
                return Response({'error': 'Invalid event ID format'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle external event saving
        if external_event_id:
            if SavedEvent.objects.filter(user=user, external_event_id=external_event_id).exists():
                return Response({'error': 'Event already saved'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Save external event
            saved_event = SavedEvent.objects.create(
                user=user,
                external_event_id=external_event_id,
                source=source,
                external_event_data=external_event_data
            )
            serializer = SavedEventSerializer(saved_event)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unsave_event_api(request, event_id):
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
    
    # Check if event_id is numeric (internal) or a string (external)
    is_numeric = re.match(r'^\d+$', str(event_id))
    
    if is_numeric:
        # Try to find the saved event by event_id
        try:
            saved_event = SavedEvent.objects.get(user=user, event_id=int(event_id))
            saved_event.delete()
            return Response({'message': 'Event removed from saved list'}, status=status.HTTP_200_OK)
        except SavedEvent.DoesNotExist:
            pass  # Fall through to external ID check
    
    # Try to find by external_event_id
    try:
        saved_event = SavedEvent.objects.get(user=user, external_event_id=event_id)
        saved_event.delete()
        return Response({'message': 'External event removed from saved list'}, status=status.HTTP_200_OK)
    except SavedEvent.DoesNotExist:
        return Response({'error': 'Saved event not found'}, status=status.HTTP_404_NOT_FOUND)
