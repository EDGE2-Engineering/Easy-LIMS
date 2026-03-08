import React, { useState, useEffect } from 'react';
import { 
    User, Search, Loader2, Calendar, ShieldCheck, 
    Building2, CheckCircle2, XCircle, MoreVertical, Edit2
} from 'lucide-react';
import { 
    Table, TableBody, TableCell, TableHead, 
    TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Dialog, DialogContent, DialogHeader, 
    DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
    Select, SelectContent, SelectItem, 
    SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { DB_TYPES, DEPARTMENTS } from '@/config';
import { format } from 'date-fns';

const AdminUsersManager = () => {
    const { idToken, user: currentUser, isSuperAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [newDepartment, setNewDepartment] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const fetchUsers = async () => {
        if (!idToken) return;
        setLoading(true);
        try {
            const data = await dynamoGenericApi.listByType(DB_TYPES.USER, idToken);
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [idToken]);

    const handleEditClick = (user) => {
        setEditingUser(user);
        setNewDepartment(user.department || '');
    };

    const handleSaveEdit = async () => {
        if (!editingUser || !idToken) return;
        setIsSaving(true);
        try {
            const updatedUser = {
                ...editingUser,
                department: newDepartment,
                updated_at: new Date().toISOString()
            };
            await dynamoGenericApi.save(DB_TYPES.USER, updatedUser, idToken);
            toast({
                title: "Success",
                description: `User ${editingUser.full_name}'s department updated.`,
            });
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            toast({
                title: "Error",
                description: "Failed to update user department.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredUsers = users.filter(user => {
        // Hide superadmins from non-superadmin users
        const isUserSuperAdmin = user.role === 'superadmin' || user.role === 'super_admin';
        if (isUserSuperAdmin && !isSuperAdmin()) {
            return false;
        }

        const matchesSearch = (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.department?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
        return matchesSearch;
    }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-md font-bold text-gray-900 flex items-center gap-3">
                        <User className="w-8 h-8 text-primary" /> Users
                    </h1>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9 border-gray-100 bg-gray-50/50 focus:bg-white transition-all rounded-lg text-sm"
                    />
                </div>
            </div>

            <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent border-gray-100">
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Name</TableHead>
                            {/* <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Username/Email</TableHead> */}
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Department</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Role</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Status</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14 text-right">Actions</TableHead>
                            {/* <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 h-14">Joined Date</TableHead> */}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        <p className="text-sm text-gray-500">Loading users...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <Search className="w-12 h-12" />
                                        <p className="font-medium text-gray-900">No users found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id} className="hover:bg-gray-50/50 border-gray-100 transition-colors">
                                    <TableCell className="font-medium text-gray-900">
                                        <div className="flex flex-col">
                                            <span title={user.id}>{user.full_name}</span>
                                            {/* <span className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]" title={user.id}>{user.id}</span> */}
                                        </div>
                                    </TableCell>
                                    {/* <TableCell className="text-gray-600 text-sm">
                                        {user.username || user.email}
                                    </TableCell> */}
                                    <TableCell className="text-gray-600 text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                            {user.department || 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="text-sm capitalize">{user.role || 'standard'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.is_active !== false ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100">Active</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100">Inactive</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={user.id === currentUser?.id}
                                            onClick={() => handleEditClick(user)}
                                            className="h-8 w-8 hover:text-primary transition-colors"
                                            title={user.id === currentUser?.id ? "You cannot edit yourself" : "Edit user"}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                    {/* <TableCell className="text-gray-500 text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy') : 'N/A'}
                                        </div>
                                    </TableCell> */}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit User Department</DialogTitle>
                        <DialogDescription>
                            Update the department for <span className="font-semibold text-gray-900">{editingUser?.full_name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Department</label>
                            <Select value={newDepartment} onValueChange={setNewDepartment}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(DEPARTMENTS).map((dept) => (
                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminUsersManager;
