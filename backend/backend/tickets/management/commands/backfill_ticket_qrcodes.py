from django.core.management.base import BaseCommand
from tickets.models import Ticket
import qrcode
from django.core.files.base import ContentFile
from io import BytesIO

class Command(BaseCommand):
    help = 'Backfill QR codes for all tickets that are missing them.'

    def handle(self, *args, **options):
        count = 0
        for ticket in Ticket.objects.all():
            if not ticket.qr_code:
                qr = qrcode.make(ticket.ticket_id)
                buffer = BytesIO()
                qr.save(buffer, format='PNG')
                ticket.qr_code.save(f"{ticket.ticket_id}.png", ContentFile(buffer.getvalue()), save=True)
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Backfilled QR codes for {count} tickets."))
