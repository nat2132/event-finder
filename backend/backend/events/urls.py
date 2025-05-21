from django.urls import path
from .views import (
    EventListCreateView, EventRetrieveUpdateDestroyView, upload_event_image,
    get_event_comments, post_event_comment, update_event_comment, delete_event_comment,
    update_event_tickets, get_event_attendees, checkin_attendee,
    organizer_reviews, organizer_reply_to_review,
    organizer_dashboard_stats, translate_text,
    ticketmaster_events_proxy,
    recommendations_api
)

urlpatterns = [
    path('external/ticketmaster/events/', ticketmaster_events_proxy, name='ticketmaster-events-proxy'),
    path('translate/', translate_text, name='translate-text'),
    path('organizer/dashboard-stats/', organizer_dashboard_stats, name='organizer-dashboard-stats'),
    path('events/', EventListCreateView.as_view(), name='event-list-create'),
    path('events/<int:pk>/', EventRetrieveUpdateDestroyView.as_view(), name='event-detail'),
    path('events/upload-image/', upload_event_image, name='event-upload-image'),
    path('events/<int:pk>/comments/', get_event_comments, name='event-get-comments'),
    path('events/<int:pk>/comments/add/', post_event_comment, name='event-add-comment'),
    path('events/<int:pk>/comments/<str:comment_id>/', update_event_comment, name='event-update-comment'),
    path('events/<int:pk>/comments/<str:comment_id>/delete/', delete_event_comment, name='event-delete-comment'),
    path('events/<int:pk>/update_tickets/', update_event_tickets, name='event-update-tickets'),
    path('events/<int:pk>/attendees/', get_event_attendees, name='event-attendees'),
    path('tickets/<str:ticket_id>/checkin/', checkin_attendee, name='ticket-checkin'),
    path('organizer/reviews/', organizer_reviews, name='organizer-reviews'),
    path('reviews/<str:comment_id>/reply/', organizer_reply_to_review, name='organizer-reply-to-review'),
    path('recommendations/', recommendations_api, name='recommendations-api'),
]
