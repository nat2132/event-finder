"use client"
import { format, isToday } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CalendarEvent } from "@/lib/calendar"
import { Calendar, MapPin, Clock } from "lucide-react"

interface ListViewProps {
  events: CalendarEvent[]
  currentDate: Date
  onEventClick?: (event: CalendarEvent) => void
  className?: string
}

export function ListView({ events, currentDate, onEventClick, className }: ListViewProps) {
  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Group events by date
  const groupedEvents: Record<string, CalendarEvent[]> = {}

  sortedEvents.forEach((event) => {
    const dateKey = format(new Date(event.date), "yyyy-MM-dd")
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = []
    }
    groupedEvents[dateKey].push(event)
  })

  // Get category badge color
  const getCategoryColor = (category: string) => {
    const categories: Record<string, string> = {
      Music: "bg-blue-500",
      Cultural: "bg-green-500",
      Sports: "bg-orange-500",
      Food: "bg-red-500",
      Art: "bg-purple-500",
      Business: "bg-gray-500",
      Education: "bg-yellow-500",
      Tour: "bg-indigo-500",
      Festival: "bg-pink-500",
      Charity: "bg-teal-500",
    }

    return categories[category] || "bg-gray-500"
  }

  return (
    <div className={cn("w-full", className)}>
      <ScrollArea className="h-[600px] pr-4">
        <AnimatePresence>
          {Object.keys(groupedEvents).length > 0 ? (
            Object.entries(groupedEvents).map(([dateKey, dateEvents], index) => {
              const date = new Date(dateKey)

              return (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="mb-6"
                >
                  <div className="sticky top-0 z-10 bg-background py-2">
                    <h3 className={cn("text-lg font-semibold mb-2 flex items-center", isToday(date) && "text-primary")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {isToday(date) ? "Today" : format(date, "EEEE, MMMM d, yyyy")}
                      {isToday(date) && (
                        <Badge variant="outline" className="ml-2 bg-primary text-primary-foreground">
                          Today
                        </Badge>
                      )}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {dateEvents.map((event) => (
                      <motion.div key={event.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <Card className="cursor-pointer overflow-hidden " onClick={() => onEventClick?.(event)}>
                          <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{event.title}</CardTitle>
                                <CardDescription className="flex items-center mt-1 text-muted-foreground
">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {format(new Date(event.date), "h:mm a")}
                                  {event.durationMinutes && (
                                    <span>
                                      {" "}
                                      • {Math.floor(event.durationMinutes / 60)} hr
                                      {event.durationMinutes / 60 !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </CardDescription>
                              </div>
                              <Badge className={cn(getCategoryColor(event.category), "text-primary-foreground")}>
                                {event.category}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-2">
                            <div className="flex items-center text-sm text-muted-foreground
">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.location}
                            </div>
                            {event.description && <p className="text-sm mt-2 line-clamp-2 text-muted-foreground
">{event.description}</p>}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground
">
              <Calendar className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium">No events found</h3>
              <p className="text-sm">Try changing your filters or adding a new event</p>
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  )
}
