from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CalendarEventViewSet

router = DefaultRouter()
router.register(r'calendar-events', CalendarEventViewSet, basename='calendar-event')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
]
