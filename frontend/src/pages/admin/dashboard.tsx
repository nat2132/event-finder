import { Users, Calendar, DollarSign } from "lucide-react"
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import { T, useTranslation } from "@/context/translation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RevenueChart } from "@/components/admin/dashboard/revenue-chart"
import { PlanDistributionChart } from "@/components/admin/dashboard/plan-distribution-chart"
import { RecentSignups } from "@/components/admin/dashboard/recent-signups"
import AdminLayout from "./AdminLayout";

// Define an interface for the stats data
interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalRevenue: number;
  // Add other relevant stats fields if available from the API
}

// Define an interface for user data (adjust based on actual API response)
interface RecentUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string; // Assuming ISO string format
  profile_image?: string;
  plan?: string; // Plan information (e.g., "Free", "Pro", "Organizer")
}

// Interface for Plan Distribution data
interface PlanDistributionData {
  name: string; // e.g., "Free Plan"
  value: number; // e.g., 100
}

// Interface for Revenue Summary data (keys are dynamic based on plans)
interface RevenueSummaryData {
  month: string; // e.g., "Jan 2025"
  [planKey: string]: number | string; // Allows for dynamic plan keys like "Free Plan", "Pro Plan", etc.
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [planDistributionData, setPlanDistributionData] = useState<PlanDistributionData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueSummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        setError("Authentication token not available.");
        setLoading(false);
        return;
      }

      try {
        // Fetch stats (using the new path with trailing slash)
        const statsPromise = axios.get<AdminStats>("/api/admin/stats/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Fetch recent users (using new path with trailing slash)
        // Use pagination (_page_size=5_) and ordering (_ordering=-created_at_)
        const usersPromise = axios.get<{results: RecentUser[]}>("/api/users/?page_size=5&ordering=-created_at&user_type=user", {
           headers: { Authorization: `Bearer ${token}` },
        });

        // Fetch plan distribution
        const planDistPromise = axios.get<PlanDistributionData[]>("/api/admin/plan-distribution/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Fetch revenue summary
        const revenuePromise = axios.get<RevenueSummaryData[]>("/api/admin/revenue-summary/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const [statsRes, usersRes, planDistRes, revenueRes] = await Promise.all([
          statsPromise,
          usersPromise,
          planDistPromise,
          revenuePromise
        ]);

        setStats(statsRes.data);
        // DRF pagination wraps results in a 'results' key
        setRecentUsers(usersRes.data.results); 
        setPlanDistributionData(planDistRes.data);
        setRevenueData(revenueRes.data);

      } catch (err: any) {
        console.error("Failed to fetch admin dashboard data:", err);
        setError(err.response?.data?.error || err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]); // Rerun if getToken changes

  // Optional: Display loading or error states
  if (loading) {
    return <AdminLayout><div><T>Loading dashboard...</T></div></AdminLayout>;
  }

  if (error) {
    return <AdminLayout><div className="text-red-600"><T>Error</T>: {error}</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium"><T>Total Users</T></CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers?.toLocaleString() ?? 'N/A'}</div>
            <p className="text-xs text-muted-foreground">+18% <T>from last month</T></p>
          </CardContent>
        </Card>
        <Card >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium"><T>Total Events</T></CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents?.toLocaleString() ?? 'N/A'}</div>
            <p className="text-xs text-muted-foreground">+12% <T>from last month</T></p>
          </CardContent>
        </Card>
        <Card >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium"><T>Total Revenue</T></CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalRevenue != null
                ? `$${(stats.totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              <T>From plan subscriptions only</T>
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle><T>Revenue Overview</T></CardTitle>
            <CardDescription><T>Monthly revenue breakdown by plan type</T></CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <RevenueChart data={revenueData} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle><T>User Plan Distribution</T></CardTitle>
            <CardDescription><T>Breakdown of users by subscription plan</T></CardDescription>
          </CardHeader>
          <CardContent>
            <PlanDistributionChart data={planDistributionData} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4">
        <Card >
          <CardHeader>
            <CardTitle><T>Recent Sign-ups</T></CardTitle>
            <CardDescription><T>Latest users who joined the platform</T></CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSignups users={recentUsers} />
          </CardContent>
        </Card>
      </div>
    </div>
    </AdminLayout>
  )
}
