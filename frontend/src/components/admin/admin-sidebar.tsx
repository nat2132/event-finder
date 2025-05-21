import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
  Home,
  Menu,
  Settings,
  User,
  Users,
  Check,
  type LucideIcon, // Import base type for icons
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation, T, TranslatedAttributeRenderer } from "@/context/translation";

// --- Type Definitions for Sidebar Items ---
interface NavItem {
  title: string;
  to: string;
  icon: LucideIcon; // Use the base icon type
  badge?: number;
}

interface SettingsItem {
  title: string;
  to: string;
  icon: LucideIcon;
  dropdown?: boolean;
  options?: { label: string; value: string }[];
}

// --- Sidebar Data ---
const sidebarItems: NavItem[] = [
  {
    title: "Dashboard",
    to: "/dashboard/admin/dashboard",
    icon: Home,
  },
  {
    title: "Manage Users",
    to: "/dashboard/admin/users",
    icon: Users,
  },
  {
    title: "All Events",
    to: "/dashboard/admin/events",
    icon: CalendarDays,
  },
  {
    title: "Analytics",
    to: "/dashboard/admin/analytics",
    icon: BarChart3,
    badge: 4,
  },
];

const settingsItems: SettingsItem[] = [
  {
    title: "Platform Settings",
    to: "/dashboard/admin/settings",
    icon: Settings,
  },
  {
    title: "Profile Settings",
    to: "/dashboard/admin/profile",
    icon: User,
  },
  {
    title: "Notification Settings",
    to: "/dashboard/admin/notifications",
    icon: Bell,
  },
  {
    title: "Language",
    to: "#", // Indicate non-navigational link
    icon: Globe,
    dropdown: true,
    options: [
      { label: "English", value: "en" },
      { label: "Amharic", value: "am" },
      { label: "Oromo", value: "om" },
    ],
  },
];

