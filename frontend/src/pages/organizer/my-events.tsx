import { motion } from "framer-motion"
import { CalendarPlus, Filter, MoreHorizontal, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardLayout } from "@/components/organizer/dashboard-layout"

import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { fetchEvents } from "./event-api"
import type {Event as EventType } from "./event-api"
import { format } from "date-fns"

type EventDisplay = EventType & {
  status: string;
  attendees: number;
  ticketsSold: number;
  totalTickets: number;
  gallery_images: string[];
};

import { deleteEvent } from "./event-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import { Progress } from "@/components/ui/progress"

export default function MyEventsPage() {
  const [events, setEvents] = useState<EventDisplay[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const location = useLocation();
  const { getToken } = useAuth();
  // Modal/dialog state
  const [selectedEvent, setSelectedEvent] = useState<EventDisplay | null>(null);
  const [modalType, setModalType] = useState<null | "details" | "edit">(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Handler to update ticket counts after purchase
  const handleTicketsPurchased = (selectedTickets: { [key: string]: number }) => {
    if (!selectedEvent) return;
    setEvents((prevEvents) =>
      prevEvents.map((ev) => {
        if (ev.id !== selectedEvent.id) return ev;
        // Update ticketTypes quantities
        const updatedTicketTypes = ev.ticketTypes.map((tt) => {
          // Use ticket name as key for selectedTickets
          const purchased = selectedTickets[tt.name] || 0;
          // Ensure quantity is string as per Event type
          return {
            ...tt,
            quantity: String(Math.max(Number(tt.quantity) - purchased, 0)),
          };
        });
        return { ...ev, ticketTypes: updatedTicketTypes };
      })
    );
  };

  function normalizeEvent(event: EventType): EventDisplay {
    return {
      ...event,
      status: (event as any).status || "upcoming",
      attendees: (event as any).attendees || 0,
      ticketsSold: (event as any).ticketsSold || 0,
      totalTickets: (event as any).totalTickets || 0,
      gallery_images: (event as any).gallery_images || [],
    };
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.error("No token available");
          setEvents([]);
          return;
        }
        const response = await fetchEvents(token);
        // Handle paginated response
        const eventsData = response.results || response;
        setEvents(eventsData.map(normalizeEvent));
      } catch (err) {
        console.error("Error fetching events:", err);
        setEvents([]);
      }
    };
    fetchData();
  }, [getToken]);

  useEffect(() => {
    if (location.state && location.state.refresh) {
      const fetchData = async () => {
        try {
          const token = await getToken();
          if (!token) {
            console.error("No token available");
            setEvents([]);
            return;
          }
          const response = await fetchEvents(token);
          // Handle paginated response
          const eventsData = response.results || response;
          setEvents(eventsData.map(normalizeEvent));
        } catch (err) {
          console.error("Error fetching events:", err);
          setEvents([]);
        }
      };
      fetchData();
    }
  }, [location.state, getToken]);

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "upcoming" && event.status === "upcoming") ||
      (activeTab === "completed" && event.status === "completed") ||
      (activeTab === "draft" && event.status === "draft");
    return matchesSearch && matchesTab;
  });

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Events</h1>
            <p className="text-muted-foreground">Manage and track all your events in one place</p>
          </div>
          <Button asChild className=" bg-primary text-primary-foreground">
            <a href="/create-event">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Create Event
            </a>
          </Button>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search events..."
              className="pl-8 "
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 ">
            <Filter className="h-4 w-4 "/>
            <span className="sr-only">Filter</span>
          </Button>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger className="cursor-pointer" value="all">All</TabsTrigger>
              <TabsTrigger className="cursor-pointer" value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger className="cursor-pointer" value="completed">Completed</TabsTrigger>
              <TabsTrigger className="cursor-pointer" value="draft">Draft</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <img src="/hot_air_balloon.png" alt="No events" className="mb-6 w-40 h-40 opacity-80" />
              <h2 className="text-xl font-semibold mb-2">No events found</h2>
              <p className="mb-6 text-muted-foreground">You haven't created any events yet. Start by creating your first event!</p>
              <Button asChild className=" bg-primary text-primary-foreground">
                <a href="/create-event">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Create Event
                </a>
              </Button>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden ">
                  <div className="relative">
                    <img src={event.image || "/placeholder.svg"} alt={event.title} className="h-48 w-full object-cover" />
                        {event.gallery_images && event.gallery_images.length > 0 && (
                          <div className="flex gap-2 px-2 py-2 bg-slate-50 border-t border-slate-200">
                            {event.gallery_images.map((img: string, idx: number) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Gallery ${idx+1}`}
                                className="h-12 w-12 object-cover rounded shadow border border-slate-200"
                              />
                            ))}
                          </div>
                        ) }
                    <div className="absolute right-2 top-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-slate-200">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer hover:bg-slate-100" onClick={() => {
                            setSelectedEvent(event);
                            setModalType("details");
                          }}>View details</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer hover:bg-slate-100" onClick={() => {
                            // Forward to create-event page with event data for editing
                            window.location.href = `/dashboard/organizer/create-event?id=${event.id}`;
                          }}>Edit event</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer hover:bg-slate-100" disabled>Duplicate event</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-500 cursor-pointer hover:bg-red-100" onClick={() => {
                            setSelectedEvent(event);
                            setShowDeleteConfirm(true);
                          }}>Delete event</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="absolute left-2 top-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          event.status === "completed"
                            ? "bg-green-500/10 text-green-700"
                            : event.status === "upcoming"
                              ? "bg-blue-500/10 text-blue-700"
                              : "bg-yellow-500/80 text-primary-foreground"
                        }`}
                      >
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>
                      {formatDateOnly(event.start_time)} - {formatDateOnly(event.end_time)} | {event.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">
                        {event.ticketsSold} / {event.totalTickets} tickets sold
                      </span>
                      <div className="w-full">
                        <Progress value={event.totalTickets > 0 ? (event.ticketsSold / event.totalTickets) * 100 : 0} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Event Details Modal */}
        <Dialog open={modalType === "details" && !!selectedEvent} onOpenChange={open => { if (!open) { setModalType(null); setSelectedEvent(null); } }}>
          <DialogContent className="sm:max-w-[900px] p-0 overflow-auto max-h-[90vh] w-[95vw]">  
            {selectedEvent && (
              <div className="grid md:grid-cols-5 h-full">
                {/* Left panel - Image & Gallery */}
                <div className="md:col-span-2 relative bg-slate-50 border-r border-slate-200">
                  <div className="h-full overflow-auto">
                    <div className="relative h-72">
                      <img 
                        src={selectedEvent.image || "/placeholder.svg"} 
                        alt={selectedEvent.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 left-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            selectedEvent.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : selectedEvent.status === "upcoming"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    {selectedEvent.gallery_images && selectedEvent.gallery_images.length > 0 && (
                      <div className="p-4">
                        <h4 className="text-sm font-medium text-slate-500 mb-2">Event Gallery</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedEvent.gallery_images.map((img: string, idx: number) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Gallery ${idx+1}`}
                              className="aspect-square w-full object-cover rounded-md shadow-sm border border-slate-200 hover:opacity-90 transition-opacity cursor-pointer"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right panel - Details */}
                <div className="md:col-span-3 p-6">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl">{selectedEvent.title}</DialogTitle>
                    <p className="text-muted-foreground text-sm">
                      Event ID: {selectedEvent.id}
                    </p>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Event Basic Info */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium text-slate-500">Date</h3>
                          <p className="font-medium">{formatDateOnly(selectedEvent.start_time)}</p>
                          <p className="font-medium text-muted-foreground">{formatDateOnly(selectedEvent.end_time)}</p>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium text-slate-500">Location</h3>
                          <p className="font-medium">{selectedEvent.location}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-slate-500">Address</h3>
                        <p className="text-sm">{selectedEvent.address || "No address specified"}</p>
                      </div>
                    </div>

                    {/* Event Description */}
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-slate-500">Description</h3>
                      <div className="prose prose-sm max-w-none text-slate-700">
                        {selectedEvent.description || "No description provided."}
                      </div>
                    </div>

                    {/* Ticket Sales */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-medium text-slate-500">Ticket Sales</h3>
                      
                      <div className="bg-slate-50 rounded-md p-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">Overall Progress</span>
                          <span className="text-sm text-slate-500">
                            {selectedEvent.ticketsSold} / {selectedEvent.totalTickets} sold
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ 
                              width: `${selectedEvent.totalTickets > 0 ? 
                                Math.min((selectedEvent.ticketsSold / selectedEvent.totalTickets) * 100, 100) : 0}%` 
                            }}
                          />
                        </div>
                        
                        {/* Per-ticket-type breakdown */}
                        {Array.isArray(selectedEvent.ticketTypes) && selectedEvent.ticketTypes.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <h4 className="text-xs font-medium text-slate-500">Ticket Types</h4>
                            {selectedEvent.ticketTypes.map((tt: any, idx: number) => {
                              const sold = Number(tt.sold || 0);
                              const quantity = Number(tt.quantity || 0);
                              const total = sold + quantity;
                              const percentage = total > 0 ? Math.min((sold / total) * 100, 100) : 0;
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium">{tt.name}</span>
                                    <span className="text-xs text-slate-500">{sold} / {total} sold</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${
                                        percentage > 80 ? 'bg-green-500' : 
                                        percentage > 50 ? 'bg-blue-500' : 
                                        percentage > 20 ? 'bg-yellow-500' : 
                                        'bg-slate-400'
                                      }`} 
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-xs text-slate-500">
                                    <span>Price: ${Number(tt.price).toFixed(2)}</span>
                                    <span>{percentage.toFixed(0)}% sold</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="mt-6 pt-4 border-t">
                    <Button variant="outline" onClick={() => setModalType(null)}>Close</Button>
                    <Button onClick={() => {
                      window.location.href = `/dashboard/organizer/create-event?id=${selectedEvent.id}`;
                    }}>Edit Event</Button>
                  </DialogFooter>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={open => { if (!open) setShowDeleteConfirm(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-500">Delete Event</DialogTitle>
            </DialogHeader>
            <div>Are you sure you want to delete <b>{selectedEvent?.title}</b>? This action cannot be undone.</div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={async () => {
                if (!selectedEvent) return;
                setDeleting(true);
                try {
                  const token = await getToken();
                  await deleteEvent(selectedEvent.id, token || "");
                  toast({ title: "Event deleted", description: `${selectedEvent.title} was deleted.` });
                  setShowDeleteConfirm(false);
                  setModalType(null);
                  setSelectedEvent(null);
                  // Refresh events
                  const token2 = localStorage.getItem('token') || undefined;
                  const data = await fetchEvents(token2);
                  setEvents(data.map(normalizeEvent));
                } catch (err) {
                  toast({ title: "Delete failed", description: "Could not delete event.", variant: "destructive" });
                } finally {
                  setDeleting(false);
                }
              }} disabled={deleting}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
}

function formatDateOnly(date: string | number | Date | null | undefined): string {
  if (!date) return 'Not specified';
  try {
    return format(new Date(date), 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
}
