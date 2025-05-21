import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingScreen } from './loading-screen';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Show loading screen for 1 second

    return () => clearTimeout(timer);
  }, [location.pathname]); // Trigger on route change

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
} 