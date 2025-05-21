import { addDays, format, getHours, getMinutes, startOfWeek } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { CalendarEvent } from "@/lib/calendar"
import { parseISO, isSameDay } from "date-fns"

interface WeekViewProps {
  events: CalendarEvent[]
  currentDate: Date
  onEventClick?: (event: CalendarEvent) => void
  className?: string
}

export function WeekView({ events, currentDate, onEventClick, className }: WeekViewProps) {

  // Start the week on Sunday
  const startDate = startOfWeek(currentDate)

  // Create an array of the 7 days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))

  // Hours to display (all 24 hours)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Helper to get events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(parseISO(event.date), date))
  }

  // Position an event on the time grid
  const getEventPosition = (event: CalendarEvent) => {
    const eventDate = new Date(event.date)
    const hour = getHours(eventDate)
    const minute = getMinutes(eventDate)

    const hourPosition = hour;
    const minutePosition = minute / 60;
    const top = (hourPosition + minutePosition) * 60;
    const height = event.durationMinutes ? event.durationMinutes : 60;

    return {
      top: `${top}px`,
      height: `${height}px`,
    }
  }

  // Get color based on category
  const getCategoryColor = (category: string) => {
    const categories: Record<string, string> = {
      Music: "bg-blue-100 border-blue-300 text-blue-700",
      Cultural: "bg-green-100 border-green-300 text-green-700",
      Sports: "bg-orange-100 border-orange-300 text-orange-700",
      Food: "bg-red-100 border-red-300 text-red-700",
      Art: "bg-purple-100 border-purple-300 text-purple-700",
      Business: "bg-gray-100 border-gray-300 text-gray-700",
      Education: "bg-yellow-100 border-yellow-300 text-yellow-700",
      Tour: "bg-indigo-100 border-indigo-300 text-indigo-700",
      Festival: "bg-pink-100 border-pink-300 text-pink-700",
      Charity: "bg-teal-100 border-teal-300 text-teal-700",
    }

    return categories[category] || "bg-gray-100 border-gray-300 text-gray-700"
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-8 gap-1">
        {/* Time column */}
        <div className="col-span-1">
          <div className="h-12"></div> {/* Empty cell for header alignment */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-[100px] border-t border-dashed  text-xs text-muted-foreground
 pr-2 text-right"
            >
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </div>
          ))}
        </div>

        {/* Days columns */}
        {weekDays.map((day, index) => (
          <div key={index} className="col-span-1">
            {/* Day header */}
            <div
              className={cn(
                "h-12 flex flex-col items-center justify-center font-medium",
                isSameDay(day, new Date()) && "bg-primary/10 rounded-md",
              )}
            >
              <div className="text-sm">{format(day, "EEE")}</div>
              <div
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full",
                  isSameDay(day, new Date()) && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </div>
            </div>

            {/* Time slots */}
            <div className="relative">
              {hours.map((hour) => (
                <div key={hour} className="h-[100px] border-t border-dashed "></div>
              ))}

              {/* Events */}
              <AnimatePresence>
                {getEventsForDay(day).map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "absolute left-1 right-1 rounded-md border p-1 overflow-hidden cursor-pointer",
                      getCategoryColor(event.category),
                    )}
                    style={getEventPosition(event)}
                    onClick={() => onEventClick?.(event)}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs font-medium truncate">{event.title}</div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm font-medium">{event.title}</div>
                          <div className="text-xs">{format(new Date(event.date), "h:mm a")}</div>
                          <div className="text-xs">{event.location}</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
