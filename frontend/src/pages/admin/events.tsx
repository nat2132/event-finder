import React, { useState, useEffect, useCallback } from "react"
import { Calendar, Filter, MoreHorizontal, Search, Pencil, Trash2 } from "lucide-react"
import axios from "axios"
import { useAuth } from "@clerk/clerk-react"
import { useBackendUserProfile } from "@/components/use-backend-user-profile"
import { T, useTranslation } from "@/context/translation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import AdminLayout from "./AdminLayout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Define Event interface based on EventSerializer
interface Event {
  id: number;
  title: string;
  description?: string;
  category?: string;
  date: string; // Assuming ISO string
  time?: string;
  location?: string;
  address?: string;
  ticketTypes?: any[]; // Define more specifically if needed
  image?: string;
  gallery_images?: any[]; // Define more specifically if needed
  status: string; // e.g., 'upcoming', 'past', 'cancelled'
  attendees: number;
  start_time?: string;
  end_time?: string;
  created_at: string; // Assuming ISO string
  comments?: any[]; // Define more specifically if needed
  rating?: number;
  organizer: number; // Organizer ID
  organizer_name?: string;
  organizer_image?: string;
  // Add revenue or other fields if available/needed from backend
  // 'revenue' was in the sample data but not in the serializer, need to confirm if needed
}

// Interface for API response (with pagination)
interface PaginatedEventsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Event[];
}

