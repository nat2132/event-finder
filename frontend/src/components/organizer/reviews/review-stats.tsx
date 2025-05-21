import { useMemo } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ReviewStatsProps {
  reviews: Review[]
  className?: string
}

export function ReviewStats({ reviews, className }: ReviewStatsProps) {
  const stats = useMemo(() => {
    const totalReviews = reviews.length
    const averageRating = totalReviews > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0

    const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
      const count = reviews.filter((review) => review.rating === rating).length
      const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0

      return {
        rating: `${rating} ★`,
        count,
        percentage: Math.round(percentage),
      }
    })

    const pendingResponses = reviews.filter((review) => !review.responses || review.responses.length === 0).length

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
      pendingResponses,
    }
  }, [reviews])

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Review Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Reviews</p>
            <p className="text-2xl font-bold">{stats.totalReviews}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Average Rating</p>
            <div className="flex items-center">
              <p className="text-2xl font-bold mr-1">{stats.averageRating.toFixed(1)}</p>
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="space-y-1 mb-4">
          <p className="text-sm text-muted-foreground">Pending Responses</p>
          <p className="text-xl font-medium">{stats.pendingResponses}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Rating Distribution</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={stats.ratingDistribution}>
              <XAxis dataKey="rating" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-1">
            {stats.ratingDistribution.map((item) => (
              <div key={item.rating} className="flex items-center text-sm">
                <div className="w-12">{item.rating}</div>
                <div className="w-full">
                  <div className="flex items-center">
                    <div className="h-2 bg-primary rounded" style={{ width: `${item.percentage}%` }} />
                    <span className="ml-2 text-muted-foreground">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
