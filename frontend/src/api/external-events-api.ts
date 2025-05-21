import axios from "axios";

// --- API KEYS (Replace with your actual keys) ---
const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
const SKIDDLE_API_KEY = import.meta.env.VITE_SKIDDLE_API_KEY;

// --- API ENDPOINTS ---
const TICKETMASTER_ENDPOINT = "https://app.ticketmaster.com/discovery/v2/events.json";
const SKIDDLE_ENDPOINT = "https://www.skiddle.com/api/v1/events/search/";

// --- Event Card Shape ---
export interface ExternalEventCard {
  id: string;
  title: string;
  description: string;
  image: string;
  date: string;
  location: string;
  category: string;
  type?: string; // Event type (e.g., Nightclub, live, etc.)
  saved: boolean;
  creator?: {
    name: string;
    avatar?: string;
  };
  rating?: number;
  comments?: any[];
  source: 'Ticketmaster' | 'Skiddle';
  ticketTypes: TicketType[];
  totalReviews: number;
  price?: string; // Main price (minimum from tickets)
  startDate?: string; // Added for discover page filters
  endDate?: string;   // Added for discover page filters
}

export interface TicketType {
  name: string;
  price: string;
  currency?: string;
  available?: number;
}



// Fetch Ticketmaster ticket types for a single event
export async function fetchTicketmasterTicketTypes(eventId: string): Promise<TicketType[]> {
  const url = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`;
  const res = await axios.get(url, {
    params: { apikey: TICKETMASTER_API_KEY }
  });
  const event = res.data;
  // Ticketmaster uses priceRanges, no ticket names, so we fake a single type
  if (event.priceRanges && event.priceRanges.length > 0) {
    return event.priceRanges.map((pr: any, idx: number) => ({
      name: pr.type || `General Admission ${idx + 1}`,
      price: pr.min === pr.max ? `${pr.min}` : `${pr.min} - ${pr.max}`,
      currency: pr.currency,
      available: undefined // Not provided
    }));
  } else {
    return [{ name: 'General Admission', price: 'See site', available: undefined }];
  }
}


// Fetch a single Ticketmaster event by ID
export async function fetchTicketmasterEventById(eventId: string): Promise<ExternalEventCard | null> {
  if (!TICKETMASTER_API_KEY) {
    throw new Error("Ticketmaster API key is missing");
  }
  const url = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`;
  try {
    const res = await axios.get(url, {
      params: { apikey: TICKETMASTER_API_KEY }
    });
    if (res.data) {
      return normalizeTicketmasterEvent(res.data);
    }
    return null;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}

// --- Ticketmaster Fetch & Normalize ---
export async function fetchTicketmasterEvents(query: string, location?: string, category?: string): Promise<ExternalEventCard[]> {
  const params: any = {
    apikey: TICKETMASTER_API_KEY,
    keyword: query,
    size: 10,
  };
  if (location) params.city = location;
  if (category) params.segmentName = category;
  const res = await axios.get(TICKETMASTER_ENDPOINT, { params });
  const events = res.data._embedded?.events || [];
  return events.map(normalizeTicketmasterEvent);
}

function normalizeTicketmasterEvent(event: any): ExternalEventCard {
  return {
    id: event.id,
    title: event.name,
    description: event.info || event.pleaseNote || "",
    image: event.images?.[0]?.url || "/placeholder.svg",
    date: event.dates?.start?.localDate || "",
    location: event._embedded?.venues?.[0]?.name || "",
    category: event.classifications?.[0]?.segment?.name || "",
    saved: false,
    creator: {
      name: event.promoter?.name || "Ticketmaster Organizer",
      avatar: event.promoter?.image || event.promoter?.logo || undefined,
    },
    rating: event.ratingAverage || event.rating || undefined,
    comments: [],
    source: 'Ticketmaster',
  };
}

// Fetch a single Skiddle event by ID
export async function fetchSkiddleEventById(eventId: string): Promise<ExternalEventCard | null> {
  if (!SKIDDLE_API_KEY) {
    throw new Error("Skiddle API key is missing");
  }
  // Skiddle event details endpoint
  const url = `https://www.skiddle.com/api/v1/events/${eventId}/`;
  try {
    const res = await axios.get(url, {
      params: { api_key: SKIDDLE_API_KEY, description: 1 },
    });
    if (res.data) {
      // Skiddle sometimes wraps the event in a 'results' field
      const eventObj = res.data.results || res.data;
      return normalizeSkiddleEvent(eventObj);
    }
    return null;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}

// --- Skiddle & Ticketmaster Fetch & Normalize ---
export async function fetchSkiddleEvents(query: string, location?: string, category?: string): Promise<ExternalEventCard[]> {
  if (!SKIDDLE_API_KEY) {
    throw new Error("Skiddle API key is missing");
  }
  const params: any = {
    api_key: SKIDDLE_API_KEY,
    limit: 20,
    description: 1,
  };
  if (query && query !== "undefined" && query !== "") {
    params.keyword = query;
  }
  if (location && location !== "undefined" && location !== "") {
    params.town = location;
  }
  if (category && category !== "undefined" && category !== "") {
    params.eventcode = category;
  }
  try {
    const res = await axios.get(SKIDDLE_ENDPOINT, { params });
    const events = res.data.results || [];
    return events.map(normalizeSkiddleEvent);
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return [];
    }
    throw error;
  }
}

import { SKIDDLE_CATEGORIES } from './external-categories';

function normalizeSkiddleEvent(event: any): ExternalEventCard {
  // Use 'skEvent' consistently to refer to the actual event data object
  // This handles potential nesting if fetching by ID, but for search results, event IS the object.
  const skEvent = event.results ? event.results : event;

  let category = 'Uncategorized';
  let rating: number | null | undefined = undefined; // Explicitly allow null
  let normalizedPrice = '';
  let totalReviews = 0;
  let ticketTypes: TicketType[] = [];

  // --- Category ---
  const eventCode = skEvent.EventCode || skEvent.eventcode; // Use skEvent
  if (eventCode) {
    // Ensure SKIDDLE_CATEGORIES is imported and structured correctly
    const cat = SKIDDLE_CATEGORIES.find(c => c.id.toLowerCase() === String(eventCode).toLowerCase());
    category = cat ? cat.name : String(eventCode); // Fallback to code if no name found
  }

  // --- Rating ---
  // Prefer specific rating fields if they exist, then fall back to venue rating
  if (typeof skEvent.reviewscore === 'number') {
    rating = skEvent.reviewscore;
  } else if (typeof skEvent.ratingAverage === 'number') {
    rating = skEvent.ratingAverage;
  } else if (typeof skEvent.rating === 'number') { // Top-level rating
    rating = skEvent.rating;
  } else if (skEvent.venue && typeof skEvent.venue.rating === 'number') { // Venue rating (as seen in your Postman data)
    rating = skEvent.venue.rating;
  } else {
      rating = null; // Explicitly set to null if no rating found
  }
  // Ensure rating is either a number or null/undefined as per your interface
  if (rating !== null && typeof rating !== 'number') {
      rating = undefined;
  }


  // --- Price ---
  // Prefer entryprice, then ticketpricing, then tickets array (less common in search results)
  if (skEvent.entryprice && skEvent.entryprice !== '') { // Use skEvent
    normalizedPrice = skEvent.entryprice;
  } else if (skEvent.ticketpricing && typeof skEvent.ticketpricing.minPrice !== 'undefined') { // Use skEvent & check minPrice
    const minPrice = skEvent.ticketpricing.minPrice;
    const maxPrice = skEvent.ticketpricing.maxPrice;
    if (typeof maxPrice !== 'undefined' && minPrice !== maxPrice) {
      // Format as range if min and max differ
      normalizedPrice = `${minPrice} - ${maxPrice}`;
    } else {
      // Format as single price if only min exists or min === max
      normalizedPrice = `${minPrice}`;
    }
     // Add currency symbol if available (assuming GBP from your example)
     const currencySymbol = skEvent.currency === 'GBP' ? '£' : (skEvent.currency || ''); // Or use a lookup
     if (normalizedPrice) {
        // Check if already contains symbol (less likely here)
        if (!normalizedPrice.includes(currencySymbol) && currencySymbol) {
             normalizedPrice = normalizedPrice.replace(/(\d+(\.\d+)?)/g, `${currencySymbol}$1`);
        }
     }

  } else if (Array.isArray(skEvent.tickets) && skEvent.tickets.length > 0) { // Use skEvent
    // Fallback for endpoints that provide a tickets array
    const numericPrices = skEvent.tickets
      .map((t: any) => parseFloat(t.price))
      .filter((p: number) => !isNaN(p));
    if (numericPrices.length > 0) {
      normalizedPrice = Math.min(...numericPrices).toFixed(2); // Show minimum price
        const currencySymbol = skEvent.tickets[0].currency === 'GBP' ? '£' : (skEvent.tickets[0].currency || '');
        if (!normalizedPrice.includes(currencySymbol) && currencySymbol) {
            normalizedPrice = `${currencySymbol}${normalizedPrice}`;
        }
    } else {
      normalizedPrice = skEvent.tickets[0].price || 'See site'; // Fallback if prices aren't numeric
    }
  } else {
      normalizedPrice = 'Check site'; // Ultimate fallback
  }

  // --- Total Reviews ---
  // Prefer venue.reviewCount (as seen in Postman data)
  if (skEvent.venue && typeof skEvent.venue.reviewCount === 'number') { // Use skEvent
    totalReviews = skEvent.venue.reviewCount;
  } else {
    // Add other potential fallbacks if needed, otherwise default to 0
    totalReviews = skEvent.review_count || skEvent.reviews_count || skEvent.total_reviews || 0;
  }

  // --- Ticket Types ---
  // Map tickets array if it exists (more common in details endpoint)
  if (Array.isArray(skEvent.tickets)) { // Use skEvent
    ticketTypes = skEvent.tickets.map((t: any) => ({
      name: t.ticket_type || t.ticketname || t.name || 'General Admission',
      price: t.price ? String(t.price) : 'See site',
      currency: t.currency || skEvent.currency || 'GBP', // Use event currency as fallback
      available: typeof t.available === 'number' ? t.available : undefined,
    }));
  }
  // If no tickets array but ticketpricing exists, create a placeholder type
  else if (skEvent.ticketpricing && normalizedPrice !== 'Check site') {
      ticketTypes = [{
          name: 'Standard Ticket', // Or derive from event type/name if needed
          price: normalizedPrice, // Use the calculated price range/value
          currency: skEvent.currency || 'GBP',
          available: undefined // Availability not usually in ticketpricing
      }];
  }
   else {
      // Default fallback if no price info at all
      ticketTypes = [{ name: 'General Admission', price: 'Check site' }];
  }


  // Debug log before returning
  console.log('Normalized Skiddle Event:', {
    id: skEvent.id, // Log using skEvent
    category,
    price: normalizedPrice,
    rating,
    totalReviews,
    venueType: skEvent.venue?.type, // Log the venue type
  });

  // --- Return consistently using skEvent ---
  return {
    id: skEvent.id, // Use skEvent
    title: skEvent.eventname || '', // Use skEvent
    description: skEvent.description || '', // Use skEvent
    image: skEvent.xlargeimageurl || skEvent.largeimageurl || skEvent.imageurl || "/placeholder.svg", // Use skEvent
    date: skEvent.date || '', // Use skEvent
    location: skEvent.venue?.name || skEvent.venue?.town || '', // Use skEvent
    category: category, // Use calculated category
    type: skEvent.venue?.type || '', // Use skEvent for venue type
    saved: false, // Default value
    creator: {
      name: skEvent.venue?.name || 'Skiddle Organizer', // Use skEvent
      avatar: skEvent.venue?.imageurl || undefined, // Use skEvent
    },
    rating: typeof rating === "number" ? rating : undefined, // Ensure type matches interface
    comments: [], // Default value
    source: 'Skiddle',
    ticketTypes: ticketTypes, // Use calculated ticketTypes
    price: normalizedPrice, // Use calculated price
    totalReviews: totalReviews, // Use calculated totalReviews
  };
}