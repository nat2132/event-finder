// Shared organizer review types, extracted from review-dashboard.tsx so the
// review card / list / stats components can import them.

export interface ReviewResponse {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  organizerId?: string;
  organizerName?: string;
  organizerImage?: string;
}

// Organizer review type
export interface Review {
  id: string;
  eventId: string;
  eventTitle?: string;
  /** Backend sends either a plain name or a user object */
  userName: string | { name: string; avatar?: string; avatar_url?: string };
  userAvatar?: string;
  userEmail?: string;
  rating: number;
  content: string;
  /** Some backend payloads use `comment` instead of `content` */
  comment?: string;
  event_title?: string;
  createdAt: string;
  updatedAt?: string;
  responses?: ReviewResponse[];
  reply?: string;
}
