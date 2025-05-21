import { useState, useEffect, useCallback } from "react"
import { MoreHorizontal, Search, UserPlus, Filter } from "lucide-react"
import axios from "axios"
import { useAuth } from "@clerk/clerk-react"
import { useBackendUserProfile } from "@/components/use-backend-user-profile"
import { formatDate } from "@/utils/formatDate"
import { T, useTranslation } from "@/context/translation"
import { getDisplayName, getAvatarInitials, formatPlanName } from "@/utils/userDisplayUtils"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import AdminLayout from "./AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Define user interface (should match serializer)
interface User {
  clerk_id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  profile_image?: string;
  plan: 'free' | 'pro' | 'organizer' | string; // Allow string for potential other values
  user_type: 'user' | 'admin';
  admin_role?: 'super_admin' | 'event_admin' | 'support_admin';
  created_at: string;
  status: string;
  is_active?: boolean; // Add for deactivation support
  active?: boolean;    // Alternative field for deactivation
  deleted?: boolean;   // Another possible field for deletion status
}

// Interface for API response (with pagination)
interface PaginatedUsersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

export default function UsersPage() {
  const { getToken } = useAuth();
  const { profile, loading: profileLoading } = useBackendUserProfile();
  const { language, translate } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(10);
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search users...");

  // State for modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // State for Add User modal

  // Debounce search input
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // State for Add User Modal
  const [formData, setFormData] = useState<Partial<User> & { password?: string }>({});

  const isSuperAdmin = profile?.admin_role === 'super_admin';
  const isEventAdmin = profile?.admin_role === 'event_admin';
  const isSupportAdmin = profile?.admin_role === 'support_admin';
  const canManageUsers = isSuperAdmin || isEventAdmin || isSupportAdmin;
  const canViewUsers = isSuperAdmin || isEventAdmin || isSupportAdmin;

  // fetchData definition MUST come before the useEffect that calls it.
  const fetchData = useCallback(async (page: number, search: string, status: string | null) => {
    setLoading(true);
    setError(null);
    const token = await getToken();
    if (!token) {
      const translatedError = await translate("Authentication token not available.");
      setError(translatedError);
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      if (search) params.append('search', search);
      if (status && status !== 'all') params.append('status', status); // Keep status filter if used for other things
      params.append('user_type', 'user'); // Only fetch regular users
      
      console.log("Fetching users with params:", Object.fromEntries(params.entries()));
      
      const response = await axios.get<PaginatedUsersResponse>("/api/users/", {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
      });
      
      if (response.data && response.data.results) {
      setUsers(response.data.results);
        setCount(response.data.count ?? 0);
      setNextPageUrl(response.data.next);
      setPrevPageUrl(response.data.previous);
      } else {
        const translatedError = await translate("Received unexpected data format from server.");
        setError(translatedError);
        setUsers([]); setCount(0); setNextPageUrl(null); setPrevPageUrl(null);
      }
    } catch (err: any) {
      const translatedError = await translate("Failed to load users.");
      setError(err.response?.data?.detail || err.response?.data?.error || translatedError);
      setUsers([]); setCount(0); setNextPageUrl(null); setPrevPageUrl(null);
    } finally {
      setLoading(false);
    }
  }, [getToken, pageSize, translate]);

  useEffect(() => {
    fetchData(currentPage, debouncedSearchTerm, null);
  }, [fetchData, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    translate("Search users by name, email...").then(setSearchPlaceholder);
  }, [translate, language]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0) {
        // We refetch based on currentPage changing in the useEffect
        setCurrentPage(newPage);
    }
  };

  const handleTabChange = (value: string) => {
    setCurrentPage(1); // Reset page on tab change
    if (value === "all") {
      setStatusFilter("all");
    } else {
      setStatusFilter(value);
    }
  };
  
  // Calculate total pages
  const totalPages = Math.ceil(count / pageSize);

  // --- Modal Handlers ---
  const openModal = (user: User, type: 'view' | 'edit' | 'delete') => {
    setSelectedUser(user);
    if (type === 'view') setIsViewModalOpen(true);
    if (type === 'edit') setIsEditModalOpen(true);
    if (type === 'delete') setIsDeleteModalOpen(true);
  };

  const openAddModal = () => {
      setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsAddModalOpen(false); // Close Add modal too
  };

  const handleUserUpdate = () => {
    fetchData(currentPage, debouncedSearchTerm, null); // Refetch after update
    closeModal();
  };

  const handleUserDelete = () => {
     fetchData(currentPage, debouncedSearchTerm, null); // Refetch after delete
     // If deleting the last item on a page > 1, go back one page
    if (users.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
    }
    closeModal();
  };

  const handleUserAdd = () => {
    fetchData(1, "", null); // Refetch page 1 after adding
    closeModal();
  };
  // --- End Modal Handlers ---

  // Determine permissions based on role
  const canManageAdmins = !profileLoading && profile?.admin_role === 'super_admin';

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold"><T>User Management</T></h1>
          {canManageUsers && !profileLoading && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> <T>Add New User</T>
        </Button>
          )}
        </div>

        <Card>
          <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                <CardTitle><T>All Users</T></CardTitle>
                <CardDescription><T>Browse and manage all registered users.</T></CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                      <Filter className="mr-2 h-4 w-4" /> <T>Filter by Status</T>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel><T>Select Status</T></DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {[
                      { value: "all", label: "All Statuses" },
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                      { value: "suspended", label: "Suspended" },
                    ].map(option => (
                      <DropdownMenuItem
                        key={option.value}
                        onSelect={() => handleTabChange(option.value)}
                      >
                        <T>{option.label}</T>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
          </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && users.length === 0 && <p><T>Loading users...</T></p>}
            {error && <p className="text-red-500"><T>Error loading users</T>: {error}</p>}
            {!loading && !error && (
              <UserTable
                users={users}
                onViewDetails={(user) => openModal(user, 'view')}
                onEditUser={canManageUsers ? (user) => openModal(user, 'edit') : undefined}
                onDeleteUser={canManageUsers ? (user) => openModal(user, 'delete') : undefined}
                canManage={canManageUsers}
                currentUserAdminRole={profile?.admin_role}
              />
            )}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end space-x-2 py-4">
                <span className="text-sm text-muted-foreground">
                  <T>Page</T> {currentPage} <T>of</T> {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1 || loading}>
                  <T>Previous</T>
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages || loading}>
                  <T>Next</T>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedUser && (
        <>
          <UserDetailsModal user={selectedUser} isOpen={isViewModalOpen} onClose={closeModal} />
          <EditUserModal
            user={selectedUser}
            isOpen={isEditModalOpen}
            onClose={closeModal}
            onUserUpdate={handleUserUpdate}
          />
          <DeleteConfirmationModal
            user={selectedUser}
            isOpen={isDeleteModalOpen}
            onClose={closeModal}
            onUserDelete={handleUserDelete}
          />
        </>
      )}
       <AddUserModal
        isOpen={isAddModalOpen}
        onClose={closeModal}
        onUserAdd={handleUserAdd} // Ensure handleUserAdd is defined
      />
    </AdminLayout>
  );
}

