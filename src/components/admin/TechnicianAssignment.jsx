import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus, CheckCircle2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES, DEPARTMENTS } from '@/data/config';
import { Label } from '@/components/ui/label';

const TechnicianAssignment = ({ jobId, onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [technicians, setTechnicians] = useState([]);
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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
        .select('id, full_name, username, role, departments')
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
        setSelectedTechs(existingAssignments.map((a) => String(a.technician_id)));
      } else {
        setSelectedTechs([]);
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

      // Update job status to TECHNICIANS_ASSIGNED
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'TECHNICIANS_ASSIGNED', updated_by: userId })
        .eq('id', jobId);
      if (jobError) throw jobError;

      // Delete existing technician assignments for this job
      const { error: deleteError } = await supabase
        .from('job_to_technicians')
        .delete()
        .eq('job_id', jobId);
      if (deleteError) throw deleteError;

      // Insert new technician assignments
      if (selectedTechs.length > 0) {
        const insertData = selectedTechs.map((techId) => ({
          job_id: jobId,
          technician_id: parseInt(techId),
        }));
        const { error: insertError } = await supabase
          .from('job_to_technicians')
          .insert(insertData);
        if (insertError) throw insertError;
      }

      const assignedUsers = technicians.filter((t) => selectedTechs.includes(String(t.id)));
      await supabase.from('job_workflow_logs').insert({
        job_id: jobId,
        to_state: 'TECHNICIANS_ASSIGNED',
        action_id: 'ASSIGN_TECHNICIANS',
        performed_by: userId,
        remarks: assignedUsers.length > 0
          ? `Assigned Technicians: ${assignedUsers.map((u) => u.full_name || u.username).join(', ')}`
          : 'Cleared technician assignments',
      });

      toast({ title: 'Success', description: 'Technicians assigned successfully' });
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to save assignments: ' + err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleTechnician = (techId) => {
    setSelectedTechs((prev) =>
      prev.includes(techId)
        ? prev.filter((id) => id !== techId)
        : [...prev, techId]
    );
  };

  const filteredTechnicians = technicians.filter((tech) =>
    (tech.full_name || tech.username || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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
            Select one or more technicians to assign to this job.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-600">Search Technicians</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-primary focus:border-primary focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-600">
            Available Technicians ({selectedTechs.length} selected)
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
            {filteredTechnicians.map((tech) => {
              const isSelected = selectedTechs.includes(String(tech.id));
              const roleLabel =
                Object.values(ROLES).find((r) => r.slug === tech.role)?.label || tech.role;
              const deptNames = Array.isArray(tech.departments)
                ? tech.departments
                    .map((id) => DEPARTMENTS.find((d) => d.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')
                : '';
              const finalRoleLabel = tech.role === ROLES.TECHNICIAN.slug && deptNames
                ? `${roleLabel} (${deptNames})`
                : roleLabel;
              return (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => toggleTechnician(String(tech.id))}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-primary/5 border-primary text-primary shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">
                      {tech.full_name || tech.username}
                    </span>
                    <span className="text-xs text-gray-400 mt-0.5">{finalRoleLabel}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
            {filteredTechnicians.length === 0 && (
              <div className="col-span-full text-center py-8 text-sm text-gray-400">
                No technicians found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button
          onClick={handleSave}
          disabled={saving || selectedTechs.length === 0}
          className="bg-primary hover:bg-primary-dark text-white px-6"
        >
          {saving ? (
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Assign Technicians
        </Button>
      </div>
    </div>
  );
};

export default TechnicianAssignment;
