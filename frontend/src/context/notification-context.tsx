import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getClerkToken } from '@/lib/clerkToken';
import axios from 'axios';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

// Define the notification interface with specific types
interface Notification {
  id: number;
  is_read: boolean;
  message: string;
  notification_type: string;
  created_at: string;
  link?: string;
  reference_id?: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const token = await getClerkToken();
      if (!token) return;

      const response = await axios.get("/api/user-notifications/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const notifications = response.data.results || response.data;
      const unread = notifications.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Failed to fetch unread notifications count:", error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount: fetchUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 