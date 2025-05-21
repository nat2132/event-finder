import axios from "axios";

// Skiddle categories only
// Skiddle categories are static per API documentation
export const SKIDDLE_CATEGORIES = [
  { id: 'FEST', name: 'Festivals' },
  { id: 'LIVE', name: 'Live music' },
  { id: 'CLUB', name: 'Clubbing/Dance music' },
  { id: 'DATE', name: 'Dating event' },
  { id: 'THEATRE', name: 'Theatre/Dance' },
  { id: 'COMEDY', name: 'Comedy' },
  { id: 'EXHIB', name: 'Exhibitions and Attractions' },
  { id: 'KIDS', name: 'Kids/Family Event' },
  { id: 'BARPUB', name: 'Bar/Pub event' },
  { id: 'LGB', name: 'Gay/Lesbian event' },
  { id: 'SPORT', name: 'Sporting event' },
  { id: 'ARTS', name: 'The Arts' },
];

export async function fetchSkiddleCategories() {
  return SKIDDLE_CATEGORIES;
}

// Fetch Ticketmaster categories (requires API key)
export async function fetchTicketmasterCategories() {
  // Use a random page and fetch more events for more variety
  const randomPage = Math.floor(Math.random() * 10); // 0-9
  const res = await axios.get("/api/external/ticketmaster/events/", {
    params: { size: 20, page: randomPage },
  });
  const events = res.data._embedded?.events || [];
  const segments: {id: string, name: string}[] = [];
  const seen = new Set();
  events.forEach((event: any) => {
    const segment = event.classifications?.[0]?.segment;
    if (segment && !seen.has(segment.id)) {
      segments.push({ id: segment.id, name: segment.name });
      seen.add(segment.id);
    }
  });
  return segments;
}
