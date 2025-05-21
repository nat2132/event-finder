import { Badge } from "@/components/ui/badge"

// Define the expected prop type based on AnalyticsPage
interface TopEvent {
  id: number;
  title: string;
  attendees: number;
  organizer_name?: string;
}

interface TopEventsTableProps {
  events: TopEvent[];
}

// Sample data removed

export function TopEventsTable({ events }: TopEventsTableProps) {
  // Handle empty or undefined events prop
  if (!events || events.length === 0) {
    return <div className="text-center text-muted-foreground">No event data available.</div>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{event.title}</div>
              <div className="flex items-center gap-2">
                {/* Display organizer name if available */}
                {event.organizer_name && <Badge variant="secondary">{event.organizer_name}</Badge>}
                <span className="text-sm text-muted-foreground">{event.attendees?.toLocaleString() ?? 0} attendees</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
