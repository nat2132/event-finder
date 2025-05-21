import axios from 'axios';

export async function updateEventTickets(eventId: string, tickets: { name: string; quantity: number }[], token: string): Promise<any> {
  const res = await axios.post(`/api/events/${eventId}/update_tickets/`, { tickets }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export interface EventInput {
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  address: string;
  ticketTypes: { name: string; price: string; quantity: string }[];
  image?: string; // cover image URL
}

export interface Creator {
  name: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  text: string;
  date: string;
  rating: number;
}

export interface Event {
  saved?: boolean;
  rating?: number;
  comments?: Comment[];
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  address: string;
  ticketTypes: { name: string; price: string; quantity: string }[];
  image?: string;
  creator?: Creator;
  organizer_name?: string;
  organizer_image?: string;
  startDate?: string; // Added for discover page filters
  endDate?: string;   // Added for discover page filters
  start_time?: string; // Added for date formatting
  end_time?: string;   // Added for date formatting
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function createEvent(event: EventInput, token: string): Promise<Event> {
  console.log("[createEvent] Sending event with Authorization header:", `Bearer ${token}`);
  const res = await axios.post('/api/events/', event, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data as Event;
}

// Uploads a single image file and returns the uploaded image URL
export async function uploadEventImage(file: File, token?: string, onUploadProgress?: (percent: number) => void): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await axios.post('/api/events/upload-image/', formData, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Do not set 'Content-Type' for FormData! Axios will handle it.
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percent);
      }
    },
  });
  return res.data.url;
}


export async function deleteEvent(eventId: string, token: string): Promise<void> {
  await axios.delete(`/api/events/${eventId}/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function fetchEvents(token?: string, isDiscover: boolean = false): Promise<PaginatedResponse<Event>> {
  const params = isDiscover ? { discover: 'true' } : {};
  const res = await axios.get('/api/events/', {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  
  // Process event data to ensure organizer information is available
  const data = res.data;
  if (data.results) {
    data.results = data.results.map((event: Event) => {
      // Fix organizer image URLs if they start with /media/
      if (event.organizer_image && event.organizer_image.startsWith('/media/')) {
        event.organizer_image = `${window.location.protocol}//${window.location.hostname}:8000${event.organizer_image}`;
      }
      
      // Ensure creator object is properly initialized
      if (!event.creator) {
        event.creator = {
          name: event.organizer_name || "Event Organizer",
          avatar: event.organizer_image || "/placeholder.svg"
        };
      } else if (event.creator.avatar && event.creator.avatar.startsWith('/media/')) {
        event.creator.avatar = `${window.location.protocol}//${window.location.hostname}:8000${event.creator.avatar}`;
      }
      
      // Format date properly for display
      if (event.start_time && !event.date) {
        const startDate = new Date(event.start_time);
        event.date = startDate.toLocaleString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      return event;
    });
  }
  
  return data;
}

// Fetch a single event by ID
export async function fetchEventById(eventId: string, token?: string): Promise<Event> {
  const res = await axios.get(`/api/events/${eventId}/`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  const event = res.data as Event;
  
  // Fix organizer image URLs if they start with /media/
  if (event.organizer_image && event.organizer_image.startsWith('/media/')) {
    event.organizer_image = `${window.location.protocol}//${window.location.hostname}:8000${event.organizer_image}`;
  }
  
  // Ensure creator object is properly initialized
  if (!event.creator) {
    event.creator = {
      name: event.organizer_name || "Event Organizer",
      avatar: event.organizer_image || "/placeholder.svg"
    };
  } else if (event.creator.avatar && event.creator.avatar.startsWith('/media/')) {
    event.creator.avatar = `${window.location.protocol}//${window.location.hostname}:8000${event.creator.avatar}`;
  }
  
  // Format date properly for display
  if (event.start_time && !event.date) {
    const startDate = new Date(event.start_time);
    event.date = startDate.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return event;
}

// Get comments for an event
export async function getEventComments(eventId: string, token?: string): Promise<any[]> {
  const res = await axios.get(`/api/events/${eventId}/comments/`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  return res.data;
}

// Post a comment to an event
export async function postEventComment(eventId: string, comment: string, rating: number | null, token: string): Promise<{success: boolean, comments: any[], rating: number}> {
  const res = await axios.post(`/api/events/${eventId}/comments/add/`, { comment, rating }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// Update a comment on an event
export async function updateEventComment(eventId: string, commentId: string, text: string, rating: number | null, token: string): Promise<{success: boolean, comments: any[]}> {
  const res = await axios.put(`/api/events/${eventId}/comments/${commentId}/`, { text, rating }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// Delete a comment from an event
export async function deleteEventComment(eventId: string, commentId: string, token: string): Promise<{success: boolean, comments: any[]}> {
  const res = await axios.delete(`/api/events/${eventId}/comments/${commentId}/delete/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}