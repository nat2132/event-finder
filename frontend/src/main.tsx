import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/auth/SignIn';
import SignUpPage from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import Home from './pages/organizer/dashboard';
import { PageTransition } from './components/page-transition';
import { NotificationProvider } from './context/notification-context';

import { UserDashboardRoutes } from './pages/user/user-dashboard-routes';
import AdminDashboardPage from './pages/admin/dashboard';
import AdminAnalyticsPage from './pages/admin/analytics.tsx';
import AdminEventsPage from './pages/admin/events';
import AdminNotificationsPage from './pages/admin/notifications';
import AdminProfilePage from './pages/admin/profile';
import AdminSettingsPage from './pages/admin/settings';
import AdminUsersPage from './pages/admin/users';
import RequireAuth from './components/auth/RequireAuth';
import ResetPassword from './pages/auth/ResetPassword';
import { ThemeProvider } from './components/theme-provider'; // Import ThemeProvider
import { SidebarProvider } from './components/ui/sidebar'; // Import SidebarProvider
import { ClerkProvider } from '@clerk/clerk-react'; // Import ClerkProvider
import { UserProfileProvider } from './components/UserProfileProvider';
import { Toaster } from './components/ui/toaster';
import CreateEventPage from './pages/organizer/create-event';
import MyEventsPage from './pages/organizer/my-events';
import AttendeesPage from './pages/organizer/attendees';
import TicketSalesPage from './pages/organizer/ticket-sales';
import NotificationsPage from './pages/organizer/notifications';
import SettingsPage from './pages/organizer/settings';
import ReviewsPage from './pages/organizer/reviews';
import { TranslationProvider } from './context/translation';

// Lazy load event detail page
const EventDetailPage = React.lazy(() => import('./pages/user/event/[id]/event'));
// Be sure to set VITE_CLERK_PUBLISHABLE_KEY in your .env or .env.local file
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TranslationProvider>
          <Router>
              <UserProfileProvider>
              <NotificationProvider>
                <PageTransition>
                  <Routes>
                    {/* Redirect the root path to LandingPage */}
                    <Route path="/" element={<Navigate to="/landing" replace />} />
                    <Route path="/landing" element={<LandingPage />} />
                    {/* Auth routes */}
                    <Route path="/login" element={<SignInPage />} />
                    <Route path="/sign-in" element={<SignInPage />} />
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route path="/sign-up" element={<SignUpPage />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    {/* User dashboard routes - RequireAuth now uses context from the provider above */}
                    <Route path="/dashboard/user/*" element={<RequireAuth><UserDashboardRoutes /></RequireAuth>} />
                    {/* Organizer dashboard routes */}
                    <Route path="/dashboard/organizer/dashboard" element={<RequireAuth><SidebarProvider><Home /></SidebarProvider></RequireAuth>} />
                    <Route path="/dashboard/organizer/create-event" element={<RequireAuth><SidebarProvider><CreateEventPage /></SidebarProvider></RequireAuth>} />
                    <Route path="/dashboard/organizer/my-events" element={<RequireAuth><SidebarProvider><MyEventsPage /></SidebarProvider></RequireAuth>} />
                    <Route path="/dashboard/organizer/attendees" element={<RequireAuth><SidebarProvider><AttendeesPage /></SidebarProvider></RequireAuth>} />
                    <Route path="/dashboard/organizer/ticket-sales" element={<RequireAuth><SidebarProvider><TicketSalesPage /></SidebarProvider></RequireAuth>} />
                    <Route path="/dashboard/organizer/notifications" element={<RequireAuth><SidebarProvider><NotificationsPage /></SidebarProvider></RequireAuth>} />
                    <Route path="/dashboard/organizer/settings" element={<RequireAuth><SidebarProvider><SettingsPage /></SidebarProvider></RequireAuth>} />
                    <Route path="/dashboard/organizer/reviews" element={<RequireAuth><SidebarProvider><ReviewsPage /></SidebarProvider></RequireAuth>} />
                    {/* Event detail page */}
                    <Route path="/events/:id" element={<RequireAuth><React.Suspense fallback={null}><EventDetailPage /></React.Suspense></RequireAuth>} />
                    {/* Admin dashboard routes */}
                    <Route path="/dashboard/admin/dashboard" element={<RequireAuth><AdminDashboardPage /></RequireAuth>} />
                    <Route path="/dashboard/admin/analytics" element={<RequireAuth><AdminAnalyticsPage /></RequireAuth>} />
                    <Route path="/dashboard/admin/events" element={<RequireAuth><AdminEventsPage /></RequireAuth>} />
                    <Route path="/dashboard/admin/notifications" element={<RequireAuth><AdminNotificationsPage /></RequireAuth>} />
                    <Route path="/dashboard/admin/profile" element={<RequireAuth><AdminProfilePage /></RequireAuth>} />
                    <Route path="/dashboard/admin/settings" element={<RequireAuth><AdminSettingsPage /></RequireAuth>} />
                    <Route path="/dashboard/admin/users" element={<RequireAuth><AdminUsersPage /></RequireAuth>} />
                  </Routes>
                </PageTransition>
                </NotificationProvider>
              </UserProfileProvider>
          </Router>
          <Toaster />
        </TranslationProvider>
      </ThemeProvider>
    </ClerkProvider>
  </React.StrictMode>
);
