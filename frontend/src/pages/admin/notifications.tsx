import { useState, useEffect, useCallback } from "react";
import { Bell, Check, Settings, UserPlus, UserCog, CreditCard, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";    
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; 
import AdminLayout from "./AdminLayout";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import { formatDistanceToNow } from 'date-fns'; // For relative time formatting
import { T, TranslatedAttributeRenderer } from "@/context/translation"; // Added imports

// Interface matching backend AdminNotificationSerializer
interface AdminNotificationData {
  id: number;
  message: string;
  notification_type: string; // e.g., 'user_signup', 'admin_change'
  timestamp: string; // ISO string
  target_role: string; // 'all' or 'super_admin'
  is_read: boolean;
  link?: string | null;
  // actor_name?: string | null; // Uncomment if using actor details
}

// Interface for paginated API response
interface PaginatedNotificationsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminNotificationData[];
}

// Define the type for the active tab
type NotificationTab = 'all' | 'unread'; // Simplified for now

// Helper function to get icons based on notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'user_signup': return <UserPlus className="h-4 w-4 text-green-600" />;
    case 'admin_change': return <UserCog className="h-4 w-4 text-blue-600" />;
    case 'revenue_milestone': return <CreditCard className="h-4 w-4 text-purple-600" />;
    case 'user_create': 
    case 'user_update': return <Edit className="h-4 w-4 text-orange-600" />;
    case 'user_delete': return <Trash2 className="h-4 w-4 text-red-600" />;
    case 'event_create': 
    case 'event_update': return <Edit className="h-4 w-4 text-teal-600" />;
    case 'event_delete': return <Trash2 className="h-4 w-4 text-red-600" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const getNotificationBgColor = (isRead: boolean): string => {
    return isRead ? '' : 'bg-slate-100';
};

export function NotificationsPage() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const [notifications, setNotifications] = useState<AdminNotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add pagination state if needed later
  // const [count, setCount] = useState(0);
  // const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  // const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);
  // const [currentPage, setCurrentPage] = useState(1);
  // const [pageSize, setPageSize] = useState(20); // Example page size

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Authentication token not available."); // TODO: Translate
        setNotifications([]);
        setLoading(false);
        return;
      }

      const response = await axios.get<PaginatedNotificationsResponse>("/api/admin/notifications/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Ensure we set an empty array if results is missing
      setNotifications(response.data.results || []);
    } catch (err: unknown) {
      console.error("Failed to fetch notifications:", err);
      let message = "Failed to load notifications."; // Default/fallback message
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.detail || err.message || message;
      }
      setError(message); // TODO: Translate this message string
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // --- Actions (Placeholder/Future Implementation) ---
  const markAsRead = (id: number) => {
     console.log("Marking notification as read (not implemented yet):", id);
     // TODO: Implement API call to PATCH notification status
     setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n)); // Optimistic UI update
  };

  const markAllAsRead = () => {
    console.log("Marking all as read (not implemented yet)");
    // TODO: Implement API call to mark all as read
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); // Optimistic UI update
  };

  const clearAllNotifications = () => {
    console.log("Clearing all notifications (not implemented yet)");
     // TODO: Implement API call to DELETE all notifications (or mark archived)
     setNotifications([]);
  };
  // --- End Actions ---

  // Filtering based on the active tab (client-side for now)
  // Make sure notifications is always an array before filtering
  const filteredNotifications = Array.isArray(notifications) 
    ? notifications.filter(n => activeTab === 'all' || (activeTab === 'unread' && !n.is_read))
    : [];

  return (
    <AdminLayout>
        <div className="flex flex-col justify-between w-full gap-4 md:flex-row md:items-center">
          <div className="mb-4">
            <h1 className="text-3xl font-bold tracking-tight"><T>Notifications</T></h1>
            <p className="text-muted-foreground"><T>Recent administrative activities and alerts</T></p>
          </div>
          <div className="flex gap-2">
            <TranslatedAttributeRenderer text="Mark all as read">
              {(translatedText) => (
                <Button variant="outline"  onClick={markAllAsRead} disabled={loading || notifications.every(n => n.is_read)} title={translatedText} aria-label={translatedText}>
                  <Check className="mr-2 h-4 w-4" />
                  <T>Mark all as read</T>
                </Button>
              )}
            </TranslatedAttributeRenderer>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <TranslatedAttributeRenderer text="Actions">
                  {(translatedText) => (
                    <Button variant="outline"  title={translatedText} aria-label={translatedText}>
                      <Settings className="mr-2 h-4 w-4" /> <T>Actions</T>
                    </Button>
                  )}
                </TranslatedAttributeRenderer>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className=" ">
                {/* Future settings link? */}
                {/* <DropdownMenuItem className="cursor-pointer hover:bg-slate-100">Notification preferences</DropdownMenuItem> */}
                <DropdownMenuItem onClick={clearAllNotifications} className="cursor-pointer hover:bg-slate-100 text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> <T>Clear all notifications</T>
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="w-full">
            <Card >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle><T>Recent Notifications</T></CardTitle>
                  <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as NotificationTab)} >
                    <TabsList className="grid w-full grid-cols-2 ">
                      <TabsTrigger value="all"><T>All</T></TabsTrigger>
                      <TabsTrigger value="unread"><T>Unread</T></TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                 {loading ? (
                   <div className="text-center py-10"><T>Loading notifications...</T></div>
                 ) : error ? (
                   <div className="text-center py-10 text-red-600"><T>Error:</T> <T>{error}</T></div> // Error itself needs to be a translation key or translated before setting
                 ) : (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Add max height and scroll */}
                    {Array.isArray(filteredNotifications) && filteredNotifications.length > 0 ? (
                        filteredNotifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`flex gap-4 rounded-lg border  p-4 ${getNotificationBgColor(notification.is_read)} cursor-pointer hover:bg-slate-50 transition-colors duration-150`}
                            onClick={() => markAsRead(notification.id)}
                        >
                            <div className="flex-shrink-0 pt-1">
                            {getNotificationIcon(notification.notification_type)}
                            </div>
                            <div className="flex-1 min-w-0"> {/* Ensure text wraps */}
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-700 break-words"><T>{notification.message}</T></p> {/* Assuming notification.message is a key or pre-translated */}
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2 whitespace-nowrap">
                                 {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                </span>
                            </div>
                             {/* Optional: Display Actor */} 
                            {/* {notification.actor_name && <p className="text-xs text-gray-400">By: {notification.actor_name}</p>} */} 
                             {/* Optional: Display Link */} 
                             {notification.link && 
                                <a href={notification.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                                    <T>View Details</T>
                                </a>
                            }
                            </div>
                            {!notification.is_read && (
                            <div className="flex h-2 w-2 items-center pt-1 flex-shrink-0">
                                <div className="h-2 w-2 rounded-full bg-blue-700" />
                            </div>
                            )}
                        </div>
                        ))
                    ) : (
                        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed ">
                        <p className="text-muted-foreground">
                          <T>No</T> {activeTab === 'unread' ? <T>unread </T> : ''}<T>notifications found.</T>
                        </p>
                        </div>
                    )}
                    </div>
                 )}
              </CardContent>
            </Card>
          </div>
        </div>
    </AdminLayout>
  )
}

export default NotificationsPage; 
