import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bell, Ticket, Calendar, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { getClerkToken } from "@/lib/clerkToken";
import { fetchUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, getNotificationTypeInfo, formatNotificationTime } from "@/api/notifications";
import type { UserNotification } from "@/api/notifications";
import { useToast } from "@/hooks/use-toast";

export function DashboardHeader() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchNotificationData = async () => {
    try {
      const token = await getClerkToken();
      if (!token) return;

      const fetchedNotifications = await fetchUserNotifications(token);
      // Limit to 5 most recent notifications for the dropdown
      setNotifications(fetchedNotifications.slice(0, 5));
      setError(null);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const token = await getClerkToken();
      if (!token) return;

      await markNotificationAsRead(id, token);
      
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === id 
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  };

  const handleMarkAllAsRead = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const token = await getClerkToken();
      if (!token) return;

      await markAllNotificationsAsRead(token);
      
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          is_read: true
        }))
      );
      
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchNotificationData();
    
    // Set up polling to check for new notifications every 30 seconds
    const interval = setInterval(fetchNotificationData, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(notification => !notification.is_read).length;
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket':
        return <Ticket className="h-4 w-4 text-blue-500" />;
      case 'event':
        return <Calendar className="h-4 w-4 text-green-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-16 items-center justify-between border-b bg-background px-4"
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px]">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-sm text-destructive">
                  {error}
                </div>
              ) : notifications.length > 0 ? (
                <>
                  {notifications.map((notification) => {
                    const typeInfo = getNotificationTypeInfo(notification.notification_type);
                    return (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`flex gap-3 p-3 ${
                        !notification.is_read ? "bg-muted/50" : ""
                      }`}
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                    >
                      <div className="mt-0.5">
                          {getNotificationIcon(typeInfo.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium truncate">
                              {typeInfo.title}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
                              {formatNotificationTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator className="bg-slate-200" />
                  <div className="flex justify-between px-3 py-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => handleMarkAllAsRead(e)}
                      disabled={unreadCount === 0}
                    >
                      Mark all as read
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/organizer/notifications" className="text-primary">
                        View all
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              )}
            </DropdownMenuContent>
        </DropdownMenu>
        <ModeToggle />
      </div>
    </motion.header>
  )
}
