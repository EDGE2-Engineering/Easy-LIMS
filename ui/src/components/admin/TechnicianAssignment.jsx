import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
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
      const users = await apiClient.get('/api/users', {
        params: { in_role: `${ROLES.TECHNICIAN.slug},${ROLES.ANALYST.slug}`, eq_is_active: true },
      });
      // Sort users locally if API doesn't support order_by
      users.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      setTechnicians(users || []);

      const existingAssignments = await apiClient.get('/api/job_to_technicians', {
        params: { eq_job_id: jobId },
      });
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
        const usersData = await apiClient.get('/api/users', {
          params: { eq_username: user.username },
        });
        if (usersData && usersData.length > 0) userId = usersData[0].id;
      }
      if (isNaN(userId)) throw new Error('Unable to determine a valid numeric User ID.');

      await apiClient.put(`/api/jobs/${jobId}`, {
        status: 'TECHNICIANS_ASSIGNED',
        updated_by: userId,
      });

      const allAssignments = await apiClient.get('/api/job_to_technicians', {
        params: { eq_job_id: jobId },
      });
      for (const assign of allAssignments) {
        await apiClient.delete(`/api/job_to_technicians/${assign.id}`).catch(() => {});
      }

      if (selectedTech) {
        await apiClient.post('/api/job_to_technicians', {
          job_id: jobId,
          technician_id: parseInt(selectedTech),
        });
      }

      const assignedUser = technicians.find((t) => String(t.id) === selectedTech);
      await apiClient.post('/api/job_workflow_logs', {
        job_id: jobId,
        from_state: 'TECHNICIANS_ASSIGNED', // Or whatever previous state was
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
