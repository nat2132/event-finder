// This file exports a function to fetch the organizer's billing history from the backend
import axios from 'axios';

export interface BillingRecord {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  invoice_url: string;
}

export async function fetchBillingHistory(token: string): Promise<BillingRecord[]> {
  try {
    const res = await axios.get('/api/user/billing-history/', {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Backend returns data directly
    return res.data as BillingRecord[];
  } catch (error: any) {
    console.error('Error fetching billing history:', error, error?.response?.data);
    return [];
  }
}
