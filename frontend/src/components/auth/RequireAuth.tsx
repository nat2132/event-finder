import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserProfile } from '../UserProfileProvider'; // Fixed the import path

// Optional: Import a dedicated loading spinner component
// import LoadingSpinner from './LoadingSpinner';

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps): React.ReactElement | null {
  const { isSignedIn, isLoaded } = useUser();
  const { profile, loading: profileLoading } = useUserProfile();
  const location = useLocation();

  // --- 1. Handle Loading States ---
  // Show loading indicator while Clerk or the custom profile hook is loading.
  if (!isLoaded || profileLoading) {
    console.log('RequireAuth: Loading user or profile...');
    // return <LoadingSpinner />; // Replace with your loading component
    return <div>Loading...</div>; // Simple placeholder
  }

  // --- 2. Handle Unauthenticated Users ---
  // If Clerk is loaded but the user is not signed in, redirect to the sign-in page.
  // Pass the current location so the user can be redirected back after signing in.
  if (!isSignedIn) {
    console.log('RequireAuth: User not signed in. Redirecting to sign-in.');
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // --- 3. Handle Missing Profile (Edge Case) ---
  // If authenticated but the profile data couldn't be loaded for some reason.
  if (!profile) {
    console.error('RequireAuth: User is signed in, but profile data is missing after loading!');
    // Redirect to sign-in or an error page, as access control cannot be determined.
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
    // Alternatively: return <Navigate to="/error-page" replace />;
  }

  // --- 4. Handle Authenticated Users - Access Control & Redirection ---
  const currentPath = location.pathname;
  const isAdminRoute = currentPath.startsWith('/dashboard/admin/');
  const isOrganizerRoute = currentPath.startsWith('/dashboard/organizer/');
  // const isUserRoute = currentPath.startsWith('/dashboard/user/'); // Less commonly needed for checks

  const userType = profile.user_type; // e.g., 'admin', 'standard'
  const plan = profile.plan;         // e.g., 'organizer', 'pro', 'free'

  // Debugging Log for state after loading and auth checks
  console.log('RequireAuth State:', {
    isSignedIn: true, // Already checked
    profileLoaded: true, // Already checked
    userType,
    plan,
    currentPath,
  });

  // --- Role/Plan Based Restrictions ---

  // A. Admin Access Control:
  if (userType === 'admin') {
    // If an admin is NOT on an admin route, redirect them TO the admin dashboard.
    if (!isAdminRoute) {
      console.warn(`Redirecting ADMIN user from non-admin route (${currentPath}) to admin dashboard.`);
      return <Navigate to="/dashboard/admin/dashboard" replace />;
    }
    // If admin IS on an admin route, allow access (no redirect needed here).
  } else {
    // If a NON-ADMIN tries to access an admin route, redirect them away.
    if (isAdminRoute) {
      console.warn(`Redirecting NON-ADMIN user from admin route (${currentPath}).`);
      // Redirect to a default safe page for non-admins
      return <Navigate to="/dashboard/user/discover" replace />;
    }
  }

  // B. Plan-Based Access Control (Example: Free users cannot access organizer routes)
  // Add more rules here as needed based on plan permissions.
  if (userType !== 'admin' && plan === 'free' && isOrganizerRoute) {
    console.warn(`Redirecting FREE user from organizer route (${currentPath}).`);
    return <Navigate to="/dashboard/user/discover" replace />; // Or a specific upgrade page
  }

  // Add automatic redirection to organizer dashboard for organizer plan users
  if (plan === 'organizer' && !isOrganizerRoute && !isAdminRoute) {
    console.log(`Redirecting ORGANIZER user to organizer dashboard from ${currentPath}`);
    return <Navigate to="/dashboard/organizer/dashboard" replace />;
  }

  // --- 5. Access Granted ---
  // If none of the above conditions triggered a redirect, the user has access.
  console.log(`RequireAuth: Access GRANTED for ${userType} (Plan: ${plan}) to ${currentPath}`);
  return <>{children}</>;
}