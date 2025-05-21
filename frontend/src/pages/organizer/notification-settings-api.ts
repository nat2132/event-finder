import axios from 'axios';

export interface NotificationSettings {
  email_ticket_sales: boolean;
  email_event_reminders: boolean;
  email_promotional: boolean;
  push_ticket_sales: boolean;
  push_event_reminders: boolean;
  push_new_events: boolean;
  freq_realtime: boolean;
  freq_daily: boolean;
  freq_weekly: boolean;
}

export async function fetchNotificationSettings(token: string): Promise<NotificationSettings> {
  const res = await axios.get('/api/notification-settings/', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function updateNotificationSettings(settings: Partial<NotificationSettings>, token: string): Promise<NotificationSettings> {
  const res = await axios.put('/api/notification-settings/', settings, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
