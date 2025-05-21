// src/api/saved-events.ts
import axios from 'axios'

export interface SavedEvent {
  id: string
  event: any // Should match your backend's EventSerializer
  saved_at: string
}

// All functions now require a JWT token. Pass it as the first argument.

export async function fetchSavedEvents(token: string) {
  const res = await axios.get<SavedEvent[]>('/api/saved-events/', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}

// Save an event (internal or external)
// For external events, provide eventData, isExternal, and source
export async function saveEvent(
  eventId: string,
  token: string,
  eventData?: any,
  isExternal?: boolean,
  source?: string
) {
  // The backend will handle free plan limit checking now
  const payload: any = { event_id: eventId };
  
  // Use external_event_data which is what the backend expects
  if (eventData) payload.external_event_data = eventData;
  if (typeof isExternal !== 'undefined') payload.is_external = isExternal;
  if (source) payload.source = source;
  
  try {
    const res = await axios.post<SavedEvent>('/api/saved-events/', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    // Check if this is a free plan limit error
    if (error.response && error.response.status === 403 && 
        error.response.data && error.response.data.error === 'FREE_PLAN_LIMIT') {
      throw new Error('FREE_PLAN_LIMIT');
    }
    // Re-throw other errors
    throw error;
  }
}

export async function unsaveEvent(eventId: string, token: string) {
  await axios.delete(`/api/saved-events/${eventId}/`, {
    headers: { Authorization: `Bearer ${token}` }
  })
}
