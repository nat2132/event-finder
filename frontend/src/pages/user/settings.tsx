import { Globe, Lock, User } from "lucide-react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useUserProfile } from "@/components/UserProfileProvider";
import { useAuth } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardShell } from "@/components/user/dashboard-shell";
import { ProfileImageUpload } from "@/components/user/profile-image-upload";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile, updateUserPassword, deleteUserFromBackend } from "./api-user";
import { T, useTranslation } from "@/context/translation";

// Helper function to process image URLs
function processImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  
  // Handle backend media paths
  if (url.startsWith('/media/')) {
    return `${window.location.protocol}//${window.location.hostname}:8000${url}`;
  }
  
  // Handle localhost HTTPS URLs (convert to HTTP for mixed content issues)
  if (url.startsWith('https://127.0.0.1:8000/') || url.startsWith('https://localhost:8000/')) {
    return url.replace('https://', 'http://');
  }
  
  return url;
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { profile, refetch } = useUserProfile();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { setLanguage, language } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "am" | "om" | "ti">(language);

  // Update state when backend profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setEmail(profile.email || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  // Fetch user profile from backend on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getToken();
        const res = await axios.get("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBio(res.data.bio || "");
        // Optionally set profile image if you want to display backend-synced image
        // setProfileImage(res.data.profile_image || null);
        setFirstName(res.data.first_name || user?.firstName || "");
        setLastName(res.data.last_name || user?.lastName || "");
        setEmail(res.data.email || user?.emailAddresses?.[0]?.emailAddress || "");
      } catch (e) {
        // Optionally handle fetch error
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!isLoaded) return null;

  // Get processed profile image URL
  const profileImageUrl = processImageUrl(profile?.profile_image) || user?.imageUrl;

  // Profile Update Handler
  const handleProfileSave = async () => {
    setIsSaving(true);
    try {
      const token = await getToken();
      console.log("JWT Token:", token);
      console.log('[DEBUG] profileImage value:', profileImage, 'type:', typeof profileImage, 'instanceof File:', profileImage instanceof File);
      await updateUserProfile({
        first_name: firstName,
        last_name: lastName,
        email,
        profile_image: profileImage === null ? undefined : profileImage, // now always a File or undefined
        bio,
      }, token || "");
      // Force Clerk to reload user data so image/info update instantly
      await user?.reload();
      if (typeof refetch === 'function') {
        await refetch(); // update backend profile in global state
      }
      toast({ title: "Profile updated!" });
    } catch (err) {
      toast({ title: "Error updating profile", description: String(err), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Password Change Handler
  const handlePasswordChange = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      await updateUserPassword({ password: newPassword });
      toast({ title: "Password updated!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast({ title: "Error updating password", description: String(err), variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Account Deletion Handler
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Remove user from Clerk
      await user?.delete();
      // Backend cleanup (optional, if you store extra user data)
      await deleteUserFromBackend(user?.id || "");
      toast({ title: "Account deleted" });
      await signOut();
      window.location.href = "/";
    } catch (err) {
      toast({ title: "Error deleting account", description: String(err), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight"><T>Settings</T></h2>
          </div>
          <Tabs defaultValue="account" className="space-y-4">
            <TabsList>
              <TabsTrigger value="account">
                <User className="mr-2 h-4 w-4" />
                <T>Account</T>
              </TabsTrigger>
              <TabsTrigger value="language">
                <Globe className="mr-2 h-4 w-4" />
                <T>Language</T>
              </TabsTrigger>
              <TabsTrigger value="security">
                <Lock className="mr-2 h-4 w-4" />
                <T>Security</T>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="space-y-4">
              <Card >
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription className="text-muted-foreground">Update your profile picture.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ProfileImageUpload
                      defaultImage={profileImagePreview || profileImageUrl || undefined}
                      fallback={profile?.first_name?.slice(0,2).toUpperCase() || user?.firstName?.slice(0,2).toUpperCase() || "AB"}
                      onChange={(file: File | null) => {
                        setProfileImage(file);
                        if (file) {
                          setProfileImagePreview(URL.createObjectURL(file));
                        } else {
                          setProfileImagePreview(null);
                        }
                      }}
                    />
                </CardContent>
              </Card>
              <Card >
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription className="text-muted-foreground">Update your account information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First name</Label>
                      <Input id="first-name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last name</Label>
                      <Input id="last-name" value={lastName} onChange={e => setLastName(e.target.value)}  />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}  />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input id="bio" value={bio} onChange={e => setBio(e.target.value)}  />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline"  disabled={isSaving}>Cancel</Button>
                  <Button  onClick={handleProfileSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
                </CardFooter>
              </Card>
              <Card >
                <CardHeader>
                  <CardTitle>Delete Account</CardTitle>
                  <CardDescription className="text-muted-foreground">Permanently delete your account and all of your data.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>Delete Account</Button>
                  {/* Delete confirmation dialog */}
                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent >
                      <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                      </DialogHeader>
                      <p>This action will permanently delete your account and all associated data. This cannot be undone.</p>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting} >Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete Account"}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="language" className="space-y-4">
              <Card >
                <CardHeader>
                  <CardTitle><T>Language Settings</T></CardTitle>
                  <CardDescription className="text-muted-foreground"><T>Choose your preferred language.</T></CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language"><T>Language</T></Label>
                    <Select value={selectedLanguage} onValueChange={val => setSelectedLanguage(val as "en" | "am" | "om" | "ti")}>
                      <SelectTrigger id="language" >
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent >
                        <SelectItem value="en"><T>English</T></SelectItem>
                        <SelectItem value="am"><T>Amharic</T></SelectItem>
                        <SelectItem value="om"><T>Oromo</T></SelectItem>
                        <SelectItem value="ti"><T>Tigrinya</T></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => setLanguage(selectedLanguage)}
                  >
                    <T>Save Language</T>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="security" className="space-y-4">
              <Card >
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription className="text-muted-foreground">Update your password to keep your account secure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4"> 
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password"  value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password"  value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password"  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handlePasswordChange} disabled={isChangingPassword}>{isChangingPassword ? "Updating..." : "Update Password"}</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardShell>
  )
}
