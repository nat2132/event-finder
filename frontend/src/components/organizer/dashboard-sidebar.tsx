import { useNavigate, useLocation, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Bell,
  CalendarPlus,
  ChevronDown,
  ClipboardList,
  Home,
  LogOut,
  Settings,
  Ticket,
  Users,
  Star,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@clerk/clerk-react";
import { useClerk } from '@clerk/clerk-react';
import { useUserProfile } from "@/components/UserProfileProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { getClerkToken } from "@/lib/clerkToken";
import { fetchUserNotifications } from "@/api/notifications";
import type { UserNotification } from "@/api/notifications";

export default function DashboardSidebar() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { profile } = useUserProfile();
  
  // Generate display name with better fallbacks
  let displayName = "User";
  if (profile && profile.first_name) {
    displayName = profile.first_name;
    if (profile.last_name) {
      displayName += ` ${profile.last_name}`;
    }
  } else if (user) {
    if (user.firstName) {
      displayName = user.firstName;
      if (user.lastName) {
        displayName += ` ${user.lastName}`;
      }
    } else if (user.fullName) {
      displayName = user.fullName;
    } else if (user.username) {
      displayName = user.username;
    }
  }
  
  const displayEmail = profile?.email || user?.primaryEmailAddress?.emailAddress || "";
  const displayImage = user?.imageUrl || "/placeholder.svg";
  
  // Generate initials for avatar fallback
  let initials = "U";
  if (profile?.first_name) {
    initials = profile.first_name.charAt(0);
    if (profile.last_name) {
      initials += profile.last_name.charAt(0);
    }
  } else if (user?.firstName) {
    initials = user.firstName.charAt(0);
    if (user.lastName) {
      initials += user.lastName.charAt(0);
    } 
  } else if (displayName && displayName !== "User") {
    initials = displayName.charAt(0);
  }
  
  const navigate = useNavigate()
  const location = useLocation()
  
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    async function fetchNotificationCount() {
      try {
        const token = await getClerkToken();
        if (!token) return;

        const notifications = await fetchUserNotifications(token);
        const unreadNotifications = notifications.filter(
          (notification: UserNotification) => !notification.is_read
        ).length;
        
        setUnreadCount(unreadNotifications);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    }

    fetchNotificationCount();
    
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotificationCount, 60000);
    return () => clearInterval(interval);
  }, []);

const navigationItems = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        icon: Home,
        href: "/dashboard/organizer/dashboard",
      },
      {
        title: "Create Event",
        icon: CalendarPlus,
        href: "/dashboard/organizer/create-event",
      },
      {
        title: "My Events",
        icon: ClipboardList,
        href: "/dashboard/organizer/my-events",
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Attendees",
        icon: Users,
        href: "/dashboard/organizer/attendees",
      },
      {
        title: "Ticket Sales",
        icon: Ticket,
        href: "/dashboard/organizer/ticket-sales",
      },
      {
        title: "Reviews",
        icon: Star,
        href: "/dashboard/organizer/reviews",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        title: "Notifications",
        icon: Bell,
        href: "/dashboard/organizer/notifications",
          badge: unreadCount > 0 ? unreadCount.toString() : undefined,
      },
      {
        title: "Settings",
        icon: Settings,
        href: "/dashboard/organizer/settings",
      },
    ],
  },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Link to="/dashboard/organizer/dashboard" className="flex items-center gap-2">
              <span className="text-xl font-bold">Eventify</span>
            </Link>
          </motion.div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigationItems.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.href} tooltip={item.title}>
                      <Link to={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm hover:bg-slate-100 cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={displayImage} alt={displayName} />
                  <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{displayEmail || "No email"}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator/>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/organizer/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/organizer/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    localStorage.removeItem('token');
                    await signOut();
                    navigate('/sign-in');
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
