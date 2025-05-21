from django.core.management.base import BaseCommand
from events.models import Event
from tickets.models import EventTicketType

class Command(BaseCommand):
    help = 'Syncs ticketTypes JSON from Event to EventTicketType relational table for all events.'

    def handle(self, *args, **options):
        count_created = 0
        count_updated = 0
        for event in Event.objects.all():
            ticket_types = getattr(event, 'ticketTypes', []) or []
            for tt in ticket_types:
                if not tt.get('name'):
                    continue
                ett, created = EventTicketType.objects.update_or_create(
                    event_id=event.id,
                    type=tt['name'],
                    defaults={
                        'price': tt.get('price', 0),
                        'available': tt.get('available', 0),
                    }
                )
                if created:
                    count_created += 1
                else:
                    count_updated += 1
        self.stdout.write(self.style.SUCCESS(f"Created {count_created} and updated {count_updated} EventTicketType objects."))
