import { useState, useEffect } from "react"
import { Plus, ChevronLeft, ChevronRight, Bell } from "lucide-react"
import { addDays, addMonths, addWeeks, format, subDays, subMonths, subWeeks } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardShell } from "@/components/user/dashboard-shell"
import { EventCalendar } from "@/components/user/event-calendar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeekView } from "@/components/user/calendar/week-view"
import { DayView } from "@/components/user/calendar/day-view"
import { ListView } from "@/components/user/calendar/list-view"
import { DatePicker } from "@/components/user/calendar/date-picker"
import { EventDialog } from "@/components/user/calendar/event-dialog"
import { PlanUpgradeDialog } from "@/components/user/plan-upgrade-dialog"
import { useUserProfile } from "@/components/UserProfileProvider";
import type { CalendarEvent } from "@/lib/calendar"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@clerk/clerk-react"
import { fetchSavedEvents } from "@/api/saved-events"
import type { SavedEvent } from "@/api/saved-events"
import { fetchCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/api/calendar-events"
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";

export default function CalendarPage() {
  const { profile, loading: profileLoading } = useUserProfile();
  const plan = profile?.plan || 'free';
  const [currentDate, setCurrentDate] = useState(new Date())
  // Debug: log currentDate whenever it changes
  useEffect(() => {
    console.log('[CalendarPage] currentDate:', currentDate.toISOString());
  }, [currentDate]);
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [view, setView] = useState<"month" | "week" | "day" | "list">("month")
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(undefined)
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [savedError, setSavedError] = useState<string | null>(null)
  const { getToken } = useAuth()
  // For delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  const handleRequestDeleteEvent = (event: CalendarEvent) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteEvent = async () => {
    if (eventToDelete) {
      await handleDeleteEvent();
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  const handleCancelDeleteEvent = () => {
    setDeleteDialogOpen(false);
    setEventToDelete(null);
  };

  // Fetch calendar events from backend on mount
  useEffect(() => {
    async function loadEvents() {
      setLoadingEvents(true)
      setEventsError(null)
      try {
        const token = await getToken()
        if (!token || token.split('.').length !== 3) {
          setEventsError("You are not logged in or your session has expired.")
          setEvents([])
          setLoadingEvents(false)
          return
        }
        const backendEvents = await fetchCalendarEvents(token)
        setEvents(backendEvents)
      } catch (error) {
        console.error("Failed to load calendar events:", error);
        setEventsError("Failed to load your calendar events.")
        setEvents([])
      } finally {
        setLoadingEvents(false)
      }
    }
    loadEvents()
  }, [getToken])

  // Navigation functions
  const navigatePrevious = () => {
    switch (view) {
      case "month":
        setCurrentDate(subMonths(currentDate, 1))
        break
      case "week":
        setCurrentDate(subWeeks(currentDate, 1))
        break
      case "day":
        setCurrentDate(subDays(currentDate, 1))
        break
      default:
        break
    }
  }

  const navigateNext = () => {
    switch (view) {
      case "month":
        setCurrentDate(addMonths(currentDate, 1))
        break
      case "week":
        setCurrentDate(addWeeks(currentDate, 1))
        break
      case "day":
        setCurrentDate(addDays(currentDate, 1))
        break
      default:
        break
    }
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  const ensureReminderForEvent = async (event: CalendarEvent) => {
    const token = await getToken();
    if (!token) return;

    const eventDate = new Date(event.date);
    if (eventDate > new Date()) { // Only for upcoming events
      try {
        await axios.post("/api/user-notifications/ensure-event-reminder/", {
          event_id: event.id, // Will pass numeric ID if valid
          event_title: event.title,
          event_date_string: eventDate.toISOString(), // Send ISO string
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`Set reminder for event: ${event.title}`);
        return true;
      } catch (error) {
        console.error("Failed to ensure event reminder notification:", error);
        return false;
      }
    }
    return false;
  };

  // Bulk ensure reminders for multiple events
  const ensureRemindersForEvents = async (eventsToRemind: CalendarEvent[]) => {
    let successCount = 0;
    let failCount = 0;
    
    for (const event of eventsToRemind) {
      if (await ensureReminderForEvent(event)) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    if (successCount > 0) {
      console.log(`Successfully set reminders for ${successCount} events`);
    }
    if (failCount > 0) {
      console.error(`Failed to set reminders for ${failCount} events`);
    }
    
    return { successCount, failCount };
  };

  // Ensure reminders for all upcoming events
  const ensureAllReminders = async () => {
    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate > new Date();
    });
    
    if (upcomingEvents.length > 0) {
      const result = await ensureRemindersForEvents(upcomingEvents);
      if (result.successCount > 0) {
        toast({
          title: "Reminders updated",
          description: `Set reminders for ${result.successCount} upcoming events.`,
        });
      }
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setEventDialogOpen(true)
    ensureReminderForEvent(event); // Call reminder function
  }

  const handleCreateEvent = async () => {
    setSelectedEvent(undefined)
    setEventDialogOpen(true)
    setLoadingSaved(true)
    setSavedError(null)
    try {
      const token = await getToken()
      if (!token || token.split('.').length !== 3) {
        setSavedError("You are not logged in or your session has expired.")
        setSavedEvents([])
        setLoadingSaved(false)
        return
      }
      const events = await fetchSavedEvents(token)
      setSavedEvents(events)
    } catch (error) {
      console.error("Failed to load saved events:", error);
      setSavedError("Failed to load saved events.")
      setSavedEvents([])
    } finally {
      setLoadingSaved(false)
    }
  }

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, "id">) => {
  // Log local and UTC date being saved
  const localDate = typeof eventData.date === "string" ? new Date(eventData.date) : eventData.date;
  console.log('[handleSaveEvent] Local date:', localDate.toString());
  console.log('[handleSaveEvent] UTC ISO:', localDate.toISOString());
  // Always store date as UTC ISO string
  const formattedEventData = {
    ...eventData,
    date: localDate.toISOString(),
  };

    const token = await getToken()
    if (!token || token.split('.').length !== 3) {
      toast({ title: "Authentication required", description: "Please log in to save events.", variant: "destructive" })
      return
    }
    if (selectedEvent) {
      // Update existing event in backend
      try {
        const updated = await updateCalendarEvent(Number(selectedEvent.id), formattedEventData, token)
        setEvents(events.map((event) => (event.id === selectedEvent.id ? updated : event)))
        toast({
          title: "Event updated",
          description: `${eventData.title} has been updated.`,
        })
        
        // Automatically create/update reminder for the event
        try {
          await axios.post("/api/user-notifications/ensure-event-reminder/", {
            event_id: updated.id,
            event_title: updated.title,
            event_date_string: updated.date,
          }, {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log(`Updated reminder for event: ${updated.title}`);
        } catch (reminderError) {
          console.error("Failed to set reminder for updated event:", reminderError);
        }
      } catch {
        toast({ title: "Failed to update event", description: "Try again.", variant: "destructive" })
      }
    } else {
      // Create new event in backend
      try {
        const created = await createCalendarEvent(formattedEventData, token)
        setEvents([...events, created])
        toast({
          title: "Event created",
          description: `${eventData.title} has been added to your calendar.`,
        })
        
        // Automatically create reminder for the new event
        try {
          await axios.post("/api/user-notifications/ensure-event-reminder/", {
            event_id: created.id,
            event_title: created.title,
            event_date_string: created.date,
          }, {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log(`Created reminder for new event: ${created.title}`);
        } catch (reminderError) {
          console.error("Failed to set reminder for new event:", reminderError);
        }
      } catch {
        toast({ title: "Failed to create event", description: "Try again.", variant: "destructive" })
      }
    }
  }

  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      const token = await getToken()
      if (!token || token.split('.').length !== 3) {
        toast({ title: "Authentication required", description: "Please log in to delete events.", variant: "destructive" })
        return
      }
      try {
        await deleteCalendarEvent(Number(selectedEvent.id), token)
        setEvents(events.filter((event) => event.id !== selectedEvent.id))
        setEventDialogOpen(false)
        toast({
          title: "Event deleted",
          description: `${selectedEvent.title} has been removed from your calendar.`,
          variant: "destructive",
        })
      } catch (error) {
        console.error("Failed to delete event:", error);
        toast({ title: "Failed to delete event", description: "Try again.", variant: "destructive" })
      }
    }
  }

  // Run this effect when events change to ensure reminders for all upcoming events
  useEffect(() => {
    if (events.length > 0) {
      // Don't block the UI, run async
      ensureAllReminders();
    }
  }, []); // Only run once when component mounts, not on every event update

  // View title based on current view and date
  const getViewTitle = () => {
    switch (view) {
      case "month":
        return format(currentDate, "MMMM yyyy")
      case "week":
        return `Week of ${format(currentDate, "MMM d, yyyy")}`
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy")
      case "list":
        return "Event List"
      default:
        return ""
    }
  }

  return (
    <DashboardShell>
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCreateEvent}>
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                // Create a function to update reminders for all events
                const updateAllReminders = async () => {
                  try {
                    const token = await getToken();
                    if (!token) {
                      toast({ 
                        title: "Authentication required", 
                        description: "Please log in to update reminders.", 
                        variant: "destructive" 
                      });
                      return;
                    }
                    
                    // Get all future events
                    const futureEvents = events.filter(event => {
                      const eventDate = new Date(event.date);
                      return eventDate > new Date();
                    });
                    
                    if (futureEvents.length === 0) {
                      toast({
                        title: "No upcoming events",
                        description: "You don't have any future events to set reminders for."
                      });
                      return;
                    }
                    
                    // Set a counter for successful reminder creations
                    let successCount = 0;
                    
                    // Create reminders for each future event
                    for (const event of futureEvents) {
                      try {
                        await axios.post("/api/user-notifications/ensure-event-reminder/", {
                          event_id: event.id,
                          event_title: event.title,
                          event_date_string: event.date,
                        }, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        successCount++;
                      } catch (error) {
                        console.error(`Failed to create reminder for event ${event.title}:`, error);
                      }
                    }
                    
                    // Show success message
                    toast({
                      title: "Reminders updated",
                      description: `Created/updated reminders for ${successCount} upcoming events.`
                    });
                  } catch (error) {
                    console.error("Error updating reminders:", error);
                    toast({
                      title: "Failed to update reminders",
                      description: "An error occurred while updating your event reminders.",
                      variant: "destructive"
                    });
                  }
                };
                
                updateAllReminders();
              }}>
                <Bell className="mr-2 h-4 w-4" />
                Update Reminders
              </Button>
            </div>
          </div>

          <Card >
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm"  onClick={navigatePrevious}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm"  onClick={navigateToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm"  onClick={navigateNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <DatePicker date={currentDate} onDateChange={setCurrentDate} />
                  {plan === 'free' ? (
                    <Tabs value="month" className="w-[200px]">
                      <TabsList className="grid grid-cols-1">
                        <TabsTrigger value="month">Month</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  ) : (
                    <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week" | "day" | "list")} className="w-[400px]">
                      <TabsList className="grid grid-cols-4 mb-4">
                        <TabsTrigger value="month">Month</TabsTrigger>
                        <TabsTrigger value="week">Week</TabsTrigger>
                        <TabsTrigger value="day">Day</TabsTrigger>
                        <TabsTrigger value="list">List</TabsTrigger>
                  </TabsList>
                </Tabs>
                  )}
                </div>
              </div>

              {/* Navigation controls for week and day views */}
              {(view === "week" || view === "day") && (
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" onClick={navigatePrevious} className="flex items-center"><ChevronLeft className="mr-1 h-4 w-4" /> Previous</Button>
                  <div className="flex gap-2">
                    <Button variant="outline"  onClick={navigateToday}>Today</Button>
                    <Button variant="ghost" onClick={navigateNext} className="flex items-center">Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
                  </div>
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {plan === 'free' ? (
                    <>
                      {/* Only allow month view for free users */}
                      {view === "month" ? (
                        <>
                          <EventCalendar 
                            events={events} 
                            onEventClick={handleEventClick}
                            onEditEvent={(event) => {
                              setSelectedEvent(event);
                              setEventDialogOpen(true);
                            }}
                            onDeleteEvent={handleRequestDeleteEvent}
                          />
                          <div className="mt-6 flex flex-col items-center justify-center bg-yellow-50 border border-yellow-300 rounded-lg p-6">
                            <div className="text-yellow-900 font-semibold mb-2">Unlock More Calendar Features!</div>
                            <div className="text-yellow-800 mb-3 text-center">Upgrade to Pro or Organizer to access week, day, and list views, calendar sync, and more.</div>
                            <PlanUpgradeDialog />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center bg-yellow-50 border border-yellow-300 rounded-lg p-8 mt-8">
                          <div className="text-yellow-900 font-semibold text-lg mb-2">Upgrade Required</div>
                          <div className="text-yellow-800 mb-4 text-center">The {view.charAt(0).toUpperCase() + view.slice(1)} view is available only for Pro plans. Upgrade to unlock this and more calendar features.</div>
                          <PlanUpgradeDialog />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {view === "month" && (
                        <EventCalendar
                          events={events}
                          onEventClick={handleEventClick}
                          onEditEvent={(event) => {
                            setSelectedEvent(event);
                            setEventDialogOpen(true);
                          }}
                          onDeleteEvent={handleRequestDeleteEvent}
                        />
                      )}
                      {view === "week" && (
                        <WeekView events={events} currentDate={currentDate} onEventClick={handleEventClick} />
                      )}
                      {view === "day" && (
                        <DayView events={events} currentDate={currentDate} onEventClick={handleEventClick} />
                      )}
                      {view === "list" && (
                        <ListView events={events} currentDate={currentDate} onEventClick={handleEventClick} />
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        onSave={handleSaveEvent}
        onDelete={handleRequestDeleteEvent}
        savedEvents={savedEvents}
        loadingSaved={loadingSaved}
        savedError={savedError}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader >
            <DialogTitle className="text-red-500">Delete Event?</DialogTitle>
          </DialogHeader >
          <div>Are you sure you want to delete the event <b>{eventToDelete?.title}</b>? This action cannot be undone.</div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDeleteEvent}>Cancel</Button>
            <Button variant="destructive"  onClick={handleConfirmDeleteEvent}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
