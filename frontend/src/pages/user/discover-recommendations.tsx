import React from "react";
import { EventCard } from "@/components/user/event-cards";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


export default function DiscoverRecommendations({ internalEvents = [], externalEvents = [] }: { internalEvents?: any[], externalEvents?: any[] }) {
  // The recommendation logic can be improved, for now we just combine and shuffle
  const [recommendedEvents, setRecommendedEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(6);

  React.useEffect(() => {
    setLoading(true);
    setError(false);
    try {
      // Simple recommendation: mix internal and external events, prioritize those with high rating or popularity
      const combined = [...internalEvents, ...externalEvents];
      // Shuffle for variety
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }
      setRecommendedEvents(combined);
      setVisibleCount(6);
    } catch (err) {
      setRecommendedEvents([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [internalEvents, externalEvents]);

  return (
    <Card className=" mt-6">
      <CardHeader>
        <CardTitle>Recommended For You</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading recommendations...</div>
        ) : error ? (
          <div className="text-red-500">Failed to load recommendations.</div>
        ) : recommendedEvents.length === 0 ? (
          <div>No recommendations yet. Save events to get personalized picks!</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendedEvents.slice(0, visibleCount).map(event => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
            {recommendedEvents.length > visibleCount && (
              <Button variant="outline" className="w-full mt-4" onClick={() => setVisibleCount(c => c + 6)}>
                Load More
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
