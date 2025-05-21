import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Star, StarHalf } from "lucide-react"

interface TestimonialCardProps {
  quote: string
  author: string
  role: string
  avatar: string
  rating: number
}

export function TestimonialCard({ quote, author, role, avatar, rating }: TestimonialCardProps) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.floor(rating) }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-primary text-primary" />
          ))}
          {rating % 1 !== 0 && <StarHalf className="h-4 w-4 fill-primary text-primary" />}
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 italic">"{quote}"</p>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden">
            <img
              src={avatar || "/placeholder.svg"}
              alt={author}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="font-medium">{author}</p>
            <p className="text-sm text-muted-foreground">{role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

