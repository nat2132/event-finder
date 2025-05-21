import axios from 'axios';

export interface OrganizerDashboardStats {
  totalEvents: number;
  ticketsSold: number;
  totalRevenue: number;
  activeAttendees: number;
  analytics: {
    ticketSales: { name: string; sales: number }[];
    revenue: { name: string; revenue: number }[];
    attendance: { name: string; value: number }[];
  };
}

export async function fetchOrganizerDashboardStats(token: string): Promise<OrganizerDashboardStats> {
  const res = await axios.get('/api/organizer/dashboard-stats/', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
