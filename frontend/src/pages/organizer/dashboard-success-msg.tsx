import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function OrganizerDashboardSuccessMsg() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const showSuccess = params.get("success") === "1";
  const [visible, setVisible] = React.useState(showSuccess);

  const navigate = useNavigate();
  React.useEffect(() => {
    if (showSuccess) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        navigate('/dashboard/organizer/dashboard', { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, navigate]);

  if (!visible) return null;

  return (
    <div className="flex justify-center w-full items-center">
      <Alert variant="default" className="mb-4 w-fit mx-auto h-fit px-6 py-2 text-sm shadow-md ">
        <AlertTitle className="text-bold">Payment Successful</AlertTitle>
        <AlertDescription className="text-sm text-green-500">
          Your organizer payment was successful. Welcome to the Organizer Dashboard!
        </AlertDescription>
      </Alert>
    </div>
  );
}
