import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { VIEWS } from '@/data/config';

const RoleManager = () => {
    const { refreshRoles } = useAuth();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        role_slug: '',
        view_permissions: []
    });
    const { toast } = useToast();

    const availableViews = Object.values(VIEWS);

    useEffect(() => {
        fetchRoles();
    }, []);


    const fetchRoles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('app_roles').select('*').order('name');
            if (error) throw error;
            setRoles(data || []);
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally { setLoading(false); }
    };

    const handleNewRole = () => {
        setEditingRole(null);
        setFormData({ id: '', name: '', role_slug: '', view_permissions: [] });
        setIsDialogOpen(true);
    };

    const handleEditRole = (role) => {
        setEditingRole(role);
        setFormData({
            id: role.id,
            name: role.name,
            role_slug: role.role_slug || '',
            view_permissions: role.view_permissions || []
        });
        setIsDialogOpen(true);
    };

    const handleDeleteRole = async (id) => {
        if (!confirm('Are you sure you want to delete this role? This might affect users assigned to this role.')) return;
        try {
            const { error } = await supabase.from('app_roles').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Success', description: 'Role deleted successfully.' });
            fetchRoles();
            refreshRoles();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const roleData = {
                name: formData.name,
                role_slug: formData.role_slug.toLowerCase().replace(/\s+/g, '_') || formData.name.toLowerCase().replace(/\s+/g, '_'),
                view_permissions: formData.view_permissions,
                updated_at: new Date().toISOString()
            };

            if (editingRole) {
                const { error } = await supabase.from('app_roles').update(roleData).eq('id', editingRole.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('app_roles').insert([roleData]);
                if (error) throw error;
            }

            toast({ title: 'Success', description: 'Role saved successfully.' });
            setIsDialogOpen(false);
            fetchRoles();
            refreshRoles();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handlePermissionToggle = (view) => {
        setFormData(prev => ({
            ...prev,
            view_permissions: prev.view_permissions.includes(view)
                ? prev.view_permissions.filter(v => v !== view)
                : [...prev.view_permissions, view]
        }));
    };

    const filteredRoles = roles.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.role_slug && r.role_slug.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Search roles..."
                        className="pl-10 w-full h-10 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    onClick={handleNewRole}
                    className="bg-primary hover:bg-primary-dark text-white h-10 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Role
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b font-semibold">
                        <tr>
                            <th className="text-left p-4">Role Name</th>
                            <th className="text-left p-4">Permissions</th>
                            <th className="text-right p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRoles.map(r => (
                            <tr key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-medium text-gray-900">{r.name}</td>
                                <td className="p-4">
                                    <div className="flex flex-wrap gap-1">
                                        {(r.view_permissions || []).map(v => (
                                            <Badge key={v} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{v}</Badge>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditRole(r)} className="hover:text-primary">
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(r.id)} className="hover:text-red-600">
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            {editingRole ? 'Edit Role' : 'Create New Role'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="grid gap-2">
                            <Label htmlFor="role-name">Display Name</Label>
                            <Input
                                id="role-name"
                                placeholder="e.g. Lab Technician"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role-slug">Role Slug (Optional)</Label>
                            <Input
                                id="role-slug"
                                placeholder="e.g. lab_technician"
                                value={formData.role_slug}
                                onChange={e => setFormData({ ...formData, role_slug: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <Label className="text-primary font-bold">View Permissions</Label>
                            <div className="grid grid-cols-1 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100 max-h-48 overflow-y-auto">
                                {availableViews.map(view => (
                                    <div key={view} className="flex items-center space-x-3 p-1">
                                        <Checkbox
                                            id={`perm-${view}`}
                                            checked={formData.view_permissions.includes(view)}
                                            onCheckedChange={() => handlePermissionToggle(view)}
                                        />
                                        <Label htmlFor={`perm-${view}`} className="text-sm cursor-pointer font-medium">{view}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-4 border-t">
                            <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Role Configuration</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RoleManager;
