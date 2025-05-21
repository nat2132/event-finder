import { useState, useEffect } from "react"
import { SortDesc, SortAsc } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReviewList } from "./review-list"
import { ReviewStats } from "./review-stats"
import { ReviewFilters } from "./review-filters"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@clerk/clerk-react"
import { fetchEvents } from "../../../pages/organizer/event-api"
import type { Event } from "../../../pages/organizer/event-api"

// Organizer review type
interface Review {
  id: string;
  eventId: string;
  eventTitle?: string;
  userName: string;
  userEmail?: string;
  rating: number;
  content: string;
  createdAt: string;
  responses?: { id: string; content: string; createdAt: string }[];
  reply?: string;
}

// Fetch reviews for the organizer
async function fetchReviews(token: string): Promise<Review[]> {
  const res = await fetch("/api/organizer/reviews/", {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  })
  if (!res.ok) return []
  const data = await res.json()
  // Adapt data if needed
  return data.reviews || []
}

// --- Additional: Delete organizer reply from backend ---
async function deleteOrganizerReply(reviewId: string, getToken: () => Promise<string>, setReviews: any, setFilteredReviews: any, toast: any) {
  try {
    const jwt = await getToken();
    const res = await fetch(`/api/reviews/${reviewId}/reply/`, {
      method: "POST", // If backend supports DELETE or PATCH, change accordingly
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ reply: "" }),
    });
    if (res.ok) {
      const reviewsData = await fetchReviews(jwt);
      setReviews(reviewsData);
      setFilteredReviews(reviewsData);
      toast({
        title: "Response deleted",
        description: "Your response has been removed from the backend.",
      });
    } else {
      toast({
        title: "Failed to delete response",
        description: "Could not remove your response from the backend. Please try again.",
        variant: "destructive",
      });
    }
  } catch (e) {
    toast({
      title: "Network error",
      description: "Could not reach the backend. Please try again.",
      variant: "destructive",
    });
  }
}

