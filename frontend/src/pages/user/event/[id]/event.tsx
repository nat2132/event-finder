import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useParams, useLocation } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { fetchEventById, getEventComments, postEventComment, updateEventComment, deleteEventComment } from "../../../organizer/event-api";
import type {Event as EventType} from "../../../organizer/event-api";
import { fetchTicketmasterTicketTypes, fetchTicketmasterEventById, fetchSkiddleEvents} from "@/api/external-events-api";
import type { ExternalEventCard } from "@/api/external-events-api";
import { Calendar, ChevronLeft, MapPin, Save, Share2, Star, Ticket } from "lucide-react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DashboardShell } from "@/components/user/dashboard-shell"
import { StarRating } from "@/components/user/star-rating"
import { CommentList } from "@/components/user/comment-list"
import { CommentForm } from "@/components/user/comment-form"
import type { Comment } from "@/components/user/comment-carousel"
import { TicketPurchaseDialog } from "@/components/user/ticket-purchase-dialog"
import { toast } from "@/hooks/use-toast"
import { EventReminderButton } from "@/components/user/event-reminder-button"

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { getToken } = useAuth();
  const { user, isSignedIn } = useUser();
  const [event, setEvent] = useState<EventType | ExternalEventCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comments, setComments] = useState<Comment[]>([]);
  // Provide a single onEdit handler for CommentList
  const handleEditComment = async (comment: Comment) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const response = await updateEventComment(id, comment.id, comment.text, comment.rating, token);
      setComments(response.comments || []);
      toast({ title: "Comment updated!", variant: "success" });
    } catch (err) {
      toast({ title: "Failed to update comment", description: "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for deleting comment
  const handleDeleteComment = async (comment: Comment) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const response = await deleteEventComment(id!, comment.id, token);
      setComments(response.comments || []);
      toast({ title: "Comment deleted!", variant: "success" });
    } catch (err) {
      toast({ title: "Failed to delete comment", description: "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadEvent() {
      console.log('EventDetailPage loadEvent running, id:', id, 'location.search:', location.search);
      setLoading(true);
      setError(null);
      try {
        // Check for ?source=Skiddle or ?source=Ticketmaster
        const params = new URLSearchParams(location.search);
        const source = params.get('source');
        const paymentStatus = params.get('payment');
        
        // Check if this is a return from successful payment
        if (paymentStatus === 'success') {
          try {
            // Get previous payment data from localStorage
            const pendingTicketData = localStorage.getItem(`pending_tickets_${id}`);
            console.log(`[DEBUG] Payment success! Found stored ticket data for event ${id}:`, pendingTicketData);
            
            if (pendingTicketData) {
              const token = await getToken();
              const ticketDetails = JSON.parse(pendingTicketData);
              console.log(`[DEBUG] Parsed ticket details:`, ticketDetails);
              
              // Create tickets in the user's account
              try {
                console.log("[DEBUG] Creating tickets for user after payment:", ticketDetails);
                
                // Process each ticket into individual requests
                for (const [ticketName, quantity] of Object.entries(ticketDetails)) {
                  // Create individual ticket requests based on quantity
                  for (let i = 0; i < Number(quantity); i++) {
                    try {
                      console.log(`[DEBUG] Creating ticket ${i+1}/${quantity} for ${ticketName}, eventId: ${id}`);
                      
                      // Build ticket payload
                      const payload = {
                        event_id: id,
                        ticket_type_name: ticketName
                      };
                      console.log('[DEBUG] Ticket payload:', payload);
                      
                      const resp = await fetch("/api/tickets/", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify(payload),
                        credentials: "include",
                      });
                      
                      // Log the entire response
                      const responseText = await resp.text();
                      console.log(`[DEBUG] Ticket creation response (${resp.status}):`, responseText);
                      
                      if (!resp.ok) {
                        console.error(`Failed to create ticket ${i+1} of ${quantity} for ${ticketName}:`, responseText);
                      } else {
                        console.log(`Successfully created ticket ${i+1} of ${quantity} for ${ticketName}`);
                        
                        // Try to parse the result to validate the creation succeeded
                        try {
                          const ticketData = JSON.parse(responseText);
                          console.log(`Created ticket with ID: ${ticketData.id}, QR code: ${ticketData.qr_code || 'none'}`);
                        } catch (parseError) {
                          console.warn("Could not parse ticket response:", parseError);
                        }
                      }
                    } catch (error) {
                      console.error(`Error creating ticket ${i+1} of ${quantity} for ${ticketName}:`, error);
                    }
                  }
                }
              } catch (ticketError) {
                console.error("Error creating tickets after payment:", ticketError);
                toast({
                  title: "Ticket Creation Failed",
                  description: "We processed your payment but couldn't create your tickets. Please contact support.",
                  variant: "destructive"
                });
              }
              
              // Update ticket counts in backend
              console.log("[DEBUG] Updating ticket counts after payment:", ticketDetails);
              
              try {
                const { updateEventTickets } = await import("@/pages/organizer/event-api");
                // Group tickets by event_id
                const tickets = Object.entries(ticketDetails).map(([name, quantity]) => ({
                  name,
                  quantity: Number(quantity)
                }));
                
                if (tickets.length > 0) {
                  // Update the backend
                  await updateEventTickets(id!, tickets, token);
                  console.log("[DEBUG] Successfully updated ticket counts");
                  
                  // Clear the pending ticket data
                  localStorage.removeItem(`pending_tickets_${id}`);
                }
              } catch (updateError) {
                console.error("Error updating tickets after payment:", updateError);
              }
            }
            
            // Show payment success message
            toast({
              title: "Payment Successful!",
              description: "Your tickets have been purchased successfully.",
              variant: "default"
            });
            
            // Create a purchase success notification
            try {
              const { createPurchaseSuccessNotification } = await import("@/api/notifications");
              const totalTickets = Object.values(ticketDetails).reduce((sum, qty) => sum + Number(qty), 0);
              
              // Make sure we have a valid numeric ID for the event
              const numericId = id && /^\d+$/.test(id) ? id : null;
              
              await createPurchaseSuccessNotification(
                token,
                numericId || "unknown",
                event?.title || "Event",
                totalTickets
              );
              console.log("[DEBUG] Created purchase success notification");
            } catch (notifError) {
              console.error("Error creating purchase notification:", notifError);
            }
            
            // Clean up the URL to remove payment status
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          } catch (err) {
            console.error("Error handling payment success:", err);
          }
        }
        
        // If source is 'manual' or not specified, treat as internal event
        if (!source || source === 'manual') {
          // Internal event
          const token = await getToken();
          const data = await fetchEventById(id!, token);
          if (!data.creator && (data.organizer_name || data.organizer_image)) {
            data.creator = {
              name: data.organizer_name,
              avatar: data.organizer_image,
            };
          }
          console.log('Setting internal event:', data);
          setEvent(data);
          // Fetch comments from backend
          const backendComments = await getEventComments(id!, token);
          setComments(backendComments || []);
        } else if (source && id) {
          // External event
          let externalEvent: ExternalEventCard | undefined;
          if (source === 'Skiddle') {
            const events = await fetchSkiddleEvents("");
            externalEvent = events.find(e => e.id === id && e.source === 'Skiddle');
            console.log('Fetched Skiddle event:', externalEvent);
            if (!externalEvent) {
              console.warn('External Skiddle event not found for id:', id);
            }
          } else if (source === 'Ticketmaster') {
            externalEvent = await fetchTicketmasterEventById(id);
            console.log('Fetched Ticketmaster event:', externalEvent);
            if (!externalEvent) {
              console.warn('External Ticketmaster event not found for id:', id);
            }
            if (externalEvent) {
              try {
                const ticketTypes = await fetchTicketmasterTicketTypes(id);
                console.log('Ticketmaster ticketTypes:', ticketTypes);
                externalEvent.ticketTypes = ticketTypes;
              } catch (err) {
                console.error('Error fetching Ticketmaster ticket types:', err);
                externalEvent.ticketTypes = [];
              }
            }
          }
          if (externalEvent) {
            console.log('Setting external event:', externalEvent);
            setEvent(externalEvent);
            setComments([]); // Or fetch comments from your backend if you support this for external events
          } else {
            console.error('External event not found for source:', source, 'id:', id);
            setError('External event not found.');
          }
        } else {
          // Internal event
          const token = await getToken();
          const data = await fetchEventById(id!, token);
          // Ensure creator object is present
          if (!data.creator && (data.organizer_name || data.organizer_image)) {
            data.creator = {
              name: data.organizer_name,
              avatar: data.organizer_image,
            };
          }
          console.log('Setting internal event:', data);
          setEvent(data);
          // Fetch comments from backend
          const backendComments = await getEventComments(id!, token);
          setComments(backendComments || []);
        }
      } catch (err) {
        console.error('Error loading event:', err);
        setError("Failed to load event.");
      } finally {
        setLoading(false);
      }
    }
    if (id) loadEvent();
  }, [id, getToken, location.search]);

  useEffect(() => {
    if (event) {
      console.log('Event detail loaded:', event); // Debug: inspect event object
      setLoading(false);
    }
  }, [event]);

  const handleCommentSubmit = async (values: { text: string; rating: number }) => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const response = await postEventComment(id!, values.text, values.rating, token);
      setComments(response.comments || []);
      if (event) setEvent({ ...event, rating: response.rating });
    } catch (err) {
      toast({ title: "Failed to submit comment", description: "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleTicketPurchase = async (selectedTickets: { [key: string]: number }) => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const resp = await fetch("/api/tickets/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          event_id: id,
          tickets: selectedTickets,
        }),
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Failed to purchase ticket(s)");
      toast({
        title: "Purchase successful!",
        description: "Your ticket(s) have been added. View them in My Tickets.",
      });
      // Refresh event to update tickets sold
      await loadEvent();
    } catch (e: any) {
      toast({
        title: "Purchase failed",
        description: e.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) return <div className="flex justify-center items-center h-64 text-xl font-semibold">Loading event...</div>;
  if (error) return <div className="flex justify-center items-center h-64 text-xl font-semibold text-red-500">{error}</div>;
  if (!event) return <div className="flex justify-center items-center h-64 text-xl font-semibold">Event not found.</div>;

  return (
    <DashboardShell>
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <button type="button" onClick={() => window.history.back()} className="flex items-center">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Events
              </button>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={event.image || "/placeholder.svg"}
                  alt={event.title || 'Event image'}
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full shadow-lg"
                    onClick={() => setSaved(!saved)}
                  >
                    <Save className={cn("h-4 w-4", saved && "fill-primary")} />
                    <span className="sr-only">{saved ? "Unsave" : "Save"}</span>
                  </Button>
                  <Button variant="secondary" size="icon" className="rounded-full shadow-lg">
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Share</span>
                  </Button>
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-bold">{event.title || 'Untitled Event'}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* Only show category, type, and price ONCE, remove extras below */}
                  {/* Category */}
                  <Badge variant="outline" >
                    {event.category || 'Uncategorized'}
                  </Badge>
                  {/* Type (if present) */}
                  {event.type && (
                    <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-800">
                      {event.type}
                    </Badge>
                  )}
                  {/* Rating and Reviews */}
                  <div className="flex items-center text-sm ml-4">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                    <span className="text-muted-foreground ml-1">
                      ({typeof event.totalReviews === 'number' ? event.totalReviews : (Array.isArray(event.comments) ? event.comments.length : 0)} reviews)
                    </span>
                  </div>
                </div>
                {/* Organizer info */}
                <div className="flex items-center gap-2 mt-4">
                  <Avatar>
                    <AvatarImage
                      src={
                        (() => {
                          // Check for organizer image from different sources
                          let imageUrl = '';
                          
                          // First check organizer_image
                          if (event.organizer_image) {
                            imageUrl = event.organizer_image;
                          } 
                          // Then try creator avatar
                          else if (event.creator?.avatar) {
                            imageUrl = event.creator.avatar;
                          }
                          
                          // Handle various URL formats
                          if (imageUrl.startsWith('/media/')) {
                            return `${window.location.protocol}//${window.location.hostname}:8000${imageUrl}`;
                          } else if (imageUrl.startsWith('https://127.0.0.1:8000/') || imageUrl.startsWith('https://localhost:8000/')) {
                            // Replace https with http for localhost to avoid mixed content issues
                            return imageUrl.replace('https://', 'http://');
                          }
                          
                          return imageUrl || "/placeholder.svg";
                        })()
                      }
                      alt={event.organizer_name || event.creator?.name || "Organizer"}
                      onError={(e) => {
                        console.log("Organizer avatar failed to load:", e.currentTarget.src);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <AvatarFallback>{event.organizer_name || event.creator?.name?.[0] || "O"}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{event.organizer_name || event.creator?.name || "Event Organizer"}</span>
                </div>
              </div>

              <Tabs defaultValue="about" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="space-y-4">
                  <Card >
                    <CardHeader>
                      <CardTitle>About this event</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="whitespace-pre-line">{event.description || 'No description available.'}</p>

                      <div className="grid gap-4 md:grid-cols-2 mt-6">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Date and Time</div>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            {event.date || 'Date not available'}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-sm font-medium">Location</div>
                          <div className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            {event.location}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-sm font-medium">Price</div>
                          <div className="text-sm">
                            {event.ticketTypes && event.ticketTypes.length > 0
                              ? (() => {
                                  const prices = event.ticketTypes
                                    .map((t: any) => parseFloat(t.price))
                                    .filter((p: number) => !isNaN(p));
                                  if (prices.length === 0) return "N/A";
                                  const min = Math.min(...prices);
                                  const max = Math.max(...prices);
                                  return min === max ? `ETB ${min}` : `ETB ${min} - ETB ${max}`;
                                })()
                              : "N/A"}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-sm font-medium">Organizer</div>
                          <div className="flex items-center text-sm">
                            <Avatar className="h-5 w-5 mr-2">
                              <AvatarImage
                                src={
                                  (() => {
                                    // Check for organizer image from different sources
                                    let imageUrl = '';
                                    
                                    // First check organizer_image
                                    if (event.organizer_image) {
                                      imageUrl = event.organizer_image;
                                    } 
                                    // Then try creator avatar
                                    else if (event.creator?.avatar) {
                                      imageUrl = event.creator.avatar;
                                    }
                                    
                                    // Handle various URL formats
                                    if (imageUrl.startsWith('/media/')) {
                                      return `${window.location.protocol}//${window.location.hostname}:8000${imageUrl}`;
                                    } else if (imageUrl.startsWith('https://127.0.0.1:8000/') || imageUrl.startsWith('https://localhost:8000/')) {
                                      // Replace https with http for localhost to avoid mixed content issues
                                      return imageUrl.replace('https://', 'http://');
                                    }
                                    
                                    return imageUrl || "/placeholder.svg";
                                  })()
                                }
                                alt={event.organizer_name || event.creator?.name || "Organizer"}
                                onError={(e) => {
                                  console.log("Organizer avatar in About tab failed to load:", e.currentTarget.src);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <AvatarFallback>{(event.organizer_name || event.creator?.name || "O").charAt(0)}</AvatarFallback>
                            </Avatar>
                            {event.organizer_name || event.creator?.name || "Event Organizer"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reviews" className="space-y-4">
                  <Card >
                    <CardHeader>
                      <CardTitle>Reviews</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {typeof event.totalReviews === 'number' ? `${event.totalReviews} review${event.totalReviews === 1 ? '' : 's'}` : `${comments.length} review${comments.length === 1 ? '' : 's'}`}
                        {typeof event.rating === 'number' && (
                          <> • {event.rating} average rating</>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-4">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center justify-center bg-primary/5 rounded-full h-20 w-20"
                        >
                          <div className="text-center">
                            <div className="text-2xl font-bold">{event.rating}</div>
                            <StarRating rating={event.rating ?? 0} size="sm" />
                          </div>
                        </motion.div>

                        <div className="flex-1">
                          <div className="space-y-1">
                            {[5, 4, 3, 2, 1].map((star, idx) => {
                              const count = comments.filter(c => Number(c.rating) === star).length;
                              const percent = comments.length > 0 ? (count / comments.length) * 100 : 0;
                              return (
                                <div className="flex items-center gap-2" key={star}>
                                  <div className="text-xs w-8">{star} ★</div>
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percent}%` }}
                                      transition={{ delay: 0.1 + idx * 0.1, duration: 0.8 }}
                                      className="h-full bg-yellow-400"
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground ml-2 min-w-[18px] text-right">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-medium mb-4">Leave a review</h3>
                        <CommentForm onSubmit={handleCommentSubmit} isSubmitting={isSubmitting} />
                      </div>

                      {(() => {
                        console.log("Clerk user id (frontend):", user?.id);
                        console.log("Comments from backend:", comments);
                        return null;
                      })()}
                      <div className="border-t pt-6">
                        <h3 className="font-medium mb-4">All reviews</h3>
                        <CommentList
                          comments={comments}
                          currentUserId={user?.id}
                          onEdit={handleEditComment}
                          onDelete={handleDeleteComment}
                          renderReply={(comment) =>
                            comment.responses && comment.responses.length > 0 ? (
                              <div className="space-y-2 mt-2 ml-6">
                                {comment.responses.map((response) => (
                                  <div key={response.id} className="bg-slate-100 rounded p-2 text-sm border-l-4 border-yellow-400">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold">{response.organizerName || 'Organizer'}:</span>
                                      <span className="text-xs text-muted-foreground">{new Date(response.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div>{response.content}</div>
                                  </div>
                                ))}
                              </div>
                            ) : null
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="location" className="space-y-4">
                  <Card >
                    <CardHeader>
                      <CardTitle>Location</CardTitle>
                      <CardDescription className="text-muted-foreground">{event.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
                        <iframe
                          title="Event Location Map"
                          width="100%"
                          height="100%"
                          style={{ border: 0, minHeight: 240, borderRadius: 8 }}
                          loading="lazy"
                          allowFullScreen
                          src={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                        ></iframe>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-4">              
              <Card className="border-primary/10 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary" />
                    Get Tickets
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Secure your spot at this event</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {(() => {
                    const isExternal = event.source === 'Skiddle' || event.source === 'Ticketmaster';
                    // Filter out placeholder/fake tickets for external events
                    let realTicketTypes = event.ticketTypes || [];
                    if (isExternal && Array.isArray(realTicketTypes)) {
                      realTicketTypes = realTicketTypes.filter((ticket: any) => {
                        // Remove tickets with name 'General Admission' and price 'See site', 'N/A', or undefined
                        const isPlaceholder = (
                          ticket.name === 'General Admission' &&
                          (ticket.price === 'See site' || ticket.price === 'N/A' || ticket.price === undefined || ticket.price === null)
                        );
                        return !isPlaceholder;
                      });
                    }
                    // If this is an external event and no real ticket types are available, show a clear placeholder message
                    if (isExternal && (!realTicketTypes || realTicketTypes.length === 0)) {
                      return (
                        <div className="text-sm text-center py-4 bg-muted/30 rounded-md">
                          Tickets not available. Check the official site for details.
                        </div>
                      );
                    }
                    // For internal events, or if there are tickets for external events, show the ticket list and dialog
                    if (!realTicketTypes || realTicketTypes.length === 0) {
                      return (
                        <div className="text-sm text-center py-4 bg-muted/30 rounded-md">
                          No tickets available at this time
                        </div>
                      );
                    }
                      return (
                        <>
                        <div className="space-y-3">
                            {realTicketTypes.map((ticket: any) => {
                      const available = typeof ticket.available === 'number'
                        ? ticket.available
                        : (typeof ticket.quantity === 'number' && typeof ticket.sold === 'number'
                            ? Math.max(0, ticket.quantity - ticket.sold)
                            : (typeof ticket.quantity === 'number' ? ticket.quantity : 0));
                      return (
                              <div className="flex flex-col p-3 border rounded-md hover:bg-muted/20 transition-colors" key={ticket.id ?? ticket.name}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium">{ticket.name}</span>
                                  <span className="font-semibold text-primary">
                                    {ticket.price === 'Free' || ticket.price === 0 || ticket.price === '0' 
                                      ? 'Free' 
                                      : (ticket.price ? `ETB ${ticket.price}` : 'N/A')}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground">
                                    {typeof available === 'number' 
                                      ? available > 0 
                                        ? `${available} available` 
                                        : "Sold out" 
                                      : 'N/A'}
                                  </span>
                                  {typeof available === 'number' && available > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {available < 10 ? "Limited" : "Available"}
                                    </Badge>
                                  )}
                                </div>
                        </div>
                      );
                    })}
                          <div className="text-xs text-muted-foreground mt-2 text-center">
                            * Prices may vary based on availability
                          </div>
                          </div>
                          {/* Only show the TicketPurchaseDialog if at least one ticket is available */}
                          {realTicketTypes.some((ticket: any) => {
                            const available = typeof ticket.available === 'number'
                              ? ticket.available
                              : (typeof ticket.quantity === 'number' && typeof ticket.sold === 'number'
                                  ? Math.max(0, ticket.quantity - ticket.sold)
                                  : (typeof ticket.quantity === 'number' ? ticket.quantity : 0));
                            return available > 0;
                          }) && (
                            <TicketPurchaseDialog
                              eventTitle={event.title}
                              eventDate={`${event.date}${event.time ? ", " + event.time : ""}`}
                              eventImage={event.image}
                              ticketTypes={realTicketTypes.map((ticket: any) => ({
                                id: String(ticket.id ?? ticket.name ?? Math.random().toString(36).substr(2, 9)),
                                name: ticket.name ?? "Ticket",
                                price: typeof ticket.price === 'number' ? ticket.price : Number(ticket.price) || 0,
                                description: ticket.description ?? "",
                                benefits: ticket.benefits ?? [],
                                // Prefer ticket.available from backend, otherwise compute from quantity minus sold (if present), fallback to 0
                                available: typeof ticket.available === 'number'
                                  ? ticket.available
                                  : (typeof ticket.quantity === 'number' && typeof ticket.sold === 'number'
                                      ? Math.max(0, ticket.quantity - ticket.sold)
                                      : (typeof ticket.quantity === 'number' ? ticket.quantity : 0)),
                                maxPerOrder: Number(ticket.maxPerOrder ?? 20),
                                event_id: String(event.id),
                              }))}
                              onPurchase={handleTicketPurchase}
                            trigger={
                              <Button className="w-full mt-2 text-primary-foreground bg-primary cursor-pointer hover:bg-primary/80">
                                <Ticket className="h-4 w-4 mr-2" />
                                Buy Tickets
                              </Button>
                            }
                            />
                          )}
                          
                          {/* Add reminder button if user is authenticated */}
                          {isSignedIn && (
                            <EventReminderButton 
                              eventId={id!}
                              eventTitle={event.title}
                              eventDate={`${event.date}${event.time ? ", " + event.time : ""}`}
                              className="w-full mt-2"
                            />
                          )}
                        </>
                      );
                    })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Share This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        className="h-4 w-4"
                      >
                        <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z" />
                      </svg>
                    </Button>
                    <Button variant="outline" size="icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        className="h-4 w-4"
                      >
                        <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z" />
                      </svg>
                    </Button>
                    <Button variant="outline" size="icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        className="h-4 w-4"
                      >
                        <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" />
                      </svg>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center justify-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Copy Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
