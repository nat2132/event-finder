import type React from "react"
import { Filter, Search, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface ReviewFiltersProps {
  events: Event[]
  filters: {
    event: string
    rating: string
    dateRange: string
    searchQuery: string
    sortBy: string
    sortOrder: "asc" | "desc"
  }
  setFilters: React.Dispatch<
    React.SetStateAction<{
      event: string
      rating: string
      dateRange: string
      searchQuery: string
      sortBy: string
      sortOrder: "asc" | "desc"
    }>
  >
}

export function ReviewFilters({ events, filters, setFilters }: ReviewFiltersProps) {
  const handleReset = () => {
    setFilters({
      event: "all",
      rating: "all",
      dateRange: "all",
      searchQuery: "",
      sortBy: "date",
      sortOrder: "desc",
    })
  }

  const hasActiveFilters =
    filters.event !== "all" || filters.rating !== "all" || filters.dateRange !== "all" || filters.searchQuery !== ""

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-1">
          <Filter className="h-4 w-4" /> Filters
        </h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2">
            <X className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reviews..."
          value={filters.searchQuery}
          onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
          className="pl-8"
        />
      </div>

      <Accordion type="multiple" defaultValue={["events", "rating", "date"]}>
        <AccordionItem value="events">
          <AccordionTrigger className="py-2">Event</AccordionTrigger>
          <AccordionContent>
            <Select value={filters.event} onValueChange={(value) => setFilters((prev) => ({ ...prev, event: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rating">
          <AccordionTrigger className="py-2">Rating</AccordionTrigger>
          <AccordionContent>
            <Select
              value={filters.rating}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, rating: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <SelectItem key={rating} value={rating.toString()}>
                    <div className="flex items-center">
                      {rating} <Star className="h-3.5 w-3.5 ml-1 fill-yellow-400 text-yellow-400" />
                      {rating === 1 ? " and below" : ""}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="date">
          <AccordionTrigger className="py-2">Date Range</AccordionTrigger>
          <AccordionContent>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
