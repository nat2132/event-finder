from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework import viewsets, permissions, generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from users.models import ClerkUser
from events.models import Event
from tickets.models import Ticket
from .models import AdminDashboardStat, AdminActionLog
from .serializers import AdminDashboardStatSerializer, AdminActionLogSerializer, AdminUserSerializer
from rest_framework.pagination import PageNumberPagination
from django.db import models
from datetime import datetime, timedelta

# Define permission classes for admin functionality
class IsClerkAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        # First try to use clerk_db_user which is the database record
        clerk_user = getattr(request, 'clerk_db_user', None)
        if clerk_user and clerk_user.user_type == ClerkUser.USER_TYPE_ADMIN:
            return True
            
        # Fallback to checking clerk_user JWT claims if needed
        clerk_user_info = getattr(request, 'clerk_user', None)
        if not clerk_user_info: 
            return False
            
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id: 
            return False
            
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            return user.user_type == ClerkUser.USER_TYPE_ADMIN
        except ClerkUser.DoesNotExist:
            return False

class IsAnyAdmin(permissions.BasePermission):
    """Allows access only to authenticated users marked as admin."""
    message = 'User is not an administrator.'
    def has_permission(self, request, view):
        clerk_user_info = getattr(request, 'clerk_user', None)
        if not clerk_user_info: return False
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id: return False
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            return user.user_type == ClerkUser.USER_TYPE_ADMIN
        except ClerkUser.DoesNotExist:
            return False

class IsSuperAdmin(permissions.BasePermission):
    """Allows access only to Super Admins."""
    message = 'Requires Super Admin privileges.'
    def has_permission(self, request, view):
        clerk_user_info = getattr(request, 'clerk_user', None)
        if not clerk_user_info: return False
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id: return False
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            return user.user_type == ClerkUser.USER_TYPE_ADMIN and user.admin_role == ClerkUser.ADMIN_ROLE_SUPER
        except ClerkUser.DoesNotExist:
            return False

class IsEventAdminOrSuperAdmin(permissions.BasePermission):
    """Allows access to Event Admins and Super Admins."""
    message = 'Requires Event Admin or Super Admin privileges.'
    def has_permission(self, request, view):
        clerk_user_info = getattr(request, 'clerk_user', None)
        if not clerk_user_info: return False
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id: return False
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            if user.user_type != ClerkUser.USER_TYPE_ADMIN:
                return False
            return user.admin_role in [ClerkUser.ADMIN_ROLE_EVENT, ClerkUser.ADMIN_ROLE_SUPER]
        except ClerkUser.DoesNotExist:
            return False

class IsSupportAdminOrSuperAdmin(permissions.BasePermission):
    """Allows access to Support Admins and Super Admins."""
    message = 'Requires Support Admin or Super Admin privileges.'
    def has_permission(self, request, view):
        clerk_user_info = getattr(request, 'clerk_user', None)
        if not clerk_user_info: return False
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id: return False
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            if user.user_type != ClerkUser.USER_TYPE_ADMIN:
                return False
            return user.admin_role in [ClerkUser.ADMIN_ROLE_SUPPORT, ClerkUser.ADMIN_ROLE_SUPER]
        except ClerkUser.DoesNotExist:
            return False

class CanManageUsers(permissions.BasePermission):
    """Allows access to users who can manage other users (Support Admin, Event Admin, Super Admin)."""
    message = 'You do not have permission to manage users.'
    def has_permission(self, request, view):
        clerk_user_info = getattr(request, 'clerk_user', None)
        if not clerk_user_info: return False
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id: return False
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            if user.user_type != ClerkUser.USER_TYPE_ADMIN:
                return False
            return user.admin_role in [ClerkUser.ADMIN_ROLE_SUPPORT, ClerkUser.ADMIN_ROLE_EVENT, ClerkUser.ADMIN_ROLE_SUPER]
        except ClerkUser.DoesNotExist:
            return False

class CanViewAnalytics(permissions.BasePermission):
    """Allows access to users who can view analytics (Support Admin, Event Admin, Super Admin)."""
    message = 'You do not have permission to view analytics.'
    def has_permission(self, request, view):
        clerk_user_info = getattr(request, 'clerk_user', None)
        if not clerk_user_info: return False
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id: return False
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            if user.user_type != ClerkUser.USER_TYPE_ADMIN:
                return False
            return user.admin_role in [ClerkUser.ADMIN_ROLE_SUPPORT, ClerkUser.ADMIN_ROLE_EVENT, ClerkUser.ADMIN_ROLE_SUPER]
        except ClerkUser.DoesNotExist:
            return False

class CanManageEvents(permissions.BasePermission):
    """Allows access to users who can manage events (Event Admin, Super Admin)."""
    message = 'You do not have permission to manage events.'
    def has_permission(self, request, view):
        clerk_user_info = getattr(request, 'clerk_user', None)
        if not clerk_user_info: return False
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id: return False
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            if user.user_type != ClerkUser.USER_TYPE_ADMIN:
                return False
            return user.admin_role in [ClerkUser.ADMIN_ROLE_EVENT, ClerkUser.ADMIN_ROLE_SUPER]
        except ClerkUser.DoesNotExist:
            return False

