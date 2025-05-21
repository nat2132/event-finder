from rest_framework import serializers
from .models import SavedEvent
from events.serializers import EventSerializer

class SavedEventSerializer(serializers.ModelSerializer):
    event_details = EventSerializer(source='event', read_only=True)
    
    class Meta:
        model = SavedEvent
        fields = '__all__'
        read_only_fields = ['user']
