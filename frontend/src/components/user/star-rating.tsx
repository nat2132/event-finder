import * as React from "react"
import { Star } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: "sm" | "md" | "lg"
  interactive?: boolean
  onRatingChange?: (rating: number) => void
  className?: string
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onRatingChange,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState(0)

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index)
    }
  }

  return (
    <div className={cn("flex items-center", className)}>
      {Array.from({ length: maxRating }).map((_, index) => {
        const starValue = index + 1
        const isFilled = interactive ? starValue <= (hoverRating || rating) : starValue <= rating

        return (
          <motion.span
            key={index}
            initial={{ scale: 1 }}
            animate={isFilled ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn("cursor-default", interactive && "cursor-pointer")}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => handleClick(starValue)}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                isFilled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
              )}
            />
          </motion.span>
        )
      })}
    </div>
  )
}
