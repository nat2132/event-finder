import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getClerkToken } from "@/lib/clerkToken";
import { createEventReminderNotification } from "@/api/notifications";

interface EventReminderButtonProps {
  eventId: string | number;
  eventTitle: string;
  eventDate: string;
  className?: string;
}

export function EventReminderButton({ 
  eventId, 
  eventTitle, 
  eventDate, 
  className = "" 
}: EventReminderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReminded, setIsReminded] = useState(false);

  const handleSetReminder = async () => {
    if (isReminded) return;
    
    setIsLoading(true);
    
    try {
      const token = await getClerkToken();
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please log in to set event reminders",
          variant: "destructive"
        });
        return;
      }
      
      // Check if the ID is numeric 
      const isNumericId = typeof eventId === 'number' || (typeof eventId === 'string' && /^\d+$/.test(eventId));
      
      // Pass the event ID only if it's a valid numeric ID
      await createEventReminderNotification(
        token, 
        isNumericId ? eventId : null, 
        eventTitle, 
        eventDate
      );
      
      setIsReminded(true);
      toast({
        title: "Reminder set",
        description: `We'll remind you before "${eventTitle}" begins`,
      });
    } catch (error) {
      console.error("Failed to set event reminder:", error);
      toast({
        title: "Failed to set reminder",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isReminded ? "outline" : "default"}
      size="sm"
      className={className}
      onClick={handleSetReminder}
      disabled={isLoading || isReminded}
    >
      <Bell className="mr-2 h-4 w-4" />
      {isReminded ? "Reminder set" : "Set reminder"}
    </Button>
  );
} 