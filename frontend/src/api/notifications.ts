import axios from 'axios';

export interface UserNotification {
  id: number;
  message: string;
  notification_type: 'event_reminder' | 'purchase_success' | 'new_ticket_sale' | 'sales_milestone' | 'event_reminder_organizer' | 'purchase_failure';
  is_read: boolean;
  created_at: string;
  link?: string;
  reference_id?: string;
}

// Function to fetch all user notifications
export async function fetchUserNotifications(token: string): Promise<UserNotification[]> {
  const res = await axios.get('/api/user-notifications/', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// Function to mark a notification as read
export async function markNotificationAsRead(id: number, token: string): Promise<UserNotification> {
  const res = await axios.patch(`/api/user-notifications/${id}/`, 
    { is_read: true },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// Function to mark all notifications as read
export async function markAllNotificationsAsRead(token: string): Promise<{ status: string }> {
  const res = await axios.post('/api/user-notifications/mark_all_as_read/', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// Create a purchase success notification
export async function createPurchaseSuccessNotification(
  token: string, 
  eventId: string | number, 
  eventTitle: string, 
  ticketCount: number
): Promise<UserNotification> {
  const res = await axios.post('/api/user-notifications/', {
    message: `Successfully purchased ${ticketCount} ticket${ticketCount > 1 ? 's' : ''} for "${eventTitle}"`,
    notification_type: 'purchase_success',
    reference_id: `purchase-${eventId}`,
    link: `/events/${eventId}`
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// Create a purchase failure notification
export async function createPurchaseFailureNotification(
  token: string, 
  eventId: string | number, 
  eventTitle: string, 
  errorMessage: string
): Promise<UserNotification> {
  const res = await axios.post('/api/user-notifications/', {
    message: `Failed to purchase tickets for "${eventTitle}": ${errorMessage}`,
    notification_type: 'purchase_failure',
    reference_id: `purchase-fail-${eventId}`,
    link: `/events/${eventId}`
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// Create an event reminder notification
export async function createEventReminderNotification(
  token: string,
  eventId: string | number,
  eventTitle: string,
  eventDate: string
): Promise<UserNotification> {
  // Check if the eventId is a valid number
  const isNumericId = typeof eventId === 'number' || /^\d+$/.test(String(eventId));
  
  // Use the API payload structure expected by the backend
  const payload = {
    event_id: isNumericId ? eventId : null, // Only send ID if it's numeric
    event_title: eventTitle,
    event_date_string: eventDate,
    // If we don't have a valid event ID, this will create a standalone notification
    is_test: !isNumericId
  };
  
  const res = await axios.post('/api/user-notifications/ensure-event-reminder/', payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// Helper function to get the notification icon type based on notification_type
export function getNotificationTypeInfo(type: UserNotification['notification_type']) {
  switch (type) {
    case 'new_ticket_sale':
      return { icon: 'ticket', title: 'New Ticket Sale' };
    case 'sales_milestone':
      return { icon: 'ticket', title: 'Sales Milestone' };
    case 'event_reminder':
    case 'event_reminder_organizer':
      return { icon: 'event', title: 'Event Reminder' };
    case 'purchase_success':
      return { icon: 'message', title: 'Purchase Confirmation' };
    case 'purchase_failure':
      return { icon: 'alert', title: 'Purchase Failed' };
    default:
      return { icon: 'bell', title: 'Notification' };
  }
}

// Format the time difference from now for a notification
export function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffDay < 30) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
} 