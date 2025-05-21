import { Bell, Calendar, Check, Clock, Ticket, Info } from "lucide-react"
import { useState, useEffect } from "react"
import { getClerkToken } from '@/lib/clerkToken';
import axios from "axios";
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from "@/context/notification-context";
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardShell } from "@/components/user/dashboard-shell"

type UserNotification = {
  id: number;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  link?: string;
  reference_id?: string;
};

export default function NotificationsPage() {
  const { refreshUnreadCount } = useNotifications();
  // State for user notifications
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [loadingUserNotifications, setLoadingUserNotifications] = useState(true);
  const [errorUserNotifications, setErrorUserNotifications] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all"); // To refresh list on tab change after marking read
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Function to create a test notification (for debugging only)
  const createTestNotification = async () => {
    try {
      // Create a local test notification for UI testing
      const testNotification: UserNotification = {
        id: Date.now(), // Use timestamp as temporary ID
        message: "This is a test notification created locally.",
        notification_type: "test_notification",
        is_read: false,
        created_at: new Date().toISOString(),
        link: "#",
        reference_id: "test-123"
      };
      
      setUserNotifications(prev => [testNotification, ...prev]);
      
      // Also try to create one on the server
      const token = await getClerkToken();
      if (token) {
        try {
          console.log("Attempting to create a test notification on the server...");
          const response = await axios.post("/api/user-notifications/ensure-event-reminder/", {
            event_id: "test-123",
            event_title: "Test Event",
            event_date_string: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log("Server response:", response.data);
        } catch (err) {
          console.error("Failed to create server notification:", err);
        }
      }
    } catch (err) {
      console.error("Failed to create test notification:", err);
    }
  };

  // Function to check backend connection and validate auth token
  const runDiagnostics = async () => {
    setDebugInfo("Running diagnostics...");
    const results: string[] = [];
    
    // 1. Check auth token
    const token = await getClerkToken();
    if (!token) {
      results.push("❌ Authentication token not available");
    } else {
      results.push("✅ Authentication token available");
      
      // Extract token parts for inspection (without revealing sensitive info)
      try {
        const [header, payload] = token.split('.');
        const decodedHeader = JSON.parse(atob(header));
        const decodedPayload = JSON.parse(atob(payload));
        
        results.push(`✅ Token type: ${decodedHeader.typ}`);
        results.push(`✅ Token algorithm: ${decodedHeader.alg}`);
        results.push(`✅ Token subject: ${decodedPayload.sub ? '(present)' : '(missing)'}`);
        results.push(`✅ Token expiration: ${new Date(decodedPayload.exp * 1000).toLocaleString()}`);
      } catch (error) {
        results.push(`❌ Error parsing token: ${(error as Error).message}`);
      }
    }
    
    // 2. Check basic API connectivity
    try {
      const response = await fetch(`/api/ping-test`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (response.ok) {
        results.push("✅ Basic API connectivity working");
      } else {
        results.push(`❌ API ping test failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      results.push(`❌ API ping test error: ${(err as Error).message}`);
    }
    
    // 3. Try basic endpoints without auth
    try {
      const response = await fetch(`/api/events/?limit=1`);
      if (response.ok) {
        results.push("✅ Public API endpoint working");
      } else {
        results.push(`❌ Public API test failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      results.push(`❌ Public API test error: ${(err as Error).message}`);
    }
    
    // Compile and display results
    setDebugInfo(results.join("\n"));
  };

  // Fetch user notifications
  useEffect(() => {
    async function loadUserNotifications() {
      setLoadingUserNotifications(true);
      setErrorUserNotifications(null);
      const token = await getClerkToken();
      
      console.log("🔍 Attempting to fetch notifications with token:", token ? "Token available" : "Token missing");
      
      if (!token) {
        setErrorUserNotifications("Authentication token not available.");
        setLoadingUserNotifications(false);
        return;
      }
      
      // Try multiple approaches to fetch notifications
      // 1. First, try the standard axios approach
      try {
        console.log("🔄 APPROACH 1: Trying standard axios GET request");
        
        const endpoint = "/api/user-notifications/";
        console.log(`📤 Making API request to ${endpoint}`);
        
        const response = await axios.get(endpoint, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log("📥 API Response status:", response.status);
        console.log("📥 API Response headers:", response.headers);
        console.log("📄 Full response data:", response.data);
        
        // Check response shape and handle data accordingly
        if (Array.isArray(response.data)) {
          console.log(`✅ Found ${response.data.length} notifications using approach 1`);
          setUserNotifications(response.data);
          setLoadingUserNotifications(false);
          return; // Success - exit early
        } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
          console.log(`✅ Found ${response.data.results.length} notifications in paginated results using approach 1`);
          setUserNotifications(response.data.results);
          setLoadingUserNotifications(false);
          return; // Success - exit early
        } else {
          console.warn("⚠️ Unexpected response format:", response.data);
          // Continue to next approach rather than setting error
        }
      } catch (error) {
        const err = error as Error & { 
          response?: { 
            status?: number; 
            statusText?: string; 
            data?: unknown; 
          } 
        };
        
        console.error(`❌ Approach 1 failed:`, err);
        console.error("Error details:", {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          responseData: err.response?.data
        });
        
        // Don't set error yet, try next approach
      }
      
      // 2. Try native fetch API as an alternative
      try {
        console.log("🔄 APPROACH 2: Trying native fetch API");
        
        const endpoint = "/api/user-notifications/";
        console.log(`📤 Making fetch API request to ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log("📥 Fetch API Response status:", response.status);
        console.log("📥 Fetch API Response headers:", Object.fromEntries([...response.headers]));
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("📄 Fetch API full response data:", data);
        
        if (Array.isArray(data)) {
          console.log(`✅ Found ${data.length} notifications using approach 2`);
          setUserNotifications(data);
          setLoadingUserNotifications(false);
          return; // Success - exit early
        } else if (data && data.results && Array.isArray(data.results)) {
          console.log(`✅ Found ${data.results.length} notifications in paginated results using approach 2`);
          setUserNotifications(data.results);
          setLoadingUserNotifications(false);
          return; // Success - exit early
        } else {
          console.warn("⚠️ Unexpected response format from fetch API:", data);
          // Continue to next approach
        }
      } catch (error) {
        console.error(`❌ Approach 2 failed:`, error);
      }
      
      // 3. Try a different endpoint path format
      try {
        console.log("🔄 APPROACH 3: Trying alternative endpoint path");
        
        const endpoint = "/api/notifications/user-notifications/";
        console.log(`📤 Making API request to ${endpoint}`);
        
        const response = await axios.get(endpoint, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log("📥 API Response status:", response.status);
        console.log("📥 API Response headers:", response.headers);
        console.log("📄 Full response data:", response.data);
        
        if (Array.isArray(response.data)) {
          console.log(`✅ Found ${response.data.length} notifications using approach 3`);
          setUserNotifications(response.data);
        } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
          console.log(`✅ Found ${response.data.results.length} notifications in paginated results using approach 3`);
          setUserNotifications(response.data.results);
        } else {
          console.warn("⚠️ Unexpected response format:", response.data);
          setUserNotifications([]);
          setErrorUserNotifications("Unexpected response format from server - please check the console for details.");
        }
      } catch (error) {
        const err = error as Error & { 
          response?: { 
            status?: number; 
            statusText?: string; 
            data?: unknown; 
          } 
        };
        
        console.error(`❌ Approach 3 failed:`, err);
        console.error("Error details:", {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          responseData: err.response?.data
        });
        
        // Now set error since all approaches failed
        if (err.response?.status === 404) {
          setErrorUserNotifications("Notification service not available. Check server configuration.");
        } else if (err.response?.status === 403) {
          setErrorUserNotifications("You don't have permission to view notifications.");
        } else if (err.response?.status === 401) {
          setErrorUserNotifications("Authentication error. Please log in again.");
        } else {
          setErrorUserNotifications(`Failed to load notifications after trying multiple approaches. See console for details.`);
        }
      } finally {
      setLoadingUserNotifications(false);
      }
    }
    loadUserNotifications();
  }, [activeTab]); // Re-fetch when activeTab changes (e.g., after marking all as read)

  const handleMarkAllAsRead = async () => {
    const token = await getClerkToken();
    if (!token) {
      alert("Authentication error. Please try again.");
      return;
    }
    try {
      // Use the correct endpoint path
      await axios.post("/api/user-notifications/mark_all_as_read/", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh notifications by updating the list or re-fetching
      setUserNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      // Refresh the unread count in the sidebar
      await refreshUnreadCount();
    } catch (error) {
      const err = error as Error;
      console.error("Failed to mark all notifications as read:", err);
      alert("Failed to mark all notifications as read.");
    }
  };

  // Handle marking a single notification as read
  const handleMarkAsRead = async (notificationId: number) => {
    const token = await getClerkToken();
    if (!token) {
      console.error("Authentication token not available.");
      return;
    }
    try {
      // Call the API to mark a single notification as read
      await axios.patch(`/api/user-notifications/${notificationId}/`, 
        { is_read: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state to reflect the change
      setUserNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
      
      // Refresh the unread count in the navbar
      await refreshUnreadCount();
    } catch (error) {
      const err = error as Error;
      console.error(`Failed to mark notification ${notificationId} as read:`, err);
    }
  };

  const renderNotificationIcon = (type: UserNotification['notification_type']) => {
    switch (type) {
      case 'purchase_success':
        return <Ticket className="h-4 w-4 text-primary" />;
      case 'purchase_failure':
        return <Info className="h-4 w-4 text-red-500" />;
      case 'event_reminder':
      case 'event_reminder_organizer':
        return <Calendar className="h-4 w-4 text-primary" />;
      case 'new_ticket_sale':
      case 'sales_milestone':
        return <Ticket className="h-4 w-4 text-primary" />;
      case 'test_notification':
        return <Info className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  // Get user-friendly name for notification type
  const getNotificationTypeName = (type: string): string => {
    return type
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getNotificationsForTab = (tab: string) => {
    if (tab === 'unread') {
      return userNotifications.filter(n => !n.is_read);
    }
    return userNotifications;
  };

  // Render a notification card with a consistent format
  const renderNotificationCard = (notification: UserNotification) => (
    <Card 
      key={notification.id} 
      className={`${notification.is_read ? 'opacity-70 bg-slate-50' : 'bg-white'} transition-all hover:shadow-md`}
      onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-2">
              {renderNotificationIcon(notification.notification_type)}
            </div>
            <div>
              <CardTitle className="text-base">
                {getNotificationTypeName(notification.notification_type)}
                {!notification.is_read && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                    New
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {notification.message}
              </CardDescription>
              {debugMode && notification.reference_id && (
                <p className="text-xs text-muted-foreground mt-1">Ref: {notification.reference_id}</p>
              )}
            </div>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </div>
        </div>
      </CardHeader>
      {notification.link && (
        <CardFooter className="flex justify-end p-4 pt-0">
          <Button asChild variant="ghost" size="sm">
            <a href={notification.link} target="_blank" rel="noopener noreferrer">View Details</a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  // Try to create a notification directly with the backend API
  const createDirectNotification = async () => {
    setDebugInfo("Attempting to create notification directly...");
    const token = await getClerkToken();
    if (!token) {
      setDebugInfo("❌ Authentication token not available");
      return;
    }
    
    try {
      // Using the event reminder endpoint directly with the API
      const response = await fetch("/api/user-notifications/ensure-event-reminder/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Using a numeric ID for test notifications
          event_id: null,
          event_title: "Direct Test Event",
          event_date_string: new Date(Date.now() + 3600000).toISOString(),
          is_test: true
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setDebugInfo("✅ Notification created successfully!\n" + JSON.stringify(data, null, 2));
        // Force refresh notifications
        const newNotification = {
          id: data.id || Date.now(),
          message: data.message || "Test notification created directly",
          notification_type: data.notification_type || "event_reminder",
          is_read: false,
          created_at: data.created_at || new Date().toISOString(),
          reference_id: data.reference_id || "direct-test",
        };
        
        setUserNotifications(prev => [newNotification, ...prev]);
      } else {
        const errorText = await response.text();
        setDebugInfo(`❌ Failed to create notification: ${response.status} ${response.statusText}\n${errorText}`);
      }
    } catch (error) {
      setDebugInfo(`❌ Error creating notification: ${(error as Error).message}`);
    }
  };

  return (
    <DashboardShell>
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
            <div className="flex gap-2">
              {debugMode && (
                <Button variant="outline" size="sm" onClick={createTestNotification}>
                  <Info className="mr-2 h-4 w-4" />
                  Create Test Notification
                </Button>
              )}
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground"
            onClick={() => setDebugMode(!debugMode)}
          >
            {debugMode ? "Hide Debug Tools" : "Show Debug Tools"}
          </Button>
          
          {debugMode && (
            <div className="mb-4 space-y-2">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={createTestNotification}
                >
                  <Info className="mr-2 h-4 w-4" />
                  Create Test Notification
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={runDiagnostics}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Run API Diagnostics
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={createDirectNotification}
                >
                  <Info className="mr-2 h-4 w-4" />
                  Direct API Test
                </Button>
              </div>
              
              {debugInfo && (
                <div className="bg-slate-50 p-3 rounded text-xs font-mono whitespace-pre overflow-x-auto">
                  {debugInfo}
                </div>
              )}
              
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs font-semibold mb-2">Debug Information</p>
                <ul className="text-xs list-disc pl-5 space-y-1">
                  <li>Make sure your Django server is running on http://localhost:8000</li>
                  <li>Check your browser console for detailed API responses</li>
                  <li>Ensure the notifications app URLs are properly configured in settings</li>
                  <li>Validate that your authentication token is being accepted by the server</li>
                  <li>Try running the API diagnostics to check connectivity</li>
                </ul>
              </div>
            </div>
          )}
          
          <Tabs defaultValue="all" className="space-y-4" onValueChange={setActiveTab} value={activeTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              {loadingUserNotifications && <p>Loading notifications...</p>}
              {errorUserNotifications && (
                <div>
                  <p className="text-red-500">{errorUserNotifications}</p>
                  {debugMode && (
                    <div className="mt-4 text-xs bg-gray-100 p-4 rounded overflow-auto">
                      <p className="font-bold">Debug Information:</p>
                      <p>- Try adding some test notifications using the debug button above</p>
                      <p>- Check browser console for detailed error logs</p>
                      <p>- Verify backend server is running on localhost:8000</p>
                      <p>- API endpoints tried: /api/user-notifications/ and /api/notifications/user-notifications/</p>
                    </div>
                  )}
                </div>
              )}
              {!loadingUserNotifications && !errorUserNotifications && getNotificationsForTab('all').length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center space-y-4">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full max-w-[350px]"
                  >
                    <source src="/travel.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-muted-foreground text-center">No notifications yet. Stay tuned for updates about your events!</p>
                  {debugMode && (
                    <p className="text-xs text-muted-foreground">
                      Use the "Create Test Notification" button above to add a test notification.
                    </p>
                  )}
                      </div>
              ) : (
                getNotificationsForTab('all').map(renderNotificationCard)
              )}
            </TabsContent>
            <TabsContent value="unread" className="space-y-4">
              {loadingUserNotifications && <p>Loading notifications...</p>}
              {errorUserNotifications && (
                <div>
                  <p className="text-red-500">{errorUserNotifications}</p>
                  {debugMode && (
                    <div className="mt-4 text-xs bg-gray-100 p-4 rounded overflow-auto">
                      <p className="font-bold">Debug Information:</p>
                      <p>- Try adding some test notifications using the debug button above</p>
                      <p>- Check browser console for detailed error logs</p>
                      <p>- Verify backend server is running on localhost:8000</p>
                      <p>- API endpoints tried: /api/user-notifications/ and /api/notifications/user-notifications/</p>
                    </div>
                  )}
                </div>
              )}
              {!loadingUserNotifications && !errorUserNotifications && getNotificationsForTab('unread').length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center space-y-4">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full max-w-[350px]"
                  >
                    <source src="/travel.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-muted-foreground text-center">No unread notifications. You're all caught up!</p>
                  {debugMode && (
                    <p className="text-xs text-muted-foreground">
                      Use the "Create Test Notification" button above to add a test notification.
                    </p>
                  )}
                </div>
              ) : (
                getNotificationsForTab('unread').map(renderNotificationCard)
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardShell>
  )
}
