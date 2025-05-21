from django.urls import path
from .views import tickets_api

urlpatterns = [
    # Tickets API endpoints
    path('tickets/', tickets_api),
    path('tickets', tickets_api),
]
