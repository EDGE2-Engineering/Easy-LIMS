import React, { useState, useEffect } from 'react';
import { ROLES, DEPARTMENTS } from '@/data/config';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Pencil,
  UserMinus,
  UserCheck,
  Search,
  UsersRound,
  Filter,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const AdminUsersManager = () => {
  const { user: currentUser, roles } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    employee_id: '',
    departments: [],
    role: ROLES.TECHNICIAN.slug,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').order('username');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (u.role === ROLES.SUPER_ADMIN.slug) return false;
    const searchStr = searchTerm.toLowerCase();
    const matchesSearch =
      u.username.toLowerCase().includes(searchStr) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchStr)) ||
      (u.role && u.role.toLowerCase().includes(searchStr));
    if (!matchesSearch) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterStatus === 'active' && !u.is_active) return false;
    if (filterStatus === 'inactive' && u.is_active) return false;
    return true;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterStatus('active');
  };

  const hasActiveFilters = filterRole !== 'all' || filterStatus !== 'active';

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      employee_id: '',
      departments: [],
      role: ROLES.TECHNICIAN.slug,
    });
    setIsDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: user.password,
      full_name: user.full_name || '',
      employee_id: user.employee_id || '',
      departments: Array.isArray(user.departments) ? user.departments : [],
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Enforce lowercase username
    if (/[A-Z]/.test(formData.username)) {
      toast({
        title: 'Validation Error',
        description: 'Username must be in all lowercase characters.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const userData = {
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name,
        employee_id: formData.employee_id || null,
        role: formData.role,
        updated_at: new Date().toISOString(),
      };

      let userId;
      if (editingUser) {
        const { error } = await supabase.from('users').update(userData).eq('id', editingUser.id);
        if (error) throw error;
        userId = editingUser.id;
      } else {
        const { data, error } = await supabase.from('users').insert([userData]).select().single();
        if (error) throw error;
        userId = data.id;
      }

      // Store department IDs directly on the user row
      const deptIds = formData.role === ROLES.TECHNICIAN.slug ? formData.departments : [];
      await supabase.from('users').update({ departments: deptIds }).eq('id', userId);

      toast({ title: 'Success', description: 'User saved successfully.' });
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDepartmentToggle = (deptId) => {
    setFormData((prev) => ({
      ...prev,
      departments: prev.departments.includes(deptId)
        ? prev.departments.filter((id) => id !== deptId)
        : [...prev.departments, deptId],
    }));
  };

  const confirmToggleStatus = async () => {
    if (!userToToggle) return;
    try {
      const newStatus = !userToToggle.is_active;
      await supabase.from('users').update({ is_active: newStatus }).eq('id', userToToggle.id);
      toast({ title: 'Status Updated' });
      fetchUsers();
    } catch (error) {
      console.error(error);
    } finally {
      setIsStatusDialogOpen(false);
    }
  };

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Standardized Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <UsersRound className="w-6 h-6 text-primary" />
            </div>
            Users
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Manage system user accounts and roles
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Search + Add Row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users..."
              className="pl-10 w-full h-10 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleNewUser}
                className="bg-primary hover:bg-primary-dark text-white h-10 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" /> Add User
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-gray-800">
              <p className="text-xs">Create a new system user account</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Filters and Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showFilters ? 'secondary' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-10 px-4 rounded-xl transition-all border-gray-200 ${showFilters ? 'bg-primary/10 text-primary border-primary/20' : 'bg-gray-50/50'}`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="text-sm font-bold uppercase tracking-widest leading-none">
                    Filters
                  </span>
                  {hasActiveFilters && (
                    <Badge className="ml-2 bg-primary text-white scale-75">!</Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                <p className="text-xs">Show advanced filtering options</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="text-sm text-gray-500 font-bold uppercase tracking-widest">
            Total Users: <span className="text-primary">{filteredUsers.length}</span>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <Filter className="w-4 h-4 mr-2 text-primary" />
                Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest"
              >
                <X className="w-3 h-3 mr-1" /> Reset All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Role
                </Label>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {Object.entries(ROLES)
                      .filter(([key]) => key !== 'SUPER_ADMIN')
                      .map(([key, role]) => (
                        <SelectItem key={role.slug} value={role.slug}>
                          {role.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Status
                </Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Name
                </th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Employee ID
                </th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Username
                </th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Role
                </th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Status
                </th>
                <th className="text-right py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4 align-middle text-gray-600">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 align-middle text-gray-600">
                    <div className="text-xs font-mono font-semibold text-primary">
                      {u.employee_id || (
                        <span className="text-gray-300 font-normal not-italic">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 align-middle text-gray-600">
                    <div className="text-xs text-gray-500">{u.username}</div>
                  </td>

                  <td className="py-4 px-4 align-middle text-gray-600">
                    <Badge className="bg-primary text-primary-foreground uppercase text-[10px] font-bold px-2 py-0.5 shadow-sm hover:bg-primary/90">
                      {Object.values(ROLES).find((r) => r.slug === u.role)?.label ||
                        u.role ||
                        'N/A'}
                    </Badge>
                    {(() => {
                      const deptIds = Array.isArray(u.departments) ? u.departments : [];
                      const deptNames = deptIds
                        .map((id) => DEPARTMENTS.find((d) => d.id === id)?.name)
                        .filter(Boolean);
                      return deptNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {deptNames.map((name) => (
                            <Badge
                              key={name}
                              variant="secondary"
                              className="capitalize text-[10px] border border-border"
                            >
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </td>

                  <td className="py-4 px-4 align-middle text-gray-600">
                    <Badge
                      className={
                        u.is_active
                          ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                          : 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20'
                      }
                    >
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-right align-middle text-gray-600">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => handleEditUser(u)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white border-gray-800">
                          <p className="text-xs">Edit user account</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserToToggle(u);
                              setIsStatusDialogOpen(true);
                            }}
                          >
                            {u.is_active ? (
                              <UserMinus className="w-4 h-4 text-red-500" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white border-gray-800">
                          <p className="text-xs">
                            {u.is_active ? 'Deactivate user' : 'Activate user'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Username + Password */}
            <div className="grid grid-cols-2 gap-4 items-start">
              <div className="grid gap-2">
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className={
                    /[A-Z]/.test(formData.username) ? 'border-red-500 focus:ring-red-500' : ''
                  }
                />
                <p className="text-[10px] text-gray-400 font-medium italic">
                  Must be all lowercase (e.g. john.doe)
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 font-medium italic invisible">
                  placeholder
                </p>
              </div>
            </div>

            {/* Row 2: Employee ID + Full Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Employee ID</Label>
                <Input
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  placeholder="e.g. EMP-001"
                  className="font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
            </div>

            {/* Row 3: Role + Departments (side by side when technician) */}
            <div
              className={`grid gap-4 items-start ${formData.role === ROLES.TECHNICIAN.slug ? 'grid-cols-2' : 'grid-cols-1'}`}
            >
              <div className="flex flex-col gap-2">
                <Label className="pb-1">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger className="h-auto py-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLES)
                      .filter(([key]) => key !== 'SUPER_ADMIN')
                      .map(([key, role]) => (
                        <SelectItem key={role.slug} value={role.slug} className="py-2">
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="font-bold text-xs">{role.label}</span>
                            <span className="text-[10px] text-gray-500 leading-tight whitespace-normal max-w-[280px]">
                              {role.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.role === ROLES.TECHNICIAN.slug && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-primary font-bold">Departments</Label>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Select one or more
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 h-[104px] overflow-y-auto pr-1 custom-scrollbar border rounded-lg p-2">
                    {DEPARTMENTS.length > 0 ? (
                      DEPARTMENTS.map((dept) => (
                        <div
                          key={dept.id}
                          className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            id={`dept-${dept.id}`}
                            checked={formData.departments.includes(dept.id)}
                            onCheckedChange={() => handleDepartmentToggle(dept.id)}
                            className="rounded-md"
                          />
                          <Label
                            htmlFor={`dept-${dept.id}`}
                            className="text-xs font-medium cursor-pointer flex-grow"
                          >
                            {dept.name}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">No departments configured.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="submit">Save User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.is_active
                ? 'Are you sure you want to deactivate this user?'
                : 'Are you sure you want to activate this user?'}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500" onClick={confirmToggleStatus}>
              {userToToggle?.is_active ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsersManager;
