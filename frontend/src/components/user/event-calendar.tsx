import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  addDays,
  format,
  getDay,
  isToday,
  isSameMonth,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subMonths,
  addMonths,
} from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CalendarEvent {
  id: string
  title: string
  date: Date
  category: string
}

import { Pencil, Trash2 } from "lucide-react"

interface EventCalendarProps {
  events?: CalendarEvent[]
  className?: string
  onEditEvent?: (event: CalendarEvent) => void
  onDeleteEvent?: (event: CalendarEvent) => void
  onEventClick?: (event: CalendarEvent) => void
}

export function EventCalendar({ events = [], className, onEditEvent, onDeleteEvent, onEventClick }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)

  // Sample events if none provided
  const calendarEvents =
    events.length > 0
      ? events
      : [
          {
            id: "1",
            title: "Addis Jazz Festival",
            date: new Date(2025, 4, 15), // May 15, 2024
            category: "Music",
          },
          {
            id: "2",
            title: "Ethiopian Coffee Ceremony",
            date: new Date(2024, 5, 10), // June 10, 2024
            category: "Cultural",
          },
          {
            id: "3",
            title: "Lalibela Rock Churches Tour",
            date: new Date(2024, 6, 5), // July 5, 2024
            category: "Tour",
          },
          {
            id: "4",
            title: "Meskel Festival",
            date: new Date(2024, 8, 27), // September 27, 2024
            category: "Cultural",
          },
          {
            id: "5",
            title: "Great Ethiopian Run",
            date: new Date(2024, 10, 20), // November 20, 2024
            category: "Sports",
          },
          {
            id: "6",
            title: "Timket Celebration",
            date: new Date(2025, 0, 19), // January 19, 2025
            category: "Cultural",
          },
        ]

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get the day of the week for the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const startDay = getDay(monthStart)

  // Create an array of days including the leading and trailing days from adjacent months
  const calendarDays = React.useMemo(() => {
    const daysInMonth = monthDays
    const daysFromPreviousMonth = Array.from({ length: startDay }, (_, i) => addDays(monthStart, -startDay + i))

    // Calculate how many days we need from the next month to complete the grid
    // We want to fill a 6-row grid (42 cells)
    const totalCells = 42
    const remainingDays = totalCells - daysFromPreviousMonth.length - daysInMonth.length
    const daysFromNextMonth = Array.from({ length: remainingDays }, (_, i) => addDays(monthEnd, i + 1))

    return [...daysFromPreviousMonth, ...daysInMonth, ...daysFromNextMonth]
  }, [monthStart, monthEnd, monthDays, startDay])

  const handlePreviousMonth = () => {
    setCurrentMonth((prevMonth) => subMonths(prevMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth((prevMonth) => addMonths(prevMonth, 1))
  }

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter((event) => isSameDay(event.date, date))
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-4 ">
        <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth} >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous month</span>
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next month</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        <AnimatePresence mode="wait">
          <motion.div
            key={format(currentMonth, "yyyy-MM")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="col-span-7 grid grid-cols-7 gap-1"
          >
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

              return (
                <div key={index} className="min-h-[100px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-full w-full flex flex-col items-start justify-start p-2 hover:bg-muted rounded-md",
                          !isCurrentMonth && "text-muted-foreground opacity-50",
                          isToday(day) && "border border-primary",
                          isSelected && "bg-muted",
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isToday(day) &&
                              "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center",
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        <div className="mt-1 w-full space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className="w-full text-left truncate text-xs rounded px-1 py-0.5 bg-primary/10 text-primary cursor-pointer"
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-muted-foreground text-left">+{dayEvents.length - 2} more</div>
                          )}
                        </div>
                      </Button>
                    </PopoverTrigger>
                    {dayEvents.length > 0 && (
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-4 pb-2 border-b">
                          <h3 className="font-medium">{format(day, "EEEE, MMMM d, yyyy")}</h3>
                        </div>
                        <div className="p-4 space-y-2">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className="flex items-center space-x-2 hover:bg-muted group relative p-2 rounded-md"
                            >
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <div>
                                <div className="font-medium">{event.title}</div>
                                <div className="text-xs text-muted-foreground">{event.category}</div>
                              </div>
                              {/* Edit/Delete icons */}
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 transition-opacity z-10">
                                <button
                                  className="p-1 hover:bg-slate-200 rounded"
                                  title="Edit Event"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onEditEvent) {
                                      onEditEvent(event);
                                    } else if (onEventClick) {
                                      onEventClick(event);
                                    } else {
                                      alert(`Edit event: ${event.title}`);
                                    }
                                  }}
                                >
                                  <Pencil className="h-4 w-4 text-blue-600" />
                                </button>
                                <button
                                  className="p-1 hover:bg-slate-200 rounded"
                                  title="Delete Event"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDeleteEvent) {
                                      onDeleteEvent(event);
                                    } else if (onEventClick) {
                                      onEventClick(event);
                                    } else {
                                      if (confirm(`Delete event: ${event.title}?`)) {
                                        alert(`Event deleted: ${event.title}`);
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                </div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
