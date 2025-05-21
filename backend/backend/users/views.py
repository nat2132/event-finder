from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics, viewsets
from django.conf import settings
import os
from clerk_backend_api import Clerk
from django.db import models
from rest_framework import serializers

from .models import ClerkUser
from .serializers import ClerkUserSerializer
from admin_panel.views import IsClerkAdminUser, CanManageUsers, IsAnyAdmin, IsSuperAdmin

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def update_profile(request):
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
        serializer = ClerkUserSerializer(user)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        # Extract profile_image from request.FILES if present
        profile_image = request.FILES.get('profile_image')
        
        # Create a mutable copy of request.data
        data = request.data.copy()
        
        # Prevent users from changing their plan (only admin can do that)
        if 'plan' in data and not request.user.is_staff:
            data.pop('plan')
            
        serializer = ClerkUserSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            # Handle profile image separately if provided
            if profile_image:
                user.profile_image = profile_image
                
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@csrf_exempt
@api_view(['POST'])
def clerk_user_webhook(request):
    """Handle Clerk webhooks for user events"""
    # Verify the webhook signature
    try:
        # First, ensure the request.body is loaded
        body = request.body
        
        # Process webhook based on event type
        data = request.data
        event_type = data.get('type', '')
        
        if event_type == 'user.created':
            # New user created in Clerk
            user_data = data.get('data', {})
            clerk_id = user_data.get('id')
            email = next((e['email_address'] for e in user_data.get('email_addresses', []) if e), None)
            
            # Get full name from Clerk data (first_name + last_name)
            first_name = user_data.get('first_name', '')
            last_name = user_data.get('last_name', '')
            full_name = f"{first_name} {last_name}".strip()
            
            if clerk_id and email:
                # Create or update the user in our database
                user, created = ClerkUser.objects.get_or_create(
                    clerk_id=clerk_id,
                    defaults={
                        'email': email,
                        'full_name': full_name
                    }
                )
                
                if not created:
                    user.email = email
                    # Update full_name if it's provided
                    if full_name:
                        user.full_name = full_name
                    user.save()
                
                return JsonResponse({'status': 'user created/updated'})
        
        elif event_type == 'user.updated':
            # User updated in Clerk
            user_data = data.get('data', {})
            clerk_id = user_data.get('id')
            email = next((e['email_address'] for e in user_data.get('email_addresses', []) if e), None) 
            
            # Get full name from Clerk data (first_name + last_name)
            first_name = user_data.get('first_name', '')
            last_name = user_data.get('last_name', '')
            full_name = f"{first_name} {last_name}".strip()
            
            if clerk_id:
                try:
                    user = ClerkUser.objects.get(clerk_id=clerk_id)
                    if email:
                        user.email = email
                    # Update full_name if it's provided
                    if full_name:
                        user.full_name = full_name
                    user.save()
                    return JsonResponse({'status': 'user updated'})
                except ClerkUser.DoesNotExist:
                    pass
        
        elif event_type == 'user.deleted':
            # User deleted in Clerk
            user_data = data.get('data', {})
            clerk_id = user_data.get('id')
            
            if clerk_id:
                try:
                    user = ClerkUser.objects.get(clerk_id=clerk_id)
                    user.delete()
                    return JsonResponse({'status': 'user deleted'})
                except ClerkUser.DoesNotExist:
                    pass
        
        # Return success for any webhook we received but didn't specifically handle
        return JsonResponse({'status': 'webhook received'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def user_language_api(request):
    """Update the language preference for a user"""
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
    
    # Get language from request
    language = request.data.get('language')
    if not language:
        return Response({'error': 'Language is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update user language preference
    user.language = language
    user.save(update_fields=['language'])
    
    return Response({'status': 'success', 'language': language})

class AdminUserListView(generics.ListAPIView):
    """List view for users in admin panel"""
    permission_classes = [IsClerkAdminUser]
    serializer_class = ClerkUserSerializer
    queryset = ClerkUser.objects.all().order_by('-created_at')
    
    def get_queryset(self):
        """Filter queryset based on request parameters"""
        queryset = super().get_queryset()
        
        # Filter by user_type if specified, default to regular users
        user_type = self.request.query_params.get('user_type', 'user')
        if user_type:
            queryset = queryset.filter(user_type=user_type)
            
        # Additional filters could be added here (status, search, etc.)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(email__icontains=search) | 
                models.Q(full_name__icontains=search)
            )
            
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override list method to format response correctly for admin panel"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get pagination parameters
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = self.get_paginated_response(serializer.data)
            
            # The frontend expects a specific format
            for user in response_data.data['results']:
                # Convert the plan code to display name
                if 'plan' in user:
                    plan_code = user['plan']
                    for code, name in ClerkUser.PLAN_CHOICES:
                        if code == plan_code:
                            user['plan'] = name
                            break
                
                # Add a status field expected by the frontend
                user['status'] = 'active'  # Default status
            
            return response_data
        
        serializer = self.get_serializer(queryset, many=True)
        
        # If no pagination, still format the data correctly
        formatted_data = serializer.data
        for user in formatted_data:
            # Convert the plan code to display name
            if 'plan' in user:
                plan_code = user['plan']
                for code, name in ClerkUser.PLAN_CHOICES:
                    if code == plan_code:
                        user['plan'] = name
                        break
            
            # Add a status field expected by the frontend
            user['status'] = 'active'  # Default status
        
        return Response({
            'results': formatted_data,
            'count': len(formatted_data),
            'next': None,
            'previous': None
        })

class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detail view for a user in admin panel with delete support"""
    permission_classes = [IsClerkAdminUser]
    serializer_class = ClerkUserSerializer
    lookup_field = 'clerk_id'
    queryset = ClerkUser.objects.all()
    
    def update(self, request, *args, **kwargs):
        """Update method with special handling for admin-created users"""
        try:
            # Get the instance we're trying to update
            instance = self.get_object()
            
            # Log incoming data for debugging
            print(f"Update request for user {instance.clerk_id}:", request.data)
            
            # Create a copy of the request data
            data = request.data.copy()
            
            # Special handling for admin-created users: don't allow clerk_id to be changed
            if instance.clerk_id.startswith('admin_created_') and 'clerk_id' in data:
                print(f"Removing clerk_id from request data for admin-created user")
                # Remove clerk_id from the data as we don't want to change it
                data.pop('clerk_id')
            
            # If we have first_name/last_name but not full_name, create full_name
            if ('first_name' in data or 'last_name' in data) and 'full_name' not in data:
                first_name = data.get('first_name', '').strip() or getattr(instance, 'first_name', '')
                last_name = data.get('last_name', '').strip() or getattr(instance, 'last_name', '')
                if first_name or last_name:
                    data['full_name'] = f"{first_name} {last_name}".strip()
            
            # Create serializer with modified data
            partial = kwargs.pop('partial', True)  # Allow partial updates by default
            serializer = self.get_serializer(instance, data=data, partial=partial)
            
            if not serializer.is_valid():
                # Log validation errors for debugging
                print(f"Validation errors for user {instance.clerk_id}:", serializer.errors)
                return Response(
                    {"error": "Validation failed", **serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save the updated user
            self.perform_update(serializer)
            
            # Return the updated data
            return Response(serializer.data)
            
        except Exception as e:
            # Handle unexpected errors with detailed logging
            import traceback
            print(f"Error updating user:", str(e))
            print(traceback.format_exc())
            
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """Handle user deletion with proper logging"""
        try:
            instance = self.get_object()
            
            # Only super admins can delete users
            clerk_user_info = getattr(request, 'clerk_user', None)
            if not clerk_user_info or not clerk_user_info.get('sub'):
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            try:
                admin_user = ClerkUser.objects.get(clerk_id=clerk_user_info['sub'])
                if admin_user.admin_role != ClerkUser.ADMIN_ROLE_SUPER:
                    return Response(
                        {"error": "Only Super Admins can delete users"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except ClerkUser.DoesNotExist:
                return Response(
                    {"error": "Admin user not found"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Perform the deletion
            self.perform_destroy(instance)
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            import traceback
            print(f"Error deleting user: {str(e)}")
            print(traceback.format_exc())
            
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminManagementViewSet(viewsets.ModelViewSet):
    """ViewSet for user management by admins"""
    permission_classes = [CanManageUsers]
    serializer_class = ClerkUserSerializer
    queryset = ClerkUser.objects.all().order_by('-created_at')
    lookup_field = 'clerk_id'
    
    def perform_update(self, serializer):
        # Check what fields are being updated
        if 'user_type' in serializer.validated_data or 'admin_role' in serializer.validated_data:
            # User is trying to modify admin roles
            admin_user = None
            
            # Get the admin user making the request
            clerk_user_info = getattr(self.request, 'clerk_user', None)
            if clerk_user_info and isinstance(clerk_user_info, dict) and clerk_user_info.get('sub'):
                try:
                    admin_user = ClerkUser.objects.get(clerk_id=clerk_user_info['sub'])
                except ClerkUser.DoesNotExist:
                    raise serializer.ValidationError("Admin user not found")
            
            # Only Super Admins can change user_type or admin_role
            if not admin_user or admin_user.admin_role != ClerkUser.ADMIN_ROLE_SUPER:
                raise serializer.ValidationError("Only Super Admins can modify admin roles")
        
        # Proceed with the update
        serializer.save()

class AdminUserCreateView(generics.ListCreateAPIView):
    """List and Create view for users in admin panel"""
    permission_classes = [IsClerkAdminUser]
    serializer_class = ClerkUserSerializer
    queryset = ClerkUser.objects.all().order_by('-created_at')
    
    def get_queryset(self):
        """Filter queryset based on request parameters"""
        queryset = super().get_queryset()
        
        # Filter by user_type if specified, default to regular users
        user_type = self.request.query_params.get('user_type', 'user')
        if user_type:
            queryset = queryset.filter(user_type=user_type)
            
        # Additional filters could be added here (status, search, etc.)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(email__icontains=search) | 
                models.Q(full_name__icontains=search)
            )
            
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override list method to format response correctly for admin panel"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get pagination parameters
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = self.get_paginated_response(serializer.data)
            
            # The frontend expects a specific format
            for user in response_data.data['results']:
                # Convert the plan code to display name
                if 'plan' in user:
                    plan_code = user['plan']
                    for code, name in ClerkUser.PLAN_CHOICES:
                        if code == plan_code:
                            user['plan'] = name
                            break
                
                # Add a status field expected by the frontend
                user['status'] = 'active'  # Default status
            
            return response_data
        
        serializer = self.get_serializer(queryset, many=True)
        
        # If no pagination, still format the data correctly
        formatted_data = serializer.data
        for user in formatted_data:
            # Convert the plan code to display name
            if 'plan' in user:
                plan_code = user['plan']
                for code, name in ClerkUser.PLAN_CHOICES:
                    if code == plan_code:
                        user['plan'] = name
                        break
            
            # Add a status field expected by the frontend
            user['status'] = 'active'  # Default status
        
        return Response({
            'results': formatted_data,
            'count': len(formatted_data),
            'next': None,
            'previous': None
        })
    
    def create(self, request, *args, **kwargs):
        """Create a new user with admin panel"""
        try:
            # Clean up the data to ensure proper format
            data = request.data.copy()
            
            # Validate essential fields
            if 'email' not in data or not data['email']:
                return Response(
                    {"error": "Email is required", "email": ["Enter a valid email address."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Make sure full_name is set from first_name and last_name if provided
            if ('first_name' in data or 'last_name' in data) and 'full_name' not in data:
                first_name = data.get('first_name', '').strip()
                last_name = data.get('last_name', '').strip()
                if first_name or last_name:
                    data['full_name'] = f"{first_name} {last_name}".strip()
                    
            # Ensure user has the right default values    
            if 'plan' not in data:
                data['plan'] = ClerkUser.PLAN_FREE
                
            # Don't require clerk_id, as the serializer will handle it
            # Create a serializer with our prepared data
            serializer = self.get_serializer(data=data)
            
            if not serializer.is_valid():
                # Provide clear validation errors
                return Response(
                    {"error": "Validation failed", **serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Save the user
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            
            # Return user data with proper formatting
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            
        except serializers.ValidationError as e:
            # Format validation errors in a cleaner way
            errors = e.detail if hasattr(e, 'detail') else {'error': str(e)}
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Handle unexpected errors
            error_message = str(e)
            return Response(
                {"error": error_message},
                status=status.HTTP_400_BAD_REQUEST
            )
