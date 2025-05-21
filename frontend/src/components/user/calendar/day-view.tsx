import { format, getHours, getMinutes, isSameDay, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/calendar";

interface DayViewProps {
    events: CalendarEvent[];
    currentDate: Date;
    onEventClick?: (event: CalendarEvent) => void;
    className?: string;
}

const HOUR_HEIGHT = 100;
const HOUR_START = 6;

export function DayView({ events, currentDate, onEventClick, className }: DayViewProps) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = events.filter((event) => isSameDay(parseISO(event.date), currentDate));

    const getEventPosition = (event: CalendarEvent) => {
        const eventDate = new Date(event.date);
        const hour = getHours(eventDate);
        const minute = getMinutes(eventDate);

        const hourPosition = hour;
        const minutePosition = minute / 60;
        const top = (hourPosition + minutePosition) * HOUR_HEIGHT;
        const height = Math.max(20, event.durationMinutes ? event.durationMinutes : 60);

        return {
            top: `${top}px`,
            height: `${height}px`,
        };
    };

    const getOverlappingEvents = (event: CalendarEvent, currentEvents: CalendarEvent[]) => {
        const eventStart = new Date(event.date).getTime();
        const eventEnd = event.durationMinutes ? eventStart + event.durationMinutes * 60000 : eventStart + 60 * 60000;

        return currentEvents.filter(otherEvent => {
            if (otherEvent.id === event.id) return false;

            const otherStart = new Date(otherEvent.date).getTime();
            const otherEnd = otherEvent.durationMinutes ? otherStart + otherEvent.durationMinutes * 60000 : otherStart + 60 * 60000;

            return eventStart < otherEnd && eventEnd > otherStart;
        });
    };

    const getEventStyles = (event: CalendarEvent, allDayEvents: CalendarEvent[]) => {
        const position = getEventPosition(event);
        const overlappingEvents = getOverlappingEvents(event, allDayEvents);
        const totalOverlapping = overlappingEvents.length + 1;

        let width = totalOverlapping > 0 ? `${90 / totalOverlapping}%` : "100%";
        let left = totalOverlapping > 0 ? `${(overlappingEvents.indexOf(event) / totalOverlapping) * 90}%` : "0";

        return {
            top: position.top,
            height: position.height,
            left,
            width,
        };
    };


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
        };

        return categories[category] || "bg-gray-100 border-gray-300 text-gray-700";
    };

    return (
        <div className={cn("w-full", className)}>
            <div className="flex flex-col">
                {/* Day header */}
                <div className="text-center mb-4">
                    <h3 className="text-xl font-bold">{format(currentDate, "EEEE")}</h3>
                    <p className="text-muted-foreground
">{format(currentDate, "MMMM d, yyyy")}</p>
                </div>

                {/* Time grid */}
                <div className="grid grid-cols-[80px_1fr] gap-2">
                    {/* Time column */}
                    <div className="col-span-1">
                        {hours.map((hour) => (
                            <div
                                key={hour}
                                className={cn(
                                    "h-[100px] border-t border-dashed border-black/20 text-xs text-muted-foreground pr-2 text-right",
                                    hour % 2 === 0 ? "bg-slate-50" : "bg-background",
                                    "hover:bg-slate-100 border-black/30"
                                )}
                            >
                                <span className="pt-1 opacity-80 select-none">{hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}</span>
                            </div>
                        ))}
                    </div>

                    {/* Events column */}
                    <div className="col-span-1 relative" style={{ height: `${hours.length * 100}px` }}>
                        {/* Dashed lines for each hour */}
                        {hours.map((hour) => (
                            <div
                                key={hour}
                                style={{ top: `${hour * 100}px` }}
                                className="absolute left-0 w-full border-t border-dashed border-black/20 pointer-events-none"
                            />
                        ))}
                        {/* Events */}
                        <AnimatePresence>
                            {dayEvents.map((event) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                    className={cn(
                                        "rounded-md border p-2 overflow-hidden cursor-pointer",
                                        getCategoryColor(event.category),
                                    )}
                                    style={getEventStyles(event, dayEvents)}
                                    onClick={() => onEventClick?.(event)}
                                >
                                    <div className="font-medium">{event.title}</div>
                                    <div className="text-xs">
                                        {format(new Date(event.date), "h:mm a")} • {event.location}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

