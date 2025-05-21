import { DashboardLayout } from "@/components/organizer/dashboard-layout"
import { ArrowRight, Calendar, DollarSign, MoreHorizontal, Ticket, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, BarChart } from "@/components/ui/chart"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateEventButton } from "@/components/organizer/create-event-button";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { OrganizerDashboardSuccessMsg } from "./dashboard-success-msg";
import { fetchEvents } from "./event-api";
import type {Event as EventType } from "./event-api";
import { fetchOrganizerDashboardStats } from "./dashboard-api";
import type { OrganizerDashboardStats } from "./dashboard-api";
import { useAuth } from "@clerk/clerk-react";


export default function Home() {
  const [chartPeriod, setChartPeriod] = useState("weekly");
  const [recentEvents, setRecentEvents] = useState<EventType[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [errorEvents, setErrorEvents] = useState(false);

  // Organizer dashboard stats
  const [stats, setStats] = useState<OrganizerDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(false);

  const { getToken } = useAuth();

  useEffect(() => {
    setLoadingEvents(true);
    async function fetchEventsAsync() {
      try {
        const token = await getToken();
        if (!token) {
          setErrorEvents(true);
          setLoadingEvents(false);
          console.warn("No Clerk token found for events fetch");
          return;
        }
        console.log("Fetching events with Clerk token:", token);
        const response = await fetchEvents(token);
        console.log("Events fetched:", response);
        // Handle paginated response
        const eventsData = response.results || response;
        setRecentEvents(eventsData);
      } catch (e) {
        setErrorEvents(true);
        console.error("Error fetching events:", e);
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchEventsAsync();
  }, [getToken]);

  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true);
      try {
        const token = await getToken();
        if (!token) {
          setErrorStats(true);
          setLoadingStats(false);
          console.warn("No Clerk token found for dashboard stats fetch");
          return;
        }
        console.log("Fetching dashboard stats with Clerk token:", token);
        const data = await fetchOrganizerDashboardStats(token);
        console.log("Dashboard stats fetched:", data);
        setStats(data);
      } catch (e) {
        setErrorStats(true);
        console.error("Error fetching dashboard stats:", e);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, [getToken]);

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <OrganizerDashboardSuccessMsg />
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col justify-between gap-4 md:flex-row md:items-center"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, John!</h1>
            <p className="text-muted-foreground">Here's what's happening with your events today.</p>
          </div>
          <Button asChild>
            <Link to="/dashboard/organizer/create-event">
              <Calendar className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <motion.div variants={itemVariants} >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingStats ? '...' : errorStats || !stats ? '--' : stats.totalEvents}
                </div>
                <p className="text-xs text-muted-foreground">+2 from last month</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants} >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingStats ? '...' : errorStats || !stats ? '--' : stats.ticketsSold.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">+15% from last month</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants} >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingStats ? '...' : errorStats || !stats ? '--' : `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"
        >
          <motion.div variants={itemVariants} className="col-span-full lg:col-span-4">
            <Card >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ticket Sales Overview</CardTitle>
                    <CardDescription className="text-muted-foreground">Track your ticket sales performance over time</CardDescription>
                  </div>
                  <Tabs defaultValue="weekly" value={chartPeriod} onValueChange={setChartPeriod}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="daily">Daily</TabsTrigger>
                      <TabsTrigger value="weekly">Weekly</TabsTrigger>
                      <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="h-[300px] w-full">
                <AreaChart
                  data={stats && stats.analytics ? stats.analytics.ticketSales : []}
                  index="name"
                  categories={["sales"]}
                  colors={["green"]}
                  valueFormatter={(value) => `${value} tickets`}
                  className="h-[300px]"
                />
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants} className="col-span-full lg:col-span-3">
            <Card className="h-full ">
              <CardHeader>
                <CardTitle>Event Attendance</CardTitle>
                <CardDescription className="text-muted-foreground">Distribution across your events</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <BarChart
                  data={stats && stats.analytics ? stats.analytics.attendance : []}
                  index="name"
                  categories={["value"]}
                  colors={["blue"]}
                  valueFormatter={(value) => `${value} attendees`}
                  className="h-[300px]"
                />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4">
          <motion.div variants={itemVariants} className="col-span-full">
            <Card className="h-full ">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Events</CardTitle>
                  <CardDescription>You have {recentEvents.length} events in total</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild >
                  <Link to="/dashboard/organizer/my-events">
                    View all
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loadingEvents ? (
                    <div>Loading events...</div>
                  ) : errorEvents ? (
                    <div className="text-red-500">Failed to load events.</div>
                  ) : recentEvents.length === 0 ? (
                    <div>No events found.</div>
                  ) : (
                    recentEvents.map((event) => (
                      <div key={event.id} className="flex items-center gap-4 rounded-lg border p-3">
                        <img
                          src={event.image || "/placeholder.svg"}
                          alt={event.title}
                          className="h-16 w-24 rounded-md object-cover"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{event.title}</h4>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                event.status === "Completed"
                                  ? "bg-green-500/10 text-green-700"
                                  : "bg-blue-500/10 text-blue-700"
                              }`}
                            >
                              {event.status || "Upcoming"}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span>{event.date}</span>
                            <span className="mx-1">•</span>
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Users className="mr-1 h-3 w-3" />
                            <span>{typeof event.attendees === 'number' ? event.attendees : 0} attendees</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">More options</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer hover:bg-slate-100">View details</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer hover:bg-slate-100">Edit event</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 cursor-pointer hover:bg-red-100">Cancel event</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
        <CreateEventButton />
      </div>
    </DashboardLayout>
  );
}
