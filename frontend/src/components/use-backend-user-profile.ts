import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";

export interface BackendUserProfile {
  id: number;
  clerk_id: string;
  first_name: string;
  last_name: string;
  email: string;
  bio?: string;
  profile_image?: string;
  plan?: 'free' | 'pro' | 'organizer';
  user_type?: 'user' | 'admin';
  admin_role?: 'super_admin' | 'event_admin' | 'support_admin';
  language?: string | null;
}

const MAX_PROFILE_FETCH_RETRIES = 1; // Try initial + 1 retry
const RETRY_DELAY_MS = 1000; // 1 second

export function useBackendUserProfile() {
  const { getToken } = useAuth();
  const { isLoaded, isSignedIn } = useUser();
  const [profile, setProfile] = useState<BackendUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      if (isLoaded && !isSignedIn) {
        setProfile(null);
        setLoading(false);
        setRetryCount(0); // Reset retry count if user signs out
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Authentication token not available.");
        setProfile(null);
        setLoading(false);
        return;
      }
      const res = await axios.get("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status >= 200 && status < 300 || status === 401 || status === 404,
      });

      if (res.status === 401) {
        setProfile(null);
        if (retryCount < MAX_PROFILE_FETCH_RETRIES) {
          // console.log(`Profile fetch failed with 401, retrying (${retryCount + 1}/${MAX_PROFILE_FETCH_RETRIES})...`);
          setRetryCount(prev => prev + 1);
          // setLoading(true) is already set, error will be set by the next attempt or final failure
          // useEffect will trigger fetchProfile again due to retryCount change
        } else {
          setError("Authentication failed after retries. Please ensure you are logged in.");
          setLoading(false); // Stop loading after final retry fails
        }
      } else if (res.status === 404) {
        setProfile(null);
        setError("User profile not found. Please complete your profile setup.");
        setLoading(false); // Stop loading on 404
        setRetryCount(0); // Reset retries, 404 is not a temp auth issue
      } else {
        setProfile(res.data);
        setLoading(false); // Stop loading on success
        setRetryCount(0); // Reset retries on success
      }
    } catch (err: unknown) {
      let message = "Failed to fetch user profile";
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      setProfile(null);
      setLoading(false); // Stop loading on other errors
      setRetryCount(0); // Reset retries
    } 
    // Removed finally { setLoading(false) } as loading is managed in each branch

  }, [getToken, isLoaded, isSignedIn, retryCount]); // Added retryCount to dependencies

  useEffect(() => {
    if (retryCount > 0 && retryCount <= MAX_PROFILE_FETCH_RETRIES) {
      const timer = setTimeout(() => {
        fetchProfile();
      }, RETRY_DELAY_MS);
      return () => clearTimeout(timer);
    } else if (retryCount === 0) { // Initial fetch
      fetchProfile();
    }
    // If retryCount > MAX_PROFILE_FETCH_RETRIES, do nothing, error is set.
  }, [fetchProfile, retryCount]); // fetchProfile and retryCount are deps

  return { profile, loading, error, refetch: () => { setRetryCount(0); fetchProfile(); } }; // Modified refetch
}
