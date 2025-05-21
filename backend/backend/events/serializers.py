from rest_framework import serializers
from .models import Event
from tickets.models import Ticket
from users.models import ClerkUser

class EventSerializer(serializers.ModelSerializer):
    image = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    ticketsSold = serializers.SerializerMethodField()
    totalTickets = serializers.SerializerMethodField()

    @staticmethod
    def sync_ticket_types(event):
        """
        Ensure each ticket type in event.ticketTypes has correct price, sold, total, and available values.
        Also calculates and updates revenue for each ticket type.
        """
        from tickets.models import Ticket
        ticket_types = event.ticketTypes or []
        updated_types = []
        for tt in ticket_types:
            name = tt.get('name')
            # Ensure price is a float
            try:
                price = float(tt.get('price', 0) or 0)
            except Exception:
                price = 0
            # Count sold tickets for this type
            sold = Ticket.objects.filter(event=event, ticket_type_name=name).count()
            quantity = int(tt.get('quantity', 0) or 0)
            total = sold + quantity  # total ever made available for this ticket type
            available = quantity    # tickets remaining for sale
            revenue = sold * price  # calculate revenue for this ticket type
            tt['price'] = price
            tt['sold'] = sold
            tt['total'] = total
            tt['available'] = available
            tt['revenue'] = revenue  # add revenue to ticket type data
            updated_types.append(tt)
        event.ticketTypes = updated_types
        event.save(update_fields=['ticketTypes'])

    def create(self, validated_data):
        request = self.context.get('request', None)
        # Pop gallery_images and image from validated_data, defaulting to None or []
        image_url = validated_data.pop('image', None)
        print("DEBUG: validated_data before create:", validated_data)
        # Create event with remaining fields
        event = super().create(validated_data)
        # Assign image URL directly
        if image_url:
            event.image = image_url
        event.save()

        # --- Robust organizer info assignment ---
        organizer_name = None
        organizer_image = None
        from users.models import ClerkUser
        user = None
        if request:
            # Prefer request.clerk_user if present, else request.user
            if hasattr(request, 'clerk_user') and getattr(request, 'clerk_user', None):
                clerk_claims = getattr(request, 'clerk_user')
                print("DEBUG: Using request.clerk_user for organizer info")
                # If it's a dict (JWT claims), look up the ClerkUser instance
                if isinstance(clerk_claims, dict) and 'sub' in clerk_claims:
                    try:
                        user = ClerkUser.objects.get(clerk_id=clerk_claims['sub'])
                        print(f"DEBUG: Found ClerkUser with clerk_id {clerk_claims['sub']}")
                    except ClerkUser.DoesNotExist:
                        print(f"WARNING: ClerkUser with clerk_id {clerk_claims['sub']} not found.")
                        user = None
            else:
                user = getattr(request, 'user', None)
                print("DEBUG: Using request.user for organizer info")
        
        # Try to get organizer information from the user
        if user:
            # Get organizer name
            if hasattr(user, 'full_name') and user.full_name:
                organizer_name = user.full_name
            elif hasattr(user, 'username') and user.username:
                organizer_name = user.username
            
            # Get organizer image
            if hasattr(user, 'profile_image') and user.profile_image:
             try:
                organizer_image = user.profile_image.url
                # Ensure absolute URL with https://127.0.0.1:8000/
                if organizer_image and not organizer_image.startswith(('http://', 'https://')):
                    organizer_image = f'https://127.0.0.1:8000{organizer_image}'
                elif organizer_image and organizer_image.startswith('http://127.0.0.1:8000'):
                    organizer_image = organizer_image.replace('http://127.0.0.1:8000', 'https://127.0.0.1:8000')
             except Exception:
                organizer_image = None
            
        # Set ForeignKey if possible
            if hasattr(event, 'organizer_id') and hasattr(user, 'id'):
             event.organizer = user
                
        # Fallback to payload or previous values
        if not organizer_name:
            organizer_name = validated_data.get('organizer_name') or getattr(event, 'organizer_name', 'Event Organizer')
        if not organizer_image:
            organizer_image = validated_data.get('organizer_image') or getattr(event, 'organizer_image', '/placeholder.svg')
            
        # Save organizer information
        event.organizer_name = organizer_name
        event.organizer_image = organizer_image
        event.save()

        # --- Sync ticketTypes with correct price and sold values ---
        self.sync_ticket_types(event)

        return event

    def update(self, instance, validated_data):
        image = validated_data.get('image', None)
        event = super().update(instance, validated_data)
        if image is not None:
            event.image = image
        event.save()
        # --- Sync ticketTypes with correct price and sold values ---
        self.sync_ticket_types(event)
        return event

    customCategory = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # Organizer fields
    organizer_name = serializers.SerializerMethodField(read_only=True)
    organizer_image = serializers.SerializerMethodField(read_only=True)
    creator = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Event
        fields = '__all__'
        extra_fields = ['customCategory', 'organizer_name', 'organizer_image', 'creator', 'ticketsSold', 'totalTickets']

    def get_organizer_name(self, obj):
        # Prefer organizer's full name, fallback to event.organizer_name, else default
        try:
            if obj.organizer_id and obj.organizer and hasattr(obj.organizer, 'full_name') and obj.organizer.full_name:
                return obj.organizer.full_name
        except (AttributeError, ClerkUser.DoesNotExist):
            pass
            
        # Use organizer_name if available
        if getattr(obj, 'organizer_name', None):
            return obj.organizer_name
            
        # Fallback to default
        return "Event Organizer"

    def get_organizer_image(self, obj):
        # Prefer organizer's profile image, fallback to event.organizer_image, else default
        try:
            if obj.organizer_id and obj.organizer and hasattr(obj.organizer, 'profile_image') and obj.organizer.profile_image:
                try:
                    image_url = obj.organizer.profile_image.url
                    # Ensure it's an absolute URL
                    if image_url and not image_url.startswith(('http://', 'https://')):
                        image_url = f'https://127.0.0.1:8000{image_url}'
                    return image_url
                except Exception:
                    pass
        except (AttributeError, ClerkUser.DoesNotExist):
            pass
            
        # Use organizer_image if available
        if getattr(obj, 'organizer_image', None):
            return obj.organizer_image
            
        # Fallback to default
        return "/placeholder.svg"

    def get_creator(self, obj):
        return {
            "name": self.get_organizer_name(obj),
            "avatar": self.get_organizer_image(obj)
        }

    def get_ticketsSold(self, obj):
        # Count all tickets for this event
        return Ticket.objects.filter(event=obj).count()

    def get_totalTickets(self, obj):
        # Sum all ticketType quantities from the JSONField
        ticket_types = getattr(obj, 'ticketTypes', []) or []
        total = 0
        for tt in ticket_types:
            try:
                total += int(tt.get('quantity', 0)) + int(tt.get('sold', 0) or 0)
            except Exception:
                continue
        return total

    def validate(self, attrs):
        print("DEBUG: attrs in validate:", attrs)
        category = attrs.get('category')
        custom_category = attrs.get('customCategory')
        if category == 'other' and custom_category:
            attrs['category'] = custom_category
        return attrs

from rest_framework import serializers

class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()

