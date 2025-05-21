import React, { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/admin/header";
import { Sidebar } from "@/components/admin/admin-sidebar";
import { cn } from "@/lib/utils";

// If you use a font like 'inter', import it here or remove the className if not needed
// import { inter } from "@/fonts/inter";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ThemeProvider theme={{ mode: 'light' }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className={cn(
          "flex w-full flex-col",
          collapsed ? "md:pl-16" : "md:pl-64"
        )}>
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-10 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