export default function EventsPage() {
  const { getToken } = useAuth();
  const { profile, loading: profileLoading } = useBackendUserProfile();
  const { language, translate } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(10);
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search events...");

  // State for modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const isSuperAdmin = profile?.admin_role === 'super_admin';
  const isEventAdmin = profile?.admin_role === 'event_admin';
  const isSupportAdmin = profile?.admin_role === 'support_admin';
  const canManageEvents = isSuperAdmin || isEventAdmin;
  const canViewEvents = isSuperAdmin || isEventAdmin || isSupportAdmin;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchData = useCallback(async (page: number, search: string, status: string | null) => {
    setLoading(true);
    setError(null);
    const token = await getToken();
    if (!token) {
      const translatedError = await translate("Authentication token not available.");
      setError(translatedError);
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      if (search) params.append('search', search);
      if (status && status !== 'all') params.append('status', status);
      const response = await axios.get<PaginatedEventsResponse>("/api/events/", {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
      });
      if (response.data && response.data.results) {
        setEvents(response.data.results);
        setCount(response.data.count ?? 0);
        setNextPageUrl(response.data.next);
        setPrevPageUrl(response.data.previous);
      } else {
        const translatedError = await translate("Received unexpected data format from server.");
        setError(translatedError);
        setEvents([]); setCount(0); setNextPageUrl(null); setPrevPageUrl(null);
      }
    } catch (err: any) {
      const translatedError = await translate("Failed to load events.");
      setError(err.response?.data?.detail || err.response?.data?.error || translatedError);
      setEvents([]); setCount(0); setNextPageUrl(null); setPrevPageUrl(null);
    } finally {
      setLoading(false);
    }
  }, [getToken, pageSize, translate]);

  useEffect(() => {
    fetchData(currentPage, debouncedSearchTerm, statusFilter);
  }, [fetchData, currentPage, debouncedSearchTerm, statusFilter]);

  useEffect(() => {
    translate("Search events by title, organizer, location...").then(setSearchPlaceholder);
  }, [translate, language]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0) setCurrentPage(newPage);
  };

  const handleFilterChange = (value: string) => {
    setCurrentPage(1);
    setStatusFilter(value);
  };

  const totalPages = Math.ceil(count / pageSize);

  // Modal handlers (assumed to be present and correct)
  const openModal = (event: Event, type: 'view' | 'edit' | 'delete') => {
    setSelectedEvent(event);
    setIsViewModalOpen(type === 'view');
    setIsEditModalOpen(type === 'edit');
    setIsDeleteModalOpen(type === 'delete');
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsAddModalOpen(false);
  };

  const handleEventUpdate = () => {
    fetchData(currentPage, debouncedSearchTerm, statusFilter);
    closeModal();
  };

  const handleEventDelete = () => {
    fetchData(currentPage, debouncedSearchTerm, statusFilter);
    if (events.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
    closeModal();
  };

  const handleEventAdd = () => {
    fetchData(1, "", "all");
    closeModal();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold"><T>Event Management</T></h1>
          {canManageEvents && !profileLoading && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Calendar className="mr-2 h-4 w-4" /> <T>Add New Event</T>
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle><T>All Events</T></CardTitle>
                <CardDescription><T>Browse and manage all scheduled events.</T></CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                      <Filter className="mr-2 h-4 w-4" /> <T>Filter by Status</T>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel><T>Select Status</T></DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {[
                      { value: "all", label: "All Statuses" },
                      { value: "upcoming", label: "Upcoming" },
                      { value: "past", label: "Past" },
                      { value: "cancelled", label: "Cancelled" },
                    ].map(option => (
                      <DropdownMenuItem
                        key={option.value}
                        onSelect={() => handleFilterChange(option.value)}
                      >
                        <T>{option.label}</T>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && events.length === 0 && <p><T>Loading events...</T></p>}
            {error && <p className="text-red-500"><T>Error loading events</T>: {error}</p>}
            {!loading && !error && (
              <EventTable
                events={events}
                onViewDetails={(event) => openModal(event, 'view')}
                onEditEvent={canManageEvents ? (event) => openModal(event, 'edit') : undefined}
                onDeleteEvent={canManageEvents ? (event) => openModal(event, 'delete') : undefined}
                canManage={canManageEvents}
                currentUserAdminRole={profile?.admin_role}
              />
            )}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end space-x-2 py-4">
                <span className="text-sm text-muted-foreground">
                  <T>Page</T> {currentPage} <T>of</T> {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1 || loading}>
                  <T>Previous</T>
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages || loading}>
                  <T>Next</T>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedEvent && (
        <>
          <EventDetailsModal event={selectedEvent} isOpen={isViewModalOpen} onClose={closeModal} />
          <EditEventModal 
            event={selectedEvent} 
            isOpen={isEditModalOpen} 
            onClose={closeModal} 
            onEventUpdate={handleEventUpdate}
          />
          <DeleteEventConfirmationModal 
            event={selectedEvent} 
            isOpen={isDeleteModalOpen} 
            onClose={closeModal} 
            onEventDelete={handleEventDelete}
          />
        </>
      )}
      <AddEventModal 
        isOpen={isAddModalOpen} 
        onClose={closeModal} 
        onEventAdd={handleEventAdd}
      />
    </AdminLayout>
  );
}

// --- EventTable Component ---
interface EventTableProps {
  events: Event[];
  onViewDetails: (event: Event) => void;
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (event: Event) => void;
  canManage: boolean;
  currentUserAdminRole?: string;
}

function EventTable({ events, onViewDetails, onEditEvent, onDeleteEvent, canManage, currentUserAdminRole }: EventTableProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 border rounded-md">
        <p className="text-muted-foreground"><T>No events found matching your criteria.</T></p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Attendees</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                    <img
                      src={event.image || '/placeholder-event.jpg'}
                      alt={event.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.organizer_name}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {event.start_time ? event.start_time : "N/A"}
              </TableCell>
              <TableCell>{event.location}</TableCell>
              <TableCell>
                <Badge variant={event.status === 'upcoming' ? 'default' : event.status === 'cancelled' ? 'destructive' : 'outline'}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>{event.category}</TableCell>
              <TableCell>{event.attendees || 0}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewDetails(event)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  {canManage && onEditEvent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditEvent(event)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canManage && onDeleteEvent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteEvent(event)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// --- EventDetailsModal Component ---
interface EventDetailsModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  if (!isOpen) return null;

  const displayValue = (value: string | number | undefined | null, defaultValue = "N/A") => {
    if (value === null || value === undefined || value === '') return defaultValue;
    return String(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 h-full">
          {/* Left panel - Event image or placeholder */}
          <div className="hidden md:flex md:col-span-2 bg-muted/30 relative">
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
              {event.image ? (
                <img 
                  src={event.image} 
                  alt={event.title} 
                  className="object-cover object-center w-full h-full"
                />
              ) : (
                <Calendar className="w-24 h-24 text-muted-foreground/30" />
              )}
            </div>
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white">
              <h3 className="text-xl font-semibold line-clamp-2">{event.title}</h3>
              <p className="text-sm text-white/80 mt-1">{displayValue(event.organizer_name)}</p>
              <div className="flex items-center mt-2">
                <Badge variant={event.status === 'upcoming' ? 'default' : event.status === 'cancelled' ? 'destructive' : 'outline'} className="mt-1">
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Right panel - Event details */}
          <div className="col-span-1 md:col-span-3 p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl md:hidden"><T>Event Details</T></DialogTitle>
              <div className="flex items-center md:hidden mt-2 mb-4">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md mr-3">
                  <img
                    src={event.image || '/placeholder-event.jpg'}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">{displayValue(event.organizer_name)}</p>
                  <Badge variant={event.status === 'upcoming' ? 'default' : event.status === 'cancelled' ? 'destructive' : 'outline'} className="mt-1">
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </DialogHeader>
            
            <div className="max-h-[65vh] overflow-y-auto pr-2">
              <div className="space-y-4">
                                <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2 border-b pb-3">
                  <Label className="text-right font-semibold text-muted-foreground"><T>Start Time</T></Label>
                  <div className="col-span-2 font-medium">{displayValue(event.start_time)}</div>
                  
                  <Label className="text-right font-semibold text-muted-foreground"><T>End Time</T></Label>
                  <div className="col-span-2">{displayValue(event.end_time)}</div>
                </div>

                <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2 border-b pb-3">
                  <Label className="text-right font-semibold text-muted-foreground"><T>Location</T></Label>
            <div className="col-span-2 break-words">{displayValue(event.location)}</div>

                  <Label className="text-right font-semibold text-muted-foreground"><T>Address</T></Label>
            <div className="col-span-2 break-words">{displayValue(event.address)}</div>
                </div>

                <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2 border-b pb-3">
                  <Label className="text-right font-semibold text-muted-foreground"><T>Category</T></Label>
            <div className="col-span-2">{displayValue(event.category)}</div>

                  <Label className="text-right font-semibold text-muted-foreground"><T>Attendees</T></Label>
                  <div className="col-span-2">{event.attendees}</div>
            </div>

                <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                  <Label className="text-right font-semibold text-muted-foreground"><T>Description</T></Label>
            <div className="col-span-2 whitespace-pre-wrap break-words">{displayValue(event.description)}</div>
                </div>
            
                {/* Ticket Types display with improved styling */}
            {event.ticketTypes && event.ticketTypes.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-2 border-b pb-1"><T>Ticket Types</T></h4>
                    <div className="space-y-3">
                    {event.ticketTypes.map((type: any, index: number) => (
                        <div key={index} className="bg-muted/30 p-3 rounded-lg">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground"><T>Name</T></Label>
                              <div className="font-medium">{displayValue(type.name)}</div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground"><T>Price</T></Label>
                              <div className="font-medium">{displayValue(type.price)}</div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground"><T>Quantity</T></Label>
                              <div className="font-medium">{displayValue(type.quantity)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
            )}
          </div>
        </div>
            
            <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}><T>Close</T></Button>
        </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- EditEventModal Component ---
interface EditEventModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdate: () => void;
}

function EditEventModal({ event, isOpen, onClose, onEventUpdate }: EditEventModalProps) {
  const { getToken } = useAuth();
  const [editFormData, setEditFormData] = useState<Partial<Event>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { translate, language } = useTranslation(); // For placeholders and error messages

  // State for translated placeholders
  const [titlePlaceholder, setTitlePlaceholder] = useState("Enter event title");
  const [descriptionPlaceholder, setDescriptionPlaceholder] = useState("Enter event description");
  const [categoryPlaceholder, setCategoryPlaceholder] = useState("e.g., Music, Conference, Workshop");
  const [locationPlaceholder, setLocationPlaceholder] = useState("e.g., Online or Venue Name");
  const [addressPlaceholder, setAddressPlaceholder] = useState("Enter full address");
  const [timePlaceholder, setTimePlaceholder] = useState("e.g., 10:00 AM or 14:00");

  useEffect(() => {
    if (event && isOpen) {
      setEditFormData({
        title: event.title || '',
        description: event.description || '',
        category: event.category || '',
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        location: event.location || '',
        address: event.address || '',
        status: event.status || 'upcoming',
        // image: event.image || '', // Image handling might be separate (upload)
      });
      setError(null); // Clear previous errors
    } else if (!isOpen) {
        setEditFormData({}); // Clear form data when modal is closed and not just hidden
    }
  }, [event, isOpen]);

  useEffect(() => {
    translate("Enter event title").then(setTitlePlaceholder);
    translate("Enter event description").then(setDescriptionPlaceholder);
    translate("e.g., Music, Conference, Workshop").then(setCategoryPlaceholder);
    translate("e.g., Online or Venue Name").then(setLocationPlaceholder);
    translate("Enter full address").then(setAddressPlaceholder);
    translate("e.g., 10:00 AM or 14:00").then(setTimePlaceholder);
    // Note: start_time and end_time might need their own placeholders if they are free text
  }, [translate, language]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const token = await getToken();
    if (!token) {
      const authError = await translate("Authentication required.");
      setError(authError);
      setIsSaving(false);
      return;
    }
    try {
      await axios.patch(`/api/events/${event.id}/`, editFormData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onEventUpdate();
    } catch (err: any) {
      const fallbackError = await translate("Failed to save event changes.");
      setError(err.response?.data?.detail || err.response?.data?.error || fallbackError);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !event) return null;

  const statusOptions = [
    { value: "upcoming", label: "Upcoming" },
    { value: "past", label: "Past" },
    { value: "cancelled", label: "Cancelled" },
    // Add other relevant statuses as needed
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 h-full">
          {/* Left panel - Preview and image */}
          <div className="hidden md:flex md:col-span-2 bg-muted/30 flex-col">
            <div className="flex-1 p-6 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
              {event.image ? (
                <img 
                  src={event.image} 
                  alt={event.title} 
                  className="object-cover object-center max-w-full max-h-full rounded-md shadow-md"
                />
              ) : (
                <div className="text-center">
                  <Calendar className="w-24 h-24 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground mt-2"><T>No image available</T></p>
                </div>
              )}
            </div>
            <div className="p-6 bg-muted/20">
              <h3 className="text-xl font-semibold mb-2"><T>Event Preview</T></h3>
              <div className="space-y-2">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground"><T>Title</T></h4>
                  <p className="font-medium">{editFormData.title || event.title}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground"><T>Time</T></h4>
                  <p>{editFormData.start_time || event.start_time || "Not set"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground"><T>Status</T></h4>
                  <Badge variant={
                    (editFormData.status || event.status) === 'upcoming' ? 'default' : 
                    (editFormData.status || event.status) === 'cancelled' ? 'destructive' : 'outline'
                  }>
                    {(editFormData.status || event.status).charAt(0).toUpperCase() + (editFormData.status || event.status).slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right panel - Form */}
          <div className="col-span-1 md:col-span-3 p-6">
            <DialogHeader className="mb-6">
          <DialogTitle><T>Edit Event</T></DialogTitle>
          <DialogDescription><T>Make changes to the event details. Click save when done.</T></DialogDescription>
        </DialogHeader>
            <div className="max-h-[65vh] overflow-y-auto pr-2">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-1"><T>Basic Information</T></h3>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-title" className="text-right text-muted-foreground"><T>Title</T></Label>
            <Input id="edit-title" name="title" value={editFormData.title || ''} onChange={handleChange} className="col-span-3" placeholder={titlePlaceholder} />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="edit-description" className="text-right pt-2 text-muted-foreground"><T>Description</T></Label>
            <Textarea id="edit-description" name="description" value={editFormData.description || ''} onChange={handleChange} className="col-span-3 min-h-[100px]" placeholder={descriptionPlaceholder} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-category" className="text-right text-muted-foreground"><T>Category</T></Label>
            <Input id="edit-category" name="category" value={editFormData.category || ''} onChange={handleChange} className="col-span-3" placeholder={categoryPlaceholder} />
          </div>
          </div>
                
                                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-1"><T>Time</T></h3>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-start_time" className="text-right text-muted-foreground"><T>Start Time</T></Label>
            <Input id="edit-start_time" name="start_time" value={editFormData.start_time || ''} onChange={handleChange} className="col-span-3" placeholder={timePlaceholder} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-end_time" className="text-right text-muted-foreground"><T>End Time</T></Label>
            <Input id="edit-end_time" name="end_time" value={editFormData.end_time || ''} onChange={handleChange} className="col-span-3" placeholder={timePlaceholder} />
          </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-1"><T>Location</T></h3>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-location" className="text-right text-muted-foreground"><T>Venue</T></Label>
            <Input id="edit-location" name="location" value={editFormData.location || ''} onChange={handleChange} className="col-span-3" placeholder={locationPlaceholder} />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="edit-address" className="text-right pt-2 text-muted-foreground"><T>Address</T></Label>
            <Textarea id="edit-address" name="address" value={editFormData.address || ''} onChange={handleChange} className="col-span-3" placeholder={addressPlaceholder} />
          </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-1"><T>Status</T></h3>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-status" className="text-right text-muted-foreground"><T>Status</T></Label>
            <Select name="status" value={editFormData.status || 'upcoming'} onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger id="edit-status" className="col-span-3">
                <SelectValue placeholder={<T>Select a status</T>} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}><T>{opt.label}</T></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
                
                {/* Image upload would go here */}
                
                {error && <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                  <p className="text-sm text-red-600"><T>Error</T>: {error}</p>
                </div>}
              </div>
            </div>
            
            <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}><T>Cancel</T></Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <T>Saving...</T> : <T>Save Changes</T>}
          </Button>
        </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- DeleteEventConfirmationModal Component ---
interface DeleteEventConfirmationModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onEventDelete: () => void;
}

function DeleteEventConfirmationModal({ event, isOpen, onClose, onEventDelete }: DeleteEventConfirmationModalProps) {
  const { getToken } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { translate, language } = useTranslation(); // Added language for consistency

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    const token = await getToken();
    if (!token) {
      const authError = await translate("Authentication required.");
      setError(authError);
      setIsDeleting(false);
      return;
    }
    try {
      await axios.delete(`/api/events/${event.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onEventDelete();
    } catch (err: any) {
      const fallbackError = await translate("Failed to delete event.");
      setError(err.response?.data?.detail || err.response?.data?.error || fallbackError);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
        setError(null); // Clear error when modal opens
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle><T>Confirm Event Deletion</T></DialogTitle>
          <DialogDescription>
            <T>Are you sure you want to delete the event:</T> <strong>{event.title}</strong>?
            <br />
            <T>This action cannot be undone.</T>
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="my-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p><T>Error</T>: {error}</p>
          </div>
        )}
        <DialogFooter className="mt-4 flex flex-row-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
            {isDeleting ? <T>Deleting...</T> : <T>Delete Event</T>}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}><T>Cancel</T></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- AddEventModal Component ---
interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventAdd: () => void;
}

function AddEventModal({ isOpen, onClose, onEventAdd }: AddEventModalProps) {
  const { getToken } = useAuth();
  const { profile } = useBackendUserProfile(); // Need organizer ID for saving
  const [addFormData, setAddFormData] = useState<Partial<Omit<Event, 'id' | 'attendees' | 'created_at' | 'organizer'>>>({
    title: '',
    description: '',
    category: '',
    date: '',
    time: '',
    location: '',
    address: '',
    status: 'upcoming',
    start_time: '',
    end_time: '',
    // ticketTypes: [], // Ticket types might be complex, handle separately if needed
    // image: '', // Image upload likely separate
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { translate, language } = useTranslation();

  // Placeholders state
  const [titlePlaceholder, setTitlePlaceholder] = useState("Enter event title");
  const [descriptionPlaceholder, setDescriptionPlaceholder] = useState("Enter event description");
  const [categoryPlaceholder, setCategoryPlaceholder] = useState("e.g., Music, Conference, Workshop");
  const [locationPlaceholder, setLocationPlaceholder] = useState("e.g., Online or Venue Name");
  const [addressPlaceholder, setAddressPlaceholder] = useState("Enter full address");
  const [timePlaceholder, setTimePlaceholder] = useState("e.g., 10:00 AM or 14:00");

  useEffect(() => {
    translate("Enter event title").then(setTitlePlaceholder);
    translate("Enter event description").then(setDescriptionPlaceholder);
    translate("e.g., Music, Conference, Workshop").then(setCategoryPlaceholder);
    translate("e.g., Online or Venue Name").then(setLocationPlaceholder);
    translate("Enter full address").then(setAddressPlaceholder);
    translate("e.g., 10:00 AM or 14:00").then(setTimePlaceholder);
  }, [translate, language]);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setAddFormData({
        title: '',
        description: '',
        category: '',
        location: '',
        address: '',
        status: 'upcoming',
        start_time: '',
        end_time: '',
      });
      setError(null); // Clear errors
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const token = await getToken();
    if (!token || !profile?.id) { // Check for profile.id which should be the organizer ID
      const authError = await translate(!token ? "Authentication required." : "Organizer information missing.");
      setError(authError);
      setIsSaving(false);
      return;
    }

    // Prepare data for API, including organizer ID
    const eventDataToSend = {
        ...addFormData,
        organizer: profile.id // Add organizer ID from the logged-in user profile
    };

    try {
      await axios.post(`/api/events/`, eventDataToSend, { // POST to the list endpoint
        headers: { Authorization: `Bearer ${token}` },
      });
      onEventAdd(); // Calls refetch and closes modal
    } catch (err: any) {
      const fallbackError = await translate("Failed to add event.");
      let errorMessage = fallbackError;
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'object') {
          errorMessage = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${(Array.isArray(messages) ? messages.join(', ') : messages)}`)
            .join('; ') || fallbackError;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const statusOptions = [
    { value: "upcoming", label: "Upcoming" },
    // Add other statuses if applicable during creation (e.g., 'draft')
    // { value: "draft", label: "Draft" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 h-full">
          {/* Left panel - Preview and inspiration */}
          <div className="hidden md:flex md:col-span-2 bg-muted/30 flex-col">
            <div className="flex-1 p-6 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 overflow-hidden">
              <div className="text-center">
                <Calendar className="w-24 h-24 text-muted-foreground/30 mx-auto" />
                <h3 className="text-xl font-semibold mt-4"><T>Create a New Event</T></h3>
                <p className="text-muted-foreground mt-2 max-w-[220px] mx-auto">
                  <T>Fill in the details to create your event and make it visible to attendees.</T>
                </p>
              </div>
            </div>
            <div className="p-6 bg-muted/20">
              <h3 className="text-xl font-semibold mb-2"><T>Event Preview</T></h3>
              <div className="space-y-2">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground"><T>Title</T></h4>
                  <p className="font-medium">{addFormData.title || <span className="text-muted-foreground italic">Not specified</span>}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground"><T>Time</T></h4>
                  <p>{addFormData.start_time || <span className="text-muted-foreground italic">Not specified</span>}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground"><T>Status</T></h4>
                  <Badge variant="default">
                    {addFormData.status.charAt(0).toUpperCase() + addFormData.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right panel - Form */}
          <div className="col-span-1 md:col-span-3 p-6">
            <DialogHeader className="mb-6">
          <DialogTitle><T>Add New Event</T></DialogTitle>
          <DialogDescription><T>Fill in the details to create a new event.</T></DialogDescription>
        </DialogHeader>
            <div className="max-h-[65vh] overflow-y-auto pr-2">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-1"><T>Basic Information</T></h3>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-title" className="text-right text-muted-foreground"><T>Title</T> *</Label>
            <Input id="add-title" name="title" value={addFormData.title} onChange={handleChange} className="col-span-3" placeholder={titlePlaceholder} />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="add-description" className="text-right pt-2 text-muted-foreground"><T>Description</T></Label>
            <Textarea id="add-description" name="description" value={addFormData.description} onChange={handleChange} className="col-span-3 min-h-[100px]" placeholder={descriptionPlaceholder} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-category" className="text-right text-muted-foreground"><T>Category</T></Label>
            <Input id="add-category" name="category" value={addFormData.category} onChange={handleChange} className="col-span-3" placeholder={categoryPlaceholder} />
          </div>
          </div>
                
                                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-1"><T>Time</T></h3>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-start_time" className="text-right text-muted-foreground"><T>Start Time</T> *</Label>
            <Input id="add-start_time" name="start_time" value={addFormData.start_time} onChange={handleChange} className="col-span-3" placeholder={timePlaceholder} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-end_time" className="text-right text-muted-foreground"><T>End Time</T></Label>
            <Input id="add-end_time" name="end_time" value={addFormData.end_time} onChange={handleChange} className="col-span-3" placeholder={timePlaceholder} />
          </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-1"><T>Location</T></h3>
          <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-location" className="text-right text-muted-foreground"><T>Venue</T></Label>
            <Input id="add-location" name="location" value={addFormData.location} onChange={handleChange} className="col-span-3" placeholder={locationPlaceholder} />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="add-address" className="text-right pt-2 text-muted-foreground"><T>Address</T></Label>
            <Textarea id="add-address" name="address" value={addFormData.address} onChange={handleChange} className="col-span-3" placeholder={addressPlaceholder} />
          </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-1"><T>Status</T></h3>
           <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-status" className="text-right text-muted-foreground"><T>Status</T></Label>
            <Select name="status" value={addFormData.status} onValueChange={(value) => setAddFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger id="add-status" className="col-span-3">
                <SelectValue placeholder={<T>Select status</T>} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}><T>{opt.label}</T></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
    </div>
                
                {/* Image upload would go here */}
                
                {error && <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                  <p className="text-sm text-red-600"><T>Error</T>: {error}</p>
                </div>}
                
                <div className="text-muted-foreground text-sm">
                  <p><T>* Required fields</T></p>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}><T>Cancel</T></Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <T>Adding Event...</T> : <T>Add Event</T>}
          </Button>
        </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- End Modal Components ---
