import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategorySelector } from "@/components/user/category-selector"
import { fetchSkiddleCategories, fetchTicketmasterCategories } from "@/api/external-categories";
import { EventCard } from "@/components/user/event-cards"
import { LocationSelector } from "@/components/user/location-selector"
import { DashboardShell } from "@/components/user/dashboard-shell"
import { useEffect, useState, useMemo } from "react";
import { fetchEvents } from "../organizer/event-api";
import type { Event as EventType, Comment as ApiComment } from "../organizer/event-api";
import { fetchTicketmasterEvents, fetchSkiddleEvents } from "@/api/external-events-api";
import type { ExternalEventCard } from "@/api/external-events-api";
import DiscoverRecommendations from "./discover-recommendations";
import { useUser, useAuth } from "@clerk/clerk-react";
import { fetchSavedEvents } from "@/api/saved-events";
import { T, useTranslation } from "@/context/translation";
import { BlurFade } from "@/components/ui/blur-fade";
import type { Comment as UIComment } from "@/components/user/comment-carousel";

// Helper function to normalize comments for UI
function normalizeComments(comments: ApiComment[] | undefined): UIComment[] {
  if (!comments || !Array.isArray(comments)) return [];
  
  return comments.map(comment => ({
    id: comment.id || `comment-${Math.random().toString(36).substring(2, 9)}`,
    rating: typeof comment.rating === 'number' ? comment.rating : 0, // Ensure rating is a number
    text: comment.text || '',
    date: comment.date || new Date().toISOString(),
    user: {
      id: comment.user?.id || undefined,
      name: comment.user?.name || 'User',
      avatar: comment.user?.avatar || undefined
    }
  }));
}

