from rest_framework import generics
from .models import Event
from .serializers import EventSerializer, ImageUploadSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from admin_panel.views import StandardResultsSetPagination, IsClerkAdminUser, IsAnyAdmin, IsSuperAdmin, IsEventAdminOrSuperAdmin, IsSupportAdminOrSuperAdmin
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

import os
import pickle
import numpy as np
from users.models import ClerkUser
from saved.models import SavedEvent
from notifications.models import AdminNotification

# --- Recommendation System Model Loading ---
RECOMMENDER_MODELS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'recommender_models')

class RecommendationModelLoader:
    _tfidf_vectorizer = None
    _cosine_sim_matrix = None
    _event_indices_map = None
    _svd_model = None

    @classmethod
    def load_models(cls):
        if cls._tfidf_vectorizer is None:
            with open(os.path.join(RECOMMENDER_MODELS_PATH, 'tfidf_vectorizer.pkl'), 'rb') as f:
                cls._tfidf_vectorizer = pickle.load(f)
        if cls._cosine_sim_matrix is None:
            with open(os.path.join(RECOMMENDER_MODELS_PATH, 'cosine_sim_matrix.pkl'), 'rb') as f:
                cls._cosine_sim_matrix = pickle.load(f)
        if cls._event_indices_map is None:
            with open(os.path.join(RECOMMENDER_MODELS_PATH, 'event_indices_map.pkl'), 'rb') as f:
                cls._event_indices_map = pickle.load(f)
        if cls._svd_model is None:
            with open(os.path.join(RECOMMENDER_MODELS_PATH, 'svd_model.pkl'), 'rb') as f:
                cls._svd_model = pickle.load(f)
        return (cls._tfidf_vectorizer, cls._cosine_sim_matrix, cls._event_indices_map, cls._svd_model)

    @classmethod
    def get_models(cls):
        if any(x is None for x in (cls._tfidf_vectorizer, cls._cosine_sim_matrix, cls._event_indices_map, cls._svd_model)):
            return cls.load_models()
        return (cls._tfidf_vectorizer, cls._cosine_sim_matrix, cls._event_indices_map, cls._svd_model)


def get_user_saved_event_indices(user, event_indices_map):
    saved_event_ids = list(SavedEvent.objects.filter(user=user).values_list('event_id', flat=True))
    indices = [event_indices_map.get(str(eid)) for eid in saved_event_ids if str(eid) in event_indices_map]
    return [idx for idx in indices if idx is not None]


def recommend_events_for_user(user):
    tfidf_vectorizer, cosine_sim_matrix, event_indices_map, svd_model = RecommendationModelLoader.get_models()
    # Content-Based Filtering: Recommend similar events to user's saved events
    saved_indices = get_user_saved_event_indices(user, event_indices_map)
    if not saved_indices:
        # Fallback: recommend top-N events (e.g., most popular)
        return Event.objects.order_by('-tickets_sold')[:10]
    # Aggregate similarity scores for all saved events
    sim_scores = np.sum([cosine_sim_matrix[idx] for idx in saved_indices], axis=0)
    # Exclude already saved events
    for idx in saved_indices:
        sim_scores[idx] = -1
    top_indices = np.argsort(sim_scores)[::-1][:10]
    # Map indices back to event IDs
    index_to_event_id = {v: k for k, v in event_indices_map.items()}
    recommended_event_ids = [int(index_to_event_id[idx]) for idx in top_indices if sim_scores[idx] > 0]
    # Collaborative Filtering (optional): can blend with SVD model predictions
    # ... (Add collaborative logic here if you wish)
    # Query events from DB
    events = Event.objects.filter(id__in=recommended_event_ids)
    # Preserve order
    events_dict = {e.id: e for e in events}
    ordered_events = [events_dict[eid] for eid in recommended_event_ids if eid in events_dict]
    return ordered_events

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommendations_api(request):
    user_jwt = getattr(request, 'clerk_user', None)
    if not user_jwt:
        return Response({'error': 'Unauthorized'}, status=401)
    clerk_id = user_jwt.get('sub')
    try:
        user = ClerkUser.objects.get(clerk_id=clerk_id)
    except ClerkUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    recommended_events = recommend_events_for_user(user)
    serializer = EventSerializer(recommended_events, many=True, context={'request': request})
    return Response({'recommendations': serializer.data})

