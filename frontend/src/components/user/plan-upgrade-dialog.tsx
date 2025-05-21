import { useState } from "react"
import { Check, Zap } from "lucide-react"
import { initializeChapaPayment } from "@/lib/chapa"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { useUserProfile } from "@/components/UserProfileProvider";

interface PlanUpgradeDialogProps {
  trigger?: React.ReactNode
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  reason?: 'saveLimit' | 'default'
}

export function PlanUpgradeDialog({ 
  trigger, 
  className, 
  open: controlledOpen, 
  onOpenChange: setControlledOpen,
  reason = 'default' 
}: PlanUpgradeDialogProps) {
  const { profile } = useUserProfile();
  const currentPlan = profile?.plan || "free";
  const [selectedPlan, setSelectedPlan] = useState(currentPlan === "pro" ? "pro" : "free")
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle both controlled and uncontrolled state
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = setControlledOpen || setUncontrolledOpen;

  const handleUpgrade = async () => {
    setError(null);
    // If user is already on Pro and selects Pro, just close dialog
    if (selectedPlan === "pro" && currentPlan === "pro") {
      setOpen(false);
      return;
    }
    if (selectedPlan === "free") {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const url = await initializeChapaPayment(selectedPlan as "pro" | "organizer");
      window.location.href = url;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Payment initiation failed.");
    } finally {
      setLoading(false);
    }
  }

  let plans = [
    {
      id: "free",
      name: "Free Plan",
      price: "0",
      description: "Basic features for casual event-goers",
      features: ["Browse events", "Save up to 5 events", "Basic search filters"],
      current: currentPlan === "free",
    },
    {
      id: "pro",
      name: "Pro Plan",
      price: "1399",
      description: "Enhanced features for event enthusiasts",
      features: [
        "Unlimited saved events",
        "Advanced search filters",
        "Early access to tickets",
        "No ads",
        "Calendar sync",
      ],
      current: currentPlan === "pro",
    },
    {
      id: "organizer",
      name: "Organizer Plan",
      price: "3999",
      description: "Complete features for event creators",
      features: [
        "All Pro Plan features",
        "Create and publish events",
        "Event analytics",
        "Ticket management",
        "Promotional tools",
        "Priority support",
      ],
      current: currentPlan === "organizer",
    },
  ];

  // If user is on Pro, hide Free plan
  if (currentPlan === "pro") {
    plans = plans.filter((plan) => plan.id !== "free");
    // Ensure Pro is selected by default
    if (!plans.some((p) => p.id === selectedPlan)) {
      setSelectedPlan("pro");
    }
  }

  // Get appropriate title and description based on reason
  const getDialogTitle = () => {
    if (reason === 'saveLimit') {
      return "You've Reached Your Saved Events Limit";
    }
    return "Upgrade Your Plan";
  };

  const getDialogDescription = () => {
    if (reason === 'saveLimit') {
      return "Free users can save up to 5 events. Upgrade to Pro for unlimited event saves!";
    }
    return "Choose the plan that works best for you.";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={cn("w-full", className)} size="sm">
            <Zap className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] left-[60%] z-80">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{getDialogDescription()}</DialogDescription>
        </DialogHeader>
        <div className="py-4 flex justify-center">
          <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="flex gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="relative">
                <RadioGroupItem value={plan.id} id={plan.id} className="peer sr-only" aria-label={plan.name} />
                <Label
                  htmlFor={plan.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary",
                    plan.current && "border-primary",
                    reason === 'saveLimit' && plan.id === 'pro' && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <div className="flex justify-between">
                    <div className="font-semibold">{plan.name}</div>
                    {plan.current && (
                      <div className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Current
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{plan.price}ETB</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{plan.description}</div>
                  <div className="mt-2 space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center text-sm">
                        <Check className="mr-2 h-4 w-4 text-primary" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  {reason === 'saveLimit' && plan.id === 'pro' && (
                    <div className="mt-2 text-sm font-medium text-primary">
                      Recommended for unlimited saves!
                    </div>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpgrade} disabled={loading}>
            {loading
              ? "Processing..."
              : selectedPlan === "free"
                ? "Continue with Free"
                : selectedPlan === "pro"
                  ? "Continue"
                  : "Upgrade Now"}
          </Button>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
