import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserActivityChart } from "@/components/admin/analytics/user-activity-chart"
import { TicketSalesChart } from "@/components/admin/analytics/ticket-sales-chart"
import { PlanConversionChart } from "@/components/admin/analytics/plan-conversion-chart"
import AdminLayout from "./AdminLayout"
import { Download } from "lucide-react"
import { useAuth } from "@clerk/clerk-react"
import axios from "axios"
import { T, useTranslation } from "@/context/translation"

// Interface for Plan Distribution Data
interface PlanData {
  name: string;
  value: number;
}

// Interface for Event Data (subset needed for TopEventsTable)
interface TopEvent {
  id: number;
  title: string;
  attendees: number; // Or tickets_sold if preferred/available
  organizer_name?: string;
  // Add other fields if needed by TopEventsTable
}

// Interface for Paginated Events Response
interface PaginatedTopEventsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TopEvent[];
}

// Interface for Revenue Summary Data (used for Ticket Sales Chart proxy)
interface RevenueDataEntry {
  month: string;
  [key: string]: number | string; // Allows for dynamic plan names + month
}

// Interface for User Data (for User Activity Chart proxy)
interface UserSignupData {
  clerk_id: string;
  created_at: string;
}

// Interface for Paginated Users Response
interface PaginatedUserSignupResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserSignupData[];
}

// Interface for processed daily/monthly signup counts
interface ProcessedSignupData {
  date: string; // e.g., "YYYY-MM-DD" or "YYYY-MM"
  count: number;
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30days")
  const { getToken } = useAuth();
  const { language, translate } = useTranslation();

  // State for fetched data
  const [planData, setPlanData] = useState<PlanData[]>([]);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueDataEntry[]>([]); // For Ticket Sales Chart
  const [userSignupData, setUserSignupData] = useState<ProcessedSignupData[]>([]); // For User Activity Chart

