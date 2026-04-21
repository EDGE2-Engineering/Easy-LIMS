
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TechnicianAssignment = ({ jobId, jobCategories, onComplete }) => {
    let parsedCategories = jobCategories || [];
    if (typeof parsedCategories === 'string') {
        try { parsedCategories = JSON.parse(parsedCategories); } catch (e) { parsedCategories = []; }
    }
    const categoriesList = Array.isArray(parsedCategories) ? parsedCategories : [];
    const [technicians, setTechnicians] = useState([]);
    const [assignments, setAssignments] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch users with role 'technician'
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'technician');
            
            if (userError) throw userError;
            setTechnicians(users || []);

            // Fetch current assignments if any
            const { data: existing, error: existingError } = await supabase
                .from('job_tests')
                .select('*')
                .eq('job_id', jobId);
                
            if (existingError) throw existingError;
            
            const initialAssignments = {};
            (existing || []).forEach(t => {
                initialAssignments[t.category] = t.assigned_technician_id;
            });
            setAssignments(initialAssignments);
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = (category, techId) => {
        setAssignments(prev => ({ ...prev, [category]: techId }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // For each category, create/update a record in job_tests
            const updates = Object.entries(assignments).map(([category, techId]) => ({
                job_id: jobId,
                category,
                assigned_technician_id: techId,
                status: 'PENDING',
                updated_at: new Date().toISOString()
            }));
            
            const { error } = await supabase
                .from('job_tests')
                .upsert(updates, { onConflict: 'job_id,category' });
            
            if (error) throw error;

            // Move job to next stage & Log it
            const { error: jobError } = await supabase
                .from('jobs')
                .update({ status: 'TECHNICIANS_ASSIGNED' })
                .eq('id', jobId);
            if (jobError) throw jobError;

            await supabase.from('job_workflow_logs').insert({
                job_id: jobId,
                to_state: 'TECHNICIANS_ASSIGNED',
                action_id: 'ASSIGN_TECHNICIANS',
                performed_by: (await supabase.auth.getUser()).data.user?.id,
                remarks: `Technicians assigned: ${Object.keys(assignments).join(', ')}`
            });
            
            toast({ title: "Success", description: "Technicians assigned successfully" });
            if (onComplete) onComplete();
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to save assignments", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Assign Technicians to Testing Streams
            </h3>
            
            <div className="grid gap-4">
                {categoriesList.map(category => (
                    <div key={category} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
                        <div className="space-y-1">
                            <Badge variant="outline" className="font-bold text-primary">{category}</Badge>
                            <p className="text-xs text-muted-foreground">Select a technician for this workstream</p>
                        </div>
                        <select 
                            className="bg-white border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary w-64"
                            value={assignments[category] || ''}
                            onChange={(e) => handleAssign(category, e.target.value)}
                        >
                            <option value="">-- Unassigned --</option>
                            {technicians.map(tech => (
                                <option key={tech.id} value={tech.id}>{tech.full_name || tech.username}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            <Button 
                onClick={handleSave} 
                disabled={saving || Object.keys(assignments).length < categoriesList.length}
                className="w-full mt-4"
            >
                {saving ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Confirm Assignments & Move to Testing
            </Button>
        </div>
    );
};

export default TechnicianAssignment;
