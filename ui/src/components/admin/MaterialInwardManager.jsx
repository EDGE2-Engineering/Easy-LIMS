import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  Edit,
  ExternalLink,
  FileText,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Calendar,
  Package,
  Plus,
  X,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiClient } from '@/lib/apiClient';
import { logAudit } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { sendTelegramNotification } from '@/lib/notifier';
import { format } from 'date-fns';
import { safeFormatDate } from '@/lib/utils';
import { WORKFLOW_STATES, ROLES } from '@/data/config';
import { useMaterials } from '@/contexts/MaterialsContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const MaterialInwardManager = ({ initialJobId, initialJob, onClose, onSuccess }) => {
  const [records, setRecords] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    recordId: null,
    jobOrderNo: '',
  });
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [appUsers, setAppUsers] = useState([]);
  const [collectionCenters, setCollectionCenters] = useState([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isStandard } = useAuth();
  const { materials } = useMaterials();

  // Management State (Consistent with AdminServicesManager)
  const [editingRecord, setEditingRecord] = useState(() => {
    if (initialJobId) {
      return {
        job_order_no: '',
        po_wo_number: initialJob?.work_order_id || '',
        client_id: initialJob?.client_id ? String(initialJob.client_id) : '',
        job_id: initialJobId,
        samples: [
          {
            sample_code: '',
            material_type: '',
            sample_description: '',
            quantity: '',
            received_date: format(new Date(), 'yyyy-MM-dd'),
            received_time: format(new Date(), 'HH:mm'),
            received_by: user?.id || '',
            collection_center_id: '',
            expected_test_days: 7,
          },
        ],
      };
    }
    return null;
  });
  const [isAddingNew, setIsAddingNew] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inwardOption, setInwardOption] = useState('add_samples');
  const [showNoSamplesConfirm, setShowNoSamplesConfirm] = useState(false);

  const fetchClients = async () => {
    try {
      const { data, error } = await apiClient
        .from('clients')
        .select('id, client_name')
        .order('client_name');
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await apiClient
        .from('users')
        .select('id, full_name')
        .eq('is_active', true)
        .eq('role', ROLES.MRO.slug)
        .order('full_name');
      if (error) throw error;
      setAppUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCollectionCenters = async () => {
    try {
      const { data, error } = await apiClient
        .from('collection_centers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setCollectionCenters(data || []);
    } catch (error) {
      console.error('Error fetching collection centers:', error);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = apiClient.from('material_inward_register').select(`
          *,
          clients(client_name),
          users!material_inward_register_created_by_fkey(full_name),
          material_samples(received_date)
        `);

      if (isStandard()) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching material inward records:', error);
      toast({
        title: 'Error',
        description: 'Failed to load material inward records. ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialJobId) {
      fetchRecords();
    }
    fetchClients();
    fetchUsers();
    fetchCollectionCenters();
  }, [initialJobId]);

  useEffect(() => {
    if (initialJobId) {
      let isMounted = true;
      const checkExistingOrAddNew = async (jobId) => {
        setLoading(true);
        try {
          // 1. Check if inward record already exists for this job_id
          const { data: existingRecords, error: fetchError } = await apiClient
            .from('material_inward_register')
            .select('*')
            .eq('job_id', jobId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!isMounted) return;

          const existing =
            existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

          if (!fetchError && existing) {
            // Fetch samples for existing record
            const { data: samples, error: samplesError } = await apiClient
              .from('material_samples')
              .select('*')
              .eq('inward_id', existing.id);

            if (samplesError) throw samplesError;
            if (!isMounted) return;

            setEditingRecord({
              ...existing,
              client_id: existing.client_id ? String(existing.client_id) : '',
              samples:
                samples?.map((s) => ({
                  ...s,
                  material_type: s.material_type || '',
                  sample_description: s.sample_description || '',
                  received_date: safeFormatDate(s.received_date, 'yyyy-MM-dd', format(new Date(), 'yyyy-MM-dd')),
                  received_by: s.received_by || user?.id,
                })) || [],
            });
            setIsAddingNew(false);
            return;
          }

          // 2. If not, create a new one based on job details
          let job = initialJob;
          if (!job || !job.client_id) {
            const { data: rawJob, error } = await apiClient
              .from('jobs')
              .select('*')
              .eq('id', jobId)
              .single();
            if (error) throw error;
            job = rawJob;
          }

          if (job && job.client_id && !job.clients) {
            const { data: cData } = await apiClient.from('clients').select('*').eq('id', job.client_id).maybeSingle();
            if (cData) job = { ...job, clients: cData };
          }

          if (!isMounted) return;

          setEditingRecord({
            job_order_no: '',
            po_wo_number: job?.work_order_id || '',
            client_id: job?.client_id ? String(job.client_id) : '',
            job_id: job?.id || jobId,
            samples: [
              {
                sample_code: '',
                material_type: '',
                sample_description: '',
                quantity: '',
                received_date: format(new Date(), 'yyyy-MM-dd'),
                received_time: format(new Date(), 'HH:mm'),
                received_by: user?.id || '',
                collection_center_id: '',
                expected_test_days: 7,
              },
            ],
          });
          setIsAddingNew(true);
        } catch (error) {
          console.error('Error in inward check:', error);
          if (isMounted) {
            toast({
              title: 'Error',
              description: 'Failed to load/check inward details.',
              variant: 'destructive',
            });
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };
      checkExistingOrAddNew(initialJobId);

      return () => {
        isMounted = false;
      };
    }
  }, [initialJobId]);

  useEffect(() => {
    if (editingRecord) {
      if (editingRecord.samples && editingRecord.samples.length > 0) {
        setInwardOption('add_samples');
      } else {
        setInwardOption('no_samples');
      }
    }
  }, [editingRecord?.id]);

  const handleAddNew = () => {
    setEditingRecord({
      job_order_no: '',
      po_wo_number: '',
      client_id: '',
      samples: [
        {
          sample_code: '',
          material_type: '',
          sample_description: '',
          quantity: '',
          received_date: format(new Date(), 'yyyy-MM-dd'),
          received_time: format(new Date(), 'HH:mm'),
          received_by: user.id,
          collection_center_id: '',
          expected_test_days: 7,
        },
      ],
    });
    setIsAddingNew(true);
  };

  const handleEdit = async (record) => {
    setLoading(true);
    try {
      const { data: samples, error } = await apiClient
        .from('material_samples')
        .select('*')
        .eq('inward_id', record.id);

      if (error) throw error;

      setEditingRecord({
        ...record,
        samples:
          samples.map((s) => ({
            ...s,
            material_type: s.material_type || '',
            sample_description: s.sample_description || '',
            received_date: safeFormatDate(s.received_date, 'yyyy-MM-dd', format(new Date(), 'yyyy-MM-dd')),
            received_by: s.received_by || user.id,
          })) || [],
      });
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error fetching samples:', error);
      toast({
        title: 'Error',
        description: 'Failed to load samples for editing.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSample = () => {
    setEditingRecord((prev) => ({
      ...prev,
      samples: [
        ...prev.samples,
        {
          sample_code: '',
          material_type: '',
          sample_description: '',
          quantity: '',
          received_date: format(new Date(), 'yyyy-MM-dd'),
          received_time: format(new Date(), 'HH:mm'),
          received_by: user.id,
          collection_center_id: '',
          expected_test_days: 7,
        },
      ],
    }));
  };

  const handleRemoveSample = (index) => {
    const updatedSamples = editingRecord.samples.filter((_, i) => i !== index);
    setEditingRecord((prev) => ({ ...prev, samples: updatedSamples }));
  };

  const handleSampleChange = (index, field, value) => {
    const updatedSamples = [...editingRecord.samples];
    updatedSamples[index][field] = value;
    setEditingRecord((prev) => ({ ...prev, samples: updatedSamples }));
  };

  const handleSave = async () => {
    if (!editingRecord.client_id) {
      toast({ title: 'Error', description: 'Please select a client', variant: 'destructive' });
      return;
    }
    if (inwardOption === 'add_samples' && (!editingRecord.samples || editingRecord.samples.length === 0)) {
      toast({
        title: 'Error',
        description: 'Please add at least one sample',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      let inwardId = editingRecord.id;

      // Robustly determine the integer user ID for bigint columns
      let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;

      // If the ID is a UUID string (not numeric), try to resolve it from the users table
      if (isNaN(userId) && user.username) {
        const { data: userData } = await apiClient
          .from('users')
          .select('id')
          .eq('username', user.username)
          .maybeSingle();
        if (userData) userId = userData.id;
      }

      if (isNaN(userId)) {
        throw new Error(
          'Unable to determine a valid numeric User ID. Please try logging out and back in.'
        );
      }

      if (isAddingNew) {
        // Create Register Entry
        const { data: inwardData, error: inwardError } = await apiClient
          .from('material_inward_register')
          .insert({
            job_order_no: editingRecord.job_order_no || `JO-${Date.now()}`,
            po_wo_number: editingRecord.po_wo_number,
            client_id:
              typeof editingRecord.client_id === 'string'
                ? parseInt(editingRecord.client_id)
                : editingRecord.client_id,
            job_id: editingRecord.job_id || null,
            created_by: userId,
            updated_by: userId,
            status: 'RECEIVED',
          })
          .select()
          .single();

        if (inwardError) throw inwardError;
        inwardId = inwardData.id;
        logAudit({
          userId,
          entityType: 'material_inward',
          entityId: inwardData.id,
          entityName: inwardData.job_order_no,
          action: 'CREATE',
        });
      } else {
        // Update Register Entry
        const { error: inwardError } = await apiClient
          .from('material_inward_register')
          .update({
            job_order_no: editingRecord.job_order_no,
            po_wo_number: editingRecord.po_wo_number,
            client_id:
              typeof editingRecord.client_id === 'string'
                ? parseInt(editingRecord.client_id)
                : editingRecord.client_id,
            status: editingRecord.status,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRecord.id);

        if (inwardError) throw inwardError;

        logAudit({
          userId,
          entityType: 'material_inward',
          entityId: editingRecord.id,
          entityName: editingRecord.job_order_no,
          action: 'UPDATE',
        });

        // Delete existing samples to rebuild them (simplest approach for batch sync)
        const { error: deleteError } = await apiClient
          .from('material_samples')
          .delete()
          .eq('inward_id', inwardId);

        if (deleteError) throw deleteError;
      }

      // Create/Recreate Samples
      const samplesToInsert = inwardOption === 'no_samples' ? [] : editingRecord.samples.map((sample, index) => {
        const receivedBy = sample.received_by
          ? typeof sample.received_by === 'string'
            ? parseInt(sample.received_by)
            : sample.received_by
          : null;
        const collectionCenterId = sample.collection_center_id
          ? typeof sample.collection_center_id === 'string'
            ? parseInt(sample.collection_center_id)
            : sample.collection_center_id
          : null;
        const materialType = sample.material_type || '';

        if (!collectionCenterId) {
          throw new Error(
            `Sample #${index + 1}${sample.sample_code ? ' (' + sample.sample_code + ')' : ''}: Please select a Collection Center.`
          );
        }
        if (!receivedBy) {
          throw new Error(
            `Sample #${index + 1}${sample.sample_code ? ' (' + sample.sample_code + ')' : ''}: Please select who received the sample.`
          );
        }
        if (!materialType) {
          throw new Error(
            `Sample #${index + 1}${sample.sample_code ? ' (' + sample.sample_code + ')' : ''}: Please select a Material Type.`
          );
        }

        return {
          inward_id: inwardId,
          sample_code: sample.sample_code,
          material_type: materialType,
          sample_description: sample.sample_description,
          quantity: parseFloat(sample.quantity) || 0,
          received_date: sample.received_date,
          received_time: sample.received_time,
          received_by: receivedBy,
          collection_center_id: collectionCenterId,
          expected_test_days: parseInt(sample.expected_test_days) || 7,
        };
      });

      if (samplesToInsert.length > 0) {
        const { error: samplesError } = await apiClient
          .from('material_samples')
          .insert(samplesToInsert);

        if (samplesError) throw samplesError;
      }

      toast({
        title: 'Success',
        description: `Material Inward Record ${isAddingNew ? 'created' : 'updated'} successfully!`,
      });

      // Telegram Notification
      const clientName =
        clients.find((c) => c.id === editingRecord.client_id)?.client_name || 'Unknown Client';
      const action = isAddingNew ? 'New Entry' : 'Entry Updated';
      const emoji = isAddingNew ? '📥' : '✏️';
      const message = `${emoji} *Material Inward ${action}*\n\nJob OrderNo: \`${editingRecord.job_order_no || inwardId}\`\nClient: \`${clientName}\`\nSamples: \`${editingRecord.samples.length}\`\nBy: \`${user?.fullName || 'Unknown'}\``;
      sendTelegramNotification(message);
      if (editingRecord.job_id) {
        // Robustly determine the integer user ID for bigint columns
        let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
        if (isNaN(userId) && user.username) {
          const { data: userData } = await apiClient
            .from('users')
            .select('id')
            .eq('username', user.username)
            .maybeSingle();
          if (userData) userId = userData.id;
        }

        if (isNaN(userId)) {
          throw new Error(
            'Unable to determine a valid numeric User ID. Please try logging out and back in.'
          );
        }

        // Check if we need to advance the workflow
        const { data: jobData } = await apiClient
          .from('jobs')
          .select('status')
          .eq('id', editingRecord.job_id)
          .single();

        // If this is a new entry OR the job is currently stuck at WORK_ORDER_RECEIVED (e.g. after a revert)
        if (isAddingNew || (jobData && jobData.status === WORKFLOW_STATES.WORK_ORDER_RECEIVED)) {
          // Update job status
          await apiClient
            .from('jobs')
            .update({
              status: WORKFLOW_STATES.MATERIAL_RECEIVED,
              updated_by: userId,
            })
            .eq('id', editingRecord.job_id);

          // Add transition log
          await apiClient.from('job_workflow_logs').insert({
            job_id: editingRecord.job_id,
            to_state: WORKFLOW_STATES.MATERIAL_RECEIVED,
            action_id: 'RECEIVE_MATERIAL',
            performed_by: userId,
            remarks: `Material Received: ${editingRecord.job_order_no || inwardId}`,
          });
        }
      }

      // Refresh the list immediately if not in modal mode
      if (!initialJobId) {
        await fetchRecords();
      }

      if (onSuccess) {
        onSuccess();
      } else if (onClose) {
        onClose();
      } else {
        setEditingRecord(null);
        setIsAddingNew(false);
      }
    } catch (error) {
      console.error('Error saving inward record:', error);
      toast({
        title: 'Error',
        description: 'Failed to save record: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (record) => {
    setDeleteConfirmation({
      isOpen: true,
      recordId: record.id,
      jobOrderNo: record.job_order_no,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.recordId) return;

    try {
      const { error } = await apiClient
        .from('material_inward_register')
        .delete()
        .eq('id', deleteConfirmation.recordId);

      if (error) throw error;

      logAudit({
        userId: user?.id,
        entityType: 'material_inward',
        entityId: deleteConfirmation.recordId,
        entityName: deleteConfirmation.jobOrderNo,
        action: 'DELETE',
      });

      toast({
        title: 'Record Deleted',
        description: 'The inward record has been removed.',
        variant: 'destructive',
      });

      // Telegram Notification
      const message = `🗑️ *Material Inward Deleted*\n\nJob Order No: \`${deleteConfirmation.jobOrderNo}\`\nBy: \`${user?.fullName || 'Unknown'}\``;
      sendTelegramNotification(message);

      fetchRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete inward record.',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmation({ isOpen: false, recordId: null, jobOrderNo: '' });
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      (r.job_order_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (r.po_wo_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (r.clients?.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (fromDate || toDate) {
      const recordDate = new Date(r.created_at);
      recordDate.setHours(0, 0, 0, 0);

      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (recordDate < start) return false;
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(0, 0, 0, 0);
        if (recordDate > end) return false;
      }
    }

    return true;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let valA, valB;
    switch (sortField) {
      case 'status':
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
        break;
      case 'date':
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate, sortField, sortOrder]);

  const resetFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setSortField('date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  if (!initialJobId && loading && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Loading inward register...</p>
      </div>
    );
  }

  // --- RENDERING EDIT FORM (Consistent with AdminServicesManager) ---
  if (editingRecord) {
    return (
      <div className="relative bg-white p-6 rounded-lg shadow-sm animate-in slide-in-from-right-4 duration-300 min-h-[450px]">
        {/* Loading / Saving Blocking Overlay */}
        {(loading || isSaving) && (
          <div className="absolute inset-0 z-50 bg-white/75 backdrop-blur-[2px] rounded-lg flex flex-col items-center justify-center transition-all duration-200">
            <div className="flex flex-col items-center p-6 bg-white/95 border border-gray-100 shadow-xl rounded-2xl max-w-sm text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
              <p className="text-base font-semibold text-gray-800">
                {isSaving ? 'Saving Material Inward Entry...' : 'Loading Material Samples...'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isSaving
                  ? 'Updating records and workflow state...'
                  : 'Retrieving sample details and specifications...'}
              </p>
            </div>
          </div>
        )}

        <div
          className={`transition-all duration-200 ${
            loading || isSaving
              ? 'opacity-30 pointer-events-none select-none filter blur-[0.5px]'
              : 'opacity-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (onClose ? onClose() : setEditingRecord(null))}
                className="rounded-full"
                disabled={loading || isSaving}
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </Button>
              <h2 className="text-xl font-bold">
                {isAddingNew ? 'Add New Material Inward Entry' : 'Edit Material Inward Entry'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => (onClose ? onClose() : setEditingRecord(null))}
                disabled={isSaving || loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary-dark flex items-center text-white px-6"
                disabled={isSaving || loading}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? 'Saving...' : isAddingNew ? 'Create Inward Entry' : 'Save'}
              </Button>
            </div>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Select
              value={editingRecord.client_id?.toString()}
              onValueChange={(value) => setEditingRecord((prev) => ({ ...prev, client_id: value }))}
              disabled={!!initialJobId || !!editingRecord.job_id}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px] overflow-y-auto">
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200/60 space-y-3">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Material Inward Option</Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                if (inwardOption !== 'no_samples') {
                  setShowNoSamplesConfirm(true);
                }
              }}
              className={`flex-1 flex items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${inwardOption === 'no_samples'
                  ? 'bg-primary/5 border-primary text-primary shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              No material samples needed
            </button>
            <button
              type="button"
              onClick={() => {
                setInwardOption('add_samples');
                if (!editingRecord.samples || editingRecord.samples.length === 0) {
                  setEditingRecord((prev) => ({
                    ...prev,
                    samples: [
                      {
                        sample_code: '',
                        material_type: '',
                        sample_description: '',
                        quantity: '',
                        received_date: format(new Date(), 'yyyy-MM-dd'),
                        received_time: format(new Date(), 'HH:mm'),
                        received_by: user.id || '',
                        collection_center_id: '',
                        expected_test_days: 7,
                      },
                    ],
                  }));
                }
              }}
              className={`flex-1 flex items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${inwardOption === 'add_samples'
                  ? 'bg-primary/5 border-primary text-primary shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              Add samples
            </button>
          </div>
          {showNoSamplesConfirm && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-orange-800">Confirm</h4>
                  <p className="text-xs text-orange-700 mt-1">
                    Are you sure no material samples are needed for this job?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNoSamplesConfirm(false)}
                  className="h-8 text-xs border-orange-200 text-orange-850 hover:bg-orange-100/50 bg-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setInwardOption('no_samples');
                    setEditingRecord((prev) => ({ ...prev, samples: [] }));
                    setShowNoSamplesConfirm(false);
                  }}
                  className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </div>

        {inwardOption === 'add_samples' && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Samples
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSample}
                className="text-xs h-8"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Sample
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {editingRecord.samples.map((sample, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 space-y-4 relative group"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-full"
                    onClick={() => handleRemoveSample(index)}
                    title="Remove Sample"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Sample Code *</Label>
                      <Input
                        placeholder="e.g. S1"
                        className="h-9 text-sm"
                        value={sample.sample_code || ''}
                        onChange={(e) => handleSampleChange(index, 'sample_code', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Material Type *</Label>
                      <Select
                        value={sample.material_type || ''}
                        onValueChange={(value) => handleSampleChange(index, 'material_type', value)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {materials.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Remarks</Label>
                      <Input
                        placeholder="e.g. M25 Grade Concrete"
                        className="h-9 text-sm"
                        value={sample.sample_description || ''}
                        onChange={(e) =>
                          handleSampleChange(index, 'sample_description', e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 6"
                        className="h-9 text-sm"
                        value={sample.quantity || ''}
                        onChange={(e) => handleSampleChange(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Received Date</Label>
                      <AppDatePicker
                        className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
                        value={sample.received_date || ''}
                        onChange={(e) => handleSampleChange(index, 'received_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Time</Label>
                      <Input
                        type="time"
                        className="h-9 text-sm"
                        value={sample.received_time || ''}
                        onChange={(e) => handleSampleChange(index, 'received_time', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Test Days</Label>
                      <Input
                        type="number"
                        className="h-9 text-sm"
                        value={sample.expected_test_days || ''}
                        onChange={(e) =>
                          handleSampleChange(index, 'expected_test_days', e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Collection At</Label>
                      <Select
                        value={sample.collection_center_id?.toString()}
                        onValueChange={(value) =>
                          handleSampleChange(index, 'collection_center_id', value)
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {collectionCenters.map((cc) => (
                            <SelectItem key={cc.id} value={cc.id.toString()}>
                              {cc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Received By</Label>
                      <Select
                        value={sample.received_by?.toString()}
                        onValueChange={(value) => handleSampleChange(index, 'received_by', value)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="User" />
                        </SelectTrigger>
                        <SelectContent>
                          {appUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id.toString()}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  // --- RENDERING LIST VIEW ---
  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by Job Order #, PO/WO # or Client..."
              className="pl-12 h-12 text-sm bg-gray-50/30 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-6 h-12 bg-primary/5 rounded-xl border border-primary/10 whitespace-nowrap">
            <Package className="w-4 h-4 text-primary/60" />
            <span className="text-sm font-semibold text-gray-700">
              {sortedRecords.length} <span className="text-gray-400 font-normal">records</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-start gap-6 flex-1">
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">
                Filters
              </span>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 bg-gray-50/50 p-1 px-3 rounded-lg border border-gray-100 focus-within:border-primary/30 transition-colors">
                    <AppDatePicker
                      className="border-none w-auto min-w-[140px] text-sm bg-transparent cursor-pointer p-0"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      placeholder="From Date"
                    />
                    <span className="text-gray-300 font-light px-1">to</span>
                    <AppDatePicker
                      className="border-none w-auto min-w-[140px] text-sm bg-transparent cursor-pointer p-0"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      placeholder="To Date"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-100 hidden xl:block" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                Sort
              </span>
              <div className="flex items-center gap-2">
                <Select value={sortField} onValueChange={setSortField}>
                  <SelectTrigger className="w-40 h-9 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date Created</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-gray-200 rounded-lg"
                      onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    >
                      {sortOrder === 'asc' ? (
                        <SortAsc className="w-4 h-4" />
                      ) : (
                        <SortDesc className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white border-gray-800">
                    <p className="text-xs">
                      Toggle {sortOrder === 'asc' ? 'Descending' : 'Ascending'} Sort
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-gray-400 hover:text-red-500 h-10 text-sm font-bold uppercase tracking-widest transition-colors"
            >
              Reset
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleAddNew}
                  className="bg-primary hover:bg-primary-dark text-white h-10 px-4 rounded-xl shadow-sm text-xs font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" /> New Material Inward Entry
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                <p className="text-xs">Register new samples arriving at the lab</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Pagination Controls - Top */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 px-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
            Items
          </span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-20 h-9 text-xs bg-gray-50/50 border-gray-200 rounded-lg">
              <SelectValue className="text-xs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10" className="text-xs">
                10
              </SelectItem>
              <SelectItem value="25" className="text-xs">
                25
              </SelectItem>
              <SelectItem value="50" className="text-xs">
                50
              </SelectItem>
              <SelectItem value="100" className="text-xs">
                100
              </SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none border-l pl-3 ml-1">
            Showing {sortedRecords.length === 0 ? 0 : startIndex + 1}-
            {Math.min(endIndex, sortedRecords.length)} of {sortedRecords.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
          >
            Prev
          </Button>
          <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
              Page {currentPage} / {totalPages || 1}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Job Order #
                </th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Created Date
                </th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Received Date
                </th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Created By
                </th>
                <th className="text-right py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4 align-middle text-gray-600">
                      <span className="font-semibold font-mono text-gray-750 text-sm bg-gray-100 px-2 py-1 rounded">
                        {record.job_order_no}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 align-middle">
                      {safeFormatDate(record.created_at)}
                    </td>
                    <td className="py-4 px-4 text-gray-600 align-middle">
                      {safeFormatDate(record.material_samples?.[0]?.received_date)}
                    </td>
                    <td className="py-4 px-4 text-gray-600 align-middle">
                      {record.users?.full_name || '-'}
                    </td>
                    <td className="py-4 px-4 text-right align-middle text-gray-600">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(record)}
                              className="text-blue-650"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Edit inward details and samples</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(record)}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Delete this inward record</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Removed bottom pagination as it is now in the top settings panel */}

      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setDeleteConfirmation({ isOpen: false, recordId: null, jobOrderNo: '' })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              Delete Inward Record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{deleteConfirmation.jobOrderNo}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MaterialInwardManager;
