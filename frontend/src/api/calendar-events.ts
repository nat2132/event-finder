import axios from "axios";
import type { CalendarEvent } from "@/lib/calendar";

const API_URL = "/api/calendar-events/";

export async function fetchCalendarEvents(token: string): Promise<CalendarEvent[]> {
  const res = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function createCalendarEvent(event: Omit<CalendarEvent, "id">, token: string): Promise<CalendarEvent> {
  const res = await axios.post(API_URL, event, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function updateCalendarEvent(id: number, event: Omit<CalendarEvent, "id">, token: string): Promise<CalendarEvent> {
  const res = await axios.put(`${API_URL}${id}/`, event, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function deleteCalendarEvent(id: number, token: string): Promise<void> {
  await axios.delete(`${API_URL}${id}/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
