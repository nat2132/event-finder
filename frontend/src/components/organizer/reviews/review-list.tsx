import { motion, AnimatePresence } from "framer-motion"
import { ReviewCard } from "./review-card"
import { Skeleton } from "@/components/ui/skeleton"

interface ReviewListProps {
  reviews: Review[]
  events: Event[]
  isLoading: boolean
  onRespond: (reviewId: string, response: string) => void
  onEditResponse: (reviewId: string, responseId: string, newContent: string) => void
  onDeleteResponse: (reviewId: string, responseId: string) => void
}

export function ReviewList({
  reviews,
  events,
  isLoading,
  onRespond,
  onEditResponse,
  onDeleteResponse,
}: ReviewListProps) {
  const getEventName = (eventId: string, review: any) => {
    const event = events.find((e) => String(e.id) === String(eventId));
    return event ? event.title : (review.event_title || "Unknown Event");
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg">
            <div className="flex justify-between mb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-6" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg bg-muted/50">
        <h3 className="text-xl font-medium mb-2">No reviews found</h3>
        <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <div className="space-y-4">
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ReviewCard
              review={review}
              eventName={getEventName(review.eventId, review)}
              onRespond={onRespond}
              onEditResponse={onEditResponse}
              onDeleteResponse={onDeleteResponse}
            />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  )
}
