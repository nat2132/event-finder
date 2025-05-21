import axios from "axios";
import { Event } from "../features/dashboards/organizer/event-api";

export async function fetchRecommendations(token: string): Promise<Event[]> {
  const res = await axios.get("/api/recommendations/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data.recommendations;
}
