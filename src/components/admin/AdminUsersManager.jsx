import React, { useState, useEffect } from 'react';
import { ROLES, APP_CONFIG, JOB_CATEGORIES } from '@/data/config';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, UserMinus, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminUsersManager = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
    const [userToToggle, setUserToToggle] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        department: '',
        role: ROLES.TECHNICIAN,
        capabilities: []
    });
    const { toast } = useToast();

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase.from('departments').select('name').order('name');
            if (error) throw error;
            setDepartments(data || []);
        } catch (error) { console.error(error); }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('users').select('*, technician_capabilities(category)').order('username');
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally { setLoading(false); }
    };

    const handleNewUser = () => {
        setEditingUser(null);
        setFormData({ username: '', password: '', full_name: '', department: '', role: ROLES.TECHNICIAN, capabilities: [] });
        setIsDialogOpen(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: user.password,
            full_name: user.full_name || '',
            department: user.department || '',
            role: user.role,
            capabilities: (user.technician_capabilities || []).map(c => c.category)
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userData = {
                username: formData.username,
                password: formData.password,
                full_name: formData.full_name,
                department: formData.department,
                role: formData.role,
                updated_at: new Date().toISOString()
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

            // Sync Capabilities
            if (formData.role === ROLES.TECHNICIAN) {
                await supabase.from('technician_capabilities').delete().eq('user_id', userId);
                if (formData.capabilities.length > 0) {
                    const caps = formData.capabilities.map(cat => ({ user_id: userId, category: cat }));
                    await supabase.from('technician_capabilities').insert(caps);
                }
            }

            toast({ title: 'Success', description: 'User saved successfully.' });
            setIsDialogOpen(false);
            fetchUsers();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleCapabilityToggle = (cat) => {
        setFormData(prev => ({
            ...prev,
            capabilities: prev.capabilities.includes(cat) 
                ? prev.capabilities.filter(c => c !== cat) 
                : [...prev.capabilities, cat]
        }));
    };

    const confirmToggleStatus = async () => {
        if (!userToToggle) return;
        try {
            const newStatus = !userToToggle.is_active;
            await supabase.from('users').update({ is_active: newStatus }).eq('id', userToToggle.id);
            toast({ title: 'Status Updated' });
            fetchUsers();
        } catch (error) { console.error(error); }
        finally { setIsStatusDialogOpen(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">User Management</h2>
                <Button onClick={handleNewUser}><Plus className="w-4 h-4 mr-2" /> Add User</Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b font-semibold">
                        <tr>
                            <th className="text-left p-4">Name</th>
                            <th className="text-left p-4">Username</th>
                            <th className="text-left p-4">Department</th>
                            <th className="text-left p-4">Role</th>
                            <th className="text-left p-4">Status</th>
                            <th className="text-right p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-medium">{u.full_name}</td>
                                <td className="p-4">
                                    <div className="text-xs text-gray-500">{u.username}</div>
                                    {/* <div className="text-[10px] text-gray-400 font-mono">{u.department}</div> */}
                                </td>

                                <td className="p-4">
                                    {u.department}
                                </td>
                                <td className="p-4">
                                    <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                                    {u.role === ROLES.TECHNICIAN && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(u.technician_capabilities || []).map(c => (
                                                <Badge key={c.category} variant="outline" className="text-[9px] px-1 py-0">{c.category}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4">
                                    <Badge className={u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                        {u.is_active ? 'Active' : 'Deactivated'}
                                    </Badge>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditUser(u)}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setUserToToggle(u); setIsStatusDialogOpen(true); }}>
                                        {u.is_active ? <UserMinus className="w-4 h-4 text-red-500" /> : <UserCheck className="w-4 h-4 text-green-500" />}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Username</Label>
                            <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                        </div>
                        <div className="grid gap-2">
                            <Label>Password</Label>
                            <Input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                        </div>
                        <div className="grid gap-2">
                            <Label>Full Name</Label>
                            <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Role</Label>
                            <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {APP_CONFIG.roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {formData.role === ROLES.TECHNICIAN && (
                            <div className="space-y-2 border-t pt-2">
                                <Label className="text-primary font-bold">Technician Departments</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    {Object.values(JOB_CATEGORIES).map(cat => (
                                        <div key={cat} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`cap-${cat}`} 
                                                checked={formData.capabilities.includes(cat)}
                                                onCheckedChange={() => handleCapabilityToggle(cat)}
                                            />
                                            <Label htmlFor={`cap-${cat}`} className="text-xs">{cat}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <DialogFooter><Button type="submit">Save User</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirm Status Change</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmToggleStatus}>Change Status</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AdminUsersManager;
