import { Link } from "react-router-dom"
import { LogOut, Settings, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "../UserProfileProvider";

export function UserNav() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { profile } = useUserProfile();

  const handleLogout = async () => {
    await signOut();
    navigate("/sign-in");
  };

  // Fix for undefined name issue
  const firstName = profile?.first_name || user?.firstName || "";
  const lastName = profile?.last_name || user?.lastName || "";
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : user?.fullName || "User";
  const displayEmail = profile?.email || user?.primaryEmailAddress?.emailAddress || "";
  
  // Get the raw image URL from profile or user
  const rawImageUrl = profile?.profile_image || user?.imageUrl || "/placeholder.svg";
  
  // Process image URL to handle different formats
  const displayImage = (() => {
    // Handle backend media paths
    if (rawImageUrl.startsWith('/media/')) {
      return `${window.location.protocol}//${window.location.hostname}:8000${rawImageUrl}`;
    }
    // Handle localhost HTTPS URLs (convert to HTTP)
    if (rawImageUrl.startsWith('https://127.0.0.1:8000/') || rawImageUrl.startsWith('https://localhost:8000/')) {
      return rawImageUrl.replace('https://', 'http://');
    }
    return rawImageUrl;
  })();
  
  const avatarFallback = ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={displayImage} 
              alt={displayName} 
              onError={(e) => {
                console.log("Avatar image failed to load:", e.currentTarget.src);
                e.currentTarget.style.display = 'none';
              }}
            />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/dashboard/user/settings">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/dashboard/user/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
