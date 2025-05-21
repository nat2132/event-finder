import { useState } from "react"
import React from 'react';
import { T, useTranslation } from "@/context/translation";
import { motion } from "framer-motion"
import { CreditCard, Globe, Mail, User, Check, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardLayout } from "@/components/organizer/dashboard-layout"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ProfileImageUpload } from "./profile-image-upload";
import { useBackendUserProfile } from "@/components/use-backend-user-profile";
import { useUser, useAuth } from "@clerk/clerk-react";
import axios from "axios";

import { fetchBillingHistory } from "./billing-history";
import type { BillingRecord } from "./billing-history";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("account");
  const { profile, loading, error, refetch } = useBackendUserProfile();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  // Profile state
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState(profile?.profile_image || "");

  // Password visibility and focus state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCurrentPasswordFocused, setIsCurrentPasswordFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  // Billing history state
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [billingHistoryLoading, setBillingHistoryLoading] = useState(true);

  // Language state for translation context
  const { setLanguage, language } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "am" | "om" | "ti">(language);

  // Fetch billing history
  React.useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setBillingHistoryLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          if (isMounted) setBillingHistory([]);
          return;
        }
        const data = await fetchBillingHistory(token);
        if (isMounted) setBillingHistory(data);
      } catch (e) {
        if (isMounted) setBillingHistory([]);
      } finally {
        if (isMounted) setBillingHistoryLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [getToken]);

  // Initialize form fields on profile load
  React.useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setEmail(profile.email || "");
      setProfileImageUrl(profile.profile_image || "");
    }
  }, [profile]);

  // Profile update handler
  const handleProfileSave = async () => {
    setSaving(true);
    setErrMsg("");
    setSuccessMsg("");
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("first_name", firstName);
      formData.append("last_name", lastName);
      formData.append("email", email);
      if (profileImage) {
        formData.append("image", profileImage);
      } else if (profileImage === null) {
        formData.append("image", ""); // Remove image
      }
      await axios.put("/api/user/profile", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMsg("Profile updated successfully.");
      refetch();
    } catch (err: any) {
      setErrMsg(err?.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMsg(""), 2000);
    }
  };

  // Password update handler (Clerk)
  const handlePasswordSave = async () => {
    setPasswordSaving(true);
    setPasswordMsg("");
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match");
      setPasswordSaving(false);
      return;
    }
    try {
      await user?.updatePassword({ currentPassword, newPassword });
      setPasswordMsg("Password updated successfully.");
    } catch (err: any) {
      setPasswordMsg(err?.errors?.[0]?.message || "Failed to update password");
    } finally {
      setPasswordSaving(false);
      setTimeout(() => setPasswordMsg(""), 2000);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteMsg("");
    try {
      const token = await getToken();
      await axios.delete("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      await user?.delete();
      setDeleteMsg("Account deleted. Logging out...");
      // Optionally: redirect to home or sign-out
      window.location.href = "/";
    } catch (err: any) {
      setDeleteMsg(err?.response?.data?.error || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  // Profile image change handler
  const handleProfileImageChange = (file: File | null) => {
    setProfileImage(file);
    if (file) {
      setProfileImageUrl(URL.createObjectURL(file));
    } else {
      setProfileImageUrl("");
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight"><T>Settings</T></h1>
          <p className="text-muted-foreground"><T>Manage your account settings and preferences</T></p>
        </div>
        <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account"><T>Account</T></TabsTrigger>
            <TabsTrigger value="billing"><T>Billing</T></TabsTrigger>
            <TabsTrigger value="language"><T>Language</T></TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="space-y-6">
            <Card >
              <CardHeader>
                <CardTitle><T>Account Information</T></CardTitle>
                <CardDescription><T>Update your account details and personal information</T></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <ProfileImageUpload
                    imageUrl={user?.imageUrl || profileImageUrl}
                    onChange={async (file) => {
                      setProfileImage(file);
                      if (file) {
                        // Update Clerk profile image
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          try {
                            await user?.setProfileImage({ file });
                            // Wait for Clerk to update imageUrl
                            const newImageUrl = user?.imageUrl || "";
                            setProfileImageUrl(newImageUrl);
                            // Sync to backend
                            const token = await getToken();
                            await axios.put("/api/user/profile", { image: newImageUrl }, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            refetch();
                          } catch (err) {
                            setErrMsg("Failed to update profile image");
                          }
                        };
                        reader.readAsDataURL(file);
                      } else {
                        // Remove image in Clerk is not directly supported; fallback to default
                        setProfileImageUrl("");
                        // Sync removal to backend
                        const token = await getToken();
                        await axios.put("/api/user/profile", { image: "" }, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        refetch();
                      }
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 w-[900px]">
                  <div className="grid gap-2">
                    <Label htmlFor="first-name"><T>First name</T></Label>
                    <Input id="first-name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="last-name"><T>Last name</T></Label>
                    <Input id="last-name" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email"><T>Email</T></Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 items-end">
                {errMsg && <span className="text-red-500 text-sm">{errMsg}</span>}
                {successMsg && <span className="text-green-600 text-sm">{successMsg}</span>}
                <div className="flex gap-2">
                  <Button variant="outline" disabled={saving} 
 onClick={() => refetch()}>
                    <T>Cancel</T>
                  </Button>
                  <Button isLoading={saving} onClick={handleProfileSave}>
                    <T>Save changes</T>
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card 
>
              <CardHeader>
                <CardTitle><T>Password</T></CardTitle>
                <CardDescription><T>Update your password to keep your account secure</T></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 relative">
                  <Label htmlFor="current-password"><T>Current password</T></Label>
                  <div className="relative flex items-center">
                    <Input
                      id="current-password"
                      type="password"
                      value={isCurrentPasswordFocused ? currentPassword : "".padEnd(currentPassword.length, "*")}
                      onChange={e => setCurrentPassword(e.target.value)}
                      onFocus={() => setIsCurrentPasswordFocused(true)}
                      onBlur={() => setIsCurrentPasswordFocused(false)}
                      className=" pr-10"
                      autoComplete="current-password"
                      name="current-password"
                    />
                  </div>
                  {currentPassword && !isCurrentPasswordFocused && (
                    <span className="text-xs text-gray-400">{currentPassword.length} characters</span>
                  )}
                </div>
                <div className="grid gap-2 relative">
                  <Label htmlFor="new-password"><T>New password</T></Label>
                  <div className="relative flex items-center">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className=" pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black"
                      onClick={() => setShowNewPassword(v => !v)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.963 9.963 0 013.34-7.486m2.66 2.66A7.963 7.963 0 004 9c0 4.418 3.582 8 8 8 1.657 0 3.183-.507 4.445-1.377m2.66-2.66A7.963 7.963 0 0020 15c0-4.418-3.582-8-8-8-1.657 0-3.183.507-4.445 1.377" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-.276.828-.676 1.609-1.174 2.326M15.54 15.54A8.963 8.963 0 0112 17c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.465-3.368" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 relative">
                  <Label htmlFor="confirm-password"><T>Confirm password</T></Label>
                  <div className="relative flex items-center">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className=" pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.963 9.963 0 013.34-7.486m2.66 2.66A7.963 7.963 0 004 9c0 4.418 3.582 8 8 8 1.657 0 3.183-.507 4.445-1.377m2.66-2.66A7.963 7.963 0 0020 15c0-4.418-3.582-8-8-8-1.657 0-3.183.507-4.445 1.377" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-.276.828-.676 1.609-1.174 2.326M15.54 15.54A8.963 8.963 0 0112 17c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.465-3.368" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                {passwordMsg && <span className={passwordMsg.includes("success") ? "text-green-600" : "text-red-500"}>{passwordMsg}</span>}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" disabled={passwordSaving} 
 onClick={() => {
                  setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordMsg("");
                }}><T>Cancel</T></Button>
                <Button  isLoading={passwordSaving} onClick={handlePasswordSave}>
                  <T>Update password</T>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle><T>Danger Zone</T></CardTitle>
                <CardDescription className="text-muted-foreground"><T>Permanently delete your account and all of your data</T></CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <T>Once you delete your account, there is no going back. This action cannot be undone.</T>
                </p>
                {deleteMsg && <span className={deleteMsg.includes("deleted") ? "text-green-600" : "text-red-500"}>{deleteMsg}</span>}
              </CardContent>
              <CardFooter>
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
                  <T>Delete account</T>
                </Button>
              </CardFooter>
            </Card>

            {/* Confirmation Dialog for Delete Account */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 flex items-center justify-center z-50  bg-primary/30">
                <div className="bg-background rounded-lg shadow-lg p-8 max-w-sm w-full flex flex-col items-center">
                  <h2 className="text-lg font-bold mb-2"><T>Delete Account?</T></h2>
                  <p className="mb-4 text-sm text-gray-600 text-center"><T>Are you sure you want to delete your account? This action cannot be undone.</T></p>
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                      <T>Cancel</T>
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteAccount} isLoading={deleting}>
                      <T>Yes, delete</T>
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </TabsContent>
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle><T>Plan & Billing</T></CardTitle>
                <CardDescription><T>Manage your subscription and billing information</T></CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4  w-[900px]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium"><T>Organizer Plan</T></h3>
                      <p className="text-sm text-muted-foreground"><T>3999ETB/month, billed monthly</T></p>
                    </div>
                    <Badge variant="outline">
                      <T>Active</T>
                    </Badge>
                  </div>
                  <Separator className="my-4 bg-slate-300" />
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-blue-500/80" />
                      <span><T>Unlimited events</T></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-blue-500/80" />
                      <span><T>Advanced analytics</T></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-blue-500/80" />
                      <span><T>Custom branding</T></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-blue-500/80" />
                      <span><T>Priority support</T></span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline"><T>Change plan</T></Button>
                    <Button variant="outline">
                      <T>Cancel subscription</T>
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 font-medium"><T>Payment Method</T></h3>
                  <div className="rounded-lg border p-4 ">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium"><T>Visa ending in 4242</T></p>
                        <p className="text-sm text-muted-foreground"><T>Expires 12/2024</T></p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" >
                        <T>Edit</T>
                      </Button>
                      <Button variant="outline" size="sm" >
                        <T>Remove</T>
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4">
                    <T>Add payment method</T>
                  </Button>
                </div>

                <div>
                  <h3 className="mb-4 font-medium"><T>Billing History</T></h3>
                  <div className="rounded-lg border ">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Invoice</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {billingHistoryLoading ? (
                          <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
                        ) : billingHistory.length === 0 ? (
                          <TableRow><TableCell colSpan={4}>No billing history found.</TableCell></TableRow>
                        ) : (
                          billingHistory.map((record) => (
                            <TableRow key={record.id} >
                              <TableCell>{new Date(record.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>${record.amount.toFixed(2)}</TableCell>
                              <TableCell>{record.status}</TableCell>
                              <TableCell className="text-right">
                                <a href={record.invoice_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm">Download</Button>
                                </a>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="language" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle><T>Language & Region</T></CardTitle>
                <CardDescription><T>Set your language and regional preferences</T></CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 w-[900px]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium"><T>Language</T></p>
                      <p className="text-sm text-muted-foreground"><T>Select your preferred language</T></p>
                    </div>
                  </div>
                  <Select value={selectedLanguage} onValueChange={val => setSelectedLanguage(val as "en" | "am" | "om" | "ti")}>
                    <SelectTrigger className="w-full ">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en"><T>English</T></SelectItem>
                      <SelectItem value="am"><T>Amharic</T></SelectItem>
                      <SelectItem value="om"><T>Oromo</T></SelectItem>
                      <SelectItem value="ti"><T>Tigrinya</T></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium"><T>Date & Time Format</T></p>
                      <p className="text-sm text-muted-foreground"><T>Choose how dates and times are displayed</T></p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label><T>Date Format</T></Label>
                      <RadioGroup defaultValue="mm-dd-yyyy">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mm-dd-yyyy" id="mm-dd-yyyy" />
                          <Label htmlFor="mm-dd-yyyy"><T>MM/DD/YYYY (US)</T></Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dd-mm-yyyy" id="dd-mm-yyyy" />
                          <Label htmlFor="dd-mm-yyyy"><T>DD/MM/YYYY (UK, EU)</T></Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yyyy-mm-dd" id="yyyy-mm-dd" />
                          <Label htmlFor="yyyy-mm-dd"><T>YYYY/MM/DD (ISO)</T></Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label><T>Time Format</T></Label>
                      <RadioGroup defaultValue="12h">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="12h" id="12h" />
                          <Label htmlFor="12h"><T>12-hour (AM/PM)</T></Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="24h" id="24h" />
                          <Label htmlFor="24h"><T>24-hour</T></Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium"><T>Timezone</T></p>
                      <p className="text-sm text-muted-foreground"><T>Set your timezone for accurate event times</T></p>
                    </div>
                  </div>
                  <Select defaultValue="america-new_york">
                    <SelectTrigger className="w-full ">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="america-new_york"><T>(GMT-5) Eastern Time (US & Canada)</T></SelectItem>
                      <SelectItem value="america-chicago"><T>(GMT-6) Central Time (US & Canada)</T></SelectItem>
                      <SelectItem value="america-denver"><T>(GMT-7) Mountain Time (US & Canada)</T></SelectItem>
                      <SelectItem value="america-los_angeles"><T>(GMT-8) Pacific Time (US & Canada)</T></SelectItem>
                      <SelectItem value="europe-london"><T>(GMT+0) London, Edinburgh</T></SelectItem>
                      <SelectItem value="europe-paris"><T>(GMT+1) Paris, Berlin, Rome</T></SelectItem>
                      <SelectItem value="asia-tokyo"><T>(GMT+9) Tokyo, Osaka</T></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => setLanguage(selectedLanguage)}
                >
                  <T>Save preferences</T>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  )
}