class CanViewEvents(permissions.BasePermission):
    """Allows access to users who can view events (Support Admin, Event Admin, Super Admin)."""
    message = 'You do not have permission to view events.'
    def has_permission(self, request, view):
        clerk_user_info = getattr(request, 'clerk_user', None)
        if not clerk_user_info: return False
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id: return False
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            if user.user_type != ClerkUser.USER_TYPE_ADMIN:
                return False
            return user.admin_role in [ClerkUser.ADMIN_ROLE_SUPPORT, ClerkUser.ADMIN_ROLE_EVENT, ClerkUser.ADMIN_ROLE_SUPER]
        except ClerkUser.DoesNotExist:
            return False

# Custom pagination for admin views
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        # Check for Clerk user admin status instead of Django's is_staff
        clerk_user_info = getattr(request, 'clerk_user', None)
        if not clerk_user_info: return False
        clerk_id = clerk_user_info.get('sub')
        if not clerk_id: return False
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
            return user.user_type == ClerkUser.USER_TYPE_ADMIN
        except ClerkUser.DoesNotExist:
            return False

# Get overall dashboard stats for admin panel
@api_view(['GET'])
@permission_classes([IsAnyAdmin])
def admin_dashboard_stats(request):
    try:
        # Get the latest dashboard stats
        latest_stats = AdminDashboardStat.objects.first()
        if not latest_stats:
            # Calculate total revenue from tickets
            from tickets.models import Ticket
            total_ticket_revenue = Ticket.objects.filter(
                is_active=True
            ).values('ticket_type__price').aggregate(total=models.Sum('ticket_type__price'))['total'] or 0
            
            # If no stats exist, create a new one with default values
            latest_stats = AdminDashboardStat.objects.create(
                total_users=ClerkUser.objects.count(),
                total_events=Event.objects.count(),
                total_tickets_sold=Ticket.objects.count(),
                total_revenue=total_ticket_revenue,
                # You can add more calculations here as needed
            )
        
        # Convert snake_case to camelCase for frontend
        serialized_data = {
            'totalUsers': latest_stats.total_users,
            'totalEvents': latest_stats.total_events,
            'totalTicketsSold': latest_stats.total_tickets_sold,
            'totalRevenue': float(latest_stats.total_revenue)
        }
        
        # Log this admin action
        ActionLogger.log_action(
            request, 
            AdminActionLog.ACTION_VIEW,
            'dashboard_stats', 
            'latest'
        )
        
        return Response(serialized_data)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminUserListView(generics.ListCreateAPIView):
    """List and create view for users in admin panel"""
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    # Filter to only admin users
    queryset = ClerkUser.objects.filter(user_type=ClerkUser.USER_TYPE_ADMIN).order_by('-created_at')
    
    def get_queryset(self):
        """Filter queryset to ensure we only get admin users"""
        queryset = super().get_queryset().filter(user_type=ClerkUser.USER_TYPE_ADMIN)
        
        # Add search capability
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(email__icontains=search) | 
                models.Q(full_name__icontains=search)
            )
            
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new admin user"""
        try:
            # Set default name values if not provided
            data = request.data.copy()
            if 'full_name' not in data or not data['full_name']:
                if 'email' in data:
                    # Generate a display name from email
                    email_name = data['email'].split('@')[0].replace('.', ' ').title()
                    data['full_name'] = email_name
                    print(f"Generated full_name from email: {data['full_name']}")

            # Ensure the user is created as an admin
            data['user_type'] = ClerkUser.USER_TYPE_ADMIN
            
            # Create the user
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            # Log this admin action
            ActionLogger.log_action(
                request, 
                AdminActionLog.ACTION_CREATE,
                'user', 
                serializer.instance.clerk_id,
                {'fields': list(request.data.keys())}
            )
            
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            import traceback
            print(f"Error creating admin user: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def list(self, request, *args, **kwargs):
        try:
            # Call the parent list method but customize the response
            response = super().list(request, *args, **kwargs)
            
            # Check what type of response we have (paginated or not)
            response_data = response.data
            
            # Handle both paginated and non-paginated responses
            if isinstance(response_data, dict) and 'results' in response_data:
                # This is a paginated response
                users_data = response_data['results']
            elif isinstance(response_data, list):
                # This is a non-paginated response
                users_data = response_data
            else:
                # Unexpected format, return as is
                return response
            
            # Add the plan display name to each user and ensure full_name exists
            for user_data in users_data:
                # Convert the plan code to display name
                plan_code = user_data.get('plan')
                if plan_code:
                    # Get the plan display name from PLAN_CHOICES
                    for code, name in ClerkUser.PLAN_CHOICES:
                        if code == plan_code:
                            user_data['plan'] = name
                            break
                
                # Ensure full_name exists
                if not user_data.get('full_name'):
                    email = user_data.get('email', '')
                    if email:
                        username = email.split('@')[0].replace('.', ' ').title()
                        user_data['full_name'] = username
                        print(f"Setting missing full_name for {user_data.get('clerk_id')}: {username}")
            
            # Log this admin action
            ActionLogger.log_action(
                request, 
                AdminActionLog.ACTION_VIEW,
                'user_list', 
                'all', 
                {'filter': request.query_params.get('filter', None)}
            )
            
            # Print the response data for debugging
            print(f"Sending admin users response with {len(users_data)} users")
            for i, user in enumerate(users_data):
                print(f"User {i}: {user.get('clerk_id')} - {user.get('full_name')} - {user.get('email')}")
                
            return response
        except Exception as e:
            # Add detailed error logging
            import traceback
            print(f"Error in admin user list view: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """Detail view for a user in admin panel"""
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    lookup_field = 'clerk_id'
    queryset = ClerkUser.objects.all()
    
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            # Get the serialized data
            serializer = self.get_serializer(instance)
            user_data = serializer.data
            
            # Convert the plan code to display name
            plan_code = user_data.get('plan')
            if plan_code:
                # Get the plan display name from PLAN_CHOICES
                for code, name in ClerkUser.PLAN_CHOICES:
                    if code == plan_code:
                        user_data['plan'] = name
                        break
            
            # Log this admin action
            ActionLogger.log_action(
                request, 
                AdminActionLog.ACTION_VIEW,
                'user', 
                instance.clerk_id
            )
            return Response(user_data)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            # Log this admin action
            ActionLogger.log_action(
                request, 
                AdminActionLog.ACTION_UPDATE,
                'user', 
                instance.clerk_id, 
                {'updated_fields': list(request.data.keys())}
            )
            return super().update(request, *args, **kwargs)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ActionLogger:
    @staticmethod
    def log_action(request, action_type, resource_type, resource_id, details=None):
        try:
            admin_user = getattr(request, 'clerk_db_user', None)
            if not admin_user:
                return
                
            AdminActionLog.objects.create(
                admin_user=admin_user,
                action_type=action_type,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                ip_address=request.META.get('REMOTE_ADDR')
            )
        except Exception as e:
            print(f"Error logging admin action: {e}")

class AdminActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for admin action logs"""
    permission_classes = [IsAdminUser]
    serializer_class = AdminActionLogSerializer
    queryset = AdminActionLog.objects.all().order_by('-timestamp')

