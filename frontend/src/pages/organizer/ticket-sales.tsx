import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { DollarSign, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, BarChart } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardLayout } from "@/components/organizer/dashboard-layout"
import { fetchOrganizerDashboardStats } from "./dashboard-api"
import type { OrganizerDashboardStats } from "./dashboard-api"
import { getClerkToken } from "@/lib/clerkToken"

export default function TicketSalesPage() {
  const [stats, setStats] = useState<OrganizerDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState("weekly")
  // Add event selection state
  const events = stats?.analytics?.events || [];
  const [selectedEvent, setSelectedEvent] = useState<string>("");

  // Set selectedEvent to first event when stats load
  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      setSelectedEvent(events[0].id.toString());
    }
  }, [events, selectedEvent]);


  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      setError(null)
      try {
        const token = await getClerkToken()
        if (!token) {
          setError("No authentication token found.")
          setLoading(false)
          return
        }
        const data = await fetchOrganizerDashboardStats(token)
        setStats(data)
      } catch (e: any) {
        setError(e?.message || "Failed to fetch ticket sales data.")
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  // Prepare data for charts and tables
  const ticketSalesData = stats?.analytics?.ticketSales || []

  // Find selected event and its ticketTypes
  const selectedEventObj = events.find((e: any) => e.id.toString() === selectedEvent)
  const ticketTypes = selectedEventObj ? selectedEventObj.ticketTypes : []

  const totalSold = ticketTypes.reduce((acc: number, ticket: any) => acc + (ticket.sold || 0), 0)
  const totalAvailable = ticketTypes.reduce((acc: number, ticket: any) => acc + (ticket.total || 0), 0)
  const totalRevenue = ticketTypes.reduce((acc: number, ticket: any) => acc + (ticket.revenue || 0), 0)
  const soldPercentage = totalAvailable > 0 ? Math.round((totalSold / totalAvailable) * 100) : 0

  const chartData = ticketSalesData.map((item: any) => ({
    name: item.name,
    sales: item.sales,
  }))

  const ticketTypeChartData = ticketTypes.map((ticket: any) => ({
    name: ticket.name,
    value: ticket.sold,
  }))

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96 text-lg">Loading ticket sales data...</div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96 text-red-500">{error}</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Sales</h1>
          <p className="text-muted-foreground">Track and analyze your ticket sales performance</p>
        </div>

        {events.length > 0 && (
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="w-full md:w-[250px] ">
                <SelectValue placeholder="Select Event" />
              </SelectTrigger>
              <SelectContent >
                {events.map((event: any) => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Button variant="outline">Export Report</Button>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card 
>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalSold} / {totalAvailable}
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div className="h-full rounded-full  bg-primary" style={{ width: `${soldPercentage}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{soldPercentage}% of tickets sold</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="mt-4 text-xs text-muted-foreground">
                Average ticket price: ${Math.round(totalRevenue / totalSold)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-7">
          <Card className=" md:col-span-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sales Over Time</CardTitle>
                  <CardDescription className="text-muted-foreground">Daily ticket sales for the selected event</CardDescription>
                </div>
                <Tabs defaultValue="weekly" value={timeRange} onValueChange={setTimeRange} className="w-[200px]">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="h-[300px]">
              <AreaChart
                data={chartData}
                index="name"
                categories={["sales"]}
                colors={["blue"]}
                valueFormatter={(value) => `${value} tickets`}
                className="h-[300px]"
              />
            </CardContent>
          </Card>
          <Card className=" md:col-span-3">
            <CardHeader>
              <CardTitle>Ticket Types</CardTitle>
              <CardDescription>Distribution of sales by ticket type</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <BarChart
                data={ticketTypeChartData}
                index="name"
                categories={["value"]}
                colors={["green"]}
                valueFormatter={(value) => `${value} tickets`}
                className="h-[300px]"
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ticket Types Breakdown</CardTitle>
            <CardDescription>Detailed information about each ticket type</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow 
>
                  <TableHead>Ticket Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead >Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketTypes.map((ticket, idx: number) => (
                  <TableRow key={ticket.id ?? ticket.name ?? idx} className=" ">
                    <TableCell className="font-medium">{ticket.name}</TableCell>
                    <TableCell>${ticket.price}</TableCell>
                    <TableCell>{ticket.sold}</TableCell>
                    <TableCell>{ticket.total}</TableCell>
                    <TableCell>${ticket.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-100 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{totalSold}</TableCell>
                  <TableCell>{totalAvailable}</TableCell>
                  <TableCell>${totalRevenue.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  )
}