export function ReviewDashboard() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    event: "all",
    rating: "all",
    dateRange: "all",
    searchQuery: "",
    sortBy: "date",
    sortOrder: "desc" as "asc" | "desc",
  })
  const { toast } = useToast()

  // Fetch reviews and events
  const { getToken } = useAuth();
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const jwt = await getToken();
        const [reviewsData, eventsResponse] = await Promise.all([
          fetchReviews(jwt),
          fetchEvents(jwt)
        ])
        setReviews(reviewsData)
        setFilteredReviews(reviewsData)
        // Handle paginated response
        setEvents(eventsResponse.results || [])
      } catch (error) {
        toast({
          title: "Error loading reviews",
          description: "Please try again later",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [toast, getToken])

  // Apply filters
  useEffect(() => {
    let result = [...reviews]

    // Filter by event
    if (filters.event !== "all") {
      result = result.filter((review) => review.eventId === filters.event)
    }

    // Filter by rating
    if (filters.rating !== "all") {
      result = result.filter((review) => review.rating === Number.parseInt(filters.rating))
    }

    // Filter by date range
    if (filters.dateRange !== "all") {
      const now = new Date()
      const dateLimit = new Date()

      switch (filters.dateRange) {
        case "today":
          dateLimit.setHours(0, 0, 0, 0)
          break
        case "week":
          dateLimit.setDate(now.getDate() - 7)
          break
        case "month":
          dateLimit.setMonth(now.getMonth() - 1)
          break
        default:
          break
      }

      result = result.filter((review) => new Date(review.createdAt) >= dateLimit)
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter(
        (review) => review.content.toLowerCase().includes(query) || review.userName.toLowerCase().includes(query),
      )
    }

    // Sort results
    result.sort((a, b) => {
      let comparison = 0

      switch (filters.sortBy) {
        case "date":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case "rating":
          comparison = a.rating - b.rating
          break
        case "responses":
          comparison = (a.responses?.length || 0) - (b.responses?.length || 0)
          break
        default:
          comparison = 0
      }

      return filters.sortOrder === "desc" ? -comparison : comparison
    })

    setFilteredReviews(result)
  }, [reviews, filters])

  const handleReviewResponse = async (reviewId: string, response: string) => {
    setReviews((prevReviews) =>
      prevReviews.map((review) => {
        if (review.id === reviewId) {
          const newResponse = {
            id: `resp-${Date.now()}`,
            content: response,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            organizerId: "current-organizer", // In a real app, this would come from auth
            organizerName: "Event Organizer", // In a real app, this would come from auth
          }

          return {
            ...review,
            responses: [...(review.responses || []), newResponse],
          }
        }
        return review
      }),
    )

    toast({
      title: "Response added",
      description: "Your response has been added to the review",
    });

    // --- POST reply to backend ---
    try {
      const jwt = await getToken();
      const res = await fetch(`/api/reviews/${reviewId}/reply/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ reply: response }),
      });
      if (res.ok) {
        // Optionally reload reviews from backend to get updated data
        const reviewsData = await fetchReviews(jwt);
        setReviews(reviewsData);
        setFilteredReviews(reviewsData);
      } else {
        toast({
          title: "Failed to add response",
          description: "Could not add your response to the backend. Please try again.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Network error",
        description: "Could not reach the backend. Please try again.",
        variant: "destructive",
      });
    }
  }

  const handleResponseEdit = async (reviewId: string, responseId: string, newContent: string) => {
    setReviews((prevReviews) =>
      prevReviews.map((review) => {
        if (review.id === reviewId && review.responses) {
          const updatedResponses = review.responses.map((response) => {
            if (response.id === responseId) {
              return {
                ...response,
                content: newContent,
                updatedAt: new Date().toISOString(),
              }
            }
            return response
          })

          return {
            ...review,
            responses: updatedResponses,
          }
        }
        return review
      }),
    )

    toast({
      title: "Response updated",
      description: "Your response has been updated",
    });

    // --- PATCH reply to backend ---
    try {
      const jwt = await getToken();
      // PATCH the reply (update)
      const res = await fetch(`/api/reviews/${reviewId}/reply/`, {
        method: "POST", // If your backend supports PATCH for reply, change to PATCH
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ reply: newContent }),
      });
      if (res.ok) {
        const reviewsData = await fetchReviews(jwt);
        setReviews(reviewsData);
        setFilteredReviews(reviewsData);
      } else {
        toast({
          title: "Failed to update response",
          description: "Could not update your response in the backend. Please try again.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Network error",
        description: "Could not reach the backend. Please try again.",
        variant: "destructive",
      });
    }
  }

  const handleResponseDelete = async (reviewId: string, responseId: string) => {
    setReviews((prevReviews) =>
      prevReviews.map((review) => {
        if (review.id === reviewId && review.responses) {
          return {
            ...review,
            responses: review.responses.filter((response) => response.id !== responseId),
          }
        }
        return review
      }),
    )

    toast({
      title: "Response deleted",
      description: "Your response has been removed",
    });

    // --- DELETE reply in backend (simulate by setting reply to empty string) ---
    try {
      const jwt = await getToken();
      // Set reply to empty string to 'delete' it
      const res = await fetch(`/api/reviews/${reviewId}/reply/`, {
        method: "POST", // If your backend supports DELETE or PATCH, use that
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ reply: "" }),
      });
      if (res.ok) {
        const reviewsData = await fetchReviews(jwt);
        setReviews(reviewsData);
        setFilteredReviews(reviewsData);
      } else {
        toast({
          title: "Failed to delete response",
          description: "Could not remove your response from the backend. Please try again.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Network error",
        description: "Could not reach the backend. Please try again.",
        variant: "destructive",
      });
    }
  }

  const toggleSortOrder = () => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === "desc" ? "asc" : "desc",
    }))
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList>
            <TabsTrigger value="all">All Reviews</TabsTrigger>
            <TabsTrigger value="pending">Pending Responses</TabsTrigger>
            <TabsTrigger value="responded">Responded</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleSortOrder} className="flex items-center gap-1">
              {filters.sortOrder === "desc" ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
              <span className="hidden sm:inline">Sort</span>
            </Button>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, sortBy: value }))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="responses">Responses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ReviewFilters events={events} filters={filters} setFilters={setFilters} />
            <ReviewStats reviews={filteredReviews} className="mt-6" />
          </div>

          <div className="lg:col-span-3">
            <TabsContent value="all" className="m-0">
              <ReviewList
                reviews={filteredReviews}
                events={events}
                isLoading={isLoading}
                onRespond={handleReviewResponse}
                onEditResponse={handleResponseEdit}
                onDeleteResponse={handleResponseDelete}
                onDeleteOrganizerReply={(reviewId: string) =>
                  deleteOrganizerReply(
                    reviewId,
                    getToken,
                    setReviews,
                    setFilteredReviews,
                    toast
                  )
                }
              />
            </TabsContent>

            <TabsContent value="pending" className="m-0">
              <ReviewList
                reviews={filteredReviews.filter((review) => !review.responses || review.responses.length === 0)}
                events={events}
                isLoading={isLoading}
                onRespond={handleReviewResponse}
                onEditResponse={handleResponseEdit}
                onDeleteResponse={handleResponseDelete}
              />
            </TabsContent>

            <TabsContent value="responded" className="m-0">
              <ReviewList
                reviews={filteredReviews.filter((review) => review.responses && review.responses.length > 0)}
                events={events}
                isLoading={isLoading}
                onRespond={handleReviewResponse}
                onEditResponse={handleResponseEdit}
                onDeleteResponse={handleResponseDelete}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
