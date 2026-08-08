import React, { useState, useEffect, useMemo, useRef } from 'react';
import { cn, safeFormatDate } from '@/lib/utils';
import {
  Search,
  Plus,
  ArrowLeft,
  Save,
  Loader2,
  Package,
  ArrowRight,
  FileText,
  ExternalLink,
  CheckCircle2,
  Edit,
  UserPlus,
  Trash2,
  AlertCircle,
  SortAsc,
  SortDesc,
  Calendar,
  Filter,
  X,
  Download,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/lib/customSupabaseClient';
import { logAudit } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WORKFLOW_STATES, ROLES, ACTIONS, DEPARTMENTS } from '@/data/config';
import { useMaterials } from '@/contexts/MaterialsContext';
import { useWorkflowConfig } from '@/contexts/WorkflowContext';
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
import WorkflowPanel from '@/components/common/WorkflowPanel';
import TechnicianAssignment from './TechnicianAssignment';
import TestingManager from './TestingManager';
import MaterialInwardManager from './MaterialInwardManager';
import { themedReactSelectStyles } from '@/lib/reactSelectStyles';
import ReactSelect from 'react-select';
import ReportPreview from '@/components/ReportPreview';
import Rupee from '@/components/Rupee';
import { format } from 'date-fns';

const JobsManager = ({ id }) => {
  const { materials } = useMaterials();
  const [records, setRecords] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get('status') || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [linkedDocs, setLinkedDocs] = useState([]);
  const [woId, setWoId] = useState('');
  const [showingWoForm, setShowingWoForm] = useState(false);
  const [showingMaterialForm, setShowingMaterialForm] = useState(false);
  const [showingTechForm, setShowingTechForm] = useState(false);
  const [showingTestingForm, setShowingTestingForm] = useState(false);
  const [jobSamples, setJobSamples] = useState([]);
  const [techAssignments, setTechAssignments] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showingAuditLogs, setShowingAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showingReportPreview, setShowingReportPreview] = useState(false);
  const [reportPreviewData, setReportPreviewData] = useState(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const generateReportActionRef = useRef(null);
  // Increment to force child components (e.g. inline TestingManager) to remount and re-fetch
  const [jobDetailRefreshKey, setJobDetailRefreshKey] = useState(0);

  // Advanced Filters State (from ExpensesManager)
  const [filterByCreator, setFilterByCreator] = useState('all');
  const [filterByClient, setFilterByClient] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [datePreset, setDatePreset] = useState('custom');
  const [showFilters, setShowFilters] = useState(false);

  const creators = useMemo(() => {
    const set = new Set(records.map((r) => r.users?.full_name).filter(Boolean));
    return Array.from(set).sort();
  }, [records]);

  const applyDatePreset = (preset) => {
    const now = new Date();
    let start = '';
    let end = '';
    const formatDate = (date) => date.toISOString().split('T')[0];

    switch (preset) {
      case 'this_month':
        start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'last_month':
        start = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'this_year':
        start = formatDate(new Date(now.getFullYear(), 0, 1));
        end = formatDate(new Date(now.getFullYear(), 11, 31));
        break;
      case 'last_year':
        start = formatDate(new Date(now.getFullYear() - 1, 0, 1));
        end = formatDate(new Date(now.getFullYear() - 1, 11, 31));
        break;
      case 'ytd':
        start = formatDate(new Date(now.getFullYear(), 0, 1));
        end = formatDate(now);
        break;
      case 'custom':
        start = '';
        end = '';
        break;
      default:
        break;
    }

    setFilterDateStart(start);
    setFilterDateEnd(end);
    setDatePreset(preset);
  };

  const downloadCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Job Code',
      'Client',
      'Project Name',
      'Quotation Amount',
      'Created On',
      'Created By',
      'Status',
    ];
    const rows = filteredRecords.map((r) => [
      r.job_code,
      `"${r.clients?.client_name?.replace(/"/g, '""') || ''}"`,
      `"${r.project_name?.replace(/"/g, '""') || ''}"`,
      r.quotationAmount || 0,
      new Date(r.created_at).toLocaleDateString('en-IN'),
      r.users?.full_name || '-',
      getStatusLabel(r.status),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Jobs_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'Report Downloaded',
      description: `Exported ${filteredRecords.length} records to CSV.`,
    });
  };

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const canModify = isAdmin() || user?.role === ROLES.MRO.slug;
  const isAnalyst = user?.role === ROLES.ANALYST.slug;
  const { workflow } = useWorkflowConfig();

  const [editingRecord, setEditingRecord] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    jobId: null,
    jobCode: '',
  });

  useEffect(() => {
    if (id) {
      // Wait for listing to load first if it's in progress
      if (loading && records.length === 0) return;

      const existing = records.find((r) => String(r.id) === String(id));
      if (existing) {
        setEditingRecord({ ...existing });
        setIsAddingNew(false);
      } else if (!authLoading) {
        // Only fetch directly if not found in already loaded records
        fetchJobById(id);
      }
    } else {
      setEditingRecord(null);
    }
  }, [id, records, authLoading, loading]);

  const fetchJobById = async (jobId) => {
    if (!user || !user.id) return;
    try {
      let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      if (isNaN(userId)) {
        // Last resort: look up by username if ID is somehow invalid
        const { data: u } = await supabase
          .from('users')
          .select('id')
          .eq('username', user.username)
          .maybeSingle();
        if (u) userId = u.id;
      }
      if (!userId || isNaN(userId)) return;

      const { data: rawData, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
      if (error) throw error;

      let data = rawData;
      if (data && data.client_id) {
        const { data: cData } = await supabase.from('clients').select('id, client_name, client_address, gstin').eq('id', data.client_id).maybeSingle();
        if (cData) data = { ...data, clients: cData };
      }

      if (data) {
        const actualJobId = data.id;
        // Security check for analysts and technicians
        if (
          !isAdmin() &&
          (user?.role === ROLES.ANALYST.slug || user?.role === ROLES.TECHNICIAN.slug)
        ) {
          const { data: assignments, error: assignError } = await supabase
            .from('job_to_technicians')
            .select('id')
            .eq('job_id', actualJobId)
            .eq('technician_id', userId);

          if (assignError || !assignments || assignments.length === 0) {
            console.error('Access Denied Check:', {
              actualJobId,
              userId,
              userRole: user?.role,
              error: assignError,
            });
            toast({
              title: 'Access Denied',
              description: 'You are not assigned to this job.',
              variant: 'destructive',
            });
            setEditingRecord(null);
            return;
          }
        }

        setEditingRecord({ ...data });
        setIsAddingNew(false);
      }
    } catch (err) {
      console.error('Failed to fetch job by ID:', err);
    }
  };

  const handleReceiveWorkOrder = async () => {
    setIsSaving(true);
    try {
      // Robustly determine the integer user ID for bigint columns
      let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      if (isNaN(userId) && user.username) {
        const { data: userData } = await supabase
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

      // 1. Update job Record
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          work_order_id: woId,
          status: WORKFLOW_STATES.WORK_ORDER_RECEIVED,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', editingRecord.id);

      if (updateError) throw updateError;

      // 2. Log workflow transition
      const { error: logError } = await supabase.from('job_workflow_logs').insert({
        job_id: editingRecord.id,
        from_state: editingRecord.status,
        to_state: WORKFLOW_STATES.WORK_ORDER_RECEIVED,
        action_id: 'RECEIVE_WORK_ORDER',
        performed_by: userId,
        remarks: `Work Order Received: ${woId}`,
      });
      if (logError) throw logError;

      toast({ title: 'Success', description: 'Work Order Received & Workflow Updated' });
      setShowingWoForm(false);
      setWoId('');
      reloadEditingRecord();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const fetchJobDocs = async (jobId) => {
    try {
      const { data, error } = await supabase.from('documents').select('*').eq('job_id', jobId);
      if (error) throw error;
      const sorted = (data || []).sort((a, b) => {
        if (a.document_type === 'Quotation' && b.document_type === 'Quotation') {
          return (b.version || 1) - (a.version || 1);
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setLinkedDocs(sorted);
    } catch (error) {
      console.error('Error fetching linked documents:', error);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchRecords();
      fetchClients();
    }
  }, [authLoading, user]);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, client_name').order('client_name');
    setClients(data || []);
  };

  useEffect(() => {
    if (editingRecord?.id) {
      fetchJobSamples(editingRecord.id);
      fetchJobAssignments(editingRecord.id);
      fetchJobDocs(editingRecord.id);
    } else {
      setJobSamples([]);
      setTechAssignments([]);
      setLinkedDocs([]);
    }
  }, [editingRecord?.id]);

  const fetchJobAssignments = async (jobId) => {
    try {
      const { data: rawAssignments, error } = await supabase
        .from('job_to_technicians')
        .select('*')
        .eq('job_id', jobId);

      if (error) throw error;

      const techIds = [...new Set((rawAssignments || []).map((r) => r.technician_id).filter(Boolean))];
      if (techIds.length > 0) {
        const { data: techUsers } = await supabase
          .from('users')
          .select('id, full_name, username')
          .in('id', techIds);
        setTechAssignments(techUsers || []);
      } else {
        setTechAssignments([]);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  const fetchJobSamples = async (jobId) => {
    try {
      const { data: inwardRecords } = await supabase
        .from('material_inward_register')
        .select('id')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (inwardRecords && inwardRecords.length > 0) {
        const inwardIds = inwardRecords.map((r) => r.id);
        const { data: rawSamples, error } = await supabase
          .from('material_samples')
          .select('*')
          .in('inward_id', inwardIds);

        if (error) throw error;
        let samples = rawSamples || [];

        const userIds = [...new Set(samples.map((s) => s.received_by).filter(Boolean))];
        const centerIds = [...new Set(samples.map((s) => s.collection_center_id).filter(Boolean))];

        let uMap = new Map();
        if (userIds.length > 0) {
          const { data: uData } = await supabase.from('users').select('id, full_name').in('id', userIds);
          if (uData) uData.forEach((u) => { uMap.set(String(u.id), u); uMap.set(Number(u.id), u); });
        }

        let cMap = new Map();
        if (centerIds.length > 0) {
          const { data: cData } = await supabase.from('collection_centers').select('id, name').in('id', centerIds);
          if (cData) cData.forEach((c) => { cMap.set(String(c.id), c); cMap.set(Number(c.id), c); });
        }

        samples = samples.map((s) => ({
          ...s,
          users: s.received_by ? uMap.get(String(s.received_by)) || null : null,
          collection_centers: s.collection_center_id ? cMap.get(String(s.collection_center_id)) || null : null,
        }));

        setJobSamples(samples);
      } else {
        setJobSamples([]);
      }
    } catch (err) {
      console.error('Error fetching samples:', err);
    }
  };

  const computeGrandTotal = (doc) => {
    if (!doc?.content) return null;
    const { items = [], discount = 0 } = doc.content;
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountAmt = (subtotal * Number(discount)) / 100;
    const afterDiscount = subtotal - discountAmt;
    const tax = afterDiscount * 0.18; // 18% GST
    return afterDiscount + tax;
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin() && user?.role !== ROLES.MRO.slug) {
        let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
        if (isNaN(userId)) userId = -1;

        if (user?.role === ROLES.ANALYST.slug || user?.role === ROLES.TECHNICIAN.slug) {
          const { data: assignments } = await supabase
            .from('job_to_technicians')
            .select('job_id')
            .eq('technician_id', userId);

          const assignedJobIds = (assignments || []).map((a) => a.job_id);
          if (assignedJobIds.length > 0) {
            query = query.in('id', assignedJobIds);
          } else {
            query = query.eq('id', 0); // No jobs assigned
          }
        } else {
          query = query.eq('created_by', userId);
        }
      }

      const { data: rawJobs, error } = await query;
      if (error) throw error;

      let jobs = rawJobs || [];
      const clientIds = [...new Set(jobs.map((j) => j.client_id).filter(Boolean))];
      const userIds = [...new Set(jobs.map((j) => j.created_by).filter(Boolean))];

      let cMap = new Map();
      if (clientIds.length > 0) {
        const { data: cData } = await supabase.from('clients').select('id, client_name, client_address, gstin').in('id', clientIds);
        if (cData) cData.forEach((c) => { cMap.set(String(c.id), c); cMap.set(Number(c.id), c); });
      }

      let uMap = new Map();
      if (userIds.length > 0) {
        const { data: uData } = await supabase.from('users').select('id, full_name, username, role, departments').in('id', userIds);
        if (uData) uData.forEach((u) => { uMap.set(String(u.id), u); uMap.set(Number(u.id), u); });
      }

      jobs = jobs.map((j) => ({
        ...j,
        clients: j.client_id ? cMap.get(String(j.client_id)) || null : null,
        users: j.created_by ? uMap.get(String(j.created_by)) || null : null,
      }));

      // Fetch quotation documents for all jobs in one query
      const jobIds = (jobs || []).map((j) => j.id);
      let quotationMap = {};
      if (jobIds.length > 0) {
        const { data: docs } = await supabase
          .from('documents')
          .select('job_id, content, document_type')
          .in('job_id', jobIds)
          .eq('document_type', 'Quotation');
        (docs || []).forEach((doc) => {
          // Keep first quotation per job
          if (!quotationMap[doc.job_id]) quotationMap[doc.job_id] = doc;
        });
      }

      const enriched = (jobs || []).map((j) => ({
        ...j,
        quotationAmount: computeGrandTotal(quotationMap[j.id]),
      }));
      setRecords(enriched);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const reloadEditingRecord = async () => {
    if (!editingRecord?.id) return;
    const jobId = editingRecord.id;
    try {
      const { data: rawData, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
      if (error) throw error;

      let data = rawData;
      if (data && data.client_id) {
        const { data: cData } = await supabase.from('clients').select('id, client_name, client_address, gstin').eq('id', data.client_id).maybeSingle();
        if (cData) data = { ...data, clients: cData };
      }
      if (data) {
        setEditingRecord({ ...data });
      }
      // Explicitly refresh child data — the useEffect won't re-fire since the job ID hasn't changed
      fetchJobSamples(jobId);
      fetchJobAssignments(jobId);
      fetchJobDocs(jobId);
      fetchRecords();
      // Bump the refresh key so inline child components (TestingManager, etc.) remount and re-fetch
      setJobDetailRefreshKey((k) => k + 1);
    } catch (error) {
      console.error('Failed to reload record:', error);
    }
  };

  const handleGenerateReport = async () => {
    try {
      // Fetch geotechnical test data from job_tests table (always fresh)
      const { data: testData } = await supabase
        .from('job_tests')
        .select('*')
        .eq('job_id', editingRecord.id);

      // Find GeotechData (Soil and Rock > Soil > Rock priority)
      let geotechData = null;
      for (const cat of ['Soil and Rock', 'Soil', 'Rock']) {
        const entry = (testData || []).find(
          (t) => t.category?.toLowerCase().trim() === cat.toLowerCase()
        );
        if (entry?.results?.GeotechData) {
          geotechData = entry.results.GeotechData;
          break;
        }
      }
      console.log(
        '[handleGenerateReport] testData categories:',
        (testData || []).map((t) => t.category)
      );
      console.log('[handleGenerateReport] geotechData maxDepths:', geotechData?.maxDepths);

      const reportNumber = `RPT/${new Date().getFullYear()}/${String(editingRecord.id).padStart(3, '0')}`;

      const defaultGeotechData = {
        boreholeLogs: [
          [
            {
              fromDepth: '',
              toDepth: '',
              natureOfSampling: '',
              soilType: '',
              waterTable: false,
              spt1: '',
              spt2: '',
              spt3: '',
              shearParameters: { cValue: '', phiValue: '' },
              coreLength: '',
              coreRecovery: '',
              rqd: '',
              sbc: '',
            },
          ],
        ],
        maxDepths: [],
        latitudes: [],
        longitudes: [],
        labTestResults: [
          [
            {
              depth: '',
              bulkDensity: '',
              moistureContent: '',
              grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' },
              atterbergLimits: { liquidLimit: '', plasticLimit: '', plasticityIndex: '' },
              specificGravity: '',
              freeSwellIndex: '',
            },
          ],
        ],
        sbcDetails: [
          [
            {
              structure: '',
              chainage: '',
              depthFromGL: '',
              scourDepthFromGL: '',
              strata: '',
              fieldNValue: '',
              typeOfCorrection: '',
              cpLayerThickness: '',
              liquidLimit: '',
              width: '',
              footingLength: '',
              shapeOfFooting: '',
            },
          ],
        ],
        grainSizeAnalysis: [
          [
            {
              depth: '',
              sieve1: '',
              sieve2: '',
              sieve3: '',
              sieve4: '',
              sieve5: '',
              sieve6: '',
              sieve7: '',
              sieve8: '',
              sieve9: '',
            },
          ],
        ],
        subSoilProfile: [[{ depth: '', description: '' }]],
        directShearResults: [
          [
            {
              shearBoxSize: '',
              depthOfSample: '',
              cValue: '',
              phiValue: '',
              stressReadings: [{ normalStress: '', shearStress: '' }],
            },
          ],
        ],
        chemicalAnalysis: [
          { phValue: '', sulphates: '', chlorides: '', additionalKeys: [{ key: '', value: '' }] },
        ],
        pointLoadStrength: [],
        pointLoadStrengthLump: [],
        foundationRockFormations: [],
      };

      // If a report already exists, preserve its user-edited fields but refresh geotech data
      const existingReport = linkedDocs.find((d) => d.document_type === 'Report');
      const existingContent = existingReport?.content || {};

      const formData = {
        projectType: editingRecord.project_name || '',
        projectName: editingRecord.project_name || '',
        location: editingRecord.project_address || existingContent.location || '',
        reportId: existingContent.reportId || reportNumber,
        projectDetails: editingRecord.project_name || '',
        client: editingRecord.clients?.client_name || '',
        clientId: editingRecord.client_id || null,
        clientAddress: editingRecord.clients?.client_address || '',
        latitude: existingContent.latitude || '',
        longitude: existingContent.longitude || '',
        siteId: editingRecord.job_code || '',
        anchorId: existingContent.anchorId || '',
        siteName: editingRecord.project_name || '',
        siteAddress: editingRecord.site_address || editingRecord.project_address || '',
        surveyDate: existingContent.surveyDate || new Date().toISOString().split('T')[0],
        groundWaterTable: existingContent.groundWaterTable || 'Not Encountered',
        reportCreatedOn: existingContent.reportCreatedOn || new Date().toISOString().split('T')[0],
        recommendations: existingContent.recommendations || '',
        depthOfFoundation: existingContent.depthOfFoundation || '',
        isCodes: existingContent.isCodes || [
          { key: 'Natural water content', value: 'IS:2720 - (Part 2) - 1973' },
          { key: 'Grain size analysis', value: 'IS:2720 - (Part 4) - 1985' },
          { key: 'Atterberg Limits', value: 'IS:2720 - (Part 5) - 1985' },
          { key: 'Field density', value: 'IS:2720 - (Part 10) - 1993' },
          { key: 'Specific Gravity', value: 'IS:2720 - (Part 3) - 1980' },
          { key: 'Standard penetration test (SPT)', value: 'IS:2131 - 1981' },
          { key: 'Shear strength parameters', value: 'IS:2720 - (Part 13) - 1986' },
          { key: 'Free Swell Index', value: 'IS:2720 - (Part 40) - 1977' },
          { key: 'Chemical Analysis', value: 'IS:2720 - (Part 26) - 1987 & (Part 27) - 1977' },
        ],
        surveyReport: existingContent.surveyReport || [
          { key: 'Weather condition', value: '' },
          { key: 'Site Dimension', value: '' },
          { key: 'Ground or seepage water', value: '' },
        ],
        includeSurveyReportNote: existingContent.includeSurveyReportNote || false,
        surveyReportNote: existingContent.surveyReportNote || '',
        conclusions: existingContent.conclusions || [
          {
            value: 'SPT values indicate that the soil strata up to a termination depth is [VALUE].',
          },
          { value: 'The [VALUE] present in the soil strata is found to be [VALUE] in nature.' },
          { value: 'Ground water table [VALUE] at the time of investigation in the bore hole.' },
        ],
        recommendationTypes: existingContent.recommendationTypes || { rock: false, soil: true },
        sitePhotos: existingContent.sitePhotos || [],
        // Always use fresh geotech data from job_tests
        ...(geotechData
          ? {
              ...geotechData,
              maxDepths: geotechData.maxDepths?.length
                ? geotechData.maxDepths
                : existingContent.maxDepths || [],
              latitudes: geotechData.latitudes?.length
                ? geotechData.latitudes
                : existingContent.latitudes || [],
              longitudes: geotechData.longitudes?.length
                ? geotechData.longitudes
                : existingContent.longitudes || [],
            }
          : defaultGeotechData),
      };

      setReportPreviewData(formData);
      setShowingReportPreview(true);
    } catch (err) {
      console.error('Error generating report preview:', err);
      toast({ title: 'Error', description: 'Failed to load report data.', variant: 'destructive' });
    }
  };

  const handleSaveReport = async () => {
    if (!generateReportActionRef.current) return;
    setIsSavingReport(true);
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

      const existingReport = linkedDocs.find((d) => d.document_type === 'Report');
      const reportNumber =
        reportPreviewData?.reportId ||
        `RPT/${new Date().getFullYear()}/${String(editingRecord.id).padStart(3, '0')}`;

      const docPayload = {
        document_type: 'Report',
        job_id: editingRecord.id,
        client_id: editingRecord.client_id || null,
        quote_number: reportNumber,
        content: reportPreviewData,
        created_by: userId,
        updated_at: new Date().toISOString(),
      };

      if (existingReport) {
        const { error } = await supabase
          .from('documents')
          .update(docPayload)
          .eq('id', existingReport.id);
        if (error) throw error;
        logAudit({
          userId,
          entityType: 'document',
          entityId: existingReport.id,
          entityName: docPayload.quote_number,
          action: 'UPDATE',
        });
      } else {
        const { data, error } = await supabase.from('documents').insert([docPayload]).select();
        if (error) throw error;
        logAudit({
          userId,
          entityType: 'document',
          entityId: data?.[0]?.id,
          entityName: docPayload.quote_number,
          action: 'CREATE',
        });
      }

      // Transition workflow → REPORT_GENERATED
      await generateReportActionRef.current('GENERATE_REPORT');

      toast({
        title: 'Report Generated',
        description: 'The report has been saved and the job status updated.',
      });
      setShowingReportPreview(false);
      generateReportActionRef.current = null;
      reloadEditingRecord();
    } catch (err) {
      console.error('Error saving report:', err);
      toast({
        title: 'Error',
        description: 'Failed to save report: ' + err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingReport(false);
    }
  };

  const fetchAuditLogs = async (jobId) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('job_workflow_logs')
        .select(
          `
                    *,
                    users:performed_by(full_name, username)
                `
        )
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({ title: 'Error', description: 'Failed to fetch audit logs', variant: 'destructive' });
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (editingRecord?.id) {
      fetchJobDocs(editingRecord.id);
      fetchJobSamples(editingRecord.id);
      fetchJobAssignments(editingRecord.id);
    } else {
      setLinkedDocs([]);
      setJobSamples([]);
      setTechAssignments([]);
    }
  }, [editingRecord?.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Ensure client_id is an integer
      const clientId =
        typeof editingRecord.client_id === 'string'
          ? parseInt(editingRecord.client_id)
          : editingRecord.client_id;

      if (!clientId || isNaN(clientId)) {
        throw new Error('Please select a valid client.');
      }

      const payload = {
        client_id: clientId,
        project_name: editingRecord.project_name || '',
        project_address: editingRecord.project_address || null,
        work_order_id: editingRecord.work_order_id || null,
        status: editingRecord.status,
        updated_at: new Date().toISOString(),
      };

      if (isAddingNew) {
        // Robustly determine the integer user ID for bigint columns
        let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;

        // If the ID is a UUID string (not numeric), try to resolve it from the users table
        if (isNaN(userId) && user.username) {
          const { data: userData } = await supabase
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

        // Ensure we don't send any 'id' field for new records to let DB auto-generate it
        const insertData = {
          ...payload,
          created_by: userId,
          updated_by: userId,
        };

        const { data, error } = await supabase.from('jobs').insert(insertData).select();
        if (error) throw error;
        logAudit({
          userId,
          entityType: 'job',
          entityId: data?.[0]?.id,
          entityName: data?.[0]?.job_code,
          action: 'CREATE',
        });
      } else {
        let userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
        if (isNaN(userId) && user.username) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('username', user.username)
            .maybeSingle();
          if (userData) userId = userData.id;
        }

        const { error } = await supabase
          .from('jobs')
          .update({
            ...payload,
            updated_by: userId || 1, // Fallback to 1 if still not found for updates
          })
          .eq('id', editingRecord.id);
        if (error) throw error;
        logAudit({
          userId,
          entityType: 'job',
          entityId: editingRecord.id,
          entityName: editingRecord.job_code,
          action: 'UPDATE',
        });
      }
      toast({ title: 'Success', description: 'Job saved successfully' });
      // If we were adding a new job, return to the jobs list
      if (isAddingNew) {
        navigate('/settings/jobs');
      }
      setEditingRecord(null);
      fetchRecords();
    } catch (err) {
      console.error('Save Error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (job) => {
    setDeleteConfirmation({
      isOpen: true,
      jobId: job.id,
      jobCode: job.job_code || job.job_id,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.jobId) return;

    try {
      const jobId = deleteConfirmation.jobId;

      // 1. Get inward register ID to delete samples
      const { data: inwardRecords } = await supabase
        .from('material_inward_register')
        .select('id')
        .eq('job_id', jobId);

      if (inwardRecords && inwardRecords.length > 0) {
        const inwardIds = inwardRecords.map((r) => r.id);
        // 2. Delete material samples
        await supabase.from('material_samples').delete().in('inward_id', inwardIds);
        // 3. Delete material inward register
        await supabase.from('material_inward_register').delete().in('id', inwardIds);
      }

      // 4. Delete job tests
      await supabase.from('job_tests').delete().eq('job_id', jobId);

      // 5. Delete job workflow logs
      await supabase.from('job_workflow_logs').delete().eq('job_id', jobId);

      // 6. Delete linked documents
      await supabase.from('documents').delete().eq('job_id', jobId);

      // 7. Finally delete the job itself
      const { error } = await supabase.from('jobs').delete().eq('id', jobId);

      if (error) throw error;

      logAudit({
        userId: user?.id,
        entityType: 'job',
        entityId: jobId,
        entityName: deleteConfirmation.jobCode,
        action: 'DELETE',
      });

      toast({ title: 'Success', description: 'Job and all related data deleted successfully' });
      fetchRecords();
    } catch (err) {
      console.error('Delete Error:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete job: ' + err.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmation({ isOpen: false, jobId: null, jobCode: '' });
    }
  };

  const getStatusLabel = (status) => workflow.states[status]?.label || status;
  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case WORKFLOW_STATES.JOB_CREATED:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-200';
      case WORKFLOW_STATES.QUOTATION_SENT:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800 hover:bg-yellow-100';
      case WORKFLOW_STATES.WORK_ORDER_RECEIVED:
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 hover:bg-orange-100';
      case WORKFLOW_STATES.MATERIAL_RECEIVED:
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100';
      case WORKFLOW_STATES.TECHNICIANS_ASSIGNED:
        return 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-800 hover:bg-lime-100';
      case WORKFLOW_STATES.UNDER_TESTING:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100';
      case WORKFLOW_STATES.TEST_DATA_UNDER_REVIEW:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 hover:bg-indigo-100';
      case WORKFLOW_STATES.DATA_VERIFIED:
        return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 hover:bg-violet-100';
      case WORKFLOW_STATES.REPORT_GENERATED:
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 hover:bg-purple-100';
      case WORKFLOW_STATES.REPORT_UNDER_REVIEW:
        return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-800 hover:bg-fuchsia-100';
      case WORKFLOW_STATES.REPORT_SIGNED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100';
      case WORKFLOW_STATES.INVOICE_GENERATED:
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-100';
      case WORKFLOW_STATES.AWAITING_PAYMENT:
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100';
      case WORKFLOW_STATES.PAYMENT_RECEIVED:
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 hover:bg-green-100';
      case WORKFLOW_STATES.REPORT_RELEASED:
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800 hover:bg-cyan-100';
      case WORKFLOW_STATES.JOB_COMPLETE:
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-800/40 dark:text-green-400 dark:border-green-700 hover:bg-green-200';
      default:
        return 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:border-primary/30';
    }
  };

  const filteredRecords = useMemo(() => {
    let result = records.filter((r) => {
      // Search filter
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch =
        (r.job_code || r.job_id)?.toLowerCase().includes(searchStr) ||
        r.clients?.client_name?.toLowerCase().includes(searchStr) ||
        r.project_name?.toLowerCase().includes(searchStr);
      if (!matchesSearch) return false;

      // Status filter
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;

      // Creator filter
      if (filterByCreator !== 'all' && r.users?.full_name !== filterByCreator) return false;

      // Client filter
      if (filterByClient !== 'all' && String(r.client_id) !== String(filterByClient)) return false;

      // Date range filter
      if (filterDateStart && new Date(r.created_at) < new Date(filterDateStart + 'T00:00:00'))
        return false;
      if (filterDateEnd && new Date(r.created_at) > new Date(filterDateEnd + 'T23:59:59'))
        return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA, valB;

      if (sortField === 'client_name') {
        valA = a.clients?.client_name || '';
        valB = b.clients?.client_name || '';
      } else if (sortField === 'quotationAmount') {
        valA = a.quotationAmount != null ? a.quotationAmount : -1;
        valB = b.quotationAmount != null ? b.quotationAmount : -1;
      } else {
        valA = a[sortField] || '';
        valB = b[sortField] || '';
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    records,
    searchTerm,
    filterStatus,
    sortField,
    sortOrder,
    filterByCreator,
    filterByClient,
    filterDateStart,
    filterDateEnd,
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterByCreator, filterDateStart, filterDateEnd]);

  const resetAll = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setSortField('created_at');
    setSortOrder('desc');
    setFilterByCreator('all');
    setFilterByClient('all');
    setFilterDateStart('');
    setFilterDateEnd('');
    setDatePreset('custom');
  };

  if (editingRecord) {
    return (
      <div className="space-y-6 bg-white p-2 rounded-xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Close the detail view and navigate back to job listing
                setEditingRecord(null);
                setIsAddingNew(false);
                navigate('/settings/jobs');
              }}
              className="rounded-full bg-gray-50 hover:bg-primary/10 hover:text-primary transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {isAddingNew ? 'Create New Job' : `Job ID: ${editingRecord.job_code}`}
              </h2>
              <p className="text-xs text-gray-500">
                Manage job details and track its progress in the laboratory workflow.
              </p>
            </div>
          </div>
          {!isAddingNew && canModify && isAdmin() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowingAuditLogs(true);
                fetchAuditLogs(editingRecord.id);
              }}
              className="text-[10px] font-bold text-blue-500 hover:text-blue-600 hover:bg-blue-50 uppercase tracking-widest flex items-center gap-2 transition-all rounded-lg px-3"
            >
              <FileText className="w-3.5 h-3.5" />
              Audit Logs
            </Button>
          )}
        </div>

        {!isAddingNew && (
          <div className="mb-2 space-y-2">
            {/* <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Workflow Actions</h3> */}
            <WorkflowPanel
              jobId={editingRecord.id}
              currentStatus={editingRecord.status}
              onTransition={reloadEditingRecord}
              onActionClick={async (actionId, action, performAction) => {
                if (actionId === 'SEND_QUOTATION') {
                  const existingQuotation = linkedDocs.find((d) => d.document_type === 'Quotation');
                  if (existingQuotation) {
                    const success = await performAction(actionId);
                    if (success) {
                      navigate(`/doc/${existingQuotation.id}`);
                    }
                    return false;
                  }
                }
                if (actionId === 'RECEIVE_WORK_ORDER') {
                  setShowingWoForm(true);
                  return false;
                }
                if (actionId === 'RECEIVE_MATERIAL') {
                  setShowingMaterialForm(true);
                  return false;
                }
                if (actionId === 'ASSIGN_TECHNICIANS') {
                  setShowingTechForm(true);
                  return false;
                }
                if (actionId === 'START_TESTING') {
                  setShowingTestingForm(true);
                }
                if (actionId === 'GENERATE_REPORT') {
                  generateReportActionRef.current = performAction;
                  await handleGenerateReport();
                  return false;
                }
                if (actionId === 'GENERATE_INVOICE') {
                  const existingInvoice = linkedDocs.find((d) => d.document_type === 'Tax Invoice');
                  if (existingInvoice) {
                    const success = await performAction(actionId);
                    if (success) reloadEditingRecord();
                    return false;
                  }
                }
              }}
            />

            {/* Modals & Dialogs Group */}
            <Dialog open={showingWoForm} onOpenChange={setShowingWoForm}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-orange-600">
                    <FileText className="w-5 h-5" /> Receive Work Order
                  </DialogTitle>
                </DialogHeader>
                <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-semibold">Client Work Order ID</Label>
                    <Input
                      autoFocus
                      placeholder="e.g. WO/2026/088"
                      value={woId}
                      onChange={(e) => setWoId(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowingWoForm(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-orange-500 text-white"
                      onClick={handleReceiveWorkOrder}
                      disabled={!woId}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showingMaterialForm} onOpenChange={setShowingMaterialForm}>
              <DialogContent className="max-w-[1200px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Material Samples Input</DialogTitle>
                </DialogHeader>
                <MaterialInwardManager
                  initialJobId={editingRecord.id}
                  onClose={() => setShowingMaterialForm(false)}
                  onSuccess={() => {
                    setShowingMaterialForm(false);
                    reloadEditingRecord();
                  }}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={showingTechForm} onOpenChange={setShowingTechForm}>
              <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Assign Technician</DialogTitle>
                </DialogHeader>
                <TechnicianAssignment
                  jobId={editingRecord.id}
                  onComplete={() => {
                    setShowingTechForm(false);
                    reloadEditingRecord();
                  }}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={showingTestingForm} onOpenChange={setShowingTestingForm}>
              <DialogContent className="max-w-[1200px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Testing Data Entry</DialogTitle>
                </DialogHeader>
                <TestingManager
                  initialJobId={editingRecord.id}
                  onClose={() => {
                    setShowingTestingForm(false);
                    reloadEditingRecord();
                  }}
                  onSave={reloadEditingRecord}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={showingAuditLogs} onOpenChange={setShowingAuditLogs}>
              <DialogContent className="max-w-[800px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-blue-600">
                    <FileText className="w-5 h-5" />
                    Job Audit Logs: {editingRecord.job_code}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto mt-4 pr-2">
                  {loadingLogs ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <p className="text-xs font-medium uppercase tracking-widest">
                        Loading Logs...
                      </p>
                    </div>
                  ) : auditLogs.length > 0 ? (
                    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                              Date & Time
                            </th>
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                              User
                            </th>
                            {/* <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Action</th> */}
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                              Transition
                            </th>
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                              Remarks
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                          {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                              <td className="p-3 font-medium text-gray-600 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-gray-900">
                                  {log.users?.full_name || log.users?.username || '-'}
                                </div>
                              </td>
                              {/* <td className="p-3">
                                                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-bold uppercase">
                                                                    {ACTIONS[log.action_id]?.label || log.action_id}
                                                                </Badge>
                                                            </td> */}
                              <td className="p-3">
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className="text-gray-600">
                                    {getStatusLabel(log.from_state)}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-blue-600" />
                                  <span className="font-bold text-primary">
                                    {getStatusLabel(log.to_state)}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-gray-500 italic">{log.remarks || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                      <AlertCircle className="w-8 h-8 opacity-20" />
                      <p className="text-xs font-medium uppercase tracking-widest italic">
                        No logs found for this job.
                      </p>
                    </div>
                  )}
                </div>
                {/* <div className="mt-2 flex justify-end">
                                    <Button onClick={() => setShowingAuditLogs(false)} className="rounded-xl px-8 h-10">
                                        Close
                                    </Button>
                                </div> */}
              </DialogContent>
            </Dialog>

            {/* Linked Documents Summary */}
            {(canModify || isAnalyst) &&
              linkedDocs.length > 0 &&
              (() => {
                const visibleDocs = canModify
                  ? linkedDocs
                  : linkedDocs.filter((d) => d.document_type === 'Report');
                if (visibleDocs.length === 0) return null;
                return (
                  <div className="p-4 bg-white rounded-sm border border-gray-100 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Job Documents
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {visibleDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-between group hover:bg-gray-50 hover:border-primary/30 transition-all cursor-pointer"
                          onClick={() => {
                            if (doc.document_type === 'Report' && doc.content) {
                              setReportPreviewData(doc.content);
                              setShowingReportPreview(true);
                            } else {
                              navigate(`/doc/${doc.id}`);
                            }
                          }}
                        >
                          <div className="space-y-0.5">
                            <div className="text-[9px] font-bold text-primary uppercase tracking-wider">
                              {doc.document_type}
                            </div>
                            <div className="font-mono text-xs font-bold text-gray-700">
                              {doc.document_type === 'Quotation'
                                ? (doc.version && doc.version > 1 ? `${doc.quote_number}/R${doc.version - 1}` : doc.quote_number)
                                : doc.quote_number}
                            </div>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-primary" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
          </div>
        )}

        {/* Main Content Sections */}
        <div className="space-y-10 !mt-2">
          <div
            className={cn(
              'bg-white p-4 rounded-sm border border-gray-100 shadow-sm',
              canModify ? 'block' : 'hidden'
            )}
          >
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                Client Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs text-gray-700 font-semibold">Client</Label>
                  {canModify ? (
                    <ReactSelect
                      className="mt-1 text-xs"
                      classNamePrefix="react-select"
                      options={clients.map((c) => ({ value: c.id, label: c.clientName || c.client_name || '' }))}
                      value={
                        editingRecord.client_id
                          ? {
                              value: editingRecord.client_id,
                              label:
                                clients.find((c) => String(c.id) === String(editingRecord.client_id))?.clientName ||
                                clients.find((c) => String(c.id) === String(editingRecord.client_id))?.client_name ||
                                editingRecord.clients?.client_name ||
                                editingRecord.clients?.clientName ||
                                editingRecord.client_name ||
                                '',
                            }
                          : null
                      }
                      onChange={(option) =>
                        setEditingRecord({
                          ...editingRecord,
                          client_id: option ? option.value : '',
                        })
                      }
                      placeholder="Search Clients..."
                      isSearchable
                      isClearable
                      // isDisabled={!isAdmin()}
                      styles={themedReactSelectStyles({
                        minHeight: '40px',
                        borderRadius: '0.75rem',
                        fontSize: '0.75rem',
                      })}
                    />
                  ) : (
                    <p className="text-xs h-10 flex items-center px-4 bg-gray-50/50 border border-gray-100 rounded-xl text-gray-600">
                      {editingRecord.clients?.client_name || editingRecord.client_name || ''}
                    </p>
                  )}
                </div>
                {!isAddingNew && editingRecord.work_order_id && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-700 font-semibold">Work Order ID</Label>
                    {!canModify && (
                      <p className="text-xs h-10 flex items-center px-4 bg-gray-50/50 border border-gray-100 rounded-xl text-gray-600">
                        {editingRecord.work_order_id || ''}
                      </p>
                    )}
                    {canModify && (
                      <Input
                        className="text-xs h-10 border-gray-200 rounded-xl bg-white"
                        value={editingRecord.work_order_id || ''}
                        onChange={(e) =>
                          setEditingRecord({ ...editingRecord, work_order_id: e.target.value })
                        }
                        placeholder="e.g. WO/2026/088"
                      />
                    )}
                  </div>
                )}
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label className="text-xs text-gray-700 font-semibold">Project Name</Label>
                  {!canModify && (
                    <p className="text-xs min-h-20 flex items-start px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-gray-600 whitespace-pre-wrap">
                      {editingRecord.project_name || ''}
                    </p>
                  )}
                  {canModify && (
                    <Textarea
                      className="text-xs min-h-24 border-gray-200 rounded-xl bg-white"
                      value={editingRecord.project_name || ''}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, project_name: e.target.value })
                      }
                      placeholder="Enter project name"
                    />
                  )}
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label className="text-xs text-gray-700 font-semibold">Project Address</Label>
                  {!canModify && (
                    <p className="text-xs h-10 flex items-center px-4 bg-gray-50/50 border border-gray-100 rounded-xl text-gray-600">
                      {editingRecord.project_address || ''}
                    </p>
                  )}
                  {canModify && (
                    <Input
                      className="text-xs h-10 border-gray-200 rounded-xl bg-white"
                      value={editingRecord.project_address || ''}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, project_address: e.target.value })
                      }
                      placeholder="Enter project address"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {!isAddingNew && (
            <>
              {/* Quotation Summary */}
              {linkedDocs.find((d) => d.document_type === 'Quotation') && (
                <div className="bg-white !mt-2 rounded-2xl shadow-sm bg-white p-4 rounded-sm border border-gray-100 shadow-sm block">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 ">
                      <FileText className="w-4 h-4" /> Quotation Summary
                    </h3>
                    {canModify && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/doc/${linkedDocs.find((d) => d.document_type === 'Quotation').id}`
                          )
                        }
                        className="h-8 text-xs text-primary hover:bg-primary/5"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> View Full Document
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                            Description
                          </th>
                          <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px] text-center">
                            Qty
                          </th>
                          <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px] text-center">
                            Unit
                          </th>
                          <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px] text-right">
                            Unit Price
                          </th>
                          <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px] text-right">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {(
                          linkedDocs.find((d) => d.document_type === 'Quotation')?.content?.items ||
                          []
                        ).map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                            <td className="p-3 text-gray-700 font-medium whitespace-pre-wrap">
                              {item.description}
                            </td>
                            <td className="p-3 text-center text-gray-500">{item.qty}</td>
                            <td className="p-3 text-center text-gray-500">{item.unit}</td>
                            <td className="p-3 text-right text-gray-500 tabular-nums">
                              ₹{Number(item.price || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 text-right font-bold text-gray-900 tabular-nums">
                              ₹{Number(item.total || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50/50">
                          <td
                            colSpan="4"
                            className="p-3 text-right font-bold text-gray-400 uppercase tracking-widest"
                          >
                            Grand Total (Incl. Tax)
                          </td>
                          <td className="p-3 text-right font-black text-primary text-sm tabular-nums">
                            ₹
                            {Number(
                              computeGrandTotal(
                                linkedDocs.find((d) => d.document_type === 'Quotation')
                              ) || 0
                            ).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Materials Summary */}
              {Object.values(WORKFLOW_STATES).indexOf(editingRecord.status) >=
                Object.values(WORKFLOW_STATES).indexOf(WORKFLOW_STATES.MATERIAL_RECEIVED) && (
                <div className="bg-white !mt-2 rounded-2xl shadow-sm bg-white p-4 rounded-sm border border-gray-100 shadow-sm block">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Package className="w-4 h-4" /> Material Inward Details
                    </h3>
                    {canModify && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowingMaterialForm(true)}
                        className="h-8 text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" /> Edit Entries
                      </Button>
                    )}
                  </div>
                  {jobSamples.length === 0 ? (
                    <div className="text-center py-8 px-4 border border-dashed rounded-xl bg-gray-50/50 text-gray-500 text-sm flex flex-col items-center gap-2">
                      <Package className="w-8 h-8 text-gray-305" />
                      <p>No material samples needed or registered for this job.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                              Code
                            </th>
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                              Material Type
                            </th>
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                              Description
                            </th>
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px] text-center">
                              Qty
                            </th>
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px] text-right">
                              Date
                            </th>
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px] text-right">
                              Collected By
                            </th>
                            <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px] text-right">
                              Collected At
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                          {jobSamples.map((s, i) => (
                            <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                              <td className="p-3 font-bold text-gray-900">{s.sample_code}</td>
                              <td className="p-3 text-gray-500">
                                {materials.find((m) => String(m.id) === String(s.material_type))
                                  ?.name ||
                                  s.material_type ||
                                  '-'}
                              </td>
                              <td className="p-3 text-gray-500">{s.sample_description}</td>
                              <td className="p-3 text-center text-gray-500">{s.quantity}</td>
                              <td className="p-3 text-right text-gray-400">{s.received_date}</td>
                              <td className="p-3 text-right text-gray-400">
                                {s.users?.full_name || '-'}
                              </td>
                              <td className="p-3 text-right text-gray-400">
                                {s.collection_centers?.name || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {Object.values(WORKFLOW_STATES).indexOf(editingRecord.status) >=
                Object.values(WORKFLOW_STATES).indexOf(WORKFLOW_STATES.TECHNICIANS_ASSIGNED) && (
                <div className="bg-white !mt-2 rounded-2xl shadow-sm bg-white p-4 rounded-sm border border-gray-100 shadow-sm block">
                  {(canModify || user?.role === ROLES.MRO.slug) && (
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Technician Assignments
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowingTechForm(true)}
                        className="h-8 text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" /> Edit Assignments
                      </Button>
                    </div>
                  )}
                  <div className="overflow-x-auto border rounded-xl shadow-sm bg-white overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-[9px]">
                            Assigned Technician
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {techAssignments.map((a, i) => (
                          <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                            <td className="p-3 font-bold text-gray-900">
                              {a.full_name || a.username}
                            </td>
                          </tr>
                        ))}
                        {techAssignments.length === 0 && (
                          <tr>
                            <td className="p-3 text-gray-500 italic">
                              No technician assigned yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Testing Data */}
              {Object.values(WORKFLOW_STATES).indexOf(editingRecord.status) >=
                Object.values(WORKFLOW_STATES).indexOf(WORKFLOW_STATES.UNDER_TESTING) && (
                <div className="bg-white !mt-2 rounded-2xl bg-white p-4 rounded-sm border border-gray-100 shadow-sm block">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Testing Data
                  </h3>
                  <TestingManager initialJobId={editingRecord.id} onSave={reloadEditingRecord} />
                </div>
              )}
            </>
          )}
        </div>

        {canModify && (
          <div className="flex justify-end gap-3 pt-8 border-t">
            <Button
              variant="outline"
              className="h-10 p-2 text-xs rounded-lg dark:text-white"
              onClick={() => {
                // Close the edit view without saving
                setEditingRecord(null);
                setIsAddingNew(false);
                navigate('/settings/jobs');
              }}
            >
              Cancel
            </Button>
            <Button
              className="h-10 p-2 text-xs rounded-lg bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 dark:text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{' '}
              Save Job Details
            </Button>
          </div>
        )}

        {showingReportPreview && reportPreviewData && (
          <ReportPreview
            formData={reportPreviewData}
            onClose={() => {
              setShowingReportPreview(false);
              if (!linkedDocs.find((d) => d.document_type === 'Report')) {
                generateReportActionRef.current = null;
              }
            }}
            onSave={generateReportActionRef.current ? handleSaveReport : undefined}
            isSaving={isSavingReport}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by Job ID or Client..."
              className="pl-10 w-full h-10 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              {canModify && (
                <Button
                  onClick={() => {
                    setEditingRecord({
                      status: WORKFLOW_STATES.JOB_CREATED,
                      project_name: '',
                      client_id: '',
                    });
                    setIsAddingNew(true);
                  }}
                  className="bg-primary hover:bg-primary-dark text-white h-10 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" /> New Job
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-gray-800">
              <p className="text-xs">Create a new testing job for a client</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Filters and Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showFilters ? 'secondary' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-10 px-4 rounded-xl transition-all border-gray-200 ${showFilters ? 'bg-primary/10 text-primary border-primary/20' : 'bg-gray-50/50'}`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="text-sm font-bold uppercase tracking-widest leading-none">
                    Filters
                  </span>
                  {(filterStatus !== 'all' ||
                    filterByCreator !== 'all' ||
                    filterByClient !== 'all' ||
                    filterDateStart ||
                    filterDateEnd) && (
                    <Badge className="ml-2 bg-primary text-white scale-75">!</Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                <p className="text-xs">Show advanced filtering options</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={downloadCSV}
                  disabled={filteredRecords.length === 0}
                  className="hidden h-10 px-4 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all text-sm font-bold uppercase tracking-widest leading-none"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span>Export CSV</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                <p className="text-xs">Download filtered jobs as CSV</p>
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
                Sort
              </span>
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="w-40 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="job_code">Job Code</SelectItem>
                  <SelectItem value="client_name">Client Name</SelectItem>
                  <SelectItem value="quotationAmount">Amount</SelectItem>
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 border-gray-200 bg-gray-50/50 rounded-lg"
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

          <div className="text-sm text-gray-500 font-bold uppercase tracking-widest">
            Showing{' '}
            <span className="text-primary">
              {filteredRecords.length === 0 ? 0 : startIndex + 1}–
              {Math.min(endIndex, filteredRecords.length)}
            </span>{' '}
            of <span className="text-primary">{filteredRecords.length}</span> Jobs
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <Filter className="w-4 h-4 mr-2 text-primary" />
                Advanced Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAll}
                className="text-xs text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest"
              >
                <X className="w-3 h-3 mr-1" /> Reset All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Status
                </Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {Object.entries(workflow.states).map(([id, s]) => (
                      <SelectItem key={id} value={id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Quick Date
                </Label>
                <Select value={datePreset} onValueChange={applyDatePreset}>
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="Custom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Range</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  From Date
                </Label>
                <AppDatePicker
                  value={filterDateStart}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setFilterDateStart(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  To Date
                </Label>
                <AppDatePicker
                  value={filterDateEnd}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setFilterDateEnd(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Created By
                </Label>
                <Select value={filterByCreator} onValueChange={setFilterByCreator}>
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {creators.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Client Filter */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Client
                </Label>
                <ReactSelect
                  value={
                    filterByClient === 'all'
                      ? { value: 'all', label: 'All Clients' }
                      : {
                          value: filterByClient,
                          label:
                            clients.find((c) => String(c.id) === filterByClient)?.client_name ||
                            filterByClient,
                        }
                  }
                  onChange={(selectedOption) => setFilterByClient(selectedOption.value)}
                  options={[
                    { value: 'all', label: 'All Clients' },
                    ...clients.map((c) => ({ value: String(c.id), label: c.client_name })),
                  ]}
                  isSearchable
                  isClearable={false}
                  placeholder="All Clients"
                  styles={themedReactSelectStyles()}
                  className="text-sm w-full"
                  classNamePrefix="react-select"
                  menuPortalTarget={document.body}
                  menuPosition={'fixed'}
                />
              </div>
            </div>
          </div>
        )}
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
            Showing {filteredRecords.length === 0 ? 0 : startIndex + 1}-
            {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length}
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
                <th className="text-left py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Job Code
                </th>
                <th className="text-left py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Client & Project Name
                </th>
                <th className="text-right py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Amount
                </th>
                <th className="text-left py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Created On
                </th>
                <th className="text-left py-3 px-2 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Created By
                </th>
                <th className="text-center py-3 px-2 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Status
                </th>
                <th className="text-center py-3 px-2 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    No jobs found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-3 align-top whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-gray-700">
                        {r.job_code}
                      </div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="font-semibold text-gray-900 break-words">
                        {r.clients?.client_name || '-'}
                      </div>
                      {r.project_name && (
                        <div
                          className="mt-1 text-xs text-gray-500 break-words whitespace-normal"
                          title={r.project_name}
                        >
                          {r.project_name}
                        </div>
                      )}
                      {r.clients?.gstin && (
                        <div className="mt-2 text-[10px] text-gray-400 break-all">
                          GSTIN: {r.clients.gstin}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap align-top">
                      {r.quotationAmount != null ? (
                        <span className="font-bold text-gray-900 tabular-nums">
                          <Rupee />
                          {Math.floor(r.quotationAmount).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-gray-300 font-bold">—</span>
                      )}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap text-gray-600 align-top">
                      {safeFormatDate(r.created_at)}
                    </td>
                    <td className="py-4 px-2 whitespace-nowrap text-gray-600 align-top">
                      {r.users ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help select-none font-semibold hover:text-primary transition-colors">
                                {r.users.full_name || r.users.username || '-'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-800 p-3 rounded-lg shadow-md space-y-1 text-xs">
                              <div>
                                <span className="text-gray-400 font-medium">Role:</span>{' '}
                                <span className="font-bold text-white capitalize">
                                  {Object.values(ROLES).find((ro) => ro.slug === r.users.role)?.label || r.users.role || 'User'}
                                </span>
                              </div>
                              {(r.users.departments || []).length > 0 && (
                                <div>
                                  <span className="text-gray-400 font-medium">Department:</span>{' '}
                                  <span className="font-bold text-white">
                                    {(r.users.departments || [])
                                      .map((dVal) => {
                                        const found = DEPARTMENTS.find((d) => String(d.id) === String(dVal) || d.name === dVal);
                                        return found ? found.name : dVal;
                                      })
                                      .filter(Boolean)
                                      .join(', ')}
                                  </span>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        r.created_by || '-'
                      )}
                    </td>
                    <td className="py-4 px-2 text-center whitespace-nowrap align-top">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${getStatusBadgeClasses(r.status)}`}
                      >
                        {getStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="py-4 px-2 align-top">
                      <div className="flex justify-center items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => navigate(`/settings/jobs/${r.id}`)}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border-gray-800">
                            <p className="text-xs">Open Job</p>
                          </TooltipContent>
                        </Tooltip>

                        {isAdmin() && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteClick(r)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-800">
                              <p className="text-xs">Delete this job</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setDeleteConfirmation({ isOpen: false, jobId: null, jobCode: '' })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              Delete Job?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete job{' '}
              <span className="font-semibold text-gray-900">{deleteConfirmation.jobCode}</span>?
              This action cannot be undone and will remove all associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Delete It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobsManager;
