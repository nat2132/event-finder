import { Calendar, MapPin, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

interface EventCardProps {
  title: string
  date: string
  location: string
  image: string
  attendees: number
  category: string
}

export function EventCard({ title, date, location, image, attendees, category }: EventCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg">
      <div className="relative h-48 w-full">
        <img src={image || "/placeholder.svg"} alt={title} className="object-cover w-full h-full" />
        <Badge className="absolute top-4 right-4">{category}</Badge>
      </div>
      <CardHeader>
        <h3 className="text-xl font-bold">{title}</h3>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-1 h-4 w-4" />
          <span>{date}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-1 h-4 w-4" />
          <span>{location}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="mr-1 h-4 w-4" />
          <span>{attendees} attending</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <a href="/sign-up">View Details</a>
        </Button>
      </CardFooter>
    </Card>
  )
}