import type React from "react"
import { useState } from "react"
import { useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

import { AppSidebar } from "@/components/user/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { UserNav } from "@/components/user/user-nav"
import { ModeToggle } from "@/components/mode-toggle"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <SidebarProvider defaultOpen={true} open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger className="h-8 w-8" />
            <div className="ml-auto flex items-center gap-4">
              <ModeToggle />
              <UserNav />
            </div>
          </header>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
