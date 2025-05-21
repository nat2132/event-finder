import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bell, Calendar, Check, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardLayout } from "@/components/organizer/dashboard-layout"
import { getClerkToken } from '@/lib/clerkToken';
import { fetchUserNotifications, markAllNotificationsAsRead, markNotificationAsRead, getNotificationTypeInfo, formatNotificationTime } from "@/api/notifications";
import type { UserNotification } from "@/api/notifications";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  // Notification tab and state
  const [activeTab, setActiveTab] = useState<string>("all");
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadNotifications() {
      const token = await getClerkToken();
      if (!token) return;
      
      try {
        setIsLoadingNotifications(true);
        const data = await fetchUserNotifications(token);
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        toast({
          title: "Error",
          description: "Failed to load notifications. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingNotifications(false);
      }
    }
    
    loadNotifications();
    
    // Poll for new notifications every minute
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [toast]);

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.is_read;
    
    // Filter by type
    const typeInfo = getNotificationTypeInfo(notification.notification_type);
    return typeInfo.icon === activeTab;
  });

  const handleMarkAsRead = async (id: number) => {
    const token = await getClerkToken();
    if (!token) return;
    
    try {
      await markNotificationAsRead(id, token);
      setNotifications(
        notifications.map((notification) =>
          notification.id === id ? { ...notification, is_read: true } : notification
        )
    );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = await getClerkToken();
    if (!token) return;
    
    try {
      await markAllNotificationsAsRead(token);
      setNotifications(notifications.map(notification => ({ ...notification, is_read: true })));
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ticket":
        return <Bell className="h-4 w-4" />
      case "event":
        return <Calendar className="h-4 w-4" />
      case "message":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

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
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">Manage your notifications and preferences</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Settings</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" >
                <DropdownMenuItem  className="cursor-pointer hover:bg-slate-100">Notification preferences</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-slate-100">Email settings</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-slate-100">Clear all notifications</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-6 w-full">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Notifications</CardTitle>
                  <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} >
                    <TabsList className="grid w-full grid-cols-3 ">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="unread">Unread</TabsTrigger>
                      <TabsTrigger value="event">Events</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingNotifications ? (
                    <div className="flex h-32 items-center justify-center rounded-lg border">
                      <p className="text-muted-foreground">Loading notifications...</p>
                    </div>
                  ) : filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => {
                      const typeInfo = getNotificationTypeInfo(notification.notification_type);
                      return (
                      <div
                        key={notification.id}
                          className={`flex gap-4 rounded-lg border p-4 ${!notification.is_read ? "bg-slate-100" : ""}`}
                          onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-700">
                            {getNotificationIcon(typeInfo.icon)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                              <h4 className="font-medium">{typeInfo.title}</h4>
                              <span className="text-xs text-muted-foreground">{formatNotificationTime(notification.created_at)}</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                          {!notification.is_read && (
                          <div className="flex h-2 w-2 items-center">
                            <div className="h-2 w-2 rounded-full bg-blue-700" />
                          </div>
                        )}
                      </div>
                      );
                    })
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-lg border">
                      <p className="text-muted-foreground">No notifications found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  )
}
