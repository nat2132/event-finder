import React from "react";
import { Routes as RRDRoutes, Route, Navigate } from "react-router-dom";
import UserBilling from "./billing";
import UserCalendar from "./calendar";
import UserDiscover from "./discover";
import UserNotifications from "./notifications";
import UserSaved from "./saved";
import UserSettings from "./settings";
import UserTickets from "./tickets";
import EventDetailPage from "./event/[id]/event";

export function UserDashboardRoutes() {
  return (
    <RRDRoutes>
      <Route path="billing" element={<UserBilling />} />
      <Route path="calendar" element={<UserCalendar />} />
      <Route path="discover" element={<UserDiscover />} />
      <Route path="notifications" element={<UserNotifications />} />
      <Route path="saved" element={<UserSaved />} />
      <Route path="settings" element={<UserSettings />} />
      <Route path="tickets" element={<UserTickets />} />
      <Route path="event/:id" element={<EventDetailPage />} />
      {/* Optionally redirect unknown routes to dashboard */}
      <Route
        path="*"
        element={
          <>
            {console.log(`UserDashboardRoutes: Catch-all redirecting from ${window.location.pathname} to /discover`)}
            <Navigate to="/dashboard/user/discover" replace />
          </>
        }
      />
    </RRDRoutes>
  );
}
