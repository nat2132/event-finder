from django.urls import path
from .views import saved_events_api, unsave_event_api

urlpatterns = [
    # Saved events API endpoints
    path('saved-events/', saved_events_api),
    path('saved-events/<str:event_id>/', unsave_event_api),
]
