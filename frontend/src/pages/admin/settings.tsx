import { useState, useEffect, useCallback } from "react"
import { Trash2, PlusCircle, Edit, Info, Users, Settings as SettingsIcon, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

import AdminLayout from "./AdminLayout";
import { useBackendUserProfile } from "@/components/use-backend-user-profile";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { T } from "@/context/translation";

// Define interface for Admin User data from API
interface AdminUser {
  clerk_id: string;
  email: string;
  full_name: string;
  profile_image?: string;
  admin_role?: 'super_admin' | 'event_admin' | 'support_admin' | null;
  created_at: string;
  user_type?: string;
  plan?: string;
  id?: number;
  [key: string]: string | number | boolean | null | undefined | object;
}

// Admin role options
const adminRoles = [
  {
    value: "super_admin", 
    label: "Super Admin", 
    badge: "bg-red-100 text-red-800", 
    description: "Full access to all administrative features"
  },
  {
    value: "event_admin", 
    label: "Event Admin", 
    badge: "bg-blue-100 text-blue-800", 
    description: "Manages event operations"
  },
  {
    value: "support_admin", 
    label: "Support Admin", 
    badge: "bg-green-100 text-green-800", 
    description: "Handles user support"
  }
];

// Static Role definitions for display reference
const roleDefinitions = [
  {
    name: "Super Admin",
    description: "Full access to all administrative features.",
    permissions: ["Manage Users & Events", "Manage Admins", "View Analytics", "Manage Settings"],
  },
  {
    name: "Event Admin",
    description: "Manages day-to-day event operations.",
    permissions: ["Manage Users", "Manage Events (Edit/Delete)", "View Analytics"],
  },
  {
    name: "Support Admin",
    description: "Handles user support and oversight.",
    permissions: ["Manage Users", "View Events", "View Analytics"],
  },
];

export default function SettingsPage() {
  const { profile, loading: profileLoading } = useBackendUserProfile();
  const { getToken } = useAuth();
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [errorAdmins, setErrorAdmins] = useState<string | null>(null);
  
  // Modal states
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  
  // Form state
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<string | undefined>(undefined);
  const [editingAdminRole, setEditingAdminRole] = useState<string | undefined>(undefined);
  const [editingAdminName, setEditingAdminName] = useState("");
  const [editingAdminEmail, setEditingAdminEmail] = useState("");

  const isSuperAdmin = profile?.admin_role === 'super_admin';

  // Fetch admin list if current user is Super Admin
  const fetchAdminList = useCallback(async () => {
    if (profileLoading || !isSuperAdmin) return;
    
    setLoadingAdmins(true);
    setErrorAdmins(null);
    
    try {
      const token = await getToken();
      if (!token) {
        setErrorAdmins("Authentication token unavailable.");
        return;
      }

      // Try a different API endpoint that might provide user data correctly
      console.log("Attempting to fetch admin users directly from /api/users/?user_type=admin");
      const response = await axios.get("/api/users/", {
        headers: { Authorization: `Bearer ${token}` },
        params: { user_type: 'admin' }, // Ensure we're only fetching admin users
      });
      
      // Log the complete raw response
      console.log("Complete raw API response:", response);
      
      let adminUsers: AdminUser[] = [];
      const responseData = response.data;
      
      // Handle different response formats
      if (Array.isArray(responseData)) {
        // Handle array response
        console.log("Direct array response:", responseData);
        adminUsers = responseData;
      } else if (responseData && typeof responseData === 'object') {
        if (Array.isArray(responseData.results)) {
          // Handle paginated response
          console.log("Paginated response results:", responseData.results);
          adminUsers = responseData.results;
        } else {
          // Response might have nested data
          console.log("Exploring nested response object properties:");
          for (const key in responseData) {
            console.log(`Property ${key}:`, responseData[key]);
            if (Array.isArray(responseData[key])) {
              console.log(`Found array in property ${key}`);
            }
          }
          
          // Try to find admin users in the response
          if (responseData.data && Array.isArray(responseData.data)) {
            adminUsers = responseData.data;
          } else {
            console.error("Unexpected response format:", responseData);
            setErrorAdmins("Received data in unexpected format. Check console for details.");
            setLoadingAdmins(false);
            return;
          }
        }
      } else {
        console.error("Unexpected response type:", typeof responseData);
        setErrorAdmins("Received unexpected response type.");
        setLoadingAdmins(false);
        return;
      }
      
      console.log(`Found ${adminUsers.length} admin users in response`);
      
      // Deep inspect each user object
      adminUsers.forEach((user, index) => {
        console.log(`\n=== ADMIN USER ${index} DEEP INSPECTION ===`);
        console.log(`Raw user object:`, user);
        console.log(`clerk_id: ${user.clerk_id}, type: ${typeof user.clerk_id}`);
        console.log(`email: ${user.email}, type: ${typeof user.email}`);
        console.log(`admin_role: ${user.admin_role}, type: ${typeof user.admin_role}`);
        console.log(`full_name: ${user.full_name}, type: ${typeof user.full_name}`);
        
        // Check if properties are enumerable
        console.log("Enumerable properties:", Object.keys(user));
        
        // Check for nested properties
        for (const key in user) {
          if (typeof user[key] === 'object' && user[key] !== null) {
            console.log(`Nested object in ${key}:`, user[key]);
          }
        }
      });
      
      // Create a display name for every user
      const processedUsers = adminUsers.map(user => {
        // Force a display name from any available data
        let displayName = 'Unknown User';
        
        // Try different properties for name
        if (user.full_name && typeof user.full_name === 'string' && user.full_name.trim() !== '') {
          displayName = user.full_name;
          console.log(`Using full_name for user ${user.clerk_id}: ${displayName}`);
        } else if (user.email && typeof user.email === 'string') {
          // Generate from email
          const emailName = user.email.split('@')[0].replace('.', ' ');
          displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          console.log(`Generated name from email for ${user.clerk_id}: ${displayName}`);
        } else if (user.clerk_id && typeof user.clerk_id === 'string') {
          // Use clerk_id as fallback
          displayName = `User ${user.clerk_id.substring(0, 8)}`;
          console.log(`Using clerk_id for ${user.clerk_id}: ${displayName}`);
        }
        
        // Create a new object with guaranteed properties
        return {
          ...user,
          full_name: displayName,
          email: user.email || 'No Email',
          admin_role: user.admin_role || null
        };
      });
      
      setAdminList(processedUsers);
    } catch (err: unknown) {
      console.error("Failed to fetch admin list:", err);
      
      // Type guard to check if this is an Axios error
      if (axios.isAxiosError(err)) {
        // Now TypeScript knows err is an AxiosError
        console.log("Error response data:", err.response?.data);
        console.log("Error response status:", err.response?.status);
        
        let message = "Failed to load admin users.";
        if (err.response?.data?.detail) {
          message = err.response.data.detail;
        }
        setErrorAdmins(message);
      } else {
        // Handle generic error
        setErrorAdmins("Failed to load admin users.");
      }
    } finally {
      setLoadingAdmins(false);
    }
  }, [getToken, isSuperAdmin, profileLoading]);

  // Fetch admin list on mount or when role changes
  useEffect(() => {
    if (!profileLoading) {
      fetchAdminList();
    }
  }, [profileLoading, fetchAdminList]);

  // Create new admin user
  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminName || !newAdminRole) {
      toast({
        title: "Missing information",
        description: "Please fill out all fields.",
        variant: "destructive",
      });
      return;
    }

    const token = await getToken();
    if (!token || !isSuperAdmin) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to create admin users.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Creating new admin with data:", {
        email: newAdminEmail,
        full_name: newAdminName,
        admin_role: newAdminRole,
        user_type: 'admin'
      });
      
      // Use the correct endpoint for user creation
      await axios.post('/api/users/', {
        email: newAdminEmail,
        full_name: newAdminName,
        admin_role: newAdminRole,
        user_type: 'admin'
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Success
      toast({
        title: "Admin created",
        description: "New admin user has been created successfully.",
      });
      
      // Close modal and reset form
      setIsAddAdminModalOpen(false);
      setNewAdminEmail("");
      setNewAdminName("");
      setNewAdminRole(undefined);
      
      // Refetch admin list
      fetchAdminList();
    } catch (err: unknown) {
      console.error("Failed to create admin user:", err);
      let message = "Failed to create admin user.";
      if (axios.isAxiosError(err) && err.response?.data) {
        message = err.response.data.error || err.response.data.detail || message;
      }
      toast({
        title: "Creation failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Edit admin role
  const handleEditAdmin = async () => {
    if (!selectedAdmin) {
      toast({
        title: "Missing information", 
        description: "No user selected to edit.",
        variant: "destructive",
      });
      return;
    }

    // Collect updates to send
    const updates: Record<string, string | null> = {};
    
    if (editingAdminName && editingAdminName !== selectedAdmin.full_name) {
      updates.full_name = editingAdminName;
    }
    
    if (editingAdminEmail && editingAdminEmail !== selectedAdmin.email) {
      updates.email = editingAdminEmail;
    }
    
    if (editingAdminRole && editingAdminRole !== selectedAdmin.admin_role) {
      updates.admin_role = editingAdminRole === 'none' ? null : editingAdminRole;
    }
    
    if (Object.keys(updates).length === 0) {
      toast({
        title: "No changes", 
        description: "No changes were made.",
      });
      closeEditModal();
      return;
    }

    const token = await getToken();
    if (!token || !isSuperAdmin) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to update admin users.",
        variant: "destructive",
      });
      return;
    }

    try {
      await axios.patch(`/api/admin/users/${selectedAdmin.clerk_id}/`, 
        updates,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Success notification
      toast({
        title: "Admin updated",
        description: "Admin user has been updated successfully.",
      });
      
      // Refetch list to show updated data
      fetchAdminList();
      closeEditModal();
    } catch (err: unknown) {
      console.error("Failed to update admin:", err);
      let message = "Failed to update admin.";
      if (axios.isAxiosError(err) && err.response?.data) {
        message = err.response.data.error || err.response.data.detail || message;
      }
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  // --- Delete User Handlers ---
  const openDeleteUserModal = (user: AdminUser) => {
    setUserToDelete(user);
    setIsDeleteUserModalOpen(true);
  };

  const closeDeleteUserModal = () => {
    setUserToDelete(null);
    setIsDeleteUserModalOpen(false);
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete || !isSuperAdmin) {
      toast({
        title: "Action not allowed", 
        description: "You don't have permission or no user selected.",
        variant: "destructive",
      });
      closeDeleteUserModal();
      return;
    }
    const token = await getToken();
    if (!token) {
      toast({
        title: "Authentication error",
        description: "Authentication token missing.",
        variant: "destructive",
      });
      closeDeleteUserModal();
      return;
    }

    try {
      console.log(`Attempting to delete user ${userToDelete.clerk_id}`);
      // Use the correct endpoint for user deletion
      await axios.delete(`/api/users/${userToDelete.clerk_id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Success
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
      
      // Close modal, refetch admin list
      closeDeleteUserModal();
      fetchAdminList();
    } catch (err: unknown) {
      console.error("Failed to delete user:", err);
      let message = "Failed to delete user.";
      if (axios.isAxiosError(err) && err.response?.data) {
        message = err.response.data.error || err.response.data.detail || message;
        console.log("Delete error response:", err.response.data);
        console.log("Delete error status:", err.response.status);
      }
      toast({
        title: "Deletion failed",
        description: message,
        variant: "destructive",
      });
      closeDeleteUserModal();
    }
  };

  // View user details
  const openViewDetailsModal = (user: AdminUser) => {
    setSelectedAdmin(user);
    setIsViewDetailsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (user: AdminUser) => {
    setSelectedAdmin(user);
    setEditingAdminRole(user.admin_role || undefined);
    setEditingAdminName(user.full_name);
    setEditingAdminEmail(user.email);
    setIsEditAdminModalOpen(true);
  };

  // Close edit modal with proper cleanup
  const closeEditModal = () => {
    setIsEditAdminModalOpen(false);
    // Don't clear other state immediately to prevent unmounting issues
    setTimeout(() => {
      setSelectedAdmin(null);
      setEditingAdminRole(undefined);
      setEditingAdminName("");
      setEditingAdminEmail("");
    }, 200);
  };

  // View user details with proper open/close
  const closeViewDetailsModal = () => {
    setIsViewDetailsModalOpen(false);
    // Don't clear selected admin immediately to prevent unmounting issues
    setTimeout(() => {
      setSelectedAdmin(null);
    }, 200);
  };

  // Handle Add Modal
  const closeAddModal = () => {
    setIsAddAdminModalOpen(false);
    // Reset form fields after animation completes
    setTimeout(() => {
      setNewAdminEmail("");
      setNewAdminName("");
      setNewAdminRole(undefined);
    }, 200);
  };

  // Get role badge class
  const getRoleBadgeClass = (role?: string | null) => {
    if (!role) return "bg-gray-100 text-gray-800";
    
    const roleConfig = adminRoles.find(r => r.value === role);
    return roleConfig?.badge || "bg-gray-100 text-gray-800";
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight"><T>Platform Settings</T></h1>
          {isSuperAdmin && (
            <Button onClick={() => setIsAddAdminModalOpen(true)} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <T>Add Admin</T>
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="manage-admins" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <T>General</T>
            </TabsTrigger>
            <TabsTrigger value="manage-admins" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <T>Admin Management</T>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <T>Role-Based Access Control</T>
                </CardTitle>
                <CardDescription><T>Manage admin roles and permissions.</T></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold"><T>Role Name</T></TableHead>
                        <TableHead className="font-semibold"><T>Description</T></TableHead>
                        <TableHead className="font-semibold"><T>Permissions</T></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roleDefinitions.map((role) => (
                        <TableRow key={role.name} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <Badge className={role.name === "Super Admin" ? "bg-red-100 text-red-800" : 
                                           role.name === "Event Admin" ? "bg-blue-100 text-blue-800" : 
                                           "bg-green-100 text-green-800"}>
                              <T>{role.name}</T>
                            </Badge>
                          </TableCell>
                          <TableCell><T>{role.description}</T></TableCell>
                          <TableCell>
                            <ul className="list-disc list-inside space-y-1">
                              {role.permissions.map((permission) => (
                                <li key={permission}><T>{permission}</T></li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
            <TabsContent value="manage-admins" className="space-y-6">
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  <T>Admin User List</T>
                </CardTitle>
                  <CardDescription><T>View and manage platform administrators.</T></CardDescription>
                </CardHeader>
                <CardContent>
                {/* Add direct debugging section */}
                {errorAdmins && (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
                    <h3 className="font-medium">Error</h3>
                    <p>{errorAdmins}</p>
                  </div>
                )}
                
                {!loadingAdmins && !errorAdmins && adminList.length > 0 && (
                  <div className="bg-muted/20 p-4 rounded-lg mb-4">
                    <details>
                      <summary className="font-medium cursor-pointer">Debug Information (Click to expand)</summary>
                      <div className="mt-2 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto">
                        {adminList.map((admin, idx) => (
                          <div key={idx} className="mb-2 p-2 border border-muted rounded">
                            <h3>User {idx + 1}: {admin.clerk_id}</h3>
                            <ul>
                              <li>full_name: {JSON.stringify(admin.full_name)}</li>
                              <li>email: {JSON.stringify(admin.email)}</li>
                              <li>admin_role: {JSON.stringify(admin.admin_role)}</li>
                              <li>created_at: {JSON.stringify(admin.created_at)}</li>
                            </ul>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
                
                {loadingAdmins && (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
                
                {!loadingAdmins && !errorAdmins && adminList.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p><T>No admin users found.</T></p>
                    {isSuperAdmin && (
                      <Button variant="outline" className="mt-4" onClick={() => setIsAddAdminModalOpen(true)}>
                        <T>Add your first admin</T>
                      </Button>
                    )}
                  </div>
                )}
                
                  {!loadingAdmins && !errorAdmins && adminList.length > 0 && (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold"><T>User</T></TableHead>
                          <TableHead className="font-semibold"><T>Email</T></TableHead>
                          <TableHead className="font-semibold"><T>Role</T></TableHead>
                          <TableHead className="font-semibold w-[120px]"><T>Created</T></TableHead>
                          <TableHead className="font-semibold text-right"><T>Actions</T></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminList.map((admin) => {
                          // Debug output for each admin user
                          console.log(`Rendering admin: ${admin.clerk_id}`, admin);
                          
                          // Use the raw values for rendering
                          const displayName = admin.full_name || 
                            (admin.email ? admin.email.split('@')[0].replace('.', ' ') : 'Unknown User');
                          const displayEmail = admin.email || 'N/A';
                          const displayRole = admin.admin_role || 'No Role';
                          
                          return (
                            <TableRow key={admin.clerk_id || 'unknown'} className="hover:bg-muted/50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={admin.profile_image} alt={displayName} />
                                    <AvatarFallback>{displayName.substring(0, 2).toUpperCase() || 'AD'}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="font-medium">{displayName}</span>
                                    {admin.clerk_id && admin.clerk_id.startsWith('admin_') && (
                                      <span className="text-xs text-muted-foreground block">Admin Created</span>
                                    )}
                                    <span className="text-xs text-muted-foreground block">ID: {admin.clerk_id?.substring(0, 8)}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{displayEmail}</TableCell>
                              <TableCell>
                                <Badge className={getRoleBadgeClass(displayRole)}>
                                  {displayRole === 'super_admin' ? 'Super Admin' : 
                                   displayRole === 'event_admin' ? 'Event Admin' :
                                   displayRole === 'support_admin' ? 'Support Admin' : 
                                   displayRole}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {admin.created_at ? formatDate(admin.created_at) : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openViewDetailsModal(admin)}
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>
                                  
                                  {isSuperAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditModal(admin)}
                                      disabled={admin.clerk_id === profile?.clerk_id}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  
                                  {isSuperAdmin && admin.clerk_id !== profile?.clerk_id && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => openDeleteUserModal(admin)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
        </Tabs>

        {/* Admin Create Modal */}
        <Dialog open={isAddAdminModalOpen} onOpenChange={closeAddModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle><T>Add New Admin</T></DialogTitle>
              <DialogDescription>
                <T>Create a new admin user. The user will be sent an invitation email.</T>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="name">
                  <T>Full Name</T>
                </Label>
                <Input
                  id="name"
                  className="col-span-3"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="email">
                  <T>Email</T>
                </Label>
                <Input
                  id="email"
                  className="col-span-3"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="role">
                  <T>Role</T>
                </Label>
                <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                  <SelectTrigger className="col-span-3" id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          <span className="text-xs text-muted-foreground">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeAddModal}>
                <T>Cancel</T>
              </Button>
              <Button onClick={handleCreateAdmin}>
                <T>Create Admin</T>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Edit Modal */}
        <Dialog open={isEditAdminModalOpen} onOpenChange={closeEditModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle><T>Edit Admin Role</T></DialogTitle>
              <DialogDescription>
                {selectedAdmin && (
                  <>
                    <T>Update role for</T> <span>{selectedAdmin.full_name}</span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="edit-name">
                  <T>Full Name</T>
                </Label>
                <Input
                  id="edit-name"
                  className="col-span-3"
                  value={editingAdminName}
                  onChange={(e) => setEditingAdminName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="edit-email">
                  <T>Email</T>
                </Label>
                <Input
                  id="edit-email"
                  className="col-span-3"
                  type="email"
                  value={editingAdminEmail}
                  onChange={(e) => setEditingAdminEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="edit-role">
                  <T>Role</T>
                </Label>
                <Select value={editingAdminRole} onValueChange={setEditingAdminRole}>
                  <SelectTrigger className="col-span-3" id="edit-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          <span className="text-xs text-muted-foreground">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="none">
                      <div className="flex flex-col">
                        <span>No Role (Remove Admin)</span>
                        <span className="text-xs text-muted-foreground">Remove admin privileges</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEditModal}>
                <T>Cancel</T>
              </Button>
              <Button onClick={handleEditAdmin}>
                <T>Save Changes</T>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Details Modal */}
        <Dialog open={isViewDetailsModalOpen} onOpenChange={closeViewDetailsModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle><T>Admin User Details</T></DialogTitle>
            </DialogHeader>
            {selectedAdmin && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="flex-shrink-0">
                    <Avatar className="h-24 w-24 border-2 border-muted">
                      <AvatarImage src={selectedAdmin.profile_image} alt={selectedAdmin.full_name} />
                      <AvatarFallback className="text-xl">{selectedAdmin.full_name?.substring(0, 2).toUpperCase() || 'AD'}</AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="flex flex-col flex-grow space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedAdmin.full_name}</h2>
                      <p className="text-muted-foreground">{selectedAdmin.email}</p>
                      <div className="mt-2">
                        <Badge className={getRoleBadgeClass(selectedAdmin.admin_role)}>
                          {selectedAdmin.admin_role ? 
                            adminRoles.find(r => r.value === selectedAdmin.admin_role)?.label || selectedAdmin.admin_role 
                            : 'No Role'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-sm border rounded-md p-3 bg-muted/20">
                      <div className="flex flex-col">
                        <span className="font-medium text-muted-foreground"><T>User ID</T></span>
                        <span className="truncate text-xs">{selectedAdmin.clerk_id}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="font-medium text-muted-foreground"><T>Created</T></span>
                        <span>{formatDate(selectedAdmin.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    <T>Role & Permissions</T>
                  </h3>
                  
                  {selectedAdmin.admin_role && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-muted-foreground">
                          {adminRoles.find(r => r.value === selectedAdmin.admin_role)?.description}
                        </span>
                      </div>
                      
                      <div className="bg-muted/20 rounded-md p-3">
                        <h4 className="text-sm font-medium mb-2"><T>Permissions</T></h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {roleDefinitions.find(r => r.name.toLowerCase().includes(selectedAdmin.admin_role || ''))?.
                            permissions.map((permission, i) => (
                              <li key={i}><T>{permission}</T></li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button onClick={closeViewDetailsModal}>
                <T>Close</T>
              </Button>
              {isSuperAdmin && selectedAdmin && selectedAdmin.clerk_id !== profile?.clerk_id && (
                <Button variant="outline" onClick={() => {
                  closeViewDetailsModal();
                  setTimeout(() => openEditModal(selectedAdmin), 300);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  <T>Edit User</T>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <DeleteUserConfirmationModal 
          user={userToDelete}
          isOpen={isDeleteUserModalOpen}
          onClose={closeDeleteUserModal}
          onConfirm={handleDeleteUserConfirm}
        />
      </div>
    </AdminLayout>
  )
}

// --- Delete User Confirmation Modal Component ---
interface DeleteUserConfirmationModalProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteUserConfirmationModal({ user, isOpen, onClose, onConfirm }: DeleteUserConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmClick = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false); 
  };

  if (!isOpen || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle><T>Delete Admin User?</T></DialogTitle>
          <DialogDescription>
            <T>Are you sure you want to permanently delete the admin user account for</T> <strong>{user.full_name}</strong> (<T>Email:</T> {user.email})? 
            <T>This action is irreversible and will remove all their data associated with the platform.</T>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            <T>Cancel</T>
          </Button>
          <Button variant="destructive" onClick={handleConfirmClick} disabled={isDeleting}>
            {isDeleting ? <T>Deleting User...</T> : <T>Yes, Delete User</T>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
