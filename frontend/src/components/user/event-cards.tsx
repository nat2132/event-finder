import { useState } from "react"
import { Calendar, MapPin, Save, Star, User } from "lucide-react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CommentCarousel, type Comment } from "@/components/user/comment-carousel"
import { cn } from "@/lib/utils"
import { useAuth } from "@clerk/clerk-react"
import { saveEvent, unsaveEvent } from "@/api/saved-events"
import { useToast } from "@/hooks/use-toast"

interface EventCardProps {
  id: string
  title: string
  description: string
  image: string
  date: string
  location: string
  category: string
  saved: boolean
  creator?: {
    name: string
    avatar?: string
  }
  rating?: number
  comments?: Comment[]
  source?: 'Ticketmaster' | 'Skiddle';
}

export function EventCard({
  id,
  title,
  description,
  image,
  date,
  location,
  category,
  saved: initialSaved,
  creator = { name: "Event Organizer" },
  rating = 0,
  comments = [],
  source,
}: EventCardProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [saving, setSaving] = useState(false)
  const { getToken } = useAuth();
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to save events.",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }
      if (!saved) {
        try {
          await saveEvent(id, token, { id, title, description, image, date, location, category, creator, rating, comments, source }, !!source, source);
          setSaved(true);
          toast({
            title: "Event Saved",
            description: "This event has been added to your saved events.",
            variant: "default"
          });
        } catch (error: unknown) {
          if (error instanceof Error && error.message === 'FREE_PLAN_LIMIT') {
            toast({
              title: "Save Limit Reached",
              description: "You've reached the maximum number of saved events for your plan.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Failed to Save Event",
              description: "Please try again later.",
              variant: "destructive"
            });
          }
        }
      } else {
        await unsaveEvent(id, token);
        setSaved(false);
        toast({
          title: "Event Removed",
          description: "This event has been removed from your saved events.",
          variant: "default"
        });
      }
    } catch {
      toast({
        title: "Failed to Update",
        description: "An error occurred while updating your saved events.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
        <Card className="overflow-hidden h-full flex flex-col ">
          <div className="aspect-video w-full overflow-hidden relative">
            <img
              src={image || "/placeholder.svg"}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
            {rating > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-2 right-2 bg-primary/70 text-primary-foreground text-xs font-bold px-2 py-1 rounded-md flex items-center"
              >
                <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                {rating.toFixed(1)}
              </motion.div>
            )}
          </div>
          <CardHeader className="px-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex gap-2 mb-2">
                  <Badge variant="outline">
                    {category}
                  </Badge>
                  <Badge
                    className={
                      source === 'Skiddle'
                        ? 'bg-[#F6682F] text-primary-foreground border-none'
                        : source === 'Ticketmaster'
                        ? 'bg-[#003366] text-primary-foreground border-none'
                        : 'bg-[#023020] text-primary-foreground border-none' // eventify style
                    }
                  >
                    {source === 'Skiddle' || source === 'Ticketmaster' ? source : 'Eventify'}
                  </Badge>
                </div>
                <CardTitle className="line-clamp-1">{title}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={saved ? "text-primary" : "text-muted-foreground"}
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-5 w-5" />
                <span className="sr-only">{saved ? "Unsave" : "Save"}</span>
              </Button>
            </div>
            <CardDescription className="line-clamp-2 mt-1">{description}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 flex-1">
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {date}
              </div>
              <div className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                {location}
              </div>
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <div className="flex items-center">
                  {creator.avatar ? (
                    <div className="flex items-center">
                      <img 
                        src={
                          creator.avatar.startsWith('/media/') 
                            ? `${window.location.protocol}//${window.location.hostname}:8000${creator.avatar}` 
                            : creator.avatar
                        } 
                        alt={creator.name} 
                        className="w-4 h-4 rounded-full mr-1 object-cover" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span>{creator.name}</span>
                    </div>
                  ) : (
                  <span>{creator.name}</span>
                  )}
                </div>
              </div>
            </div>

            {comments.length > 0 && (
              <div className={cn("mt-3 border-t pt-3", comments.length === 0 && "hidden")}>
                <div className="text-xs font-medium mb-1">Recent Comments</div>
                <CommentCarousel comments={comments} />
              </div>
            )}
          </CardContent>
          <CardFooter className="px-4">
            <Button asChild className="w-full">
              <Link to={`/dashboard/user/event/${id}${source ? `?source=${source}` : ''}`}>View Details</Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </>
  )
}