// --- UserTable Component ---
interface UserTableProps {
  users: User[];
  onViewDetails: (user: User) => void;
  onEditUser?: (user: User) => void;
  onDeleteUser?: (user: User) => void;
  canManage: boolean;
  currentUserAdminRole?: string;
}

function UserTable({ users, onViewDetails, onEditUser, onDeleteUser, canManage, currentUserAdminRole }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 border rounded-md">
        <p className="text-muted-foreground"><T>No users found matching your criteria.</T></p>
      </div>
    );
  }

  return (
      <Table>
        <TableHeader>
        <TableRow>
            <TableHead><T>User</T></TableHead>
            <TableHead><T>Email</T></TableHead>
            <TableHead><T>Plan</T></TableHead>
            <TableHead><T>Joined</T></TableHead>
            <TableHead className="text-right"><T>Actions</T></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
          <TableRow key={user.clerk_id}>
              <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="hidden h-12 w-12 sm:flex rounded-md">
                  <AvatarImage src={user.profile_image || "/placeholder.svg"} alt={getDisplayName(user)} />
                  <AvatarFallback className="rounded-md">
                    {getAvatarInitials(user)}
                  </AvatarFallback>
                  </Avatar>
                <div>
                  <div className="font-medium truncate max-w-xs">{getDisplayName(user)}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-xs">
                    {formatPlanName(user.plan)}
                  </div>
                </div>
                </div>
              </TableCell>
              <TableCell>
              <div>{user.email}</div>
            </TableCell>
            <TableCell>
              <Badge variant="outline"
              className={
                user.plan === 'pro' || user.plan === 'Pro' || user.plan === 'Pro Plan'
                  ? "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700"
                  : user.plan === 'organizer' || user.plan === 'Organizer' || user.plan === 'Organizer Plan'
                      ? "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
              }>
                  {formatPlanName(user.plan)}
                </Badge>
              </TableCell>
              <TableCell>
              <div>{formatDate(user.created_at)}</div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only"><T>Actions</T></span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                  <DropdownMenuLabel><T>User Actions</T></DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onViewDetails(user)}><T>View Details</T></DropdownMenuItem>
                    {canManage && onEditUser && (
                      <DropdownMenuItem onClick={() => onEditUser(user)}><T>Edit User</T></DropdownMenuItem>
                    )}
                  {canManage && onDeleteUser && (
                       <DropdownMenuItem onClick={() => onDeleteUser(user)} className="text-red-600"><T>Delete User</T></DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );
}

// --- Modal Components ---

// User Details Modal
interface UserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

function UserDetailsModal({ user, isOpen, onClose }: UserDetailsModalProps) {
  if (!isOpen) return null;

  // Helper to display N/A for empty fields gracefully
  const displayValue = (value: string | undefined | null, defaultValue = "N/A") => value || defaultValue;
  const displayRole = (role: string | undefined | null) => {
    if (!role) return "N/A";
    return role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Determine plan color classes
  const getPlanBadgeClasses = (plan: string) => {
    if (plan.toLowerCase().includes('pro'))
      return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700";
    if (plan.toLowerCase().includes('organizer'))
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700";
    return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
  }

  // Calculate user metrics (placeholder - you can replace with real metrics)
  const joinedDays = Math.floor((new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 3600 * 24));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Left sidebar with user avatar and basic info */}
          <div className="w-full sm:w-1/3 p-6 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center">
            <Avatar className="h-24 w-24 rounded-xl shadow-md mb-4">
              <AvatarImage src={user.profile_image || "/placeholder.svg"} alt={getDisplayName(user)} />
              <AvatarFallback className="text-xl rounded-xl bg-primary text-primary-foreground">
                {getAvatarInitials(user)}
              </AvatarFallback>
                         </Avatar>
             
             <h3 className="text-lg font-semibold text-center mb-1">{getDisplayName(user)}</h3>
             <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-3">{user.email}</p>
            
            <Badge variant="outline" className={`${getPlanBadgeClasses(user.plan)} mb-4`}>
              {formatPlanName(user.plan)}
            </Badge>
            
            <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400"><T>User Type</T>:</span>
                  <span className="font-medium">{user.user_type === 'admin' ? "Admin" : "User"}</span>
                </div>
                
                {user.user_type === 'admin' && user.admin_role && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400"><T>Admin Role</T>:</span>
                    <span className="font-medium">{displayRole(user.admin_role)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400"><T>Member For</T>:</span>
                  <span className="font-medium">{joinedDays} days</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side detailed information */}
          <div className="w-full sm:w-2/3 p-6">
            <DialogHeader className="mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-xl"><T>User Profile</T></DialogTitle>
          <DialogDescription>
                <T>Complete details and account information</T>
          </DialogDescription>
        </DialogHeader>
            
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"><T>Account Information</T></h4>
                <div className="rounded-md border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                  <div className="flex py-2 px-3">
                    <span className="w-1/3 text-sm text-slate-600 dark:text-slate-400"><T>Full Name</T></span>
                    <span className="w-2/3 text-sm font-medium">{getDisplayName(user)}</span>
          </div>
                  <div className="flex py-2 px-3">
                    <span className="w-1/3 text-sm text-slate-600 dark:text-slate-400"><T>Email</T></span>
                    <span className="w-2/3 text-sm font-medium">{user.email}</span>
          </div>
                  <div className="flex py-2 px-3">
                    <span className="w-1/3 text-sm text-slate-600 dark:text-slate-400"><T>Joined Date</T></span>
                    <span className="w-2/3 text-sm font-medium">{formatDate(user.created_at)}</span>
          </div>
          </div>
            </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"><T>User Details</T></h4>
                <div className="rounded-md border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                  <div className="flex py-2 px-3">
                    <span className="w-1/3 text-sm text-slate-600 dark:text-slate-400"><T>Bio</T></span>
                    <span className="w-2/3 text-sm">{displayValue(user.bio, "Not set")}</span>
          </div>
                  <div className="flex py-2 px-3">
                    <span className="w-1/3 text-sm text-slate-600 dark:text-slate-400"><T>User ID</T></span>
                    <span className="w-2/3 text-sm font-mono text-xs">{user.clerk_id}</span>
          </div>
        </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={onClose}><T>Close</T></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit User Modal
interface EditUserModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: () => void;
}

function EditUserModal({ user, isOpen, onClose, onUserUpdate }: EditUserModalProps) {
  const { getToken } = useAuth();
  // Type definition for the form data
  const [editFormData, setEditFormData] = useState<Partial<User> & {
    first_name?: string;
    last_name?: string;
    admin_role?: 'super_admin' | 'event_admin' | 'support_admin' | null;
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language, translate } = useTranslation();
  const [firstNamePlaceholder, setFirstNamePlaceholder] = useState("Enter first name");
  const [lastNamePlaceholder, setLastNamePlaceholder] = useState("Enter last name");
  const [bioPlaceholder, setBioPlaceholder] = useState("Enter user bio");

  // Get plan badge color classes
  const getPlanBadgeClasses = (plan: string) => {
    if (plan.toLowerCase().includes('pro'))
      return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700";
    if (plan.toLowerCase().includes('organizer'))
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700";
    return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
  };

  useEffect(() => {
    if (user) {
      setEditFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '', 
        plan: user.plan || 'free',
        user_type: user.user_type || 'user',
        admin_role: user.admin_role || undefined,
        bio: user.bio || '',
      });
    }
  }, [user, isOpen]); // Reset form when user or isOpen changes

  useEffect(() => {
    translate("Enter first name").then(setFirstNamePlaceholder);
    translate("Enter last name").then(setLastNamePlaceholder);
    translate("Enter user bio").then(setBioPlaceholder);
  }, [translate, language]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const token = await getToken();
    if (!token) {
      setError("Authentication required.");
      setIsSaving(false);
      return;
    }

    try {
      // Create a clean data object for the API
      const apiData: {
        email?: string;
        plan?: string;
        user_type?: string;
        admin_role?: string | null;
        full_name?: string;
        bio?: string;
      } = {
        email: editFormData.email || '',
        plan: (editFormData.plan || 'free').toLowerCase(), // Ensure plan is lowercase
        user_type: editFormData.user_type || 'user',
        bio: editFormData.bio || '',
      };
      
      // Construct full_name from first+last name if available
      if (editFormData.first_name || editFormData.last_name) {
        const firstName = editFormData.first_name?.trim() || '';
        const lastName = editFormData.last_name?.trim() || '';
        apiData.full_name = `${firstName} ${lastName}`.trim();
      }
      
      // Handle admin role correctly
      if (apiData.user_type === 'admin') {
        // Only set admin_role if it's a valid value, otherwise set null
        if (editFormData.admin_role && 
            ['super_admin', 'event_admin', 'support_admin'].includes(editFormData.admin_role)) {
          apiData.admin_role = editFormData.admin_role;
        } else {
          apiData.admin_role = null;
        }
      } else {
        // For regular users, always set admin_role to null
        apiData.admin_role = null;
      }

      console.log("Sending update data:", apiData);
      
      // Ensure clerk_id is part of the user prop passed
      await axios.patch(`/api/users/${user.clerk_id}/`, apiData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onUserUpdate(); // Calls refetch and closes modal via parent
    } catch (err: any) {
      console.error("Failed to update user:", err);
      let errorMessage = "Failed to save changes.";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (typeof err.response?.data === 'object') {
        // If response contains field-specific errors
        errorMessage = Object.entries(err.response.data)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('; ');
      }
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  const adminRoleOptions = [
    { value: "super_admin", label: "Super Admin" },
    { value: "event_admin", label: "Event Admin" },
    { value: "support_admin", label: "Support Admin" },
    { value: "", label: "None (Regular User)" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row max-h-[80vh]">
          {/* Left sidebar with user info */}
          <div className="w-full sm:w-1/3 p-4 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto">
            <div className="mb-4 flex flex-col items-center">
              <Avatar className="h-16 w-16 rounded-xl mb-2">
                <AvatarImage src={user.profile_image || "/placeholder.svg"} alt={getDisplayName(user)} />
                <AvatarFallback className="text-lg rounded-xl">
                  {getAvatarInitials(user)}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-medium text-base">{getDisplayName(user)}</h3>
              <p className="text-xs text-muted-foreground text-center truncate max-w-full">{user.email}</p>
              <div className="mt-2">
                <Badge variant="outline" className={`${getPlanBadgeClasses(user.plan || 'free')}`}>
                  {formatPlanName(user.plan || 'free')}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium mb-1 text-slate-700 dark:text-slate-300"><T>Account ID</T></h4>
                <div className="text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded p-2 break-all">
                  {user.clerk_id}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-medium mb-1 text-slate-700 dark:text-slate-300"><T>Joined On</T></h4>
                <div className="text-xs">
                  {formatDate(user.created_at)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Main content/form */}
          <div className="w-full sm:w-2/3 p-4 overflow-y-auto max-h-[80vh]">
            <DialogHeader className="mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-base"><T>Edit User</T></DialogTitle>
              <DialogDescription className="text-xs">
                <T>Make changes to the user profile information</T>
              </DialogDescription>
        </DialogHeader>
            
            <div className="space-y-4">
              {/* User Information */}
              <div>
                <h3 className="text-xs font-medium mb-2 text-slate-700 dark:text-slate-300"><T>Personal Information</T></h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="first_name" className="text-xs"><T>First Name</T></Label>
                      <Input 
                        id="first_name" 
                        name="first_name" 
                        value={editFormData.first_name || ''} 
                        onChange={handleChange} 
                        placeholder={firstNamePlaceholder}
                        className="h-8 text-sm" 
                      />
          </div>
                    <div className="space-y-1">
                      <Label htmlFor="last_name" className="text-xs"><T>Last Name</T></Label>
                      <Input 
                        id="last_name" 
                        name="last_name" 
                        value={editFormData.last_name || ''} 
                        onChange={handleChange} 
                        placeholder={lastNamePlaceholder}
                        className="h-8 text-sm" 
                      />
          </div>
          </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs"><T>Email Address</T></Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={editFormData.email || ''} 
                      onChange={handleChange}
                      className="h-8 text-sm" 
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400"><T>Email is your primary identifier</T></p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="bio" className="text-xs"><T>Bio</T></Label>
                    <textarea 
                      id="bio" 
                      name="bio" 
                      value={editFormData.bio || ''} 
                      onChange={handleChange} 
                      className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" 
                      placeholder={bioPlaceholder}
                    />
                  </div>
                </div>
              </div>
              
              {/* Account Settings */}
              <div>
                <h3 className="text-sm font-medium mb-3 text-slate-700 dark:text-slate-300"><T>Account Settings</T></h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan"><T>Subscription Plan</T></Label>
                    <select 
                      id="plan" 
                      name="plan" 
                      value={editFormData.plan || 'free'} 
                      onChange={handleChange} 
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
              <option value="free"><T>Free</T></option>
              <option value="pro"><T>Pro</T></option>
              <option value="organizer"><T>Organizer</T></option>
            </select>
          </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="user_type"><T>User Type</T></Label>
                    <select 
                      id="user_type" 
                      name="user_type" 
                      value={editFormData.user_type || 'user'} 
                      onChange={handleChange} 
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
              <option value="user"><T>User</T></option>
              <option value="admin"><T>Admin</T></option>
            </select>
          </div>
                  
          {editFormData.user_type === 'admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="admin_role"><T>Admin Role</T></Label>
                      <select 
                        id="admin_role" 
                        name="admin_role" 
                        value={editFormData.admin_role || 'none'} 
                        onChange={handleChange} 
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                {adminRoleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}><T>{opt.label}</T></option>
                ))}
              </select>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <T>Access level for admin users</T>
                      </p>
            </div>
          )}
          </div>
        </div>
            </div>
            
            {error && (
              <div className="mt-4 p-3 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400"><T>Error</T>: {error}</p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} disabled={isSaving} size="sm"><T>Cancel</T></Button>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? <><T>Saving...</T></> : <><T>Save Changes</T></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Modal
interface DeleteConfirmationModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUserDelete: () => void;
}

function DeleteConfirmationModal({ user, isOpen, onClose, onUserDelete }: DeleteConfirmationModalProps) {
  const { getToken } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { translate } = useTranslation();

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    const token = await getToken();
    if (!token) {
      const authReqError = await translate("Authentication required.");
      setError(authReqError);
      setIsDeleting(false);
      return;
    }
    
    try {
      console.log(`Attempting hard DELETE for user ${user.clerk_id}`);
      await axios.delete(`/api/users/${user.clerk_id}/`, {
        headers: { 
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Hard DELETE successful");
      onUserDelete(); // Notify parent to refresh
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      const fallbackError = await translate("Failed to delete user.");
      if (err.response?.status === 405) {
          setError("The server is not configured to allow user deletion via this method. Contact admin.");
      } else {
      setError(err.response?.data?.detail || err.response?.data?.error || fallbackError);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    // Reset error when modal is opened/closed or user changes, to avoid showing old errors
    if (isOpen) {
        setError(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle><T>Confirm Deletion</T></DialogTitle>
          <DialogDescription>
            <T>Are you sure you want to delete the user:</T> <strong>{user.full_name || user.email}</strong>?
            <br />
            <T>This action cannot be undone.</T>
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="my-2 text-sm text-red-600 text-center p-2 bg-red-50 border border-red-200 rounded-md">
            <p><T>Error</T>: {error}</p>
          </div>
        )}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}><T>Cancel</T></Button>
          <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
            {isDeleting ? <T>Deleting...</T> : <T>Delete User</T>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add User Modal
interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdd: () => void;
}

function AddUserModal({ isOpen, onClose, onUserAdd }: AddUserModalProps) {
  const { getToken } = useAuth();
  // Type definition for the form data
  const [addFormData, setAddFormData] = useState<Partial<User> & { 
    password?: string;
    admin_role?: 'super_admin' | 'event_admin' | 'support_admin' | null;
  }>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    plan: 'free',
    user_type: 'user',
    admin_role: null, // Default to null
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { translate, language } = useTranslation();

  // Placeholders state
  const [firstNamePlaceholder, setFirstNamePlaceholder] = useState("Enter first name");
  const [lastNamePlaceholder, setLastNamePlaceholder] = useState("Enter last name");
  const [emailPlaceholder, setEmailPlaceholder] = useState("Enter email address");
  const [passwordPlaceholder, setPasswordPlaceholder] = useState("Enter initial password");
  const [bioPlaceholder, setBioPlaceholder] = useState("Enter user bio");

  // Get badge colors for plan
  const getPlanBadgeClasses = (plan: string) => {
    if (plan.toLowerCase().includes('pro'))
      return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700";
    if (plan.toLowerCase().includes('organizer'))
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700";
    return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
  };

  useEffect(() => {
    translate("Enter first name").then(setFirstNamePlaceholder);
    translate("Enter last name").then(setLastNamePlaceholder);
    translate("Enter email address").then(setEmailPlaceholder);
    translate("Enter initial password").then(setPasswordPlaceholder);
    translate("Enter user bio").then(setBioPlaceholder);
  }, [translate, language]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAddFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        bio: '',
        plan: 'free',
        user_type: 'user',
        admin_role: null,
      });
      setError(null); // Clear previous errors
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const token = await getToken();
    if (!token) {
      const authError = await translate("Authentication required.");
      setError(authError);
      setIsSaving(false);
      return;
    }

    try {
      // Create a clean data object to send to API
      const apiData: {
        email?: string;
        plan?: string;
        user_type?: string;
        admin_role?: string | null;
        full_name?: string;
        password?: string;
        bio?: string;
      } = {
        email: addFormData.email?.trim(),
        plan: (addFormData.plan || 'free').toLowerCase(), // Ensure plan is lowercase
        user_type: addFormData.user_type || 'user',
        bio: addFormData.bio || '',
      };
      
      // Handle admin role based on user type
      if (apiData.user_type === 'admin') {
        // Only set valid admin roles
        if (addFormData.admin_role && 
            ['super_admin', 'event_admin', 'support_admin'].includes(addFormData.admin_role)) {
          apiData.admin_role = addFormData.admin_role;
        } else {
          apiData.admin_role = null;
        }
      } else {
        // For non-admin users, always set admin_role to null
        apiData.admin_role = null;
      }
      
      // Create full_name from first/last name
      const firstName = addFormData.first_name?.trim() || '';
      const lastName = addFormData.last_name?.trim() || '';
      if (firstName || lastName) {
        apiData.full_name = `${firstName} ${lastName}`.trim();
      }
      
      // Include password if provided
      if (addFormData.password) {
        apiData.password = addFormData.password;
      }
      
      console.log("Creating user with data:", apiData);
      
      // Call API to create user
      await axios.post("/api/users/", apiData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      onUserAdd(); // Calls refetch and closes modal
    } catch (err: any) {
      console.error("Failed to add user:", err);
      const fallbackError = await translate("Failed to add user.");
      let errorMessage = fallbackError;
      if (err.response?.data) {
        // Handle DRF error structure (often an object with field names or a 'detail' string)
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'object') {
          // Concatenate field errors
          errorMessage = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${(Array.isArray(messages) ? messages.join(', ') : messages)}`)
            .join('; ') || fallbackError;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const adminRoleOptions = [
    { value: "super_admin", label: "Super Admin" },
    { value: "event_admin", label: "Event Admin" },
    { value: "support_admin", label: "Support Admin" },
    { value: "", label: "None (Regular User)" }, // Represents no role
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row max-h-[80vh]">
          {/* Left sidebar with info */}
          <div className="w-full sm:w-1/3 p-4 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto">
            <div className="mb-4 flex flex-col items-center">
              <div className="h-16 w-16 mb-3 flex items-center justify-center bg-primary/10 rounded-xl">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-medium text-base"><T>New User Account</T></h3>
              <p className="text-xs text-muted-foreground text-center mt-1 mb-3"><T>Create a new user profile in the system</T></p>
            </div>
            
            <div className="space-y-3 mt-auto">
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950">
                <h4 className="text-xs font-medium mb-2 text-slate-700 dark:text-slate-300"><T>What happens after creation</T></h4>
                <ul className="text-xs space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0 h-3 w-3 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <span className="block h-1 w-1 rounded-full bg-green-600"></span>
                    </div>
                    <span><T>User will be created with the specified information</T></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0 h-3 w-3 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <span className="block h-1 w-1 rounded-full bg-green-600"></span>
                    </div>
                    <span><T>If email is provided, user will receive login instructions</T></span>
                  </li>
                </ul>
              </div>
              
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800">
                  <h4 className="text-xs font-medium"><T>Selected Plan</T></h4>
                </div>
                <div className="p-2 flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${getPlanBadgeClasses(addFormData.plan || 'free')}`}>
                    {formatPlanName(addFormData.plan || 'free')}
                  </Badge>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {addFormData.plan === 'pro' ? 
                      <T>Premium Features</T> : 
                      addFormData.plan === 'organizer' ? 
                        <T>Event Management</T> : 
                        <T>Basic Access</T>}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main form area */}
          <div className="w-full sm:w-2/3 p-4 overflow-y-auto max-h-[80vh]">
            <DialogHeader className="mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-base"><T>Add New User</T></DialogTitle>
              <DialogDescription className="text-xs">
                <T>Enter user details to create a new account in the system</T>
          </DialogDescription>
        </DialogHeader>
            
            <div className="space-y-4">
              {/* User Information */}
              <div>
                <h3 className="text-xs font-medium mb-2 text-slate-700 dark:text-slate-300"><T>Required Information</T></h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="add-first_name" className="text-xs"><T>First Name</T></Label>
                      <Input 
                        id="add-first_name" 
                        name="first_name" 
                        value={addFormData.first_name} 
                        onChange={handleChange}
                        className="h-8 text-sm" 
                        placeholder={firstNamePlaceholder} 
                      />
          </div>
                    <div className="space-y-1">
                      <Label htmlFor="add-last_name" className="text-xs"><T>Last Name</T></Label>
                      <Input 
                        id="add-last_name" 
                        name="last_name" 
                        value={addFormData.last_name} 
                        onChange={handleChange}
                        className="h-8 text-sm"
                        placeholder={lastNamePlaceholder} 
                      />
          </div>
          </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="add-email" className="text-xs"><T>Email Address</T> <span className="text-red-500">*</span></Label>
                    <Input 
                      id="add-email"
                      name="email" 
                      type="email" 
                      value={addFormData.email} 
                      onChange={handleChange} 
                      placeholder={emailPlaceholder}
                      className="h-8 text-sm" 
                      required
                    />
          </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="add-password" className="text-xs"><T>Password</T></Label>
                    <Input 
                      id="add-password"
                      name="password" 
                      type="password" 
                      value={addFormData.password} 
                      onChange={handleChange}
                      className="h-8 text-sm" 
                      placeholder={passwordPlaceholder}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <T>Optional. If not provided, a temporary password will be generated</T>
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-3 text-slate-700 dark:text-slate-300"><T>Additional Details</T></h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio"><T>Bio</T></Label>
                    <textarea 
                      id="bio" 
                      name="bio" 
                      value={addFormData.bio || ''} 
                      onChange={handleChange} 
                      className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" 
                      placeholder={bioPlaceholder}
                    />
                  </div>
                </div>
              </div>
              
              {/* Account Settings */}
              <div>
                <h3 className="text-sm font-medium mb-3 text-slate-700 dark:text-slate-300"><T>Account Settings</T></h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-plan"><T>Subscription Plan</T></Label>
                    <select 
                      id="add-plan" 
                      name="plan" 
                      value={addFormData.plan} 
                      onChange={handleChange} 
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
              <option value="free"><T>Free</T></option>
              <option value="pro"><T>Pro</T></option>
              <option value="organizer"><T>Organizer</T></option>
            </select>
          </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-user_type"><T>User Type</T></Label>
                    <select 
                      id="add-user_type" 
                      name="user_type" 
                      value={addFormData.user_type} 
                      onChange={handleChange} 
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
              <option value="user"><T>User</T></option>
              <option value="admin"><T>Admin</T></option>
            </select>
          </div>
                  
          {addFormData.user_type === 'admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="add-admin_role"><T>Admin Role</T></Label>
                      <select 
                        id="add-admin_role" 
                        name="admin_role" 
                        value={addFormData.admin_role || 'none'} 
                        onChange={handleChange} 
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                {adminRoleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}><T>{opt.label}</T></option>
                ))}
              </select>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <T>Access level for admin users</T>
                      </p>
            </div>
          )}
        </div>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-3 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400"><T>Error</T>: {error}</p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} disabled={isSaving} size="sm"><T>Cancel</T></Button>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? <T>Adding User...</T> : <T>Add User</T>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// --- End Modal Components ---