  // State for loading/error
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingSignups, setLoadingSignups] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for translated select placeholder
  const [timeRangePlaceholder, setTimeRangePlaceholder] = useState("Select time range");

  // Translate select placeholder
  useEffect(() => {
    translate("Select time range").then(setTimeRangePlaceholder);
  }, [translate, language]);

  // Fetch Plan Distribution Data
  const fetchPlanData = useCallback(async () => {
    setLoadingPlans(true);
    const token = await getToken();
    if (!token) {
      const authError = await translate("Authentication token not available.");
      setError(prev => prev ? `${prev}; ${authError}` : authError);
      setLoadingPlans(false);
      return;
    }
    try {
      const response = await axios.get<PlanData[]>("/api/admin/plan-distribution/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlanData(response.data);
    } catch (err: any) {
      const loadError = await translate("Failed to load plan distribution.");
      setError(prev => prev ? `${prev}; ${loadError}` : loadError);
    } finally {
      setLoadingPlans(false);
    }
  }, [getToken, translate]);

  // Fetch Top Events Data
  const fetchTopEvents = useCallback(async () => {
    setLoadingEvents(true);
    const token = await getToken();
    if (!token) {
      const authError = await translate("Authentication token not available.");
      setError(prev => prev ? `${prev}; ${authError}` : authError);
      setLoadingEvents(false);
      return;
    }
    try {
       const params = new URLSearchParams();
       params.append('page', '1');
       params.append('page_size', '10');
       params.append('ordering', '-attendees');
       const response = await axios.get<PaginatedTopEventsResponse>("/api/events/", {
         headers: { Authorization: `Bearer ${token}` },
         params: params,
       });
       if (response.data && response.data.results) {
         setTopEvents(response.data.results);
       } else {
          const formatError = await translate("Received unexpected data format for top events.");
          setError(prev => prev ? `${prev}; ${formatError}` : formatError);
       }
    } catch (err: any) {
      const loadError = await translate("Failed to load top events.");
      setError(prev => prev ? `${prev}; ${loadError}` : loadError);
    } finally {
      setLoadingEvents(false);
    }
  }, [getToken, translate]);

  // Fetch Revenue Summary Data
  const fetchRevenueData = useCallback(async () => {
    setLoadingRevenue(true);
    const token = await getToken();
    if (!token) {
      const authError = await translate("Authentication token not available.");
      setError(prev => prev ? `${prev}; ${authError}` : authError);
      setLoadingRevenue(false);
      return;
    }
    try {
      const response = await axios.get<RevenueDataEntry[]>("/api/admin/revenue-summary/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRevenueData(response.data);
    } catch (err: any) {
      const loadError = await translate("Failed to load revenue data.");
      setError(prev => prev ? `${prev}; ${loadError}` : loadError);
    } finally {
      setLoadingRevenue(false);
    }
  }, [getToken, translate]);

  // Fetch User Data and Process Signups
  const fetchAndProcessSignups = useCallback(async () => {
    setLoadingSignups(true);
    const token = await getToken();
    if (!token) {
      const authError = await translate("Authentication token not available.");
      setError(prev => prev ? `${prev}; ${authError}` : authError);
      setLoadingSignups(false);
      return;
    }
    try {
       const params = new URLSearchParams();
       params.append('page', '1');
       params.append('page_size', '1000');
       params.append('ordering', '-created_at');
       const response = await axios.get<PaginatedUserSignupResponse>("/api/users/", {
         headers: { Authorization: `Bearer ${token}` },
         params: params,
       });
       if (response.data && response.data.results) {
         const signupsByDay: Record<string, number> = {};
         response.data.results.forEach(user => {
             try {
                 const dateStr = user.created_at.substring(0, 10);
                 signupsByDay[dateStr] = (signupsByDay[dateStr] || 0) + 1;
             } catch (e) { console.warn("Error processing user date:", user.created_at, e); }
         });
         const processedData: ProcessedSignupData[] = Object.entries(signupsByDay)
             .map(([date, count]) => ({ date, count }))
             .sort((a, b) => a.date.localeCompare(b.date));
         setUserSignupData(processedData);
       } else {
          const formatError = await translate("Received unexpected data format for user signups.");
          setError(prev => prev ? `${prev}; ${formatError}` : formatError);
       }
    } catch (err: any) {
      const loadError = await translate("Failed to load user data.");
      setError(prev => prev ? `${prev}; ${loadError}` : loadError);
    } finally {
      setLoadingSignups(false);
    }
  }, [getToken, translate]);

  useEffect(() => {
    fetchPlanData();
    fetchTopEvents();
    fetchRevenueData();
    fetchAndProcessSignups();
  }, [fetchPlanData, fetchTopEvents, fetchRevenueData, fetchAndProcessSignups]);

  const isLoading = loadingPlans || loadingEvents || loadingRevenue || loadingSignups;

  return (
    <AdminLayout>
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold"><T>Analytics Overview</T></h1>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] ">
              <SelectValue placeholder={timeRangePlaceholder} />
            </SelectTrigger>
            <SelectContent >
              <SelectGroup>
                <SelectLabel><T>Time Range</T></SelectLabel>
                <SelectItem value="7days"><T>Last 7 days</T></SelectItem>
                <SelectItem value="30days"><T>Last 30 days</T></SelectItem>
                <SelectItem value="90days"><T>Last 90 days</T></SelectItem>
                <SelectItem value="year"><T>This year</T></SelectItem>
                <SelectItem value="alltime"><T>All time</T></SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            <T>Export</T>
          </Button>
        </div>
      </div>
       <div className="space-y-4 mt-5">
         {isLoading && <div className="text-center"><T>Loading analytics data...</T></div>}
         {error && !isLoading && <div className="text-center text-red-600 p-4 border border-red-200 bg-red-50 rounded-md"><T>Error loading analytics</T>: {error}</div>}

         <div className="grid gap-4 md:grid-cols-2">
            <Card >
              <CardHeader>
                <CardTitle><T>User Activity</T></CardTitle>
                <CardDescription><T>Daily new user signups</T></CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSignups ? (
                  <div><T>Loading user data...</T></div>
                ) : (
                  <UserActivityChart data={userSignupData} />
                )}
              </CardContent>
            </Card>
            <Card >
              <CardHeader>
                <CardTitle><T>Revenue Summary</T></CardTitle>
                <CardDescription><T>Monthly revenue breakdown by source</T></CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRevenue ? (
                  <div><T>Loading revenue data...</T></div>
                ) : (
                  <TicketSalesChart data={revenueData} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-1">
            <Card >
              <CardHeader>
                <CardTitle><T>Plan Distribution</T></CardTitle>
                <CardDescription><T>User breakdown by subscription plan</T></CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPlans ? (
                  <div><T>Loading plan data...</T></div>
                ) : (
                  <PlanConversionChart data={planData} />
                )}
              </CardContent>
            </Card>
          </div>
    </div>
    </div>
    </AdminLayout>
  );
}
