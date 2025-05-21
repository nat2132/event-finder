import  { useState, useEffect } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { Save, Upload, Trash2, UserCircle } from "lucide-react"
import { T, useTranslation } from "@/context/translation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import AdminLayout from "./AdminLayout";
import { useBackendUserProfile } from "@/components/use-backend-user-profile";
import type { BackendUserProfile } from "@/components/use-backend-user-profile";
import { useAuth, useUser, useClerk } from "@clerk/clerk-react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function ProfileSettingsPage() {
  const { profile: backendProfile, loading: backendProfileLoading, error: backendProfileError, refetch: refetchBackendProfile } = useBackendUserProfile();
  const { getToken } = useAuth();
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const { translate, language } = useTranslation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | undefined>(undefined);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [bioPlaceholder, setBioPlaceholder] = useState("Tell us a bit about yourself");

  useEffect(() => {
    translate("Tell us a bit about yourself").then(setBioPlaceholder);
  }, [translate, language]);

  useEffect(() => {
    if (backendProfile) {
      setFirstName(backendProfile.first_name || "");
      setLastName(backendProfile.last_name || "");
      setEmail(backendProfile.email || "");
      setBio(backendProfile.bio || "");
      setProfileImagePreview(backendProfile.profile_image || "/placeholder.svg");
    }
  }, [backendProfile]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfileImage = async () => {
    if (!clerkUser) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      // First, remove from Clerk
      await clerkUser.setProfileImage({ file: null });
      
      // Reset local state
      setProfileImageFile(null);
      setProfileImagePreview("/placeholder.svg");
      
      // Fetch updated profile data from backend
      await refetchBackendProfile();
      
      // Show success message
      setSaveSuccess(await translate("Profile image removed."));
    } catch (error: Error | unknown) {
      const fallbackError = await translate("Failed to remove profile image.");
      setSaveError(error instanceof Error ? error.message : fallbackError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!backendProfile || !clerkUserLoaded) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    let token;

    try {
      token = await getToken();
      if (!token) throw new Error(await translate("Authentication token not available."));

      // Handle image upload separately if a new file was selected
      if (profileImageFile && clerkUser) {
        const imageResource = await clerkUser.setProfileImage({ file: profileImageFile });
        console.log("Image updated in Clerk:", imageResource?.publicUrl);
      }

      // Only include text fields in the API request
      const updatedProfileData: Partial<BackendUserProfile> = {
        first_name: firstName,
        last_name: lastName,
        email: email, 
        bio: bio,
        // Don't include profile_image here, it causes validation errors
      };
      
      console.log("Patching backend with data:", updatedProfileData);
      const response = await axios.patch("/api/users/profile/", updatedProfileData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("Backend update response:", response.data);
      
      // Get fresh data including the updated profile image
      await refetchBackendProfile(); 
      setProfileImageFile(null);
      setSaveSuccess(await translate("Profile updated successfully!"));

    } catch (error: Error | unknown) {
      console.error("Error updating profile:", error);
      let errMsg = await translate("Failed to update profile.");
      
      if (axios.isAxiosError(error) && error.response?.data) {
        if (error.response.data.detail) {
          errMsg = error.response.data.detail;
        } else if (error.response.data.error) {
          errMsg = error.response.data.error;
        }
      } else if (error instanceof Error) {
        errMsg = error.message;
      }
      
      setSaveError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleChangePassword = async () => {
    if (clerkUserLoaded && openUserProfile) {
      openUserProfile();
    } else {
       alert(await translate("Clerk User Profile is not available at the moment."));
    }
  };

  const openDeleteModal = () => setIsDeleteModalOpen(true);
  const closeDeleteModal = () => setIsDeleteModalOpen(false);

  const handleDeleteAccount = async () => {
    if (!clerkUser || !backendProfile?.clerk_id) {
      setSaveError(await translate("User data not available for deletion."));
      return;
    }
    setIsDeleting(true);
    setSaveError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error(await translate("Authentication token missing."));

      await clerkUser.delete(); 
      
      alert(await translate("Account deleted successfully. You will be logged out."));
      window.location.href = '/';
      
    } catch (error: Error | unknown) {
      console.error("Error deleting account:", error);
      const errorMessage = error instanceof Error ? error.message : await translate("Failed to delete account.");
      setSaveError(errorMessage);
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  if (backendProfileLoading || !clerkUserLoaded) {
    return <AdminLayout><div className="p-4"><T>Loading profile...</T></div></AdminLayout>;
  }

  if (backendProfileError) {
    return <AdminLayout><div className="p-4 text-red-600"><T>Error loading profile</T>: {backendProfileError}</div></AdminLayout>;
  }

  if (!backendProfile) {
     return <AdminLayout><div className="p-4 text-orange-600"><T>Profile data not found.</T></div></AdminLayout>;
  }
  
  const displayFullName = `${firstName} ${lastName}`.trim();

  return (
    <AdminLayout>
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold"><T>Profile Settings</T></h1>

      {saveError && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md"><T>Error</T>: {saveError}</div>}
      {saveSuccess && <div className="p-3 bg-green-100 text-green-700 border border-green-300 rounded-md">{saveSuccess}</div>}

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-3 ">
          <CardHeader>
            <CardTitle><T>Profile Picture</T></CardTitle>
            <CardDescription><T>Update your profile picture</T></CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={profileImagePreview || "/placeholder.svg"} alt={displayFullName || "User profile"} />
              <AvatarFallback>{displayFullName?.substring(0, 2)?.toUpperCase() || '??'}</AvatarFallback>
            </Avatar>
            <input type="file" id="profile-image-upload" accept="image/*" onChange={handleImageChange} className="hidden" />
            <div className="flex gap-2">
              <Button type="button" variant="outline"  onClick={() => document.getElementById('profile-image-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                <T>Upload New</T>
              </Button>
              <Button type="button" variant="outline" className="text-red-500 hover:text-red-600 " onClick={removeProfileImage} disabled={isSaving || !profileImagePreview || profileImagePreview === "/placeholder.svg" }>
                <T>Remove</T>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-4 ">
          <CardHeader>
            <CardTitle><T>Personal Information</T></CardTitle>
            <CardDescription><T>Update your personal details</T></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="first-name"><T>First Name</T></Label>
                <Input id="first-name"  value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
            <div className="space-y-1">
                <Label htmlFor="last-name"><T>Last Name</T></Label>
                <Input id="last-name"  value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email"><T>Email</T></Label>
              <Input id="email" type="email"  value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio"><T>Bio</T></Label>
              <Textarea id="bio" className=" min-h-[100px]" value={bio} onChange={(e) => setBio(e.target.value)} placeholder={bioPlaceholder} />
            </div>
          </CardContent>
           <CardFooter>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? <T>Saving...</T> : <T>Save Profile</T>}
            </Button>
          </CardFooter>
        </Card>

        <Card className="md:col-span-3 ">
          <CardHeader>
            <CardTitle><T>Account Security</T></CardTitle>
             <CardDescription><T>Manage your account settings</T></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
                <Label><T>Password</T></Label>
                <p className="text-sm text-muted-foreground pb-2"><T>Change your password through your Clerk user profile.</T></p>
                <Button type="button" variant="outline" className=" w-full" onClick={handleChangePassword}>
                    <UserCircle className="mr-2 h-4 w-4" /> <T>Manage Password & Security</T>
                </Button>
            </div>
          </CardContent>
        </Card>
        
        {backendProfile?.admin_role === 'super_admin' && (
            <Card className="md:col-span-4 ">
            <CardHeader>
                <CardTitle className="text-red-600"><T>Danger Zone</T></CardTitle>
                <CardDescription><T>Manage your account deletion</T></CardDescription>
            </CardHeader>
            <CardContent>
                <Label><T>Delete Account</T></Label>
                <p className="text-sm text-muted-foreground pb-2"><T>Permanently delete your account and all associated data. This action cannot be undone.</T></p>
                <Button type="button" variant="destructive" className="w-full" onClick={openDeleteModal} disabled={isDeleting || isSaving}>
                <Trash2 className="mr-2 h-4 w-4" />
                <T>Delete My Account</T>
                </Button>
            </CardContent>
            </Card>
        )}
      </div>
    </form>

    <DeleteAccountConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
      />

    </AdminLayout>
  )
}

interface DeleteAccountConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteAccountConfirmationModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteAccountConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle><T>Delete Account</T></DialogTitle>
          <DialogDescription>
            <T>Are you sure you want to permanently delete your account?</T>
            <br />
            <T>All your data will be removed. This action cannot be undone.</T>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}><T>Cancel</T></Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? <T>Deleting Account...</T> : <T>Yes, Delete My Account</T>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
