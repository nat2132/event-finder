import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EventCard } from "@/components/user/event-cards"
import { DashboardShell } from "@/components/user/dashboard-shell"
import { fetchSavedEvents } from "@/api/saved-events"
import { useAuth } from "@clerk/clerk-react"

// Define a type for event data to avoid 'any'
interface EventData {
  id: string;
  title: string;
  description: string;
  image?: string;
  date: string;
  location: string;
  category: string;
  creator?: { name?: string; avatar?: string };
  organizer_name?: string;
  organizer_avatar?: string;
  rating?: number;
  comments?: Array<Comment>;
  source?: string;
}

// Define a type for comment data
interface Comment {
  id: string;
  user: string;
  text: string;
  date?: string;
  rating?: number;
}

export default function SavedPage() {
  const [savedEvents, setSavedEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getToken } = useAuth()

  useEffect(() => {
    getToken().then(token => {
      if (!token || token.split('.').length !== 3) {
        setError("You are not logged in or your session has expired.")
        setLoading(false)
        return
      }
      fetchSavedEvents(token)
        .then(data => {
          setSavedEvents(data)
          setLoading(false)
        })
        .catch(() => {
          setError("Failed to load saved events.")
          setLoading(false)
        })
    })
  }, [getToken])

  function isUpcoming(eventDate: string) {
    return new Date(eventDate) > new Date()
  }
  function isPast(eventDate: string) {
    return new Date(eventDate) < new Date()
  }

  function getEventData(se: any) {
    if (!se) return null;
    
    // If we have external_event_id but no data, create a minimal event object
    if (se.external_event_id && !se.external_event_data) {
      return {
        id: se.external_event_id,
        title: `Event from ${se.source || 'External Source'}`,
        description: "Details unavailable",
        date: new Date().toISOString(),
        location: "Location information unavailable",
        category: "External Event",
        source: se.source
      };
    }
    
    if (se.external_event_id && se.external_event_data) {
      return { ...se.external_event_data, id: se.external_event_id, source: se.external_event_data.source };
    }
    return se.event_details || se.event || null;
  }

  const allCards = savedEvents
    .map(se => {
      const event = getEventData(se);
      if (!event) return null;
      
      return (
        <EventCard
          key={event.id}
          id={event.id}
          title={event.title}
          description={event.description}
          image={event.image}
          date={event.date}
          location={event.location}
          category={event.category}
          saved={true}
          creator={{ name: event.creator?.name || event.organizer_name || "Event Organizer", avatar: event.creator?.avatar || event.organizer_avatar }}
          rating={event.rating || 0}
          comments={event.comments || []}
          source={event.source}
        />
      );
    })
    .filter(Boolean); // filter out null values
    
  const upcomingCards = savedEvents
    .map(se => getEventData(se))
    .filter(event => event && event.date && isUpcoming(event.date))
    .map(event => (
      <EventCard
        key={event.id}
        id={event.id}
        title={event.title}
        description={event.description}
        image={event.image}
        date={event.date}
        location={event.location}
        category={event.category}
        saved={true}
        creator={{ name: event.creator?.name || event.organizer_name || "Event Organizer", avatar: event.creator?.avatar || event.organizer_avatar }}
        rating={event.rating || 0}
        comments={event.comments || []}
        source={event.source}
      />
    ));
    
  const pastCards = savedEvents
    .map(se => getEventData(se))
    .filter(event => event && event.date && isPast(event.date))
    .map(event => (
      <EventCard
        key={event.id}
        id={event.id}
        title={event.title}
        description={event.description}
        image={event.image}
        date={event.date}
        location={event.location}
        category={event.category}
        saved={true}
        creator={{ name: event.creator?.name || event.organizer_name || "Event Organizer", avatar: event.creator?.avatar || event.organizer_avatar }}
        rating={event.rating || 0}
        comments={event.comments || []}
        source={event.source}
      />
    ));

  return (
    <DashboardShell>
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Saved Events</h2>
          </div>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Saved</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              {loading ? (
                <div>Loading...</div>
              ) : error ? (
                <div className="text-red-500">{error}</div>
              ) : allCards.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center space-y-4">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full max-w-[350px]"
                  >
                    <source src="/window.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-muted-foreground text-center">No saved events yet. Start exploring and save your favorite events!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{allCards}</div>
              )}
            </TabsContent>
            <TabsContent value="upcoming" className="space-y-4">
              {loading ? (
                <div>Loading...</div>
              ) : error ? (
                <div className="text-red-500">{error}</div>
              ) : upcomingCards.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center space-y-4">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full max-w-[350px]"
                  >
                    <source src="/window.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-muted-foreground text-center">No upcoming saved events. Discover new events to look forward to!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{upcomingCards}</div>
              )}
            </TabsContent>
            <TabsContent value="past" className="space-y-4">
              {loading ? (
                <div>Loading...</div>
              ) : error ? (
                <div className="text-red-500">{error}</div>
              ) : pastCards.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center space-y-4">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full max-w-[350px]"
                  >
                    <source src="/window.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-muted-foreground text-center">No past saved events. Save events to keep track of your memories!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{pastCards}</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardShell>
  )
}