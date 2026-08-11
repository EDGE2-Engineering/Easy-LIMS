import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus, CheckCircle2, Search, Plus, X, ChevronDown, FlaskConical, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES, DEPARTMENTS } from '@/data/config';
import { Label } from '@/components/ui/label';

const DEFAULT_DEPARTMENT_TESTS = {
  'Chemical Analysis': [
    'pH Value',
    'Chloride Content',
    'Sulphate Content',
    'Organic Matter',
    'Total Dissolved Solids',
    'Acidity & Alkalinity',
    'Heavy Metal Analysis',
  ],
  'Geotech': [
    'Grain Size / Sieve Analysis',
    'Atterberg Limits (LL/PL/PI)',
    'Free Swell Index',
    'Direct Shear Test',
    'Triaxial Compression Test',
    'Standard Compaction (Proctor)',
    'California Bearing Ratio (CBR)',
    'Specific Gravity',
    'Natural Moisture Content',
  ],
  'Physical Testing': [
    'Specific Gravity',
    'Water Absorption',
    'Bulk Density',
    'Flakiness & Elongation',
    'Soundness Test',
    'Aggregate Impact Value',
  ],
  'Mechanical Testing': [
    'Compressive Strength',
    'Flexural Strength',
    'Tensile Strength',
    'Impact Value',
    'Abrasion Value',
  ],
  'Non-Destructive Testing (NDT)': [
    'Rebound Hammer Test',
    'Ultrasonic Pulse Velocity (UPV)',
    'Core Drilling & Testing',
    'Cover Meter Survey',
  ],
};

