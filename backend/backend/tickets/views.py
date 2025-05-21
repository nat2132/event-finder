from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import qrcode
from io import BytesIO
from django.core.files.base import ContentFile
import uuid

from users.models import ClerkUser
from events.models import Event
from .models import EventTicketType, Ticket
from .serializers import EventTicketTypeSerializer, TicketSerializer
from notifications.models import UserNotification

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tickets_api(request):
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
        # Get all tickets for this user
        tickets = Ticket.objects.filter(user=user).select_related('event', 'ticket_type')
        serializer = TicketSerializer(tickets, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Purchase a new ticket
        event_id = request.data.get('event_id')
        ticket_type_id = request.data.get('ticket_type_id')
        ticket_type_name = request.data.get('ticket_type_name')  # For JSONField-based tickets
        
        if not event_id:
            return Response({'error': 'Event ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not (ticket_type_id or ticket_type_name):
            return Response({'error': 'Either ticket_type_id or ticket_type_name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the event
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create a unique ticket ID
        ticket_id = f"TKT-{uuid.uuid4().hex[:8].upper()}"
        
        # Handle ticket creation based on whether we're using EventTicketType model or JSONField
        if ticket_type_id:
            try:
                ticket_type = EventTicketType.objects.get(pk=ticket_type_id, event=event)
                
                # Check if tickets are still available
                if ticket_type.available <= 0:
                    return Response({'error': 'No tickets available'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Create the ticket
                ticket = Ticket.objects.create(
                    user=user,
                    event=event,
                    ticket_type=ticket_type,
                    ticket_id=ticket_id
                )
                
                # Update available tickets
                ticket_type.available -= 1
                ticket_type.save()
                
            except EventTicketType.DoesNotExist:
                return Response({'error': 'Ticket type not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Handle JSONField-based ticketing
            if not event.ticketTypes:
                return Response({'error': 'No ticket types available'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Find matching ticket type in JSONField
            ticket_found = False
            updated_ticket_types = []
            
            for tt in event.ticketTypes:
                if tt.get('name') == ticket_type_name:
                    # Check availability
                    available = int(tt.get('quantity', 0) or 0)
                    if available <= 0:
                        return Response({'error': 'No tickets available for this type'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Update availability
                    tt['quantity'] = available - 1
                    ticket_found = True
                
                updated_ticket_types.append(tt)
            
            if not ticket_found:
                return Response({'error': f'Ticket type {ticket_type_name} not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Update the event's ticketTypes
            event.ticketTypes = updated_ticket_types
            event.save(update_fields=['ticketTypes'])
            
            # Create the ticket
            ticket = Ticket.objects.create(
                user=user,
                event=event,
                ticket_type_name=ticket_type_name,
                ticket_id=ticket_id
            )
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(f"EVENT: {event.title}\nTICKET: {ticket_id}\nUSER: {user.email}")
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save QR code to ticket
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        
        ticket.qr_code.save(f"{ticket_id}.png", ContentFile(buffer.read()), save=True)
        
        # Update tickets_sold for the event
        event.tickets_sold = Ticket.objects.filter(event=event).count()
        event.save(update_fields=['tickets_sold'])
        
        # Send notification to the event organizer
        if event.organizer:
            ticket_type_display = ticket_type_name if ticket_type_name else (ticket_type.name if hasattr(ticket_type, 'name') else "Standard")
            # Notification for new ticket sale
            UserNotification.objects.create(
                user=event.organizer,
                notification_type=UserNotification.TYPE_NEW_TICKET_SALE,
                message=f"New ticket sold: {ticket_type_display} for '{event.title}'",
                reference_id=str(event.id),
                link=f"/organizer/events/{event.id}"
            )
            
            # Check for sales milestones
            tickets_sold = event.tickets_sold
            
            # Define milestone thresholds (can be customized based on event capacity)
            milestones = [10, 25, 50, 100, 250, 500, 1000]
            
            # Check if we've hit a milestone
            for milestone in milestones:
                if tickets_sold == milestone:
                    UserNotification.objects.create(
                        user=event.organizer,
                        notification_type=UserNotification.TYPE_SALES_MILESTONE,
                        message=f"Milestone reached: {milestone} tickets sold for '{event.title}'!",
                        reference_id=str(event.id),
                        link=f"/organizer/events/{event.id}"
                    )
                    break
        
        # Return the ticket data
        serializer = TicketSerializer(ticket)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