export default function DiscoverPage() {
  const [skiddleCategories, setSkiddleCategories] = useState<{id: string, name: string}[]>([]);
  const [ticketmasterCategories, setTicketmasterCategories] = useState<{id: string, name: string}[]>([]);
  const { getToken } = useAuth();
  const { language, translate } = useTranslation();

  const rawPlaceholders = ["Search events...", "Try 'Addis Ababa'", "Concerts this weekend"];
  const [translatedPlaceholders, setTranslatedPlaceholders] = useState<string[]>(rawPlaceholders);

  useEffect(() => {
    const translatePlaceholders = async () => {
      const translated = await Promise.all(
        rawPlaceholders.map(p => translate(p))
      );
      setTranslatedPlaceholders(translated);
    };
    translatePlaceholders();
  }, [language, translate]);

  useEffect(() => {
    const ticketmasterKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    fetchSkiddleCategories().then(setSkiddleCategories).catch(() => setSkiddleCategories([]));
    if (ticketmasterKey) {
      fetchTicketmasterCategories().then(setTicketmasterCategories).catch(() => setTicketmasterCategories([]));
    }
  }, []);
  const [events, setEvents] = useState<EventType[]>([]);
  const [externalEvents, setExternalEvents] = useState<ExternalEventCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [error, setError] = useState(false);
  const [errorExternal, setErrorExternal] = useState(false);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);

  // Fetch saved event IDs for logged-in user
  useEffect(() => {
    async function fetchSaved() {
      try {
        const token = await getToken();
        if (token) {
          const saved = await fetchSavedEvents(token);
          setSavedEventIds(saved.map(se => se.event.id));
        } else {
          setSavedEventIds([]);
        }
      } catch {
        setSavedEventIds([]);
      }
    }
    fetchSaved();
    // Optionally: re-fetch when user changes
  }, [getToken]);
  // Fetch internal events
  useEffect(() => {
    async function fetchInternalEvents() {
      try {
    setLoading(true);
        const token = await getToken();
        if (!token) {
          setError(true);
          setLoading(false);
          return;
        }

        const response = await fetchEvents(token, true);
        // Handle paginated response
        const eventsData = response.results || response;
        // Add default values for missing properties required by EventCard
        const extended = eventsData.map((event: EventType) => {
          // Format date correctly for internal events
          const formattedDate = event.date && event.time 
            ? `${event.date} at ${event.time}` 
            : event.start_time 
              ? new Date(event.start_time).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : "Date not available";

          // Ensure creator information is available and properly formatted
          const creator = event.creator && event.creator.name
            ? event.creator 
            : {
                name: event.organizer_name || "Event Organizer",
                avatar: event.organizer_image || "/placeholder.svg"
            };

          return {
            ...event,
            date: formattedDate, // Properly formatted date string
            creator: creator, // Properly formatted creator object
            saved: typeof event.saved === 'boolean' ? event.saved : false,
            rating: typeof event.rating === 'number' ? event.rating : 0,
            comments: Array.isArray(event.comments) ? event.comments : [],
          };
        });
        setEvents(extended);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    
    fetchInternalEvents();
  }, [getToken]);

  // Fetch external events
  useEffect(() => {
    setLoadingExternal(true);
    async function fetchExternal() {
      try {
        // Find selected category name for Ticketmaster
        const selectedCategoryName =
          ticketmasterCategories.find(cat => cat.id === category)?.name || "";
        const [tm, sk] = await Promise.all([
          fetchTicketmasterEvents(search, location, selectedCategoryName),
          fetchSkiddleEvents(search, location, category),
        ]);
        setExternalEvents([...tm, ...sk]);
        setErrorExternal(false);
      } catch {
        setExternalEvents([]);
        setErrorExternal(true);
      } finally {
        setLoadingExternal(false);
      }
    }
    fetchExternal();
  }, [search, location, category, ticketmasterCategories]);

  // Filter events
  const filteredInternal = events.filter(event => {
    const matchesSearch = search === "" || 
      event.title.toLowerCase().includes(search.toLowerCase()) || 
      event.description.toLowerCase().includes(search.toLowerCase()) ||
      event.category.toLowerCase().includes(search.toLowerCase()) ||
      event.location.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = location === "" || event.location === location;
    // For internal events, match by category name (if available)
    const selectedCategoryName = skiddleCategories.concat(ticketmasterCategories).find(cat => cat.id === category)?.name || "";
    const matchesCategory = category === "" || event.category === selectedCategoryName;
    return matchesSearch && matchesLocation && matchesCategory;
  });

  const filteredExternal = externalEvents.filter(event => {
    const matchesSearch = search === "" || 
      event.title.toLowerCase().includes(search.toLowerCase()) || 
      event.description.toLowerCase().includes(search.toLowerCase()) ||
      event.category.toLowerCase().includes(search.toLowerCase()) ||
      event.location.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = location === "" || event.location === location;
    // For external events, match by category name
    const selectedCategoryName = skiddleCategories.concat(ticketmasterCategories).find(cat => cat.id === category)?.name || "";
    const matchesCategory = category === "" || event.category === selectedCategoryName;
    return matchesSearch && matchesLocation && matchesCategory;
  });

  // Memoize for fast lookup
  const savedIdSet = useMemo(() => new Set(savedEventIds), [savedEventIds]);

  // Mark saved status for all event lists
  const filteredInternalWithSaved = filteredInternal.map(event => ({ ...event, saved: savedIdSet.has(event.id) }));
  const filteredExternalWithSaved = filteredExternal.map(event => ({ ...event, saved: savedIdSet.has(event.id) }));
  const allEvents = [...filteredInternalWithSaved, ...filteredExternalWithSaved];

  const [activeTab, setActiveTab] = useState("all");
  const [visibleCounts, setVisibleCounts] = useState({
    recommended: 6,
    all: 6,
    ongoing: 6,
    upcoming: 6,
    past: 6,
    today: 6,
    fromUs: 6,
    month: 6,
  });
  type TabKeys = keyof typeof visibleCounts;

  const handleLoadMore = (tab: TabKeys) => {
    setVisibleCounts(prev => ({ ...prev, [tab]: prev[tab] + 6 }));
  }

  const { user } = useUser();

  const welcomeMessage = "Welcome back!";

  return (
    <DashboardShell>
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold text-primary">
              {user?.firstName ? (
                <>
                  <T>Welcome back,</T>{' '}
                  <span className="bg-gradient-to-r from-slate-600 via-slate-500 to-slate-400 bg-clip-text text-transparent">
                    {user.firstName}
                  </span>!
                </>
              ) : (
              <T>{welcomeMessage}</T>
              )}
            </h2>
          </div>
          <div className="grid gap-4">
            <Card >
              <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                  <CardTitle><T>Find events</T></CardTitle>
                  <CardDescription><T>Search for events by location, category, or keyword</T></CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative flex-1">
                    <PlaceholdersAndVanishInput
                      placeholders={translatedPlaceholders}
                      onChange={e => setSearch(e.target.value)}
                      onSubmit={() => { /* Implement if needed for direct form submission */ }}
                    />
                  </div>
                  <LocationSelector
                    value={location}
                    onChange={setLocation}
                    locations={Array.from(
                      new Map(
                        [...events, ...externalEvents]
                          .filter(e => e.location && e.location.trim() !== "")
                          .map(e => [e.location.trim().toLowerCase(), { value: e.location.trim(), label: e.location.trim() }])
                      ).values()
                    )}
                  />
                  <CategorySelector
                    value={category}
                    onChange={setCategory}
                    internalCategories={Array.from(new Set(events.map(event => event.category)))
                      .filter(Boolean)
                      .map(cat => ({ id: cat, name: cat }))}
                    skiddleCategories={skiddleCategories}
                    ticketmasterCategories={ticketmasterCategories}
                  />
                </div>
              </CardContent>
            </Card>
            <Tabs defaultValue="recommended" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all"><T>All Events</T></TabsTrigger>
                <TabsTrigger value="recommended"><T>For You</T></TabsTrigger>
                <TabsTrigger value="fromUs"><T>From Us</T></TabsTrigger>
                <TabsTrigger value="ongoing"><T>Ongoing Events</T></TabsTrigger>
                <TabsTrigger value="upcoming"><T>Upcoming</T></TabsTrigger>
                <TabsTrigger value="past"><T>Past Events</T></TabsTrigger>
                <TabsTrigger value="today"><T>Today</T></TabsTrigger>
                <TabsTrigger value="month"><T>This Month</T></TabsTrigger>
              </TabsList>
              <TabsContent value="recommended" className="space-y-4">
                <DiscoverRecommendations internalEvents={filteredInternalWithSaved} externalEvents={filteredExternalWithSaved} />
              </TabsContent>
              <TabsContent value="all" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {loading || loadingExternal ? (
                    <div>Loading events...</div>
                  ) : (error && errorExternal) ? (
                    <div className="text-red-500">Failed to load events.</div>
                  ) : allEvents.length === 0 ? (
                    <div className="col-span-3 w-full flex flex-col items-center">
                      <div className="text-center mb-4">
                        <T>No events found.</T>
                      </div>
                      <div className="w-full max-w-2xl rounded-lg overflow-hidden shadow-lg">
                        <video 
                          className="w-full h-auto" 
                          autoPlay 
                          loop 
                          muted
                          playsInline
                        >
                          <source src="/bath.mp4" type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                        <div className="p-4 bg-background">
                          <p className="text-lg font-medium">
                            <T>No events match your search criteria</T>
                          </p>
                          <p className="text-muted-foreground">
                            <T>Try adjusting your filters or check back later for new events</T>
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    allEvents.slice(0, visibleCounts.all).map((event, index) => (
                      <BlurFade
                        key={event.id}
                        delay={index * 0.1}
                        direction="up"
                        className="w-full"
                      >
                        {'source' in event ? (
                        <EventCard
                          id={event.id}
                          title={event.title}
                          description={event.description}
                          category={event.category}
                          date={event.date}
                          location={event.location}
                          image={event.image ?? ""}
                          creator={event.creator && event.creator.name ? event.creator : { name: "Event Organizer" }}
                          saved={typeof event.saved === 'boolean' ? event.saved : false}
                          rating={typeof event.rating === 'number' ? event.rating : 0}
                          comments={normalizeComments(event.comments)}
                          source={"source" in event ? event.source : undefined}
                        />
                      ) : (
                        <EventCard
                          id={event.id}
                          title={event.title}
                          description={event.description}
                          category={event.category}
                          date={event.date}
                          location={event.location}
                          image={event.image ?? ""}
                          creator={event.creator && event.creator.name ? event.creator : { name: "Event Organizer" }}
                          saved={typeof event.saved === 'boolean' ? event.saved : false}
                          rating={typeof event.rating === 'number' ? event.rating : 0}
                          comments={normalizeComments(event.comments)}
                        />
                        )}
                      </BlurFade>
                    ))
                  )}
                </div>
                {allEvents.length > visibleCounts.all && (
                  <Button variant="outline" className="w-full " onClick={() => handleLoadMore('all')}>
                    <T>Load More</T>
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="ongoing" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allEvents.filter(event => {
                    const now = new Date();
                    const eventDate = event.date ? new Date(event.date) : undefined;
                    const startDate = event.startDate ? new Date(event.startDate) : eventDate;
                    const endDate = event.endDate ? new Date(event.endDate) : eventDate;

                    if (startDate && endDate) {
                      const endOfDayAwareEndDate = new Date(endDate);
                      if (startDate.getTime() === endDate.getTime()) {
                        endOfDayAwareEndDate.setHours(23, 59, 59, 999);
                      }
                      return startDate <= now && now <= endOfDayAwareEndDate;
                    }
                    if (eventDate) {
                      return (
                        eventDate.getFullYear() === now.getFullYear() &&
                        eventDate.getMonth() === now.getMonth() &&
                        eventDate.getDate() === now.getDate()
                      );
                    }
                    return false;
                  }).slice(0, visibleCounts.ongoing).map((event, index) => (
                    <BlurFade
                      key={event.id}
                      delay={index * 0.1}
                      direction="up"
                      className="w-full"
                    >
                      <EventCard
                      id={event.id}
                      title={event.title}
                      description={event.description}
                      category={event.category}
                      date={event.date}
                      location={event.location}
                      image={event.image ?? ""}
                      creator={event.creator && event.creator.name ? event.creator : { name: "Event Organizer" }}
                      saved={typeof event.saved === 'boolean' ? event.saved : false}
                      rating={typeof event.rating === 'number' ? event.rating : 0}
                      comments={normalizeComments(event.comments)}
                      source={"source" in event ? event.source : undefined}
                    />
                    </BlurFade>
                  ))}
                </div>
                {allEvents.filter(event => {
                  const now = new Date();
                  const eventDate = event.date ? new Date(event.date) : undefined;
                  const startDate = event.startDate ? new Date(event.startDate) : eventDate;
                  const endDate = event.endDate ? new Date(event.endDate) : eventDate;

                  if (startDate && endDate) {
                    const endOfDayAwareEndDate = new Date(endDate);
                    if (startDate.getTime() === endDate.getTime()) {
                      endOfDayAwareEndDate.setHours(23, 59, 59, 999);
                    }
                    return startDate <= now && now <= endOfDayAwareEndDate;
                  }
                  if (eventDate) {
                    return (
                      eventDate.getFullYear() === now.getFullYear() &&
                      eventDate.getMonth() === now.getMonth() &&
                      eventDate.getDate() === now.getDate()
                    );
                  }
                  return false;
                }).length > visibleCounts.ongoing && (
                  <Button variant="outline" className="w-full " onClick={() => handleLoadMore('ongoing')}>
                    <T>Load More</T>
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="upcoming" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allEvents.filter(event => {
                    const now = new Date();
                    const start = event.startDate ? new Date(event.startDate) : event.date ? new Date(event.date) : undefined;
                    return start && start > now;
                  }).slice(0, visibleCounts.upcoming).map((event, index) => (
                    <BlurFade
                      key={event.id}
                      delay={index * 0.1}
                      direction="up"
                      className="w-full"
                    >
                      <EventCard
                      id={event.id}
                      title={event.title}
                      description={event.description}
                      category={event.category}
                      date={event.date}
                      location={event.location}
                      image={event.image ?? ""}
                      creator={event.creator && event.creator.name ? event.creator : { name: "Event Organizer" }}
                      saved={typeof event.saved === 'boolean' ? event.saved : false}
                      rating={typeof event.rating === 'number' ? event.rating : 0}
                      comments={normalizeComments(event.comments)}
                      source={"source" in event ? event.source : undefined}
                    />
                    </BlurFade>
                  ))}
                </div>
                {allEvents.filter(event => {
                  const now = new Date();
                  const start = event.startDate ? new Date(event.startDate) : event.date ? new Date(event.date) : undefined;
                  return start && start > now;
                }).length > visibleCounts.upcoming && (
                  <Button variant="outline" className="w-full " onClick={() => handleLoadMore('upcoming')}>
                    <T>Load More</T>
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="past" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allEvents.filter(event => {
                    const now = new Date();
                    const end = event.endDate ? new Date(event.endDate) : event.date ? new Date(event.date) : undefined;
                    return end && end < now;
                  }).slice(0, visibleCounts.past).map((event, index) => (
                    <BlurFade
                      key={event.id}
                      delay={index * 0.1}
                      direction="up"
                      className="w-full"
                    >
                      <EventCard
                      id={event.id}
                      title={event.title}
                      description={event.description}
                      category={event.category}
                      date={event.date}
                      location={event.location}
                      image={event.image ?? ""}
                      creator={event.creator && event.creator.name ? event.creator : { name: "Event Organizer" }}
                      saved={typeof event.saved === 'boolean' ? event.saved : false}
                      rating={typeof event.rating === 'number' ? event.rating : 0}
                      comments={normalizeComments(event.comments)}
                      source={"source" in event ? event.source : undefined}
                    />
                    </BlurFade>
                  ))}
                </div>
                {allEvents.filter(event => {
                  const now = new Date();
                  const end = event.endDate ? new Date(event.endDate) : event.date ? new Date(event.date) : undefined;
                  return end && end < now;
                }).length > visibleCounts.past && (
                  <Button variant="outline" className="w-full" onClick={() => handleLoadMore('past')}>
                    <T>Load More</T>
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="today" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allEvents.filter(event => {
                    const eventDate = event.date ? new Date(event.date) : undefined;
                    if (!eventDate) return false;
                    const now = new Date();
                    return eventDate.getFullYear() === now.getFullYear() &&
                      eventDate.getMonth() === now.getMonth() &&
                      eventDate.getDate() === now.getDate();
                  }).slice(0, visibleCounts.today).map((event, index) => (
                    <BlurFade
                      key={event.id}
                      delay={index * 0.1}
                      direction="up"
                      className="w-full"
                    >
                      <EventCard
                      id={event.id}
                      title={event.title}
                      description={event.description}
                      category={event.category}
                      date={event.date}
                      location={event.location}
                      image={event.image ?? ""}
                      creator={event.creator && event.creator.name ? event.creator : { name: "Event Organizer" }}
                      saved={typeof event.saved === 'boolean' ? event.saved : false}
                      rating={typeof event.rating === 'number' ? event.rating : 0}
                      comments={normalizeComments(event.comments)}
                      source={"source" in event ? event.source : undefined}
                    />
                    </BlurFade>
                  ))}
                </div>
                {allEvents.filter(event => {
                  const eventDate = event.date ? new Date(event.date) : undefined;
                  if (!eventDate) return false;
                  const now = new Date();
                  return eventDate.getFullYear() === now.getFullYear() &&
                    eventDate.getMonth() === now.getMonth() &&
                    eventDate.getDate() === now.getDate();
                }).length > visibleCounts.today && (
                  <Button variant="outline" className="w-full" onClick={() => handleLoadMore('today')}>
                    Load More
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="fromUs" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredInternalWithSaved.slice(0, visibleCounts.fromUs).map((event, index) => (
                    <BlurFade
                      key={event.id}
                      delay={index * 0.1}
                      direction="up"
                      className="w-full"
                    >
                      <EventCard
                      id={event.id}
                      title={event.title}
                      description={event.description}
                      category={event.category}
                      date={event.date}
                      location={event.location}
                      image={event.image ?? ""}
                      creator={event.creator && event.creator.name ? event.creator : { name: "Event Organizer" }}
                      saved={typeof event.saved === 'boolean' ? event.saved : false}
                      rating={typeof event.rating === 'number' ? event.rating : 0}
                      comments={normalizeComments(event.comments)}
                    />
                    </BlurFade>
                  ))}
                </div>
                {filteredInternalWithSaved.length > visibleCounts.fromUs && (
                  <Button variant="outline" className="w-full" onClick={() => handleLoadMore('fromUs')}>
                    <T>Load More</T>
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="month" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allEvents.filter(event => {
                    const eventDate = event.date ? new Date(event.date) : undefined;
                    if (!eventDate) return false;
                    const now = new Date();
                    return eventDate.getFullYear() === now.getFullYear() &&
                      eventDate.getMonth() === now.getMonth();
                  }).slice(0, visibleCounts.month).map((event, index) => (
                    <BlurFade
                      key={event.id}
                      delay={index * 0.1}
                      direction="up"
                      className="w-full"
                    >
                      <EventCard
                      id={event.id}
                      title={event.title}
                      description={event.description}
                      category={event.category}
                      date={event.date}
                      location={event.location}
                      image={event.image ?? ""}
                      creator={event.creator && event.creator.name ? event.creator : { name: "Event Organizer" }}
                      saved={typeof event.saved === 'boolean' ? event.saved : false}
                      rating={typeof event.rating === 'number' ? event.rating : 0}
                      comments={normalizeComments(event.comments)}
                      source={"source" in event ? event.source : undefined}
                    />
                    </BlurFade>
                  ))}
                </div>
                {allEvents.filter(event => {
                  const eventDate = event.date ? new Date(event.date) : undefined;
                  if (!eventDate) return false;
                  const now = new Date();
                  return eventDate.getFullYear() === now.getFullYear() &&
                    eventDate.getMonth() === now.getMonth();
                }).length > visibleCounts.month && (
                  <Button variant="outline" className="w-full" onClick={() => handleLoadMore('month')}>
                    <T>Load More</T>
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