const TechnicianAssignment = ({ jobId, onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [technicians, setTechnicians] = useState([]);
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [assignedTests, setAssignedTests] = useState({}); // { [techId]: string[] }
  const [customTestInput, setCustomTestInput] = useState({}); // { [techId]: string }
  const [availableTestOptions, setAvailableTestOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active technicians and analysts
      const { data: users, error: userError } = await apiClient
        .from('users')
        .select('id, full_name, username, role, departments')
        .in('role', [ROLES.TECHNICIAN.slug, ROLES.ANALYST.slug, 'technician', 'analyst'])
        .eq('is_active', true)
        .order('full_name');

      if (userError) throw userError;
      setTechnicians(users || []);

      // 2. Fetch existing job_to_technicians assignments
      const { data: existingAssignments, error: assignError } = await apiClient
        .from('job_to_technicians')
        .select('technician_id, assigned_tests')
        .eq('job_id', jobId);

      if (assignError) throw assignError;
      if (existingAssignments && existingAssignments.length > 0) {
        const selected = [];
        const testsMap = {};
        existingAssignments.forEach((a) => {
          const tid = String(a.technician_id);
          selected.push(tid);
          if (a.assigned_tests) {
            testsMap[tid] = a.assigned_tests
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
          }
        });
        setSelectedTechs(selected);
        setAssignedTests(testsMap);
      } else {
        setSelectedTechs([]);
        setAssignedTests({});
      }

      // 3. Fetch test options from lab_tests catalog and linked quotation documents
      const catalogOptions = new Set();
      Object.values(DEFAULT_DEPARTMENT_TESTS).flat().forEach((t) => catalogOptions.add(t));

      try {
        const { data: labTests } = await apiClient.from('lab_tests').select('test_name, category_name');
        if (labTests) {
          labTests.forEach((t) => {
            if (t.test_name) catalogOptions.add(t.test_name);
          });
        }
      } catch (_) {}

      try {
        const { data: docs } = await apiClient.from('documents').select('content').eq('job_id', jobId);
        if (docs) {
          docs.forEach((doc) => {
            const items = doc.content?.items || doc.content?.tests || doc.content?.selectedTests || [];
            items.forEach((item) => {
              const name = item.test_name || item.name || item.description;
              if (name) catalogOptions.add(name);
            });
          });
        }
      } catch (_) {}

      setAvailableTestOptions(Array.from(catalogOptions));
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load technicians', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getFormattedRoleDept = (tech) => {
    const roleLabel =
      Object.values(ROLES).find((r) => r.slug === tech.role)?.label || tech.role || 'Technician';
    let deptNames = '';
    if (Array.isArray(tech.departments) && tech.departments.length > 0) {
      deptNames = tech.departments
        .map((id) => {
          const d = DEPARTMENTS.find((dept) => dept.id === id);
          return d ? d.name.replace('Soil Investigation', 'Geotech') : '';
        })
        .filter(Boolean)
        .join(', ');
    }
    if (!deptNames) {
      const nameLower = (tech.full_name || tech.username || '').toLowerCase();
      if (nameLower.includes('archana')) deptNames = 'Chemical Analysis';
      else if (nameLower.includes('keerthi')) deptNames = 'Geotech';
      else if (nameLower.includes('manjula')) deptNames = 'Physical Testing';
      else if (nameLower.includes('netra') || nameLower.includes('nethra')) deptNames = 'Mechanical';
      else if (tech.role === ROLES.ANALYST.slug) deptNames = 'Geotech';
      else deptNames = 'Testing';
    }
    return `${roleLabel} (${deptNames})`;
  };

  const toggleTechnician = (techId) => {
    setSelectedTechs((prev) => {
      if (prev.includes(techId)) {
        return prev.filter((id) => id !== techId);
      } else {
        return [...prev, techId];
      }
    });
  };

  const handleAddTestToTech = (techId, testName) => {
    if (!testName || !testName.trim()) return;
    const cleanTest = testName.trim();
    setAssignedTests((prev) => {
      const current = prev[techId] || [];
      if (current.includes(cleanTest)) return prev;
      return { ...prev, [techId]: [...current, cleanTest] };
    });
    setCustomTestInput((prev) => ({ ...prev, [techId]: '' }));
  };

  const handleRemoveTestFromTech = (techId, testName) => {
    setAssignedTests((prev) => ({
      ...prev,
      [techId]: (prev[techId] || []).filter((t) => t !== testName),
    }));
  };

  const handleAddAllDeptTests = (tech, techId) => {
    const roleDept = getFormattedRoleDept(tech);
    let testsToAdd = [];
    if (roleDept.includes('Chemical')) testsToAdd = DEFAULT_DEPARTMENT_TESTS['Chemical Analysis'];
    else if (roleDept.includes('Geotech') || roleDept.includes('Soil')) testsToAdd = DEFAULT_DEPARTMENT_TESTS['Geotech'];
    else if (roleDept.includes('Physical')) testsToAdd = DEFAULT_DEPARTMENT_TESTS['Physical Testing'];
    else if (roleDept.includes('Mechanical')) testsToAdd = DEFAULT_DEPARTMENT_TESTS['Mechanical Testing'];
    else if (roleDept.includes('NDT')) testsToAdd = DEFAULT_DEPARTMENT_TESTS['Non-Destructive Testing (NDT)'];

    if (testsToAdd.length === 0) {
      testsToAdd = DEFAULT_DEPARTMENT_TESTS['Geotech'];
    }

    setAssignedTests((prev) => {
      const current = prev[techId] || [];
      const combined = [...new Set([...current, ...testsToAdd])];
      return { ...prev, [techId]: combined };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      if (isNaN(userId) && user.username) {
        const { data: userData } = await apiClient
          .from('users')
          .select('id')
          .eq('username', user.username)
          .maybeSingle();
        if (userData) userId = userData.id;
      }
      if (isNaN(userId)) throw new Error('Unable to determine a valid numeric User ID.');

      // 1. Update job status to TECHNICIANS_ASSIGNED
      const { error: jobError } = await apiClient
        .from('jobs')
        .update({ status: 'TECHNICIANS_ASSIGNED', updated_by: userId })
        .eq('id', jobId);
      if (jobError) throw jobError;

      // 2. Delete existing technician assignments for this job
      const { error: deleteError } = await apiClient
        .from('job_to_technicians')
        .delete()
        .eq('job_id', jobId);
      if (deleteError) throw deleteError;

      // 3. Insert new technician assignments with assigned tests
      if (selectedTechs.length > 0) {
        const insertData = selectedTechs.map((techId) => ({
          job_id: jobId,
          technician_id: parseInt(techId),
          assigned_tests: (assignedTests[techId] || []).join(', '),
        }));
        const { error: insertError } = await apiClient
          .from('job_to_technicians')
          .insert(insertData);
        if (insertError) throw insertError;
      }

      const assignedUsers = technicians.filter((t) => selectedTechs.includes(String(t.id)));
      const remarksSummary = assignedUsers
        .map((u) => {
          const tests = (assignedTests[String(u.id)] || []).join(', ');
          return tests
            ? `${u.full_name || u.username} (${tests})`
            : u.full_name || u.username;
        })
        .join('; ');

      await apiClient.from('job_workflow_logs').insert({
        job_id: jobId,
        to_state: 'TECHNICIANS_ASSIGNED',
        action_id: 'ASSIGN_TECHNICIANS',
        performed_by: userId,
        remarks: assignedUsers.length > 0
          ? `Assigned Technicians: ${remarksSummary}`
          : 'Cleared technician assignments',
      });

      toast({ title: 'Success', description: 'Technicians and assigned test parameters saved successfully' });
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

  const filteredTechnicians = technicians.filter((tech) => {
    const searchStr = searchTerm.toLowerCase();
    const nameMatch = (tech.full_name || tech.username || '').toLowerCase().includes(searchStr);
    const deptMatch = getFormattedRoleDept(tech).toLowerCase().includes(searchStr);
    return nameMatch || deptMatch;
  });

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
          <h3 className="text-base font-bold text-gray-900">Assign Technician & Test Parameters</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select technicians and assign specific test parameters / departments to each technician.
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
              placeholder="Search by name or department (e.g. Geotech, Chemical)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-primary focus:border-primary focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold text-gray-600">
            Available Technicians ({selectedTechs.length} selected)
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
            {filteredTechnicians.map((tech) => {
              const techId = String(tech.id);
              const isSelected = selectedTechs.includes(techId);
              const formattedRoleDept = getFormattedRoleDept(tech);
              const techTests = assignedTests[techId] || [];

              return (
                <div
                  key={tech.id}
                  className={`flex flex-col p-4 rounded-xl border text-left transition-all space-y-3 ${
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50/80'
                  }`}
                >
                  <div
                    onClick={() => toggleTechnician(techId)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-gray-900">
                        {tech.full_name || tech.username}
                      </span>
                      <span className="text-xs font-medium text-gray-500 mt-0.5">
                        {formattedRoleDept}
                      </span>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary border-primary text-white'
                          : 'border-gray-300 text-transparent hover:border-primary/50'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Test Parameter Selection Dropdown & Controls */}
                  {isSelected && (
                    <div className="pt-2 border-t border-primary/20 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                          <FlaskConical className="w-3.5 h-3.5" /> Assigned Test Parameters
                        </Label>
                        <button
                          type="button"
                          onClick={() => handleAddAllDeptTests(tech, techId)}
                          className="text-[10px] text-primary hover:underline font-semibold bg-primary/10 px-2 py-0.5 rounded-full"
                        >
                          + Add Dept Defaults
                        </button>
                      </div>

                      {/* Dropdown Selector */}
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <select
                            onChange={(e) => {
                              handleAddTestToTech(techId, e.target.value);
                              e.target.value = '';
                            }}
                            defaultValue=""
                            className="w-full h-8 text-xs bg-white border border-gray-200 rounded-lg pl-2 pr-7 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                          >
                            <option value="" disabled>
                              Select required test parameter...
                            </option>
                            {availableTestOptions.map((tName, i) => (
                              <option key={i} value={tName}>
                                {tName}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Custom test input */}
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Or type custom test parameter..."
                          value={customTestInput[techId] || ''}
                          onChange={(e) => setCustomTestInput({ ...customTestInput, [techId]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTestToTech(techId, customTestInput[techId]);
                            }
                          }}
                          className="flex-1 h-7 text-xs bg-white border border-gray-200 rounded-lg px-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddTestToTech(techId, customTestInput[techId])}
                          className="h-7 text-xs px-2.5 bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>

                      {/* Active Test Badges */}
                      <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto">
                        {techTests.map((tName, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md"
                          >
                            {tName}
                            <button
                              type="button"
                              onClick={() => handleRemoveTestFromTech(techId, tName)}
                              className="text-emerald-500 hover:text-emerald-800 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {techTests.length === 0 && (
                          <span className="text-[11px] italic text-gray-400 py-0.5">
                            No specific tests assigned yet. Pick from dropdown above.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
          Assign Technicians & Tests
        </Button>
      </div>
    </div>
  );
};

export default TechnicianAssignment;
