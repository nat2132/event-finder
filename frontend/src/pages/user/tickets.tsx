import { Download, Eye } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardShell } from "@/components/user/dashboard-shell"
import { useEffect, useState } from "react"


interface RawTicketData {
  id: number;
  ticket_id: string;
  event?: any;
  event_details?: any;
  ticket_type?: any;
  ticket_type_details?: any;
  ticket_type_name?: string;
  is_active: boolean;
  purchase_time: string;
  qr_code?: string;
  qr_code_url?: string;
  [key: string]: any; // For other potential fields
}

interface Ticket {
  id: number
  ticket_id: string
  event: {
    title: string
    date: string
    location: string
    id: number
    start_time?: string
    end_time?: string
  }
  event_details?: {
    title: string
    date: string
    location: string
    id: number
    start_time?: string
    end_time?: string
  }
  ticket_type?: {
    type: string
    id: number
  }
  ticket_type_details?: {
    type: string
    id: number
  }
  ticket_type_name?: string
  is_active: boolean
  purchase_time: string
  qr_code?: string
  qr_code_url?: string 
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true)
      try {
        const { getClerkToken } = await import("@/lib/clerkToken");
        const token = await getClerkToken();
        
        console.log("[DEBUG] Fetching tickets with token:", token ? "Token present" : "No token");
        
        const resp = await fetch("/api/tickets/", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include"
        });
        
        console.log("[DEBUG] Ticket API response status:", resp.status);
        
        if (!resp.ok) {
          const errorText = await resp.text();
          console.error(`[ERROR] Failed to fetch tickets (${resp.status}):`, errorText);
          throw new Error(`Failed to fetch tickets: ${resp.status} ${errorText}`);
        }
        
        const data = await resp.json();
        console.log("Raw ticket data:", data);
        
        // Normalize the ticket data to match our interface
        const normalizedTickets = data.map((ticket: RawTicketData) => {
          const normalized = {
            ...ticket,
            // Ensure event has the required fields
            event: ticket.event_details || ticket.event || {},
            // Handle ticket type from different sources
            ticket_type: ticket.ticket_type_details || ticket.ticket_type || { 
              type: ticket.ticket_type_name || 'Standard' 
            },
          };
          
          // Handle QR code URL - often comes as a media URL
          if (ticket.qr_code && typeof ticket.qr_code === 'string') {
            normalized.qr_code_url = ticket.qr_code.startsWith('/media/')
              ? `${window.location.protocol}//${window.location.hostname}:8000${ticket.qr_code}`
              : ticket.qr_code;
          } else if (ticket.qr_code_url && typeof ticket.qr_code_url === 'string') {
            normalized.qr_code_url = ticket.qr_code_url.startsWith('/media/')
              ? `${window.location.protocol}//${window.location.hostname}:8000${ticket.qr_code_url}`
              : ticket.qr_code_url;
          }
          
          return normalized;
        });
        
        console.log("Normalized tickets:", normalizedTickets);
        setTickets(normalizedTickets);
      } catch (e: Error) {
        console.error("Error fetching tickets:", e);
        setError(e.message || "Failed to load tickets");
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, []);

  const now = new Date()
  const upcoming = tickets.filter(ticket => {
    try {
      // The event data has empty date field but uses start_time instead
      const eventDate = ticket.event?.start_time || 
                        ticket.event_details?.start_time || 
                        ticket.event?.date || 
                        ticket.event_details?.date || '';
      
      console.log(`[DEBUG] Event date for ticket ${ticket.id}:`, eventDate);
      
      return eventDate ? new Date(eventDate) > now : false;
    } catch (e) {
      console.error("Invalid date for ticket:", ticket);
      return false;
    }
  })
  const past = tickets.filter(ticket => {
    try {
      // The event data has empty date field but uses start_time instead
      const eventDate = ticket.event?.start_time || 
                        ticket.event_details?.start_time || 
                        ticket.event?.date || 
                        ticket.event_details?.date || '';
      
      return eventDate ? new Date(eventDate) <= now : true;
    } catch (e) {
      console.error("Invalid date for ticket:", ticket);
      return true; // Show problematic tickets in past section
    }
  })

  return (
    <DashboardShell>
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">My Tickets</h2>
          </div>
          {error && <div className="text-red-500">{error}</div>}
          <Tabs defaultValue="upcoming" className="space-y-4">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                  <div>Loading...</div>
                ) : upcoming.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center space-y-4">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full max-w-[350px]"
                    >
                      <source src="/skiing.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <p className="text-muted-foreground text-center">No upcoming tickets. Time to plan your next adventure!</p>
                  </div>
                ) : (
                  upcoming.map(ticket => (
                    <Card key={ticket.id} >
                      <CardHeader className="pb-2">
                        <CardTitle>{ticket.event?.title || ticket.event_details?.title || 'Untitled Event'}</CardTitle>
                        <CardDescription>
                          {
                            (() => {
                              const eventDate = ticket.event?.start_time || 
                                                ticket.event_details?.start_time || 
                                                ticket.event?.date || 
                                                ticket.event_details?.date;
                              
                              return eventDate ? new Date(eventDate).toLocaleString() : 'Date not available';
                            })()
                          }
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-center py-4">
                          <div className="bg-background p-2 rounded-lg">
                            {ticket.qr_code || ticket.qr_code_url ? (
                                  <img
                                src={
                                  (() => {
                                    let url = ticket.qr_code_url || ticket.qr_code || '';
                                    if (url.startsWith('/media/')) {
                                      return `${window.location.protocol}//${window.location.hostname}:8000${url}`;
                                    }
                                    if (url.startsWith('https://127.0.0.1:8000/') || url.startsWith('https://localhost:8000/')) {
                                      return url.replace('https://', 'http://');
                                    }
                                    return url;
                                  })()
                                }
                                    alt="Ticket QR Code"
                                    width={128}
                                    height={128}
                                    style={{ background: 'white', borderRadius: 8 }}
                                onError={(e) => {
                                  console.error("Failed to load QR code image:", e.currentTarget.src);
                                  // Safely update the DOM
                                  const imgElem = e.currentTarget;
                                  imgElem.style.display = 'none';
                                  
                                  // Use a different approach to show the fallback QR code
                                  const container = imgElem.parentElement;
                                  if (container) {
                                    const svgElem = document.createElement('div');
                                    svgElem.innerHTML = `<svg width="128" height="128" style="background: white; border-radius: 8px"></svg>`;
                                    container.appendChild(svgElem);
                                  }
                                }}
                                  />
                                ) : (
                              <QRCodeSVG value={ticket.ticket_id || 'invalid-ticket'} size={128} />
                                )}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ticket Type:</span>
                            <span className="font-medium">
                              {ticket.ticket_type?.type || 
                               ticket.ticket_type_details?.type || 
                               ticket.ticket_type_name || 
                               '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Venue:</span>
                            <span className="font-medium">{ticket.event?.location || ticket.event_details?.location || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ticket ID:</span>
                            <span className="font-medium text-xs">{ticket.ticket_id}</span>
                          </div>
                          </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" size="sm" >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" asChild>
                          <a href={`/events/${ticket.event?.id || ticket.event_details?.id}`}><Eye className="h-4 w-4" /></a>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            <TabsContent value="past" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                  <div>Loading...</div>
                ) : past.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center space-y-4">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full max-w-[350px]"
                    >
                      <source src="/skiing.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <p className="text-muted-foreground text-center">No past tickets. Start creating new memories!</p>
                  </div>
                ) : (
                  past.map(ticket => (
                    <Card key={ticket.id} className=" opacity-70">
                      <CardHeader className="pb-2">
                        <CardTitle>{ticket.event?.title || ticket.event_details?.title || 'Untitled Event'}</CardTitle>
                        <CardDescription>
                          {
                            (() => {
                              const eventDate = ticket.event?.start_time || 
                                                ticket.event_details?.start_time || 
                                                ticket.event?.date || 
                                                ticket.event_details?.date;
                              
                              return eventDate ? new Date(eventDate).toLocaleString() : 'Date not available';
                            })()
                          }
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-center py-4">
                          <div className="bg-background p-2 rounded-lg">
                            {ticket.qr_code || ticket.qr_code_url ? (
                                <img
                                src={
                                  (() => {
                                    let url = ticket.qr_code_url || ticket.qr_code || '';
                                    if (url.startsWith('/media/')) {
                                      return `${window.location.protocol}//${window.location.hostname}:8000${url}`;
                                    }
                                    if (url.startsWith('https://127.0.0.1:8000/') || url.startsWith('https://localhost:8000/')) {
                                      return url.replace('https://', 'http://');
                                    }
                                    return url;
                                  })()
                                }
                                  alt="Ticket QR Code"
                                  width={128}
                                  height={128}
                                  style={{ background: 'white', borderRadius: 8 }}
                                onError={(e) => {
                                  console.error("Failed to load QR code image:", e.currentTarget.src);
                                  // Safely update the DOM
                                  const imgElem = e.currentTarget;
                                  imgElem.style.display = 'none';
                                  
                                  // Use a different approach to show the fallback QR code
                                  const container = imgElem.parentElement;
                                  if (container) {
                                    const svgElem = document.createElement('div');
                                    svgElem.innerHTML = `<svg width="128" height="128" style="background: white; border-radius: 8px"></svg>`;
                                    container.appendChild(svgElem);
                                  }
                                }}
                                />
                              ) : (
                              <QRCodeSVG value={ticket.ticket_id || 'invalid-ticket'} size={128} />
                              )}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ticket Type:</span>
                            <span className="font-medium">
                              {ticket.ticket_type?.type || 
                               ticket.ticket_type_details?.type || 
                               ticket.ticket_type_name || 
                               '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Venue:</span>
                            <span className="font-medium">{ticket.event?.location || ticket.event_details?.location || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ticket ID:</span>
                            <span className="font-medium text-xs">{ticket.ticket_id}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" size="sm" >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" asChild >
                          <a href={`/events/${ticket.event?.id || ticket.event_details?.id}`}><Eye className="h-4 w-4" /></a>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardShell>
  )
}

