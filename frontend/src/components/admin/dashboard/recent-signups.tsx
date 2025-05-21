import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useEffect } from "react"
import { getDisplayName, getAvatarInitials } from "@/utils/userDisplayUtils"

// Interface for user data passed as props (should match dashboard.tsx)
interface RecentUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string; // Assuming ISO string format
  profile_image?: string;
  plan?: string; // Plan information from the backend
}

// Props interface for the component
interface RecentSignupsProps {
  users: RecentUser[];
}

// Helper to format date (simple version)
function formatDate(isoString: string): string {
  if (!isoString) {
    return "No Date"; // Handle empty strings
  }
  try {
    const date = new Date(isoString);
    // Check if the date object is valid after parsing
    if (isNaN(date.getTime())) {
      console.error("formatDate received an invalid date string:", isoString);
      return "Invalid Date"; // Explicitly return on parsing failure
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    console.error("Error parsing date string:", isoString, e);
    return "Invalid Date"; // Return on error
  }
}

// Helper to get badge style based on plan
function getPlanBadgeStyle(plan: string | undefined): string {
  if (!plan) return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300";
  
  const planLower = plan.toLowerCase();
  
  if (planLower.includes('pro')) {
    return "border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-700 dark:bg-purple-900 dark:text-purple-200";
  }
  
  if (planLower.includes('organizer')) {
    return "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200";
  }
  
  if (planLower.includes('premium')) {
    return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-200";
  }
  
  if (planLower.includes('business')) {
    return "border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900 dark:text-green-200";
  }
  
  if (planLower.includes('enterprise')) {
    return "border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200";
  }
  
  // Default - Free plan or others
  return "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

export function RecentSignups({ users }: RecentSignupsProps) { // Destructure users from props
  // Log the IDs being used as keys for debugging
  useEffect(() => {
    if (users) {
      const ids = users.map(u => u.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.warn("RecentSignups: Duplicate keys detected in users prop:", ids);
      }
    }
  }, [users]);

  // Handle empty state
  if (!users || users.length === 0) {
    return <div className="text-center text-muted-foreground py-4">No recent sign-ups found.</div>;
  }

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead className="text-right">Joined Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="border-b">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profile_image || "/placeholder.svg"} alt={getDisplayName(user)} />
                    <AvatarFallback>{getAvatarInitials(user)}</AvatarFallback>
                  </Avatar>
                  <div className="font-medium">{getDisplayName(user)}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </TableCell>
              <TableCell>
              <Badge
              variant="outline"
                  className={getPlanBadgeStyle(user.plan)}
            >
                  {user.plan || 'Free'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-xs text-muted-foreground">{formatDate(user.created_at)}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
