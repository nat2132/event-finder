import { Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardShell } from "@/components/user/dashboard-shell"
import { PlanUpgradeDialog } from "@/components/user/plan-upgrade-dialog"
import { useUserProfile } from "@/components/UserProfileProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react";
import { fetchBillingHistory, verifyTransaction } from "@/lib/billing";
import { useAuth } from "@clerk/clerk-react";
import { fetchSavedEvents } from "@/api/saved-events";

import { useLocation } from "react-router-dom";

// Define the billing history item type
interface BillingHistoryItem {
  id: string;
  created_at: string;
  plan: string;
  amount: number;
  tx_ref: string;
  status: string;
}

export default function BillingPage() {
  const { profile, loading, error, refetch } = useUserProfile();
  const plan = profile?.plan || 'free';
  const [showTicketSuccess, setShowTicketSuccess] = useState(false);
  const [history, setHistory] = useState<BillingHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [savedEventsCount, setSavedEventsCount] = useState(0);
  const location = useLocation();
  const { getToken } = useAuth();

  // Fetch saved events count
  useEffect(() => {
    const fetchSavedCount = async () => {
      try {
        const token = await getToken();
        if (token) {
          const savedEvents = await fetchSavedEvents(token);
          setSavedEventsCount(savedEvents?.length || 0);
        }
      } catch (error) {
        console.error('Failed to fetch saved events count:', error);
        setSavedEventsCount(0); // Set to 0 on error
      }
    };
    fetchSavedCount();
  }, [getToken]);

  // Refetch profile if redirected after successful upgrade
  useEffect(() => {
    if (location.search.includes("success=1")) {
      refetch();
      setShowTicketSuccess(true);
    } else {
      setShowTicketSuccess(false);
    }
  }, [location.search, refetch]);

  useEffect(() => {
    async function loadHistory() {
      if (!profile) return;
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const token = await getToken();
        if (!token) {
          setHistoryError("Authentication token not available");
          return;
        }
        
        const data = await fetchBillingHistory(token);
        setHistory(data);
        
        // Check for 'initiated' transactions and verify their status
        const initiatedTransactions = data.filter((tx: BillingHistoryItem) => tx.status === 'initiated');
        if (initiatedTransactions.length > 0) {
          console.log('Found initiated transactions, verifying status:', initiatedTransactions);
          // Verify each transaction
          const verificationPromises = initiatedTransactions.map((tx: BillingHistoryItem) => 
            verifyTransaction(tx.tx_ref, token)
          );
          
          // Wait for all verifications to complete
          await Promise.all(verificationPromises);
          
          // Refetch history to get updated statuses
          if (initiatedTransactions.length > 0) {
            const updatedData = await fetchBillingHistory(token);
            setHistory(updatedData);
          }
        }
      } catch (error) {
        console.error("Error loading billing history:", error);
        setHistoryError("Failed to load billing history");
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, [profile, getToken]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex justify-center items-center h-64 text-xl font-semibold">
          Loading your profile...
        </div>
      </DashboardShell>
    );
  }
  if (error) {
    return (
      <DashboardShell>
        <div className="flex justify-center items-center h-64 text-xl font-semibold text-red-500">
          Failed to load your profile: {error}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex flex-col">
        {showTicketSuccess && (
          <div className="mb-4 p-4 rounded-md bg-green-100 border border-green-300 text-green-800 font-medium text-center">
            🎉 Payment successful! You have paid for your ticket.
          </div>
        )}
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Billing & Plan</h2>
            <PlanUpgradeDialog
              trigger={
                <Button>
                  <Zap className="mr-2 h-4 w-4" />
                  Upgrade Plan
                </Button>
              }
            />
          </div>
          <Tabs defaultValue="overview" className="space-y-4 ">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">Billing History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    {plan === 'pro' ? 'You are currently on the Pro Plan.' : 'You are currently on the Free Plan.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold">{plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</div>
                      <div className="text-sm text-muted-foreground">
                        {plan === 'pro' ? 'Enhanced features for event enthusiasts' : 'Basic features for casual event-goers'}
                      </div>
                    </div>
                    <Badge variant="outline">Current Plan</Badge>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Saved Events</span>
                        <span className="font-medium">{plan === 'pro' ? 'Unlimited' : `${savedEventsCount} of 5`}</span>
                      </div>
                      <Progress value={plan === 'pro' ? 100 : (savedEventsCount / 5) * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Search Filters</span>
                        <span className="font-medium">{plan === 'pro' ? 'Advanced' : 'Basic'}</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  {plan === 'free' && (
                    <PlanUpgradeDialog
                      trigger={
                        <Button className="w-full">
                          <Zap className="mr-2 h-4 w-4" />
                          Upgrade to Pro
                        </Button>
                      }
                    />
                  )}
                </CardFooter>
              </Card>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Plan Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <div className="mr-2 h-4 w-4 text-primary">✓</div>
                        <span>Browse events</span>
                      </div>
                      <div className="flex items-center">
                        <div className="mr-2 h-4 w-4 text-primary">✓</div>
                        <span>Save up to {plan === 'pro' ? 'unlimited' : '5'} events</span>
                      </div>
                      <div className="flex items-center">
                        <div className="mr-2 h-4 w-4 text-primary">✓</div>
                        <span>{plan === 'pro' ? 'Advanced' : 'Basic'} search filters</span>
                      </div>
                      {plan === 'pro' ? (
                        <>
                          <div className="flex items-center">
                            <div className="mr-2 h-4 w-4 text-primary">✓</div>
                            <span>Unlimited saved events</span>
                          </div>
                          <div className="flex items-center">
                            <div className="mr-2 h-4 w-4 text-primary">✓</div>
                            <span>Advanced search filters</span>
                          </div>
                          <div className="flex items-center">
                            <div className="mr-2 h-4 w-4 text-primary">✓</div>
                            <span>No ads</span>
                          </div>
                          <div className="flex items-center">
                            <div className="mr-2 h-4 w-4 text-primary">✓</div>
                            <span>Early access to tickets</span>
                          </div>
                          <div className="flex items-center">
                            <div className="mr-2 h-4 w-4 text-primary">✓</div>
                            <span>Calendar sync</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center text-muted-foreground">
                            <div className="mr-2 h-4 w-4">✗</div>
                            <span>Unlimited saved events</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <div className="mr-2 h-4 w-4">✗</div>
                            <span>Advanced search filters</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <div className="mr-2 h-4 w-4">✗</div>
                            <span>No ads</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {plan === 'pro' ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span>Saved Events</span>
                            <span className="font-medium">Unlimited</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Search Filters</span>
                            <span className="font-medium">Advanced</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Calendar Views</span>
                            <span className="font-medium">Month, Week, Day, List</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span>Saved Events</span>
                            <span className="font-medium">4 of 5</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Search Filters</span>
                            <span className="font-medium">Basic</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Calendar Views</span>
                            <span className="font-medium">Month only</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {plan === 'pro' && (
                        <>
                <Card >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Billing Cycle</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Current Plan</span>
                        <span className="font-medium">{plan === 'pro' ? 'Pro' : 'Free'}</span>
                      </div>
                          <div className="flex items-center justify-between">
                            <span>Next Billing Date</span>
                            <span className="font-medium">2025-05-18</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Payment Method</span>
                            <span className="font-medium">**** **** **** 1234</span>
                          </div>
                    </div>
                  </CardContent>
                </Card>
                </>
                  )}
              </div>
            </TabsContent>
            <TabsContent value="history" className="space-y-4">
              <Card >
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription className="text-muted-foreground">View your billing history and download invoices.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                      {historyLoading ? (
                        <div className="py-8 text-center text-muted-foreground">Loading billing history...</div>
                      ) : historyError ? (
                        <div className="py-8 text-center text-red-500">{historyError}</div>
                      ) : !history || history.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center space-y-4">
                          <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full max-w-[350px] "
                          >
                            <source src="/bath.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                          <p className="text-muted-foreground text-center">No billing history found. Your payment records will appear here.</p>
                        </div>
                      ) : (
                        <table className="min-w-full bg-background border border-slate-200 rounded-lg">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 border-b text-left">Date</th>
                              <th className="px-4 py-2 border-b text-left">Description</th>
                              <th className="px-4 py-2 border-b text-left">Amount</th>
                              <th className="px-4 py-2 border-b text-left">Status</th>
                              <th className="px-4 py-2 border-b text-left">Receipt</th>
                            </tr>
                          </thead>
                          <tbody className="bg-background divide-y divide-gray-200">
                            {history.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-2 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{item.plan === 'pro' ? 'Pro Plan Subscription' : item.plan}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{item.amount} birr</td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {item.status === 'completed' ? 'Completed' : item.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <a href="#" className="text-blue-600 hover:underline text-xs">Download</a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardShell>
  )
}
