import { Calendar, Ticket, Users } from "lucide-react"
import type { ReactNode } from "react"
import { Spotlight } from "../ui/spotlight"
import { useLocation } from "react-router-dom"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  description: string
  showRightSide?: boolean // Optional override for right side
}

export function AuthLayout({ children, title, description, showRightSide }: AuthLayoutProps) {
  const location = useLocation();
  // Allowed paths for right side
  const allowedPaths = ["/signup", "/signin", "/forgot-password"];
  // Determine if right side should be shown
  const shouldShowRightSide =
    typeof showRightSide === "boolean"
      ? showRightSide
      : allowedPaths.includes(location.pathname);

  return (
    <div className="relative flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex w-full justify-center px-4 py-12 md:w-1/2 md:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <a href="/" className="flex items-center">
              <Ticket className="mr-2 h-6 w-6 text-primary" />
              <span className="text-xl font-extrabold">Eventify</span>
            </a>
          </div>
          <div className="mb-8 space-y-2 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <div className="flex min-h-[400px] w-full flex-col items-center justify-center">
            {children}
          </div>
        </div>
      </div>

      {/* Right side - Image and features */}
      {shouldShowRightSide && (
        <div className="fixed right-0 top-0 hidden h-full w-1/2 bg-gradient-to-br from-blue-500 to-blue-700 md:block">
          <Spotlight/>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-primary-foreground">
            <div className="mb-8 text-center">
              <h2 className="mb-4 text-3xl font-extrabold">Discover Amazing Events</h2>
              <p className="mb-8 text-lg opacity-90">
                Join thousands of people discovering and creating memorable events every day
              </p>
            </div>

            <div className="grid w-full max-w-md gap-6">
              <div className="slide-in-right flex items-start space-x-4" style={{ animationDelay: "0.1s" }}>
                <div className="rounded-full p-2">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">Find Events</h3>
                  <p className="text-sm opacity-80">Discover events that match your interests</p>
                </div>
              </div>

              <div className="slide-in-right flex items-start space-x-4" style={{ animationDelay: "0.2s" }}>
                <div className="rounded-full p-2">
                  <Ticket className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">Manage Tickets</h3>
                  <p className="text-sm opacity-80">Buy and sell tickets with ease</p>
                </div>
              </div>
              <div className="slide-in-right flex items-start space-x-4" style={{ animationDelay: "0.3s" }}>
                <div className="rounded-full p-2">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">Connect with Others</h3>
                  <p className="text-sm opacity-80">Meet people who share your interests</p>
                </div>
              </div>
            </div>
            <div className="floating absolute bottom-8 right-8 max-w-[240px] rounded-lg bg-background/10 p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="h-[40px] w-[40px] overflow-hidden rounded-full flex bg-blue-300">
                  <img src="/person2.jpg" alt="User avatar" width={40} height={40} className="object-cover" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sarah J.</p>
                  <p className="text-xs opacity-80">Event Organizer</p>
                </div>
              </div>
              <p className="mt-2 text-sm">"This platform has transformed how I manage my events. Highly recommended!"</p>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 text-xs text-primary-foreground/60">
            &copy; {new Date().getFullYear()} Eventify. All rights reserved.
          </div>
        </div>
      )}
    </div>
  )
}