@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_categories(request):
    categories = Event.objects.values_list('category', flat=True).distinct()
    # Always include 'All' at the top
    category_list = ['All'] + sorted(set([c for c in categories if c and c.lower() != 'all']))
    return Response({'categories': category_list})

from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
import requests
from django.http import JsonResponse

@api_view(['GET'])
@permission_classes([AllowAny])
def ticketmaster_events_proxy(request):
    params = request.GET.dict()
    api_key = 'YOUR_TICKETMASTER_API_KEY'  # TODO: Replace with env variable or settings
    params['apikey'] = api_key
    url = 'https://app.ticketmaster.com/discovery/v2/events.json'
    resp = requests.get(url, params=params)
    try:
        data = resp.json()
    except Exception:
        data = {'error': 'Invalid response from Ticketmaster'}
    return JsonResponse(data, safe=False)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organizer_dashboard_stats(request):
    """
    Return dashboard statistics for the current organizer: total events, tickets sold, total revenue, active attendees, and analytics data.
    """
    from users.models import ClerkUser
    from tickets.models import Ticket
    from django.utils import timezone
    import datetime
    user_jwt = getattr(request, 'clerk_user', None)
    if not user_jwt:
        return Response({'error': 'Unauthorized'}, status=401)
    clerk_id = user_jwt.get('sub')
    try:
        organizer = ClerkUser.objects.get(clerk_id=clerk_id)
    except ClerkUser.DoesNotExist:
        return Response({'error': 'Organizer not found'}, status=404)
    events = Event.objects.filter(organizer=organizer)
    total_events = events.count()
    total_tickets_sold = 0
    total_revenue = 0.0
    active_attendees = set()
    # Analytics: sales/revenue/attendance per month for last 6 months
    today = timezone.now().date()
    months = [(today - datetime.timedelta(days=30*i)).strftime('%b %Y') for i in reversed(range(6))]
    sales_per_month = {m: 0 for m in months}
    revenue_per_month = {m: 0 for m in months}
    attendance_per_event = []
    for event in events:
        # Sync ticket types to ensure revenue is up to date
        from .serializers import EventSerializer
        EventSerializer.sync_ticket_types(event)
        
        # Tickets sold and revenue
        event_tickets = Ticket.objects.filter(event=event)
        event_tickets_sold = event_tickets.count()
        total_tickets_sold += event_tickets_sold
        
        # Revenue: sum revenue from each ticket type
        event_revenue = 0.0
        ticket_types = getattr(event, 'ticketTypes', []) or []
        for tt in ticket_types:
            try:
                event_revenue += float(tt.get('revenue', 0) or 0)
            except Exception:
                continue
        total_revenue += event_revenue
        
        # Active attendees (unique user IDs for future events)
        if event.date:
            try:
                event_date = datetime.datetime.strptime(event.date, '%Y-%m-%d').date()
                if event_date >= today:
                    for ticket in event_tickets:
                        if ticket.user_id:
                            active_attendees.add(ticket.user_id)
            except Exception:
                pass
        # Analytics per month
        for ticket in event_tickets:
            if ticket.purchase_time:
                month_label = ticket.purchase_time.strftime('%b %Y')
                if month_label in sales_per_month:
                    sales_per_month[month_label] += 1
                    # Get revenue from ticket type
                    tt_name = getattr(ticket, 'ticket_type_name', None)
                    for tt in ticket_types:
                        if tt.get('name') == tt_name:
                            revenue_per_month[month_label] += float(tt.get('price', 0) or 0)
                            break
        # Attendance per event (for bar chart)
        attendance_per_event.append({
            'name': event.title,
            'value': event_tickets_sold
        })
    # Build events list with ticket type stats
    event_list = []
    for event in events:
        ticket_types = getattr(event, 'ticketTypes', []) or []
        ticket_types_stats = []
        for tt in ticket_types:
            name = tt.get('name')
            price = float(tt.get('price', 0) or 0)
            sold = int(tt.get('sold', 0) or 0)
            total = int(tt.get('total', 0) or 0)
            revenue = float(tt.get('revenue', 0) or 0)
            ticket_types_stats.append({
                'name': name,
                'price': price,
                'sold': sold,
                'total': total,
                'revenue': revenue,
            })
        event_list.append({
            'id': event.id,
            'name': getattr(event, 'title', getattr(event, 'name', 'Event')),
            'ticketTypes': ticket_types_stats,
        })
    analytics = {
        'ticketSales': [{'name': m, 'sales': sales_per_month[m]} for m in months],
        'revenue': [{'name': m, 'revenue': revenue_per_month[m]} for m in months],
        'attendance': attendance_per_event,
        'events': event_list,
    }
    return Response({
        'totalEvents': total_events,
        'ticketsSold': total_tickets_sold,
        'totalRevenue': total_revenue,
        'activeAttendees': len(active_attendees),
        'analytics': analytics,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_event_attendees(request, pk):
    """
    Return a list of all attendees (tickets) for a specific event.
    Each attendee includes: name, email, ticket type, check-in status, purchase date
    """
    event = get_object_or_404(Event, pk=pk)
    tickets = Ticket.objects.filter(event=event)
    attendees = []
    for ticket in tickets.select_related('user', 'ticket_type'):
        user = ticket.user
        # Only include image URL, not the file object itself
        avatar_url = None
        if getattr(user, 'profile_image', None):
            try:
                avatar_url = user.profile_image.url
            except Exception:
                avatar_url = '/placeholder-user.jpg'
        else:
            avatar_url = '/placeholder-user.jpg'
        attendees.append({
            'id': ticket.id,
            'ticket_id': ticket.ticket_id,  # Added for reliable check-in
            'name': getattr(user, 'full_name', None) or getattr(user, 'username', ''),
            'email': getattr(user, 'email', ''),
            'ticketType': getattr(ticket.ticket_type, 'type', ticket.ticket_type_name),
            'checkInStatus': 'Checked In' if not getattr(ticket, 'is_active', True) else 'Not Checked In',
            'purchaseDate': ticket.purchase_time.strftime('%Y-%m-%d %H:%M:%S') if ticket.purchase_time else '',
            'avatar': avatar_url,
        })
    return Response({'attendees': attendees})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_event_tickets(request, pk):
    """
    Decrement ticket quantities for an event after purchase.
    Expects: {"tickets": [{"name": str, "quantity": int}]}
    """
    event = get_object_or_404(Event, pk=pk)
    ticket_types = event.ticketTypes or []
    tickets_to_update = request.data.get('tickets', [])
    name_to_qty = {t['name']: t['quantity'] for t in tickets_to_update}
    updated = False
    for tt in ticket_types:
        if tt['name'] in name_to_qty:
            try:
                old_qty = int(tt.get('quantity', 0))
                decrement = int(name_to_qty[tt['name']])
                tt['quantity'] = max(old_qty - decrement, 0)
                updated = True
            except Exception:
                continue
    if updated:
        event.ticketTypes = ticket_types
        event.save()
        # --- Sync ticketTypes with correct price and sold values after purchase ---
        from .serializers import EventSerializer
        EventSerializer.sync_ticket_types(event)
        return Response(EventSerializer(event).data)
    else:
        return Response({'detail': 'No tickets updated.'}, status=status.HTTP_400_BAD_REQUEST)

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser
from googletrans import Translator
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
from uuid import uuid4

# --- Organizer Reviews Endpoint ---
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organizer_reviews(request):
    """
    Return all reviews for events organized by the current user, with replies.
    """
    user_jwt = getattr(request, 'clerk_user', None)
    if not user_jwt:
        return Response({'error': 'Unauthorized'}, status=401)
    clerk_id = user_jwt.get('sub')
    from users.models import ClerkUser
    try:
        organizer = ClerkUser.objects.get(clerk_id=clerk_id)
    except ClerkUser.DoesNotExist:
        return Response({'error': 'Organizer not found'}, status=404)
    events = Event.objects.filter(organizer=organizer)
    reviews = []
    for event in events:
        event_id = event.id
        for idx, comment in enumerate(event.comments or []):
            reviews.append({
                'id': comment.get('id', idx),
                'userName': comment.get('user', 'Anonymous'),
                'rating': comment.get('rating', None),
                'comment': comment.get('text', ''),
                'responses': ([{
    'id': f"resp-{comment.get('id', idx)}",
    'content': comment['reply'],
    'createdAt': comment.get('replyCreatedAt') or '',
    'updatedAt': comment.get('replyUpdatedAt') or comment.get('replyCreatedAt') or '',
    'organizerId': str(organizer.id),
    'organizerName': getattr(organizer, 'name', 'Organizer'),
}] if comment.get('reply') else []),
                'event_id': event_id,
                'event_title': event.title,
'createdAt': comment.get('createdAt') or comment.get('date') or '',
'updatedAt': comment.get('updatedAt') or comment.get('createdAt') or comment.get('date') or '',
            })
    return Response({'reviews': reviews})

# --- Organizer Reply to Review ---
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def organizer_reply_to_review(request, comment_id):
    """
    Organizer adds or updates a reply to a review (comment) by comment_id.
    """
    user = getattr(request, 'clerk_user', None)
    reply = request.data.get('reply', '').strip()
    # Allow empty reply to mean delete
    organizer_id = user.get('sub') if isinstance(user, dict) else getattr(user, 'clerk_id', None)
    # Fix: use organizer__clerk_id for Clerk string IDs
    events = Event.objects.filter(organizer__clerk_id=organizer_id)
    for event in events:
        comments = event.comments or []
        for idx, comment in enumerate(comments):
            cid = str(comment.get('id', idx))
            if str(comment_id) == cid:
                # If reply is empty, delete reply and related fields
                if not reply:
                    for field in [
                        'reply', 'replyCreatedAt', 'replyUpdatedAt', 'organizerId', 'organizerName']:
                        if field in comment:
                            del comment[field]
                    comments[idx] = comment
                    event.comments = comments
                    event.save()
                    print(f"[DEBUG] Deleted organizer reply from comment: {comment}")
                    return Response({'success': True, 'deleted': True})
                # Otherwise, set reply and metadata
                from django.utils import timezone
                now_str = timezone.now().isoformat()
                if not comment.get('replyCreatedAt'):
                    comment['replyCreatedAt'] = now_str
                comment['replyUpdatedAt'] = now_str
                comment['reply'] = reply
                comment['organizerId'] = user.get('sub') if isinstance(user, dict) else getattr(user, 'clerk_id', '')
                comment['organizerName'] = (user.get('full_name') if isinstance(user, dict) else getattr(user, 'full_name', 'Organizer')) or 'Organizer'
                # Add organizerImage (profile image URL if available)
                organizer_image = user.get('profile_image_url') if isinstance(user, dict) else getattr(user, 'profile_image_url', None)
                comment['organizerImage'] = organizer_image or ''
                comments[idx] = comment
                event.comments = comments
                event.save()
                print(f"[DEBUG] Updated comment: {comment}")
                return Response({'success': True, 'reply': reply, 'organizerName': comment['organizerName'], 'organizerImage': comment['organizerImage']})
    return Response({'error': 'Review not found or not authorized.'}, status=404)

class EventListCreateView(generics.ListCreateAPIView):
    queryset = Event.objects.all().order_by('-start_time')
    serializer_class = EventSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['status', 'category', 'location']
    search_fields = ['title', 'description', 'location', 'organizer_name']
    ordering_fields = ['date', 'start_time', 'created_at', 'attendees', 'title', 'status']
    ordering = ['-date']

    # Override permissions based on HTTP method
    def get_permissions(self):
        if self.request.method == 'POST':
            # Allow both Super Admins and users with organizer plan to create events
            return [IsAuthenticated()]
        # Allow any authenticated user to list events (they will be filtered by get_queryset)
        return [IsAuthenticated()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        queryset = super().get_queryset()
        # Get the current user from the request
        clerk_user_info = getattr(self.request, 'clerk_user', None)
        if clerk_user_info:
            clerk_id = clerk_user_info['sub']
            try:
                user = ClerkUser.objects.get(clerk_id=clerk_id)
                # Check if this is a request from the discover page (indicated by query param or referer)
                discover_page = self.request.query_params.get('discover', 'false').lower() == 'true'
                referer = self.request.META.get('HTTP_REFERER', '')
                discover_referer = 'discover' in referer.lower()
                
                # If from discover page, show all events to all users
                if discover_page or discover_referer:
                    return queryset
                
                # Otherwise use original filtering logic
                # If user is an organizer, show only their events
                if user.plan == ClerkUser.PLAN_ORGANIZER:
                    queryset = queryset.filter(organizer=user)
                # If user is not a Super Admin or Event Admin, only show their events
                elif not (user.user_type == ClerkUser.USER_TYPE_ADMIN and 
                         user.admin_role in [ClerkUser.ADMIN_ROLE_SUPER, ClerkUser.ADMIN_ROLE_EVENT]):
                    queryset = queryset.filter(organizer=user)
            except ClerkUser.DoesNotExist:
                pass
        return queryset

    def perform_create(self, serializer):
        # Get the current user from the request
        clerk_user_info = getattr(self.request, 'clerk_user', None)
        if not clerk_user_info:
            raise Exception("No Clerk user found for this request")
        
        clerk_id = clerk_user_info['sub']
        try:
            user = ClerkUser.objects.get(clerk_id=clerk_id)
        except ClerkUser.DoesNotExist:
            raise Exception("User not found in database")

        # Check if user is either a Super Admin or has organizer plan
        is_super_admin = user.user_type == ClerkUser.USER_TYPE_ADMIN and user.admin_role == ClerkUser.ADMIN_ROLE_SUPER
        is_organizer = user.plan == ClerkUser.PLAN_ORGANIZER

        if not (is_super_admin or is_organizer):
            raise Exception("Only Super Admins and users with organizer plan can create events")

        # Set the organizer to the current user and source to 'manual'
        serializer.save(organizer=user, organizer_name=user.full_name, source='manual')

class EventRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    # Override permissions based on HTTP method
    def get_permissions(self):
        # Any authenticated user can retrieve event details
        return [IsAuthenticated()]
        
    # Custom check to allow event organizers to modify/delete their own events
    def check_object_permissions(self, request, obj):
        # Always allow GET (retrieve) requests
        if request.method == 'GET':
            return True
            
        # For PATCH, PUT, DELETE requests:
        if request.method in ['PATCH', 'PUT', 'DELETE']:
            # Get the current user from the request
            clerk_user_info = getattr(request, 'clerk_user', None)
            if clerk_user_info:
                clerk_id = clerk_user_info.get('sub')
                if clerk_id:
                    try:
                        from users.models import ClerkUser
                        user = ClerkUser.objects.get(clerk_id=clerk_id)
                        
                        # Allow if:
                        # 1. User is a Super Admin or Event Admin
                        if user.user_type == ClerkUser.USER_TYPE_ADMIN and user.admin_role in [ClerkUser.ADMIN_ROLE_SUPER, ClerkUser.ADMIN_ROLE_EVENT]:
                            return True
                            
                        # 2. User is the organizer of this event
                        if hasattr(obj, 'organizer') and obj.organizer and obj.organizer.clerk_id == clerk_id:
                            return True
                            
                    except ClerkUser.DoesNotExist:
                        pass
                        
            # If we get here, the user doesn't have permission
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You don't have permission to perform this action.")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_update(self, serializer):
        instance = serializer.save()
        # --- Create Notification --- 
        requesting_admin = None
        requesting_user_clerk_id = getattr(self.request, 'clerk_user', {}).get('sub')
        if requesting_user_clerk_id:
            requesting_admin = ClerkUser.objects.filter(clerk_id=requesting_user_clerk_id).first()
            
        AdminNotification.objects.create(
            message=f"📅 Event '{instance.title}' was updated.",
            notification_type=AdminNotification.TYPE_EVENT_UPDATE,
            target_role=AdminNotification.TARGET_SUPER_ADMIN_ONLY, # Only notify Super Admins
            actor=requesting_admin 
            # TODO: Maybe add a link to the event detail page?
            # link=f'/admin/events/{instance.id}' # Example frontend link structure
        )
        # --- End Notification --- 

    def perform_destroy(self, instance):
        event_title = instance.title # Get identifier before deleting
        event_id = instance.id

        # Get actor before deleting instance
        requesting_user = None
        requesting_user_clerk_id = getattr(self.request, 'clerk_user', {}).get('sub')
        if requesting_user_clerk_id:
            requesting_user = ClerkUser.objects.filter(clerk_id=requesting_user_clerk_id).first()

        # Check if this is an organizer or admin deleting
        is_admin = False
        if requesting_user and requesting_user.user_type == ClerkUser.USER_TYPE_ADMIN:
            is_admin = True

        super().perform_destroy(instance) # Delete local record

        # --- Create Notification --- 
        # Only create admin notification if it was an admin who deleted it
        if is_admin:
         AdminNotification.objects.create(
                message=f"🗑️ Event '{event_title}' was deleted by admin.",
            notification_type=AdminNotification.TYPE_EVENT_DELETE,
            target_role=AdminNotification.TARGET_SUPER_ADMIN_ONLY, # Only notify Super Admins
                actor=requesting_user
            )
        else:
            # If an organizer deleted their own event
            AdminNotification.objects.create(
                message=f"🗑️ Event '{event_title}' was deleted by its organizer.",
                notification_type=AdminNotification.TYPE_EVENT_DELETE,
                target_role=AdminNotification.TARGET_SUPER_ADMIN_ONLY,
                actor=requesting_user
        )
        # --- End Notification --- 

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated])
def upload_event_image(request):
    serializer = ImageUploadSerializer(data=request.data)
    if serializer.is_valid():
        image = serializer.validated_data['image']
        # Generate a unique filename
        ext = os.path.splitext(image.name)[1]
        filename = f"event_{uuid4().hex}{ext}"
        filepath = os.path.join(settings.MEDIA_ROOT, filename)
        with open(filepath, 'wb+') as f:
            for chunk in image.chunks():
                f.write(chunk)
        url = settings.MEDIA_URL + filename
        return Response({'url': url})
    return Response(serializer.errors, status=400)

# --- Comments Endpoints ---
@api_view(['GET'])
@permission_classes([AllowAny])
def get_event_comments(request, pk):
    event = get_object_or_404(Event, pk=pk)
    # Ensure each comment has user object and id
    def normalize_comment(comment, idx):
        user = comment.get('user')
        if not isinstance(user, dict):
            name = user or comment.get('name') or 'User'
            user = {'name': name, 'avatar': None}
        # Ensure user has an 'id' field for frontend matching
        if 'id' not in user or user['id'] is None:
            user['id'] = comment.get('user_id') or None
        # Add responses array for organizer reply, if present
        responses = []
        if comment.get('reply'):
            responses.append({
                'id': f"resp-{comment.get('id', idx)}",
                'content': comment['reply'],
                'createdAt': comment.get('replyCreatedAt') or '',
                'updatedAt': comment.get('replyUpdatedAt') or comment.get('replyCreatedAt') or '',
                'organizerId': comment.get('organizerId', ''),
                'organizerName': comment.get('organizerName', 'Organizer'),
            })
        return {
            'id': comment.get('id') or str(idx),
            'user': user,
            'text': comment.get('text', ''),
            'date': comment.get('date', ''),
            'rating': comment.get('rating', None),
            'responses': responses,
        }
    comments = event.comments or []
    normalized = [normalize_comment(c, i) for i, c in enumerate(comments)]
    return Response(normalized)

from users.models import ClerkUser
from tickets.models import Ticket

from django.views.decorators.csrf import csrf_exempt

from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from googletrans import Translator

from asgiref.sync import sync_to_async
from django.utils.decorators import sync_and_async_middleware

import asyncio

@csrf_exempt
@api_view(['POST'])
def translate_text(request):
    """
    Translate text using googletrans 4.0.2 (async).
    Expects JSON: { "text": "Hello", "target": "am" }
    Returns: { "translated": "..." }
    """
    text = request.data.get("text", "")
    target = request.data.get("target", "en")

    if not text or not target:
        return Response({"error": "Missing 'text' or 'target'"}, status=400)

    try:
        translator = Translator()
        translation = asyncio.run(translator.translate(text, dest=target))
        return Response({"translated": translation.text})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def checkin_attendee(request, ticket_id):
    """
    Mark an attendee as checked in (set ticket.is_active=False).
    Only the ticket owner or the event organizer can check in a ticket.
    """
    user = getattr(request, 'clerk_user', None)
    if not user:
        return Response({'error': 'Authentication required'}, status=401)
    clerk_id = user.get('sub') if isinstance(user, dict) else getattr(user, 'clerk_id', None)
    from users.models import ClerkUser
    try:
        clerk_user = ClerkUser.objects.get(clerk_id=clerk_id)
    except ClerkUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    try:
        ticket = Ticket.objects.select_related('event').get(ticket_id=ticket_id)
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=404)
    # Only allow the ticket owner or the event organizer
    if not (ticket.user == clerk_user or ticket.event.organizer == clerk_user):
        return Response({'error': 'You do not have permission to check in this attendee.'}, status=403)
    if not ticket.is_active:
        return Response({'message': 'Already checked in'}, status=200)
    ticket.is_active = False
    ticket.save()
    attendee_user = ticket.user
    avatar_url = None
    if getattr(attendee_user, 'profile_image', None):
        try:
            avatar_url = attendee_user.profile_image.url
        except Exception:
            avatar_url = '/placeholder-user.jpg'
    else:
        avatar_url = '/placeholder-user.jpg'
    attendee = {
        'id': ticket.id,
        'name': getattr(attendee_user, 'full_name', None) or getattr(attendee_user, 'username', ''),
        'email': getattr(attendee_user, 'email', ''),
        'ticketType': getattr(ticket.ticket_type, 'type', ticket.ticket_type_name),
        'checkInStatus': 'Checked In',
        'purchaseDate': ticket.purchase_time.strftime('%Y-%m-%d %H:%M:%S') if ticket.purchase_time else '',
        'avatar': avatar_url,
    }
    return Response({'attendee': attendee, 'message': 'Checked in successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def post_event_comment(request, pk):
    event = get_object_or_404(Event, pk=pk)
    comment = request.data.get('comment')
    rating = request.data.get('rating')
    clerk_user_info = getattr(request, 'clerk_user', None)
    clerk_user = None
    if clerk_user_info:
        clerk_id = clerk_user_info.get('sub')
        if clerk_id:
            clerk_user = ClerkUser.objects.filter(clerk_id=clerk_id).first()
    
    # Get the best available user name, with multiple fallbacks
    name = 'User'
    if clerk_user:
        if clerk_user.full_name:
            name = clerk_user.full_name
        elif hasattr(clerk_user, 'username') and clerk_user.username:
            name = clerk_user.username
        elif hasattr(clerk_user, 'email') and clerk_user.email:
            # Use part before @ in email if no better name is available
            name = clerk_user.email.split('@')[0]
    avatar = None
    if clerk_user and clerk_user.profile_image:
        try:
            # Use absolute URL for avatar if possible
            request_obj = request if 'request' in locals() else None
            if hasattr(clerk_user.profile_image, 'url'):
                if hasattr(request, 'build_absolute_uri'):
                    avatar = request.build_absolute_uri(clerk_user.profile_image.url)
                else:
                    avatar = clerk_user.profile_image.url
            else:
                avatar = None
        except Exception:
            avatar = None
    # Compose comment object with nested user
    comment_obj = {
        'id': str(int((event.comments[-1]['id'] if event.comments and 'id' in event.comments[-1] else 0)) + 1) if event.comments else '0',
        'user': {
            'name': name,
            'avatar': avatar,
            'id': clerk_user.clerk_id if clerk_user else None
        },
        'user_id': clerk_user.clerk_id if clerk_user else None,
        'text': comment,
        'date': timezone.now().strftime('%Y-%m-%d'),
        'rating': rating,
    }
    comments = event.comments or []
    comments.append(comment_obj)
    event.comments = comments
    # Optionally update event rating
    if rating is not None:
        ratings = [c.get('rating') for c in comments if c.get('rating') is not None]
        try:
            event.rating = sum(float(r) for r in ratings) / len(ratings)
        except Exception:
            pass
    event.save()
    # Normalize comments for frontend
    def normalize_comment(comment, idx):
        user = comment.get('user')
        if not isinstance(user, dict):
            # Use the best available name with a better fallback than 'Anonymous'
            name = user or comment.get('name') or 'User'
            user = {'name': name, 'avatar': None}
        # Ensure user has an 'id' field for frontend matching
        if 'id' not in user or user['id'] is None:
            user['id'] = comment.get('user_id') or None
        # Add responses array for organizer reply, if present
        responses = []
        if comment.get('reply'):
            responses.append({
                'id': f"resp-{comment.get('id', idx)}",
                'content': comment['reply'],
                'createdAt': comment.get('replyCreatedAt') or '',
                'updatedAt': comment.get('replyUpdatedAt') or comment.get('replyCreatedAt') or '',
                'organizerId': comment.get('organizerId', ''),
                'organizerName': comment.get('organizerName', 'Organizer'),
            })
        return {
            'id': comment.get('id') or str(idx),
            'user': user,
            'text': comment.get('text', ''),
            'date': comment.get('date', ''),
            'rating': comment.get('rating', None),
            'responses': responses,
        }
    normalized = [normalize_comment(c, i) for i, c in enumerate(event.comments)]
    rounded_rating = round(event.rating, 2) if event.rating is not None else 0.0
    return Response({'success': True, 'comments': normalized, 'rating': rounded_rating})

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_event_comment(request, pk, comment_id):
    print("[DEBUG] request.clerk_user:", getattr(request, 'clerk_user', None))
    print("[DEBUG] request.user:", getattr(request, 'user', None))
    event = get_object_or_404(Event, pk=pk)
    user = getattr(request, 'clerk_user', None)
    if not user:
        return Response({'error': 'Authentication required.'}, status=403)
    comments = event.comments or []
    updated = False
    for comment in comments:
        if str(comment.get('id')) == str(comment_id):
            # Only the author can edit (check by Clerk user id)
            comment_user_id = comment.get('user_id') or comment.get('user', {}).get('id')
            clerk_user_id = getattr(user, 'clerk_id', None)
            if not clerk_user_id and isinstance(user, dict):
                clerk_user_id = user.get('clerk_id') or user.get('sub')
            print(f"[DEBUG] Clerk user id from token: {clerk_user_id}")
            print(f"[DEBUG] Comment's user_id: {comment_user_id}")
            print(f"[DEBUG] Match: {clerk_user_id == comment_user_id}")
            if str(comment_user_id) != str(clerk_user_id):
                return Response({'error': 'You can only edit your own comment.'}, status=403)
            comment['text'] = request.data.get('text', comment['text'])
            comment['rating'] = request.data.get('rating', comment.get('rating'))
            comment['date'] = timezone.now().strftime('%Y-%m-%d')
            updated = True
            break
    if not updated:
        return Response({'error': 'Comment not found.'}, status=404)
    event.comments = comments
    event.save()
    return Response({'success': True, 'comments': comments})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_event_comment(request, pk, comment_id):
    event = get_object_or_404(Event, pk=pk)
    user = getattr(request, 'clerk_user', None)
    if not user:
        return Response({'error': 'Authentication required.'}, status=403)
    comments = event.comments or []
    new_comments = []
    deleted = False
    for comment in comments:
        if str(comment.get('id')) == str(comment_id):
            # Only the author can delete (check by Clerk user id)
            comment_user_id = comment.get('user_id') or comment.get('user', {}).get('id')
            clerk_user_id = getattr(user, 'clerk_id', None)
            if not clerk_user_id and isinstance(user, dict):
                clerk_user_id = user.get('clerk_id') or user.get('sub')
            print(f"[DEBUG] Clerk user id from token: {clerk_user_id}")
            print(f"[DEBUG] Comment's user_id: {comment_user_id}")
            print(f"[DEBUG] Match: {clerk_user_id == comment_user_id}")
            if str(comment_user_id) != str(clerk_user_id):
                return Response({'error': 'You can only delete your own comment.'}, status=403)
            deleted = True
            continue
        new_comments.append(comment)
    if not deleted:
        return Response({'error': 'Comment not found.'}, status=404)
    event.comments = new_comments
    event.save()
    return Response({'success': True, 'comments': new_comments})
