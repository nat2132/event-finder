import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StarRating } from "@/components/user/star-rating"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface Comment {
  id: string
  user: {
    id?: string;
    name: string;
    avatar?: string;
  };
  rating: number;
  text: string;
  date: string;
  responses?: {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    organizerId: string;
    organizerName: string;
  }[];
}

interface CommentCarouselProps {
  comments: Comment[]
  className?: string
  autoPlay?: boolean
  interval?: number
}

export function CommentCarousel({ comments, className, autoPlay = true, interval = 5000 }: CommentCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [direction, setDirection] = React.useState(0)

  const nextComment = () => {
    setDirection(1)
    setCurrentIndex((prevIndex) => (prevIndex + 1) % comments.length)
  }

  const prevComment = () => {
    setDirection(-1)
    setCurrentIndex((prevIndex) => (prevIndex - 1 + comments.length) % comments.length)
  }

  React.useEffect(() => {
    if (!autoPlay || comments.length <= 1) return

    const timer = setInterval(() => {
      nextComment()
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, interval, comments.length])

  if (comments.length === 0) {
    return <div className={cn("text-center py-2 text-sm text-muted-foreground", className)}>No comments yet</div>
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="relative h-[100px]">
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col p-2"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={comments[currentIndex].user.avatar || "/placeholder.svg"}
                    alt={comments[currentIndex].user.name}
                  />
                  <AvatarFallback>{comments[currentIndex]?.user?.name?.charAt?.(0) || "?"}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{comments[currentIndex].user.name}</span>
              </div>
              <StarRating rating={comments[currentIndex].rating} size="sm" />
            </div>
            <p className="text-xs line-clamp-2 text-muted-foreground flex-1">"{comments[currentIndex].text}"</p>
            <div className="text-[10px] text-muted-foreground mt-1">{comments[currentIndex].date}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {comments.length > 1 && (
        <div className="flex justify-between mt-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full p-0 absolute left-0 top-1/2 z-50 -translate-y-1/2 opacity-70 hover:opacity-100 hover:bg-gray-300 cursor-pointer"
            onClick={prevComment}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous comment</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full p-0 absolute right-0 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 hover:bg-gray-300 cursor-pointer"
            onClick={nextComment}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next comment</span>
          </Button>
        </div>
      )}

      {comments.length > 1 && (
        <div className="flex justify-center gap-1 mt-1">
          {comments.map((_, index) => (
            <button
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-gray-300",
              )}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1)
                setCurrentIndex(index)
              }}
              aria-label={`Go to comment ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
