import { Link, useLocation } from "react-router-dom"
import { Bell, Calendar, CreditCard, Compass, LogOut, Save, Settings, Ticket, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { PlanUpgradeDialog } from "@/components/user/plan-upgrade-dialog"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/components/UserProfileProvider";
import { useNotifications } from "@/context/notification-context";

export function AppSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { state } = useSidebar();
  const { unreadCount } = useNotifications();

  const firstName = profile?.first_name || user?.firstName || "";
  const lastName = profile?.last_name || user?.lastName || "";
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : user?.fullName || "User";
  const displayEmail = profile?.email || user?.primaryEmailAddress?.emailAddress || "";

  const handleLogout = async () => {
    await signOut();
    navigate("/sign-in");
  };

  return (  
    <Sidebar>
      {state === "expanded" && (
        <SidebarHeader className="flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <div className="grid gap-0.5">
              <div className="font-medium">{displayName}</div>
              <div className="text-xs text-muted-foreground">{displayEmail}</div>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" asChild>
              <Link to="/settings">
                <User className="h-4 w-4" />
                <span className="sr-only">Profile</span>
              </Link>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">LogOut</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you sure you want to log out?</DialogTitle>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button variant="destructive" onClick={handleLogout}>Log out</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </SidebarHeader>
      )}
      {state === "collapsed" && (
        <SidebarHeader className="p-2" />
      )}
      <SidebarSeparator className="w-full mx-0" />
      <SidebarContent>
        <SidebarMenu className="p-4">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/user/discover"} tooltip="Discover">
              <Link to="/dashboard/user/discover">
                <Compass className="h-4 w-4" />
                <span>Discover</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/user/tickets"} tooltip="Tickets">
              <Link to="/dashboard/user/tickets">
                <Ticket className="h-4 w-4" />
                <span>Tickets</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/user/saved"} tooltip="Saved">
              <Link to="/dashboard/user/saved">
                <Save className="h-4 w-4" />
                <span>Saved</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/user/notifications"} tooltip="Notifications">
              <Link to="/dashboard/user/notifications"> 
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {unreadCount}
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/user/calendar"} tooltip="Calendar">
              <Link to="/dashboard/user/calendar">
                <Calendar className="h-4 w-4" />
                <span>Calendar</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/user/billing"} tooltip="Billing & Plan">
              <Link to="/dashboard/user/billing">
                <CreditCard className="h-4 w-4" />
                <span>Billing & Plan</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/user/settings"} tooltip="Settings">
              <Link to="/dashboard/user/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      {state === "expanded" && (
        <SidebarFooter className="p-4">
          <PlanUpgradeDialog />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