// --- Component Props ---
interface SidebarProps {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

// --- Sidebar Component ---
export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  const { language: currentLanguage, setLanguage } = useTranslation(); // Removed translate
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);

  // Memoized language change handler
  const handleLanguageChange = useCallback(
    async (newLang: SupportedLanguage) => { // Ensure newLang is typed correctly if not inferred
    if (newLang === currentLanguage || isUpdatingLanguage) return;

    setIsUpdatingLanguage(true);
    try {
        await setLanguage(newLang);
      } catch (error: unknown) { // Changed from any to unknown
      console.error("Failed to update language:", error);
        let message = 'An unknown error occurred.';
        if (error instanceof Error) {
          message = error.message;
        }
        // Use a more user-friendly notification system in production
        alert(`Error: Failed to update language preference. ${message}`);
    } finally {
      setIsUpdatingLanguage(false);
    }
    },
    [currentLanguage, setLanguage]
  );

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Helper component for consistent title translation
  const TranslatedTitle: React.FC<{ title: string }> = ({ title }) => <T>{title}</T>;

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <TranslatedAttributeRenderer text={"Toggle Menu"}>
        {(translatedLabel) => (
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-3 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={translatedLabel}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only"><T>Toggle Menu</T></span>
      </Button>
        )}
      </TranslatedAttributeRenderer>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true" // Indicate it's for visual effect
        />
      )}

      {/* Sidebar Container */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r  bg-background transition-transform duration-300 ease-in-out md:transition-[width]", // Adjusted transition for desktop vs mobile
          collapsed ? "md:w-16" : "md:w-64", // Apply width transitions only on md+ screens
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:translate-x-0", // Mobile uses translate, desktop uses width
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between border-b  px-4 lg:h-[60px] flex-shrink-0">
           <Link to="/" className="flex items-center gap-2 font-semibold overflow-hidden whitespace-nowrap">
             {/* Conditional rendering for logo/title based on collapsed state */}
             {collapsed ? (
                 <span className="text-lg"><T>EA</T></span> // Abbreviated or Icon Logo when collapsed
               ) : (
                 <span className="text-lg"><T>EventAdmin</T></span> // Full Title when expanded
             )}
          </Link>
          {/* Desktop Collapse Toggle */}
          <TranslatedAttributeRenderer text={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            {(translatedLabel) => (
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex" // Only show on medium screens and up
                onClick={() => setCollapsed(!collapsed)}
                aria-label={translatedLabel}
              >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                <span className="sr-only">{collapsed ? <T>Expand Sidebar</T> : <T>Collapse Sidebar</T>}</span>
          </Button>
            )}
          </TranslatedAttributeRenderer>
        </div>

        {/* Sidebar Navigation Area */}
        <ScrollArea className="flex-1 py-2">
          <nav className="grid gap-1 px-2">
            {/* Main Navigation Items */}
            {sidebarItems.map((item) => (
              <TranslatedAttributeRenderer text={item.title} key={`${item.to}-attr`}>
                {(translatedTitle) => (
              <Button
                    key={item.to} // Key on the outer element of the map
                    variant={pathname.startsWith(item.to) ? "secondary" : "ghost"} // Use startsWith for nested routes
                className={cn(
                      "group flex h-10 justify-start gap-2 px-3 relative", // Added relative for badge positioning
                      pathname.startsWith(item.to) ? "bg-muted" : "hover:bg-accent", // Use theme colors like muted
                  collapsed ? "justify-center px-0" : "",
                )}
                asChild
              >
                    <Link to={item.to} title={translatedTitle}>
                      <item.icon className="h-4 w-4 flex-shrink-0" /> {/* Prevent icon shrinking */}
                      {!collapsed && <span className="truncate"><TranslatedTitle title={item.title} /></span>} {/* Truncate long titles */}
                      {/* Badge Logic */}
                  {!collapsed && item.badge && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                  {collapsed && item.badge && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </Button>
                )}
              </TranslatedAttributeRenderer>
            ))}

            {/* Separator */}
            <div className="my-2 border-t " />

            {/* Settings Navigation Items */}
            {settingsItems.map((item) =>
              item.dropdown ? (
                // Language Dropdown
                <DropdownMenu key={item.title}>
                  <DropdownMenuTrigger asChild>
                    <TranslatedAttributeRenderer text={item.title}>
                      {(translatedTitle) => (
                    <Button
                      variant="ghost"
                      className={cn(
                        "group flex h-10 w-full justify-start gap-2 px-3",
                        collapsed ? "justify-center px-0" : "",
                      )}
                      disabled={isUpdatingLanguage}
                          title={translatedTitle}
                    >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {!collapsed && <span className="truncate"><TranslatedTitle title={item.title} /></span>}
                    </Button>
                      )}
                    </TranslatedAttributeRenderer>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     side={collapsed ? "right" : "top"} // Consider 'top' when expanded and space is limited
                     align="start"
                     className={cn(collapsed ? "ml-2" : "")} // Adjust margin if needed
                   >
                    {item.options?.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleLanguageChange(option.value as SupportedLanguage)}
                        disabled={isUpdatingLanguage || currentLanguage === option.value}
                        className="cursor-pointer"
                      >
                        <TranslatedTitle title={option.label} />
                        {currentLanguage === option.value && <Check className="ml-auto h-4 w-4 opacity-70" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Regular Settings Link
                <TranslatedAttributeRenderer text={item.title} key={`${item.to}-settings-attr`}>
                  {(translatedTitle) => (
                <Button
                  key={item.to}
                      variant={pathname.startsWith(item.to) ? "secondary" : "ghost"}
                  className={cn(
                    "group flex h-10 justify-start gap-2 px-3",
                        pathname.startsWith(item.to) ? "bg-muted" : "hover:bg-accent",
                    collapsed ? "justify-center px-0" : "",
                  )}
                  asChild
                >
                      <Link to={item.to} title={translatedTitle}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!collapsed && <span className="truncate"><TranslatedTitle title={item.title} /></span>}
                  </Link>
                </Button>
                  )}
                </TranslatedAttributeRenderer>
              )
            )}
          </nav>
        </ScrollArea>
      </div>
    </>
  );
}

// Definition for SupportedLanguage, assuming it's available in this scope
// If not, it should be imported from where it's defined (e.g., context/translation)
// type SupportedLanguage = "en" | "am" | "om" | "ti"; // Removed duplicate definition