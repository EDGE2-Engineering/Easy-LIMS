import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus, CheckCircle2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/data/config';
import { Checkbox } from '@/components/ui/checkbox';

const TechnicianAssignment = ({ jobId, onComplete }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [technicians, setTechnicians] = useState([]);
    const [selectedTechs, setSelectedTechs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch lab technicians and analysts
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, full_name, username, role')
                .in('role', [ROLES.TECHNICIAN.slug, ROLES.ANALYST.slug])
                .order('full_name');

            if (userError) throw userError;
            setTechnicians(users || []);

            // Fetch existing assignments from mapping table
            const { data: existingAssignments, error: assignError } = await supabase
                .from('job_to_technicians')
                .select('technician_id')
                .eq('job_id', jobId);
                
            if (assignError) throw assignError;
            if (existingAssignments) {
                setSelectedTechs(existingAssignments.map(a => a.technician_id));
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to load technicians", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (techId) => {
        setSelectedTechs(prev => 
            prev.includes(techId) ? prev.filter(id => id !== techId) : [...prev, techId]
        );
    };

    const handleSave = async () => {
        if (selectedTechs.length === 0) {
            toast({ title: "Warning", description: "No technicians selected. You can proceed, but the job will remain unassigned.", variant: "default" });
            // Allow them to save empty if they want to unassign everyone
        }

        setSaving(true);
        try {
            let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
            if (isNaN(userId) && user.username) {
                const { data: userData } = await supabase.from('users').select('id').eq('username', user.username).maybeSingle();
                if (userData) userId = userData.id;
            }
            if (isNaN(userId)) {
                throw new Error("Unable to determine a valid numeric User ID.");
            }

            // Update job status
            const { error: jobError } = await supabase
                .from('jobs')
                .update({
                    status: 'TECHNICIANS_ASSIGNED',
                    updated_by: userId
                })
                .eq('id', jobId);
                
            if (jobError) throw jobError;

            // Update mapping table
            // 1. Delete existing for this job
            const { error: deleteError } = await supabase
                .from('job_to_technicians')
                .delete()
                .eq('job_id', jobId);
            if (deleteError) throw deleteError;

            // 2. Insert new selections
            if (selectedTechs.length > 0) {
                const newAssignments = selectedTechs.map(techId => ({
                    job_id: jobId,
                    technician_id: techId
                }));
                const { error: insertError } = await supabase
                    .from('job_to_technicians')
                    .insert(newAssignments);
                if (insertError) throw insertError;
            }
                
            if (jobError) throw jobError;

            const selectedNames = technicians.filter(t => selectedTechs.includes(t.id)).map(t => t.full_name || t.username).join(', ');

            await supabase.from('job_workflow_logs').insert({
                job_id: jobId,
                to_state: 'TECHNICIANS_ASSIGNED',
                action_id: 'ASSIGN_TECHNICIANS',
                performed_by: userId,
                remarks: selectedTechs.length > 0 ? `Assigned Technicians: ${selectedNames}` : 'Cleared technician assignments'
            });

            toast({ title: "Success", description: "Technicians assigned successfully" });
            if (onComplete) onComplete();
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to save assignments: " + err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin w-6 h-6 text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 border-b pb-4">
                <UserPlus className="w-5 h-5 text-primary" />
                <div>
                    <h3 className="text-lg font-bold">Assign Technicians</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Select one or more technicians to assign to this job.
                    </p>
                </div>
            </div>

            <div className="grid gap-3 max-h-[300px] overflow-y-auto px-1">
                {technicians.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400 gap-3">
                        <Users className="w-8 h-8 opacity-30" />
                        <p className="text-sm">No technicians found in the system.</p>
                    </div>
                ) : (
                    technicians.map(tech => {
                        const isSelected = selectedTechs.includes(tech.id);
                        return (
                            <label key={tech.id} className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-primary/30' : 'bg-gray-50/50 hover:bg-gray-100/50'}`}>
                                <div className="flex items-center gap-3">
                                    <Checkbox 
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggle(tech.id)}
                                        className={isSelected ? 'border-primary' : ''}
                                    />
                                    <span className={`font-medium ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                                        {tech.full_name || tech.username}
                                        <span className="text-xs font-normal text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded">
                                            {Object.values(ROLES).find(r => r.slug === tech.role)?.label || tech.role}
                                        </span>
                                    </span>
                                </div>
                            </label>
                        );
                    })
                )}
            </div>

            <div className="flex justify-end pt-2">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary hover:bg-primary-dark text-white px-6"
                >
                    {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Confirm Assignments
                </Button>
            </div>
        </div>
    );
};

export default TechnicianAssignment;
