import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronDown, ChevronUp, CreditCard, Minus, Plus, Ticket } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface TicketType {
  id: string; // Use string for DB PK (to support both numeric and named IDs)
  name: string;
  price: number;
  description: string;
  benefits: string[];
  available: number;
  maxPerOrder: number;
  event_id: string; // Use string for event_id
}

interface TicketPurchaseDialogProps {
  eventTitle: string
  eventDate: string
  eventImage?: string
  ticketTypes: TicketType[]
  trigger?: React.ReactNode
  onPurchase?: (selectedTickets: { [key: string]: number }) => void
}

export function TicketPurchaseDialog({
  eventTitle,
  eventDate,
  eventImage,
  ticketTypes,
  trigger,
  onPurchase,
}: TicketPurchaseDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>({})
  const [expandedBenefits, setExpandedBenefits] = useState<{ [key: string]: boolean }>({})

  const handleQuantityChange = (ticketId: string, change: number) => {
    setSelectedTickets((prev) => {
      const currentQuantity = prev[ticketId] || 0
      // ticketId is string, ticketTypes.id is string
      const ticketType = ticketTypes.find((t) => t.id === ticketId)
      const maxPerOrder = ticketType?.maxPerOrder || 10
      const newQuantity = Math.max(0, Math.min(currentQuantity + change, maxPerOrder))

      if (newQuantity === 0) {
        const newSelected = { ...prev }
        delete newSelected[ticketId]
        return newSelected
      }
      return { ...prev, [ticketId]: newQuantity }
    })
  }

  const toggleBenefits = (ticketId: string) => {
    setExpandedBenefits((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }))
  }

  const calculateTotal = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      const ticket = ticketTypes.find((t) => t.id === ticketId);
      return total + (ticket?.price || 0) * quantity;
    }, 0);
  }

  const handlePurchase = async () => {
    if (!hasSelectedTickets) return;
    // Calculate total and prepare ticket details
    const total = calculateTotal();
    
    console.log("[DEBUG] Ticket types from event:", ticketTypes);
    
    const ticketDetails = Object.entries(selectedTickets)
      .map(([ticketId, quantity]) => {
        const ticket = ticketTypes.find((t) => t.id === ticketId);
        
        if (!ticket) {
          console.error(`[ERROR] Could not find ticket type with ID ${ticketId}`);
          return undefined;
        }
        
        // Create a proper ticket object for the purchase
        const ticketData = {
              id: ticket.id, // String PK
              name: ticket.name,
              price: ticket.price,
              quantity,
              event_id: ticket.event_id, // Include event_id for backend
        };
        
        console.log(`[DEBUG] Created ticket data for ${ticket.name}:`, ticketData);
        return ticketData;
      })
      .filter((t): t is { id: string; name: string; price: number; quantity: number; event_id: string } => !!t);

    // Debug: log selected tickets and ticket details
    console.log('[DEBUG] selectedTickets:', selectedTickets);
    console.log('[DEBUG] ticketDetails:', ticketDetails);

    // Defensive: prevent empty purchases
    if (!ticketDetails.length) {
      toast({
        title: "No tickets selected",
        description: "Please select at least one ticket.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Start with a loading indicator
      toast({
        title: "Processing payment",
        description: "Please wait while we prepare your payment...",
      });
      
      // Verify event_id is present on all tickets
      const missingEventId = ticketDetails.some(ticket => !ticket.event_id);
      if (missingEventId) {
        console.error("Some tickets are missing event_id:", ticketDetails);
        toast({
          title: "Payment Error",
          description: "Ticket data is incomplete. Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }

      // Dynamically import Clerk token utility
      const { getClerkToken } = await import("@/lib/clerkToken");
      const token = await getClerkToken();
      console.log("[DEBUG] Clerk token:", token);
      
      // Dynamically import the Chapa payment initializer for event tickets
      const { initializeEventTicketChapaPayment } = await import("@/lib/chapa");
      
      // Create global Clerk object if needed
      if (window && !(window as any).Clerk) {
        (window as any).Clerk = { session: { getToken: async () => token } };
      }
      
      try {
      const checkoutUrl = await initializeEventTicketChapaPayment({
        tickets: ticketDetails,
        total,
        eventTitle,
        eventDate
      });
        
        console.log("[DEBUG] Received checkout URL:", checkoutUrl);
        
        if (checkoutUrl && typeof checkoutUrl === 'string' && checkoutUrl.startsWith('http')) {
          // Store the ticket data in localStorage to be used when returning from payment
          try {
            // For backend compatibility, we need to convert the tickets to the right format
            // The backend expects individual ticket_type_name keys
            const serverTicketFormat: Record<string, number> = {};
            
            // Map each ticket to format needed by the server
            ticketDetails.forEach(ticket => {
              // Use the ticket name as key (equivalent to ticket_type_name in backend)
              serverTicketFormat[ticket.name] = ticket.quantity;
            });
            
            // Get event_id from the first ticket
            const eventId = ticketDetails[0]?.event_id;
            
            if (eventId) {
              console.log(`[DEBUG] Storing tickets in localStorage for event ${eventId}:`, serverTicketFormat);
              localStorage.setItem(`pending_tickets_${eventId}`, JSON.stringify(serverTicketFormat));
            } else {
              console.error("No event_id found in ticket details");
            }
          } catch (storageError) {
            console.error("Failed to store ticket data in localStorage:", storageError);
          }
          
          // Show success toast before redirecting
          toast({
            title: "Payment ready",
            description: "Redirecting to secure payment page...",
            variant: "default"
          });
          
          // Short delay to allow toast to show before redirect
          setTimeout(() => {
            // Successful redirect to Chapa
            window.location.href = checkoutUrl;
          }, 1000);
        } else {
          console.error("Invalid checkout URL format:", checkoutUrl);
          throw new Error("Invalid checkout URL received: " + (checkoutUrl ? typeof checkoutUrl : "undefined"));
        }
      } catch (error) {
        console.error("Payment initialization error:", error);
        
        // Create a purchase failure notification
        try {
          const { createPurchaseFailureNotification } = await import("@/api/notifications");
          await createPurchaseFailureNotification(
            token, 
            ticketDetails[0]?.event_id || "unknown", 
            eventTitle,
            error instanceof Error ? error.message : "Payment initialization failed"
          );
          console.log("[DEBUG] Created purchase failure notification");
        } catch (notifError) {
          console.error("Error creating failure notification:", notifError);
        }
        
        toast({
          title: "Payment Error",
          description: error instanceof Error 
            ? error.message 
            : "Failed to initialize payment. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      // The code below won't execute due to the redirect, but we'll keep it for
      // reference for your payment success callback implementation
      /*
      try {
        const { updateEventTickets } = await import("@/pages/organizer/event-api");
        // Group by event_id (should be same for all, but future-proof)
        const byEvent: { [eventId: string]: { name: string; quantity: number }[] } = {};
        ticketDetails.forEach(t => {
          if (!byEvent[t.event_id]) byEvent[t.event_id] = [];
          byEvent[t.event_id].push({ name: t.name, quantity: t.quantity });
        });
        for (const eventId in byEvent) {
          await updateEventTickets(eventId, byEvent[eventId], token);
        }
        toast({ title: "Tickets updated!", description: "Your purchase was successful.", variant: "success" });
        if (onPurchase) onPurchase(selectedTickets);
      } catch (err) {
        toast({ title: "Ticket Update Failed", description: "Could not update ticket counts. Please refresh.", variant: "destructive" });
      }
      */
    } catch (e: any) {
      let message = "Failed to initialize payment. Please try again.";
      if (e instanceof Error) {
        message = e.message;
      } else if (typeof e === 'string') {
        message = e;
      }
      toast({
        title: "Payment Error",
        description: message,
        variant: "destructive"
      });
    }
    setOpen(false);
  }

  const hasSelectedTickets = Object.values(selectedTickets).some((quantity) => quantity > 0)

  // If there are no ticket types, show a friendly message and hide all selection/payment UI
  if (!ticketTypes || ticketTypes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Ticket className="mr-2 h-4 w-4" />
              Buy Tickets
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden z-90">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl">{eventTitle} - Tickets</DialogTitle>
            <DialogDescription>{eventDate}</DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-4">
            <div className="text-sm text-muted-foreground text-center">
              Ticket information is not available for this event. Please check the official event page for details.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Ticket className="mr-2 h-4 w-4" />
            Buy Tickets
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden z-90">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">{eventTitle} - Tickets</DialogTitle>
          <DialogDescription>{eventDate}</DialogDescription>
        </DialogHeader>

        {eventImage && (
          <div className="relative h-32 overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${eventImage})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}

        <div className="p-6 pt-4 space-y-4 max-h-[50vh] overflow-y-auto">
          <AnimatePresence>
            {ticketTypes.map((ticket) => {
              const ticketIdStr = String(ticket.id);
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden ">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{ticket.name}</CardTitle>
                          <CardDescription>{ticket.description}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{ticket.price} ETB</div>
                          <div className="text-xs text-muted-foreground">{ticket.available} available</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-xs "
                          onClick={() => toggleBenefits(ticketIdStr)}
                        >
                          {expandedBenefits[ticketIdStr] ? "Hide benefits" : "Show benefits"}
                          {expandedBenefits[ticketIdStr] ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(ticketIdStr, -1)}
                            disabled={!selectedTickets[ticketIdStr]}
                          >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center">{selectedTickets[ticket.id] || 0}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(ticket.id, 1)}
                          disabled={
                            (selectedTickets[ticket.id] || 0) >= ticket.maxPerOrder ||
                            (selectedTickets[ticket.id] || 0) >= ticket.available
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedBenefits[ticket.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-2">
                            <h4 className="text-sm font-semibold">Benefits:</h4>
                            <ul className="text-sm space-y-1">
                              {ticket.benefits.map((benefit, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                  <CardFooter>
                    {selectedTickets[String(ticket.id)] && (
                      <div className="text-sm font-semibold ml-auto">
                        Subtotal: {ticket.price * selectedTickets[String(ticket.id)]} ETB
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            )
          })} 
          </AnimatePresence>

          {hasSelectedTickets && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(selectedTickets).map(([ticketId, quantity]) => {
                    const ticket = ticketTypes.find((t) => t.id === ticketId)
                    if (!ticket || quantity === 0) return null

                    return (
                      <div key={ticketId} className="flex justify-between text-sm">
                        <span>
                          {ticket.name} x {quantity}
                        </span>
                        <span className="font-semibold">{ticket.price * quantity} ETB</span>
                      </div>
                    )
                  })}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{calculateTotal()} ETB</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0">
          <TooltipProvider>
            <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mb-2 sm:mb-0">
                    <Button className="w-full" disabled={!hasSelectedTickets} onClick={handlePurchase}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      {hasSelectedTickets ? "Proceed to Payment" : "Select Tickets"}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className={cn(!hasSelectedTickets && "hidden")}>
                  <p>Continue to payment gateway</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
