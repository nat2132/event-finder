import { DashboardLayout } from "@/components/organizer/dashboard-layout";
import { ReviewDashboard } from "@/components/organizer/reviews/review-dashboard";


export default function ReviewsPage() {
  return (
    <DashboardLayout>
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Review Management</h1>
      <ReviewDashboard />
    </div>
    </DashboardLayout>
  );
}

