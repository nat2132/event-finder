import { useState, useEffect } from "react"
import { useAuth } from '@clerk/clerk-react';
import { motion } from "framer-motion"
import { Download, Filter, Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardLayout } from "@/components/organizer/dashboard-layout"


export default function AttendeesPage() {
  const [events, setEvents] = useState<{ id: number; name: string }[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [attendees, setAttendees] = useState<Array<{
    id: string | number;
    name: string;
    email: string;
    ticketType: string;
    checkInStatus: string;
    purchaseDate: string;
    avatar?: string;
    ticket_id?: string;
  }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    ticketType: true,
    checkInStatus: true,
    purchaseDate: true,
  });
  const [loading, setLoading] = useState(false);

  const { getToken } = useAuth();

  // Fetch events list on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = await getToken();
        fetch("/api/events/", { 
          credentials: 'include',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.json();
        })
      .then((data) => {
        // Accepts both {results: [...]} or straight array
        const eventArr = Array.isArray(data) ? data : data.results || [];
          console.log("Events data received:", eventArr);
          setEvents(eventArr.map((ev: { id: number; title: string }) => ({ id: ev.id, name: ev.title })));
        if (eventArr.length > 0) setSelectedEvent(eventArr[0].id.toString());
      });
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    
    fetchEvents();
  }, [getToken]);

  useEffect(() => {
    if (selectedEvent !== "all") {
      setLoading(true);
      
      const fetchAttendees = async () => {
        try {
          const token = await getToken();
          const response = await fetch(`/api/events/${selectedEvent}/attendees/`, {
        credentials: 'include',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log("Attendees data received:", data);
          
          // Handle both formats: direct array or data.attendees array
          if (Array.isArray(data)) {
            setAttendees(data);
          } else if (data && Array.isArray(data.attendees)) {
            setAttendees(data.attendees);
          } else if (data && typeof data === 'object') {
            // If data is an object but not in expected format, try to extract attendees
            const possibleAttendees = Object.values(data).find(val => Array.isArray(val));
            setAttendees(Array.isArray(possibleAttendees) ? possibleAttendees : []);
          } else {
            setAttendees([]);
          }
        } catch (error) {
          console.error("Error fetching attendees:", error);
          setAttendees([]);
        } finally {
          setLoading(false);
        }
      };
      
      fetchAttendees();
    } else {
      setAttendees([]);
    }
  }, [selectedEvent, getToken]);

  const filteredAttendees = attendees.filter((attendee) => {
    const matchesSearch =
      attendee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attendee.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const exportToCSV = () => {
    // In a real app, this would generate and download a CSV file
    console.log("Exporting to CSV:", filteredAttendees);
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendees</h1>
          <p className="text-muted-foreground
">View and manage attendees for all your events</p>
        </div>

        <Card 
>
          <CardHeader>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <CardTitle>Attendee Management</CardTitle>
                <CardDescription className="text-muted-foreground">{filteredAttendees.length} attendees found</CardDescription>
              </div>
              <Button variant="outline" onClick={exportToCSV} 
>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or email..."
                  className="pl-8 "
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-full md:w-[200px] ">
                  <SelectValue placeholder="Select Event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="ml-auto h-10 w-10 ">
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">Filter columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.name}
                    onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, name: checked })}
                  >
                    Name
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.email}
                    onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, email: checked })}
                  >
                    Email
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.ticketType}
                    onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, ticketType: checked })}
                  >
                    Ticket Type
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.checkInStatus}
                    onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, checkInStatus: checked })}
                  >
                    Check-in Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.purchaseDate}
                    onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, purchaseDate: checked })}
                  >
                    Purchase Date
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-6 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.name && <TableHead>Name</TableHead>}
                    {visibleColumns.email && <TableHead>Email</TableHead>}
                    {visibleColumns.ticketType && <TableHead>Ticket Type</TableHead>}
                    {visibleColumns.checkInStatus && <TableHead>Check-in Status</TableHead>}
                    {visibleColumns.purchaseDate && <TableHead>Purchase Date</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={Object.values(visibleColumns).filter(Boolean).length}
                        className="h-24 text-center"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                          <p className="text-sm text-muted-foreground">Loading attendees...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAttendees.length > 0 ? (
                    filteredAttendees.map((attendee) => (
                      <TableRow key={attendee.id}>
                        {visibleColumns.name && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={attendee.avatar || "/placeholder.svg"} alt={attendee.name} />
                                <AvatarFallback>
                                  {attendee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span>{attendee.name}</span>
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.email && <TableCell>{attendee.email}</TableCell>}
                        {visibleColumns.ticketType && <TableCell>{attendee.ticketType}</TableCell>}
                        {visibleColumns.checkInStatus && (
                          <TableCell className="flex items-center gap-2">
    <Badge
      variant={attendee.checkInStatus === "Checked In" ? "default" : "secondary"}
    >
      {attendee.checkInStatus}
    </Badge>
    {attendee.checkInStatus === "Not Checked In" && attendee.ticket_id && (
      <button
        className="ml-2 px-2 py-1 text-xs rounded bg-green-500 text-primary-foreground hover:bg-green-600 transition"
        onClick={async () => {
          try {
            const token = await getToken();
    const res = await fetch(`/api/tickets/${attendee.ticket_id}/checkin/`, {
      method: 'PATCH',
      credentials: 'include',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
    });
    if (res.ok) {
      // Update UI: refetch or optimistically update
      setAttendees((prev) =>
        prev.map((a) =>
          (a.id === attendee.id || a.ticket_id === attendee.ticket_id)
            ? { ...a, checkInStatus: "Checked In" }
            : a
        )
      );
    } else {
      let errorMsg = `Failed to check in attendee. [${res.status} ${res.statusText}]`;
      try {
        const data = await res.json();
        if (data && (data.error || data.message)) {
          errorMsg = data.error || data.message;
        }
              } catch (error) {
                console.error("Error parsing error response:", error);
              }
      alert(errorMsg);
    }
          } catch (error) {
            console.error("Check-in failed:", error);
    alert('Failed to check in attendee.');
  }
}}
      >
        Check In
      </button>
    )}
    {attendee.checkInStatus === "Checked In" && attendee.ticket_id && (
      <button
        className="ml-2 px-2 py-1 text-xs rounded bg-yellow-500 text-primary-foreground hover:bg-yellow-600 transition"
        onClick={async () => {
          // Simulate uncheck: PATCH to same endpoint, but optimistically update UI
          setAttendees((prev) =>
            prev.map((a) =>
              (a.id === attendee.id || a.ticket_id === attendee.ticket_id)
                ? { ...a, checkInStatus: "Not Checked In" }
                : a
            )
          );
          // Optionally: send a PATCH to backend if you add support for unchecking
        }}
      >
        Uncheck
      </button>
    )}
  </TableCell>
)}
                        {visibleColumns.purchaseDate && <TableCell>{attendee.purchaseDate}</TableCell>}
                      </TableRow>
                    ))
                  ) : selectedEvent !== "all" ? (
                    <TableRow>
                      <TableCell
                        colSpan={Object.values(visibleColumns).filter(Boolean).length}
                        className="h-24 text-center"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p>No attendees found for this event.</p>
                          <p className="text-sm text-muted-foreground">
                            Attendees will appear here when tickets are purchased.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={Object.values(visibleColumns).filter(Boolean).length}
                        className="h-24 text-center"
                      >
                        <p>Please select an event to view its attendees.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  )
}
