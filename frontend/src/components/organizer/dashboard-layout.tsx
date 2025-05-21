import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { SidebarInset, useSidebar } from "@/components/ui/sidebar"
import { DashboardHeader } from "@/components/organizer/dashboard-header"
import DashboardSidebar from "@/components/organizer/dashboard-sidebar"

interface DashboardLayoutProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function DashboardLayout({ children, noPadding = false }: DashboardLayoutProps) {
  const { state } = useSidebar();
  // Sidebar width: expanded = 16rem, collapsed = 3rem
  const sidebarWidth = state === "expanded" ? "0rem" : "0rem";

  return (
    <div className="flex min-h-screen w-full">
      <DashboardSidebar />
      <motion.div
        animate={{ marginLeft: sidebarWidth }}
        transition={{ type: "spring", stiffness: 250, damping: 30 }}
        className="flex-1 min-w-0"
        style={{ minHeight: '100vh' }}
      >
        <SidebarInset>
          <div className="flex h-full flex-col">
            <DashboardHeader />
            <motion.main
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex-1 overflow-auto ${noPadding ? 'p-0' : 'p-4 md:p-6'}`}
            >
              {children}
            </motion.main>
          </div>
        </SidebarInset>
      </motion.div>
    </div>
  )
}

