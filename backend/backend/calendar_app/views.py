from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import CalendarEvent
from .serializers import CalendarEventSerializer
from users.models import ClerkUser

class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Get the clerk_user from the request (added by middleware)
        clerk_user_info = getattr(self.request, 'clerk_user', None)
        if not clerk_user_info or not isinstance(clerk_user_info, dict):
            return CalendarEvent.objects.none()
            
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id:
            return CalendarEvent.objects.none()
            
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            return CalendarEvent.objects.filter(user=user).order_by('-date')
        except ClerkUser.DoesNotExist:
            return CalendarEvent.objects.none()
    
    def perform_create(self, serializer):
        # Assign the current user as the owner of the calendar event
        clerk_user_info = getattr(self.request, 'clerk_user', None)
        if clerk_user_info and isinstance(clerk_user_info, dict) and clerk_user_info.get('sub'):
            try:
                user = ClerkUser.objects.get(clerk_id=clerk_user_info['sub'])
                serializer.save(user=user)
            except ClerkUser.DoesNotExist:
                raise serializer.ValidationError("User not found")
        else:
            raise serializer.ValidationError("Authentication required")
