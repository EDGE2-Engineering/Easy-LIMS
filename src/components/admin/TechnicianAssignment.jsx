import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/data/config';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TechnicianAssignment = ({ jobId, onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, full_name, username, role')
        .in('role', [ROLES.TECHNICIAN.slug, ROLES.ANALYST.slug])
        .eq('is_active', true)
        .order('full_name');

      if (userError) throw userError;
      setTechnicians(users || []);

      const { data: existingAssignments, error: assignError } = await supabase
        .from('job_to_technicians')
        .select('technician_id')
        .eq('job_id', jobId);

      if (assignError) throw assignError;
      if (existingAssignments && existingAssignments.length > 0) {
        setSelectedTech(String(existingAssignments[0].technician_id));
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load technicians', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      if (isNaN(userId) && user.username) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('username', user.username)
          .maybeSingle();
        if (userData) userId = userData.id;
      }
      if (isNaN(userId)) throw new Error('Unable to determine a valid numeric User ID.');

      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'TECHNICIANS_ASSIGNED', updated_by: userId })
        .eq('id', jobId);
      if (jobError) throw jobError;

      const { error: deleteError } = await supabase
        .from('job_to_technicians')
        .delete()
        .eq('job_id', jobId);
      if (deleteError) throw deleteError;

      if (selectedTech) {
        const { error: insertError } = await supabase
          .from('job_to_technicians')
          .insert([{ job_id: jobId, technician_id: parseInt(selectedTech) }]);
        if (insertError) throw insertError;
      }

      const assignedUser = technicians.find((t) => String(t.id) === selectedTech);
      await supabase.from('job_workflow_logs').insert({
        job_id: jobId,
        to_state: 'TECHNICIANS_ASSIGNED',
        action_id: 'ASSIGN_TECHNICIANS',
        performed_by: userId,
        remarks: assignedUser
          ? `Assigned Technician: ${assignedUser.full_name || assignedUser.username}`
          : 'Cleared technician assignment',
      });

      toast({ title: 'Success', description: 'Technician assigned successfully' });
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to save assignment: ' + err.message,
        variant: 'destructive',
      });
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
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a technician to assign to this job.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-gray-600">Technician</Label>
        <Select value={selectedTech} onValueChange={setSelectedTech}>
          <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-gray-200 rounded-xl">
            <SelectValue placeholder="Select a technician..." />
          </SelectTrigger>
          <SelectContent>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={String(tech.id)}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tech.full_name || tech.username}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    {Object.values(ROLES).find((r) => r.slug === tech.role)?.label || tech.role}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || !selectedTech}
          className="bg-primary hover:bg-primary-dark text-white px-6"
        >
          {saving ? (
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Assign
        </Button>
      </div>
    </div>
  );
};

export default TechnicianAssignment;