@api_view(['GET'])
@permission_classes([IsAdminUser])
def plan_distribution(request):
    """Get distribution of user plans for analytics"""
    try:
        plans = dict(ClerkUser.PLAN_CHOICES)
        plan_data = []
        
        # Create array of plan distribution data with the format expected by the chart
        for plan_key, plan_name in plans.items():
            # Exclude admin users from the count
            count = ClerkUser.objects.filter(
                plan=plan_key,
                user_type=ClerkUser.USER_TYPE_USER  # Only count regular users, not admins
            ).count()
            
            if count > 0:  # Only include plans that have users
                plan_data.append({
                'name': plan_name,
                    'value': count
                })
        
        # Sort by count (optional)
        plan_data = sorted(plan_data, key=lambda x: x['value'], reverse=True)
            
        return Response(plan_data)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def revenue_summary(request):
    """Get revenue summary for admin analytics"""
    try:
        # Get current date and first day of current month
        today = datetime.now().date()
        
        # Generate data for the last 6 months
        monthly_data = []
        for i in range(5, -1, -1):  # 5 months ago to current month
            # Calculate month start and end dates
            month_date = today.replace(day=1) - timedelta(days=i*30)  # Approximate, not calendar perfect
            month_name = month_date.strftime("%b %Y")  # Format: "Jan 2025"
            
            # Get revenue for this month by plan type
            # Using simple mock data for now as we don't have plan-specific ticket sales yet
            # In a real implementation, you would query tickets grouped by user plan
            month_revenue = {
                "month": month_name,
                "Free Plan": 0,
                "Pro Plan": 0,
                "Organizer Plan": 0
            }
            
            # Get actual revenue for this month (all plans combined)
            month_start = month_date
            month_end = (month_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
            
            actual_revenue = Ticket.objects.filter(
                is_active=True,
                purchase_time__date__gte=month_start,
                purchase_time__date__lte=month_end
            ).values('ticket_type__price').aggregate(total=models.Sum('ticket_type__price'))['total'] or 0
            
            # For demonstration, distribute the revenue among plans
            # In a real implementation, you would get actual plan-specific data
            if i == 0:  # Current month
                month_revenue["Free Plan"] = int(actual_revenue * 0.2)
                month_revenue["Pro Plan"] = int(actual_revenue * 0.3)
                month_revenue["Organizer Plan"] = int(actual_revenue * 0.5)
            elif i == 1:  # Last month
                month_revenue["Free Plan"] = int(actual_revenue * 0.15)
                month_revenue["Pro Plan"] = int(actual_revenue * 0.35)
                month_revenue["Organizer Plan"] = int(actual_revenue * 0.5)
            else:  # Earlier months
                month_revenue["Free Plan"] = int(actual_revenue * 0.1)
                month_revenue["Pro Plan"] = int(actual_revenue * 0.4)
                month_revenue["Organizer Plan"] = int(actual_revenue * 0.5)
            
            monthly_data.append(month_revenue)
        
        return Response(monthly_data)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
