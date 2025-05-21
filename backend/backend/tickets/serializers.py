from rest_framework import serializers
from .models import EventTicketType, Ticket
from events.serializers import EventSerializer

class EventTicketTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventTicketType
        fields = '__all__'

class TicketSerializer(serializers.ModelSerializer):
    event_details = EventSerializer(source='event', read_only=True)
    ticket_type_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = ['user', 'qr_code']
    
    def get_ticket_type_details(self, obj):
        if obj.ticket_type:
            return {
                'id': obj.ticket_type.id,
                'type': obj.ticket_type.type,
                'price': str(obj.ticket_type.price)
            }
        elif obj.ticket_type_name:
            return {
                'type': obj.ticket_type_name
            }
        return None
