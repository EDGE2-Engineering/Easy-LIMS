import React, { useState, useRef, useEffect, useMemo } from 'react';
import QuotationContent from '@/components/QuotationContent';
import PagedPreview from '@/components/PagedPreview';
import {
  Plus,
  Trash2,
  Printer,
  FileText,
  ArrowLeft,
  X,
  Building2,
  Save,
  Loader2,
  CreditCard,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Axe,
  TestTube,
  BriefcaseBusiness,
  Drill,
  SwatchBook,
  Unlink,
  ArrowUp,
  ArrowDown,
  ListOrdered,
} from 'lucide-react';
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
  useParams,
  useBlocker,
} from 'react-router-dom';
import Navbar from '@/components/Navbar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFieldTests } from '@/contexts/FieldTestsContext';
import { useLabTests } from '@/contexts/LabTestsContext';
import { useSampling } from '@/contexts/SamplingContext';
import { usePackages } from '@/contexts/PackagesContext';
import { useClients } from '@/contexts/ClientsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTermsAndConditions } from '@/contexts/TermsAndConditionsContext';
import { useTechnicals } from '@/contexts/TechnicalsContext';
import { usePaymentTerms } from '@/contexts/PaymentTermsContext';
import { useBankAccounts } from '@/contexts/BankAccountsContext';
import Rupee from '@/components/Rupee';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { themedReactSelectStyles } from '@/lib/reactSelectStyles';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import ReactSelect from 'react-select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import {
  DOCUMENT_ITEM_TYPE_KEYS,
  DOCUMENT_ITEM_TYPE_OPTIONS,
  getDocumentItemTypeLabel,
  getSiteContent,
  ROLES,
  WORKFLOW_STATES,
} from '@/data/config';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { sendTelegramNotification } from '@/lib/notifier';
// Paged.js CSS is loaded as a static asset: /quotation-print.css

// Helper function to convert number to words (Indian numbering system)
const numberToWords = (num) => {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  const convertLessThanThousand = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return (
      ones[Math.floor(n / 100)] +
      ' Hundred' +
      (n % 100 !== 0 ? ' and ' + convertLessThanThousand(n % 100) : '')
    );
  };

  // Split into integer and decimal parts
  const [integerPart, decimalPart] = num.toFixed(2).split('.');
  const intNum = parseInt(integerPart);

  if (intNum === 0) {
    return decimalPart && parseInt(decimalPart) > 0
      ? 'Zero Rupees and ' + convertLessThanThousand(parseInt(decimalPart)) + ' Paise'
      : 'Zero Rupees';
  }

  let result = '';

  // Crores
  if (intNum >= 10000000) {
    result += convertLessThanThousand(Math.floor(intNum / 10000000)) + ' Crore ';
  }

  // Lakhs
  const lakhs = Math.floor((intNum % 10000000) / 100000);
  if (lakhs > 0) {
    result += convertLessThanThousand(lakhs) + ' Lakh ';
  }

  // Thousands
  const thousands = Math.floor((intNum % 100000) / 1000);
  if (thousands > 0) {
    result += convertLessThanThousand(thousands) + ' Thousand ';
  }

  // Hundreds
  const remainder = intNum % 1000;
  if (remainder > 0) {
    result += convertLessThanThousand(remainder);
  }

  result = result.trim() + ' Rupees';

  // Add paise if present
  if (decimalPart && parseInt(decimalPart) > 0) {
    result += ' and ' + convertLessThanThousand(parseInt(decimalPart)) + ' Paise';
  }

  return result + ' Only';
};

const NewQuotationPage = () => {
  const { fieldTests, clientFieldTestPrices } = useFieldTests();
  const { labTests, clientLabTestPrices } = useLabTests();
  const { samplingData } = useSampling();
  const { packages } = usePackages();
  const { clients } = useClients();
  const { settings } = useSettings();
  const { bankAccounts, loading: accountsLoading } = useBankAccounts();
  const { terms } = useTermsAndConditions();
  const { technicals } = useTechnicals();
  const { paymentTerms } = usePaymentTerms();
  const { user, isStandard } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { id: pathId } = useParams();
  const navigate = useNavigate();
  const [savedRecordId, setSavedRecordId] = useState(pathId || searchParams.get('id') || null);
  const [loadedDocumentType, setLoadedDocumentType] = useState(null);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [lastSavedData, setLastSavedData] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [docVersions, setDocVersions] = useState([]);
  const [showVersionSwitchConfirm, setShowVersionSwitchConfirm] = useState(false);
  const [targetVersionToLoad, setTargetVersionToLoad] = useState(null);
  const [showSaveAsNewConfirm, setShowSaveAsNewConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [linkedJobId, setLinkedJobId] = useState(searchParams.get('jobId') || null);
  const [documentCreatorId, setDocumentCreatorId] = useState(null);
  const [showAutoJobDialog, setShowAutoJobDialog] = useState(false);
  const bypassJobCheckRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const isReadOnly = useMemo(() => {
    const restrictedRoles = [ROLES.ACCOUNTS.slug, ROLES.MRO.slug];
    return (
      restrictedRoles.includes(user?.role) &&
      savedRecordId &&
      (documentCreatorId === null || documentCreatorId !== user?.id)
    );
  }, [user, savedRecordId, documentCreatorId]);

  const defaultQuoteDetails = useMemo(
    () => ({
      clientName: '',
      clientAddress: '',
      gstin: '',
      contractorName: '',
      contractorAddress: '',
      projectName: '',
      projectAddress: '',
      email: '',
      phone: '',
      name: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      quoteNumber: '',

      generatedBy: user?.fullName || '',
      paymentDate: '',
      paymentMode: '',
      paymentAmount: '',
      bankDetails: '',
      selectedBankId: '',
      selectedTcTypes: [],
      selectedTechTypes: [],
      selectedPaymentTermsTypes: [],
    }),
    [user?.fullName]
  );

  const [quoteDetails, setQuoteDetails] = useState(defaultQuoteDetails);
  const [items, setItems] = useState([]);
  const [newItemType, setNewItemType] = useState(DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [targetPackageGroupId, setTargetPackageGroupId] = useState('');
  const [hoveredPackageGroupId, setHoveredPackageGroupId] = useState(null);
  const [qty, setQty] = useState(1);
  const [documentType, setDocumentType] = useState(searchParams.get('type') || 'Quotation'); // 'Tax Invoice', 'Quotation', 'Proforma Invoice', 'Purchase Order', or 'Delivery Challan'
  const [discount, setDiscount] = useState(0);
  const [discountShow, setDiscountShow] = useState(true);
  const [daysShow, setDaysShow] = useState(true);
  const [sealShow, setSealShow] = useState(true);
  const [isInterstate, setIsInterstate] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [clientNameSelection, setClientNameSelection] = useState(''); // Predefined client or 'Other'
  const [customClientName, setCustomClientName] = useState('');
  const [contactSelectionIdx, setContactSelectionIdx] = useState('');

  const taxCGST = settings?.tax_cgst ? Number(settings.tax_cgst) : 9;
  const taxSGST = settings?.tax_sgst ? Number(settings.tax_sgst) : 9;
  const taxIGST = settings?.tax_igst ? Number(settings.tax_igst) : 18;
  const taxTotalPercent = isInterstate ? taxIGST : taxCGST + taxSGST;

  const currentData = useMemo(
    () => ({
      quoteDetails,
      items,
      documentType,
      discount,
      discountShow,
      daysShow,
      sealShow,
      isInterstate,
    }),
    [quoteDetails, items, documentType, discount, discountShow, daysShow, sealShow, isInterstate]
  );

  const uniquePackageGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();
    items.forEach((item) => {
      if (item.packageGroupId && !seen.has(item.packageGroupId)) {
        seen.add(item.packageGroupId);
        groups.push({
          packageGroupId: item.packageGroupId,
          packageId: item.packageId,
          packageName: item.packageName,
        });
      }
    });
    return groups;
  }, [items]);

  // Compute aggregated T&C and Technicals from items, merging with legacy manually selected ones if present
  const derivedTcTypes = useMemo(() => {
    const itemTcTypes = items.flatMap((item) => item.tcList || []);
    const legacyTcTypes = quoteDetails.selectedTcTypes || [];
    return [...new Set([...itemTcTypes, ...legacyTcTypes])];
  }, [items, quoteDetails.selectedTcTypes]);

  const derivedTechTypes = useMemo(() => {
    const itemTechTypes = items.flatMap((item) => item.techList || []);
    const legacyTechTypes = quoteDetails.selectedTechTypes || [];
    return [...new Set([...itemTechTypes, ...legacyTechTypes])];
  }, [items, quoteDetails.selectedTechTypes]);

  const derivedPaymentTermsTypes = useMemo(() => {
    const itemPaymentTermsTypes = items.flatMap((item) => {
      if (Array.isArray(item.paymentTermsList) && item.paymentTermsList.length > 0) {
        return item.paymentTermsList;
      }
      // Fallback lookup for historical documents
      let fallbackList = [];
      if (item.type === DOCUMENT_ITEM_TYPE_KEYS.LAB_TESTS) {
        const matched = (labTests || []).find((t) => String(t.id) === String(item.sourceId));
        if (matched) fallbackList = matched.paymentTermsList || [];
      } else if (item.type === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS) {
        const matched = (fieldTests || []).find((t) => String(t.id) === String(item.sourceId));
        if (matched) fallbackList = matched.paymentTermsList || [];
      } else if (item.type === DOCUMENT_ITEM_TYPE_KEYS.SAMPLING) {
        const matched = (samplingData || []).find((t) => String(t.id) === String(item.sourceId));
        if (matched) fallbackList = matched.paymentTermsList || [];
      }
      return fallbackList;
    });
    const legacyPaymentTermsTypes = quoteDetails.selectedPaymentTermsTypes || [];
    return [...new Set([...itemPaymentTermsTypes, ...legacyPaymentTermsTypes])];
  }, [items, quoteDetails.selectedPaymentTermsTypes, labTests, fieldTests, samplingData]);

  // Navigation guard for unsaved changes (Browser back/forward/links)
  const isDirty = useMemo(() => {
    if (!lastSavedData) return false;
    try {
      return JSON.stringify(currentData) !== lastSavedData;
    } catch (e) {
      return false;
    }
  }, [currentData, lastSavedData]);

  // Initial snapshot for new documents
  useEffect(() => {
    if (!pathId && !searchParams.get('id') && !lastSavedData) {
      setLastSavedData(JSON.stringify(currentData));
    }
  }, [pathId, searchParams]);

  const blocker = useBlocker(
    ({ nextLocation }) =>
      isDirty &&
      !isSavingRecord &&
      (nextLocation.pathname !== location.pathname || nextLocation.state?.forceReset)
  );

  const handleReset = React.useCallback(() => {
    setQuoteDetails(defaultQuoteDetails);
    setItems([]);
    setNewItemType(DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS);
    setSelectedItemId('');
    setSelectedPackageId('');
    setTargetPackageGroupId('');
    setQty(1);
    setDocumentType('Quotation');
    setDiscount(0);
    setDiscountShow(true);
    setDaysShow(true);
    setIsInterstate(false);
    setComboboxOpen(false);
    setSearchValue('');
    setClientNameSelection('');
    setCustomClientName('');
    setContactSelectionIdx('');
    setSavedRecordId(null);
    setDocumentCreatorId(null);
    setLoadedDocumentType(null);
    setCurrentVersion(1);

    const initialSnapshot = {
      quoteDetails: defaultQuoteDetails,
      items: [],
      documentType: 'Quotation',
      discount: 0,
      discountShow: true,
      daysShow: true,
      sealShow: true,
      isInterstate: false,
    };
    setLastSavedData(JSON.stringify(initialSnapshot));

    navigate('/doc/new', { replace: true });
  }, [defaultQuoteDetails, setSearchParams, navigate]);

  const handleBack = () => {
    if (linkedJobId) {
      navigate(`/settings/jobs/${linkedJobId}`);
    } else {
      navigate('/');
    }
  };

  // Navigation guard for unsaved changes (Page reload/close)

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Standard way to show confirmation
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Path-based logic: handle reset via /doc/new or forceReset state
  useEffect(() => {
    // Reset if explicitly requested via state (e.g. Navbar click)
    // OR if we are on the /new route but still have a saved record ID in state (and aren't currently saving/transitioning)
    const isExplicitReset = !!location.state?.forceReset;
    const isAbandonedRecord =
      location.pathname === '/doc/new' &&
      !pathId &&
      savedRecordId !== null &&
      !isSavingRecord &&
      !isNavigatingRef.current;

    if (isExplicitReset || isAbandonedRecord) {
      handleReset();
    }
  }, [
    location.pathname,
    location.state?.forceReset,
    handleReset,
    savedRecordId,
    isSavingRecord,
    pathId,
  ]);

  // Generate client options from loaded clients
  const CLIENT_OPTIONS = [
    ...(clients || []).map((client) => ({
      value: client.clientName,
      label: client.clientName,
    })),
  ];

  // Reset selection and search when switching between Service and Test
  useEffect(() => {
    setSelectedItemId('');
    setSearchValue('');
  }, [newItemType]);

  // Auto-populate generatedBy from logged-in user if not already set
  useEffect(() => {
    if (user?.fullName && !quoteDetails.generatedBy) {
      setQuoteDetails((prev) => {
        const updated = { ...prev, generatedBy: user.fullName };

        // Keep lastSavedData synchronized so auto-population doesn't mark doc as dirty
        setLastSavedData((prevSaved) => {
          if (!prevSaved)
            return JSON.stringify({
              quoteDetails: updated,
              items,
              documentType,
              discount,
              discountShow,
              sealShow,
            });
          try {
            const parsed = JSON.parse(prevSaved);
            if (JSON.stringify(parsed.quoteDetails) === JSON.stringify(prev)) {
              parsed.quoteDetails.generatedBy = user.fullName;
              return JSON.stringify(parsed);
            }
          } catch (e) { }
          return prevSaved;
        });

        return updated;
      });
    }
  }, [user, quoteDetails.generatedBy, items, documentType, discount, discountShow]);

  // Auto-select default bank account if not already set
  useEffect(() => {
    if (bankAccounts.length > 0 && !quoteDetails.selectedBankId) {
      const defaultAcc = bankAccounts.find((a) => a.is_default) || bankAccounts[0];
      if (defaultAcc) {
        setQuoteDetails((prev) => ({ ...prev, selectedBankId: defaultAcc.id }));
      }
    }
  }, [bankAccounts, quoteDetails.selectedBankId]);

  const selectedBank = useMemo(() => {
    if (bankAccounts.length === 0) return null;
    return (
      bankAccounts.find((a) => a.id === quoteDetails.selectedBankId) ||
      bankAccounts.find((a) => a.is_default) ||
      bankAccounts[0]
    );
  }, [bankAccounts, quoteDetails.selectedBankId]);

  // Sync clientNameSelection with quoteDetails.clientName on mount/load
  useEffect(() => {
    if (clients.length > 0 && quoteDetails.clientName) {
      const foundClient = clients.find(
        (c) => (c.clientName || '').trim() === quoteDetails.clientName.trim()
      );

      if (foundClient) {
        if (clientNameSelection !== foundClient.clientName) {
          setClientNameSelection(foundClient.clientName);

          // Also try to find matching contact or set primary
          const contacts = foundClient.contacts || [];
          let currentIdx = contacts.findIndex(
            (con) =>
              (con.contact_person || '').trim().toLowerCase() ===
              (quoteDetails.name || '').trim().toLowerCase()
          );
          if (currentIdx === -1) {
            currentIdx = contacts.findIndex(
              (con) =>
                (con.contact_email || '').trim().toLowerCase() ===
                (quoteDetails.email || '').trim().toLowerCase()
            );
          }
          if (currentIdx === -1) {
            currentIdx = contacts.findIndex(
              (con) =>
                (con.contact_phone || '').trim().toLowerCase() ===
                (quoteDetails.phone || '').trim().toLowerCase()
            );
          }
          if (currentIdx === -1) {
            const primaryIdx = contacts.findIndex((con) => con.is_primary);
            currentIdx = primaryIdx >= 0 ? primaryIdx : contacts.length > 0 ? 0 : -1;
          }

          if (currentIdx >= 0 && contactSelectionIdx === '') {
            setContactSelectionIdx(currentIdx.toString());
          }
        }
      } else if (quoteDetails.clientName !== '' && !clientNameSelection) {
        setClientNameSelection('Other');
        setCustomClientName(quoteDetails.clientName);
      }
    }
  }, [clients, quoteDetails.clientName, clientNameSelection, contactSelectionIdx]);

  // Load record from Supabase if ID is present
  useEffect(() => {
    const loadFromSupabase = async (id) => {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*, clients(*), jobs(*)')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data && data.content) {
          const content = data.content;
          const loadedQuoteDetails = { ...(content.quoteDetails || {}) };

          // Always use/refresh client details from the joined client record (clients table) if it exists
          if (data.clients) {
            loadedQuoteDetails.clientName = data.clients.client_name || '';
            loadedQuoteDetails.clientAddress = data.clients.client_address || '';
            loadedQuoteDetails.gstin = data.clients.gstin || '';

            // Find matching contact or fallback
            const contacts = Array.isArray(data.clients.contacts) ? data.clients.contacts : [];
            let matchedContact = null;

            // Try matching by name
            const savedContactName = (loadedQuoteDetails.name || '').trim().toLowerCase();
            if (savedContactName) {
              matchedContact = contacts.find(
                (c) => (c.contact_person || '').trim().toLowerCase() === savedContactName
              );
            }
            // Try matching by email
            if (!matchedContact && loadedQuoteDetails.email) {
              matchedContact = contacts.find(
                (c) =>
                  (c.contact_email || '').trim().toLowerCase() ===
                  loadedQuoteDetails.email.trim().toLowerCase()
              );
            }
            // Try matching by phone
            if (!matchedContact && loadedQuoteDetails.phone) {
              matchedContact = contacts.find(
                (c) =>
                  (c.contact_phone || '').trim().toLowerCase() ===
                  loadedQuoteDetails.phone.trim().toLowerCase()
              );
            }
            // Fallback to primary contact or first contact
            if (!matchedContact) {
              matchedContact = contacts.find((c) => c.is_primary) || contacts[0];
            }

            if (matchedContact) {
              loadedQuoteDetails.name = matchedContact.contact_person || '';
              loadedQuoteDetails.email = matchedContact.contact_email || '';
              loadedQuoteDetails.phone = matchedContact.contact_phone || '';
            } else {
              loadedQuoteDetails.name = '';
              loadedQuoteDetails.email = '';
              loadedQuoteDetails.phone = '';
            }
          }

          // Always use/refresh project details from the joined job record (jobs table) if it exists
          if (data.jobs) {
            loadedQuoteDetails.projectName = data.jobs.project_name || '';
            loadedQuoteDetails.projectAddress = data.jobs.project_address || '';
          }

          const loadedItems = content.items || [];
          const loadedDocType = data.document_type || 'Quotation';
          const loadedDiscount = content.discount || 0;
          const loadedDiscountShow =
            content.discountShow !== undefined ? String(content.discountShow) === 'true' : true;
          const loadedDaysShow =
            content.daysShow !== undefined ? String(content.daysShow) === 'true' : true;
          const loadedSealShow =
            content.sealShow !== undefined ? String(content.sealShow) === 'true' : true;
          const loadedIsInterstate =
            content.isInterstate !== undefined ? String(content.isInterstate) === 'true' : false;

          // Ensure quoteNumber is synced from the top-level column if it's missing or empty in JSON content
          const finalQuoteNumber = data.quote_number || loadedQuoteDetails.quoteNumber;
          if (finalQuoteNumber) {
            loadedQuoteDetails.quoteNumber = finalQuoteNumber;
          }

          setQuoteDetails(loadedQuoteDetails);
          setItems(loadedItems);
          setDocumentType(loadedDocType);
          setLoadedDocumentType(loadedDocType);
          setDiscount(loadedDiscount);
          setDiscountShow(loadedDiscountShow);
          setDaysShow(loadedDaysShow);
          setSealShow(loadedSealShow);
          setIsInterstate(loadedIsInterstate);
          setSavedRecordId(data.id);
          setDocumentCreatorId(data.created_by);
          if (data.job_id) setLinkedJobId(data.job_id);
          setCurrentVersion(data.version || 1);

          const snapshot = {
            quoteDetails: loadedQuoteDetails,
            items: loadedItems,
            documentType: loadedDocType,
            discount: loadedDiscount,
            discountShow: loadedDiscountShow,
            daysShow: loadedDaysShow,
            sealShow: loadedSealShow,
            isInterstate: loadedIsInterstate,
          };
          setLastSavedData(JSON.stringify(snapshot));

          toast({
            title: `${data.document_type} Loaded`,
            description: `Loaded ${data.document_type} ${data.quote_number}`,
          });
        }
      } catch (err) {
        console.error('Error loading record:', err);
        toast({
          title: 'Error',
          description: 'Failed to load record from database.',
          variant: 'destructive',
        });
      }
    };

    const id = searchParams.get('id') || pathId;
    if (id && !isSavingRecord) {
      loadFromSupabase(id);
    }
  }, [searchParams, pathId, isSavingRecord]); // Removed clients from dependencies to break loop

  const loadDocVersions = async (quoteNumber) => {
    if (!quoteNumber) {
      setDocVersions([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, version')
        .eq('quote_number', quoteNumber)
        .order('version', { ascending: true });
      if (error) throw error;
      setDocVersions(data || []);
    } catch (err) {
      console.error('Failed to load document versions:', err);
    }
  };

  useEffect(() => {
    if (quoteDetails.quoteNumber && documentType === 'Quotation') {
      loadDocVersions(quoteDetails.quoteNumber);
    } else {
      setDocVersions([]);
    }
  }, [quoteDetails.quoteNumber, documentType, savedRecordId]);

  // Load job details if jobId is present in searchParams (to pre-fill for a new document)
  useEffect(() => {
    const jobId = searchParams.get('jobId');
    const docType = searchParams.get('type') || 'Quotation';
    if (jobId && !savedRecordId && clients.length > 0) {
      const loadJobDetails = async () => {
        try {
          // Check if a document of this type already exists for this job
          const { data: existingDoc } = await supabase
            .from('documents')
            .select('id')
            .eq('job_id', jobId)
            .eq('document_type', docType)
            .maybeSingle();

          if (existingDoc) {
            navigate(`/doc/${existingDoc.id}`, { replace: true });
            return;
          }

          const { data, error } = await supabase
            .from('jobs')
            .select(
              `
                            *,
                            clients(*)
                        `
            )
            .eq('id', jobId)
            .single();

          if (error) throw error;

          if (data) {
            const client = data.clients;
            const contacts = client?.contacts || [];
            const primaryContact = contacts.find((con) => con.is_primary) || contacts[0] || {};
            const primaryIdx = contacts.findIndex((con) => con.is_primary);

            setQuoteDetails((prev) => {
              const newDetails = {
                ...prev,
                clientName: client?.client_name || '',
                clientAddress: client?.client_address || '',
                projectName: data.project_name || '',
                projectAddress: data.project_address || '',
                email: primaryContact.contact_email || client?.email || '',
                phone: primaryContact.contact_phone || client?.phone || '',
                name: primaryContact.contact_person || '',
              };

              // Synchronize lastSavedData to avoid marking doc as dirty immediately on job load
              setLastSavedData((prevSaved) => {
                if (!prevSaved)
                  return JSON.stringify({
                    quoteDetails: newDetails,
                    items,
                    documentType: docType,
                    discount,
                    discountShow,
                    sealShow,
                  });
                try {
                  const parsed = JSON.parse(prevSaved);
                  if (JSON.stringify(parsed.quoteDetails) === JSON.stringify(prev)) {
                    parsed.quoteDetails = newDetails;
                    return JSON.stringify(parsed);
                  }
                } catch (e) { }
                return prevSaved;
              });

              return newDetails;
            });

            if (client?.client_name) {
              setClientNameSelection(client.client_name);
              if (primaryIdx >= 0) {
                setContactSelectionIdx(primaryIdx.toString());
              } else if (contacts.length > 0) {
                setContactSelectionIdx('0');
              }
            }
          }
        } catch (err) {
          console.error('Error loading job details for pre-fill:', err);
        }
      };
      loadJobDetails();
    }
  }, [searchParams, savedRecordId, clients, navigate]);

  const handleSaveToDatabase = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to save to the database.',
        variant: 'destructive',
      });
      return;
    }

    // Prevent ACCOUNTS role from updating others' documents
    // Prevent restricted roles from updating others' documents
    const restrictedRoles = [ROLES.ACCOUNTS.slug, ROLES.MRO.slug];
    if (
      restrictedRoles.includes(user.role) &&
      savedRecordId &&
      documentCreatorId &&
      documentCreatorId !== user.id
    ) {
      toast({
        title: 'Permission Denied',
        description: 'You cannot update a document created by another user.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingRecord(true);
    try {
      // Detect if the document type has changed from what was loaded
      const isTypeChanged =
        savedRecordId && loadedDocumentType && documentType !== loadedDocumentType;

      // Keep the existing document number for updates, or let the database trigger generate a new one for insert
      const docNumber = savedRecordId && !isTypeChanged ? quoteDetails.quoteNumber : null;

      const updatedQuoteDetails = { ...quoteDetails, quoteNumber: docNumber };

      const selectedClient = clients.find(
        (c) => (c.clientName || '').trim() === (quoteDetails.clientName || '').trim()
      );
      const clientId = selectedClient?.id || null;

      if (!clientId && !savedRecordId) {
        setIsSavingRecord(false);
        toast({
          title: 'Valid Client Required',
          description:
            "A job cannot be created without a registered client. Please select a client from the list instead of using 'Other'.",
          variant: 'destructive',
        });
        return;
      }

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

      // Resolve job_id — auto-create a job if one isn't already linked
      let resolvedJobId = linkedJobId || searchParams.get('jobId') || null;

      if (!resolvedJobId && !bypassJobCheckRef.current) {
        setIsSavingRecord(false);
        setShowAutoJobDialog(true);
        return;
      }

      if (!resolvedJobId) {
        // Auto-create a job so the document always has a parent job
        const jobPayload = {
          client_id: clientId,
          project_name: quoteDetails.projectName || '',
          project_address: quoteDetails.projectAddress || '',
          status: WORKFLOW_STATES.QUOTATION_SENT,
          created_by: userId,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        };
        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert(jobPayload)
          .select('id')
          .single();
        if (jobError) throw new Error('Failed to auto-create job: ' + jobError.message);
        resolvedJobId = newJob.id;
        setLinkedJobId(newJob.id);
      } else {
        // Update existing job project details to keep in sync
        const { error: jobUpdateError } = await supabase
          .from('jobs')
          .update({
            project_name: quoteDetails.projectName || '',
            project_address: quoteDetails.projectAddress || '',
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', resolvedJobId);
        if (jobUpdateError) {
          console.error('Failed to update linked job details:', jobUpdateError);
        }
      }

      const recordData = {
        quote_number: docNumber,
        document_type: documentType,
        client_id: clientId,
        payment_date: quoteDetails.paymentDate || null,
        payment_mode: quoteDetails.paymentMode || null,
        bank_details: quoteDetails.bankDetails || null,
        content: {
          quoteDetails: updatedQuoteDetails,
          items,
          discount,
          discountShow,
          daysShow,
          sealShow,
          isInterstate,
        },
        job_id: resolvedJobId,
        created_by: userId,
        updated_at: new Date().toISOString(),
        version: savedRecordId && !isTypeChanged ? (currentVersion || 1) : 1,
      };

      let error;
      let finalDocNumber = docNumber;

      if (savedRecordId && !isTypeChanged) {
        // Update existing – keep the same doc number
        const { error: updateError } = await supabase
          .from('documents')
          .update(recordData)
          .eq('id', savedRecordId);
        error = updateError;

        if (!error) {
          setQuoteDetails(updatedQuoteDetails);
          const snapshot = {
            quoteDetails: updatedQuoteDetails,
            items,
            documentType,
            discount,
            discountShow,
            daysShow,
            sealShow,
            isInterstate,
          };
          setLastSavedData(JSON.stringify(snapshot));
        }
      } else {
        // Create new (Clone if isTypeChanged)
        const { data, error: insertError } = await supabase
          .from('documents')
          .insert([recordData])
          .select()
          .single();
        error = insertError;

        if (!insertError && data) {
          finalDocNumber = data.quote_number;
          const returnedContent = data.content || {};
          const returnedQuoteDetails = returnedContent.quoteDetails || {};

          const finalQuoteDetails = {
            ...quoteDetails,
            ...returnedQuoteDetails,
            quoteNumber: finalDocNumber,
          };

          setSavedRecordId(data.id);
          setLoadedDocumentType(documentType); // Update loaded type to new one
          setQuoteDetails(finalQuoteDetails);

          const snapshot = {
            quoteDetails: finalQuoteDetails,
            items,
            documentType,
            discount,
            discountShow,
            daysShow,
            sealShow,
            isInterstate,
          };
          setLastSavedData(JSON.stringify(snapshot));

          isNavigatingRef.current = true;
          navigate(`/doc/${data.id}`, { replace: true });
        }
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description:
          savedRecordId && !isTypeChanged
            ? `${documentType} updated successfully.`
            : `${documentType} saved as ${finalDocNumber}.`,
      });

      // If we have a jobId and just created a Quotation or Purchase Order, update the job status
      const jobId = searchParams.get('jobId');
      if (jobId && (!savedRecordId || isTypeChanged)) {
        let targetStatus = null;
        if (documentType === 'Quotation') targetStatus = 'QUOTATION_SENT';
        if (documentType === 'Purchase Order') targetStatus = 'WORK_ORDER_RECEIVED';

        if (targetStatus) {
          try {
            await supabase.from('jobs').update({ status: targetStatus }).eq('id', jobId);
          } catch (err) {
            console.error('Error updating job status:', err);
          }
        }
      }

      // Send Telegram Notification
      try {
        const action = savedRecordId && !isTypeChanged ? 'Updated' : 'Created';
        const emoji = savedRecordId && !isTypeChanged ? '📝' : '📄';
        const message =
          `${emoji} *${documentType} ${action}*\n\n` +
          `Number: \`${finalDocNumber}\`\n` +
          `Client: \`${quoteDetails.clientName}\`\n` +
          `${action} By: \`${user.fullName}\``;
        await sendTelegramNotification(message);
      } catch (notifyErr) {
        console.error('Error sending Telegram notification:', notifyErr);
      }
      return true;
    } catch (err) {
      console.error('Error saving record:', err);

      let finalErrorMessage = err.message || 'Failed to save record.';

      // Comprehensive check for Supabase/Postgres unique constraint violation (23505)
      const isUniqueError =
        err.code === '23505' ||
        String(err.code) === '23505' ||
        (err.message &&
          (err.message.toLowerCase().includes('unique constraint') ||
            err.message.toLowerCase().includes('already exists')));

      if (isUniqueError) {
        finalErrorMessage = `A ${documentType.toLowerCase()} with this number already exists. Please try saving again.`;
      }

      toast({
        title: 'Error',
        description: finalErrorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSavingRecord(false);
      // Reset the navigation ref after a delay to ensure the URL has changed in the browser
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 1000);
    }
  };

  const handleSaveAsNewVersion = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to save to the database.',
        variant: 'destructive',
      });
      return false;
    }

    if (isSavingRecord) return false;
    setIsSavingRecord(true);

    try {
      const { data: existingVersions, error: versionErr } = await supabase
        .from('documents')
        .select('version')
        .eq('quote_number', quoteDetails.quoteNumber);

      if (versionErr) throw versionErr;

      let nextVer = 1;
      if (existingVersions && existingVersions.length > 0) {
        const maxVer = Math.max(...existingVersions.map((v) => v.version || 1));
        nextVer = maxVer + 1;
      }

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
        throw new Error('Unable to determine a valid numeric User ID. Please try logging out and back in.');
      }

      const selectedClient = clients.find(
        (c) => (c.clientName || '').trim() === (quoteDetails.clientName || '').trim()
      );
      const clientId = selectedClient?.id || null;

      let resolvedJobId = linkedJobId || searchParams.get('jobId') || null;

      const updatedQuoteDetails = { ...quoteDetails, quoteNumber: quoteDetails.quoteNumber };

      const recordData = {
        quote_number: quoteDetails.quoteNumber,
        document_type: documentType,
        client_id: clientId,
        payment_date: quoteDetails.paymentDate || null,
        payment_mode: quoteDetails.paymentMode || null,
        bank_details: quoteDetails.bankDetails || null,
        content: {
          quoteDetails: updatedQuoteDetails,
          items,
          discount,
          discountShow,
          daysShow,
          sealShow,
          isInterstate,
        },
        job_id: resolvedJobId,
        created_by: userId,
        updated_at: new Date().toISOString(),
        version: nextVer,
      };

      const { data, error: insertErr } = await supabase
        .from('documents')
        .insert([recordData])
        .select()
        .single();

      if (insertErr) throw insertErr;

      setSavedRecordId(data.id);
      setLoadedDocumentType(documentType);
      setCurrentVersion(nextVer);
      setQuoteDetails(updatedQuoteDetails);

      const snapshot = {
        quoteDetails: updatedQuoteDetails,
        items,
        documentType,
        discount,
        discountShow,
        daysShow,
        sealShow,
        isInterstate,
      };
      setLastSavedData(JSON.stringify(snapshot));

      toast({
        title: 'Success',
        description: `Quotation saved as new version (V${nextVer}).`,
      });

      try {
        const message =
          `📄 *Quotation Saved as New Version*\n\n` +
          `Number: \`${quoteDetails.quoteNumber}/R${nextVer}\`\n` +
          `Client: \`${quoteDetails.clientName}\`\n` +
          `Saved By: \`${user.fullName}\``;
        await sendTelegramNotification(message);
      } catch (notifyErr) {
        console.error('Error sending Telegram notification:', notifyErr);
      }

      isNavigatingRef.current = true;
      navigate(`/doc/${data.id}`, { replace: true });
      return true;
    } catch (err) {
      console.error('Error saving new version:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to save new version.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleVersionChange = (newVal) => {
    const selected = docVersions.find((v) => String(v.version) === String(newVal));
    if (!selected) return;

    if (isDirty) {
      setTargetVersionToLoad(selected);
      setShowVersionSwitchConfirm(true);
    } else {
      navigate(`/doc/${selected.id}`);
    }
  };

  const handleDiscardAndSwitch = () => {
    if (!targetVersionToLoad) return;
    setShowVersionSwitchConfirm(false);
    const currentSnapshot = {
      quoteDetails,
      items,
      documentType,
      discount,
      discountShow,
      daysShow,
      sealShow,
      isInterstate,
    };
    setLastSavedData(JSON.stringify(currentSnapshot));
    navigate(`/doc/${targetVersionToLoad.id}`);
    setTargetVersionToLoad(null);
  };

  const handleSaveAndSwitch = async () => {
    if (!targetVersionToLoad) return;
    setShowVersionSwitchConfirm(false);
    const success = await handleSaveToDatabase();
    if (success) {
      navigate(`/doc/${targetVersionToLoad.id}`);
    }
    setTargetVersionToLoad(null);
  };

  const getFormattedDocNumber = (fallback = 'Pending') => {
    const baseNum = quoteDetails.quoteNumber;
    if (!baseNum) return fallback;
    if (documentType === 'Quotation') {
      return `${baseNum}/R${currentVersion || 1}`;
    }
    return baseNum;
  };

  const getAppropiatePrice = (itemId, type, clientId) => {
    if (!clientId) {
      if (type === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS) {
        return fieldTests.find((s) => String(s.id) === String(itemId))?.price || 0;
      } else if (type === DOCUMENT_ITEM_TYPE_KEYS.SAMPLING) {
        return samplingData.find((s) => String(s.id) === String(itemId))?.price || 0;
      } else {
        return labTests.find((t) => String(t.id) === String(itemId))?.price || 0;
      }
    }

    if (type === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS) {
      const clientPrice = clientFieldTestPrices.find(
        (p) =>
          String(p.client_id) === String(clientId) && String(p.field_test_id) === String(itemId)
      );
      if (clientPrice) return clientPrice.price;
      return fieldTests.find((s) => String(s.id) === String(itemId))?.price || 0;
    } else if (type === DOCUMENT_ITEM_TYPE_KEYS.SAMPLING) {
      // For now, sampling doesn't have client-specific prices
      return samplingData.find((s) => String(s.id) === String(itemId))?.price || 0;
    } else {
      const clientPrice = clientLabTestPrices.find(
        (p) => String(p.client_id) === String(clientId) && String(p.lab_test_id) === String(itemId)
      );
      if (clientPrice) return clientPrice.price;
      return labTests.find((t) => String(t.id) === String(itemId))?.price || 0;
    }
  };

  // Paged.js preview ref — exposes print() method
  const pagedPreviewRef = useRef(null);

  const triggerPrint = async () => {
    // Handle "Saving" state to prevent race conditions
    if (isSavingRecord) {
      toast({
        title: 'Save in Progress',
        description: 'The document is being saved. Please wait a moment before printing.',
      });
      return;
    }

    // Ensure document has been saved (and thus has a doc number) before printing
    if (!quoteDetails.quoteNumber) {
      toast({
        title: 'Save Required',
        description:
          'Please save the document first to generate a document number before printing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const message =
        `🖨️ *Print/PDF Action*\n\n` +
        `Document: \`${documentType}\`\n` +
        `Number: \`${getFormattedDocNumber()}\`\n` +
        `Client: \`${quoteDetails.clientName}\`\n` +
        `Action By: \`${user?.fullName || 'Unknown User'}\``;
      await sendTelegramNotification(message);
    } catch (_) {}

    pagedPreviewRef.current?.print();
  };

  const handleAddItem = () => {
    if (!selectedItemId) return;

    let itemData;
    let description = '';
    let price = 0;
    let unit = 'Nos';

    if (newItemType === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS) {
      itemData = fieldTests.find((s) => s.id === selectedItemId);
      if (itemData) {
        description = itemData.fieldTestType;
        price = itemData.price;
        unit = itemData.unit || 'Nos';
      }
    } else if (newItemType === DOCUMENT_ITEM_TYPE_KEYS.SAMPLING) {
      itemData = samplingData.find((s) => s.id === selectedItemId);
      if (itemData) {
        description = `${itemData.name} - ${Array.isArray(itemData.materials) ? itemData.materials.join(', ') : itemData.materials || ''}`;
        price = itemData.price;
        unit = itemData.unit || 'Nos';
      }
    } else {
      itemData = labTests.find((t) => t.id === selectedItemId);
      if (itemData) {
        description = `${itemData.testType} - ${Array.isArray(itemData.materials) ? itemData.materials.join(', ') : itemData.materials || ''}`;
        price = itemData.price;

        unit = 'Per Test';
      }
    }

    if (itemData) {
      const clientId = clients.find((c) => c.clientName === quoteDetails.clientName)?.id;
      const finalPrice = getAppropiatePrice(selectedItemId, newItemType, clientId);

      const newItem = {
        id: Date.now(), // unique ID for row
        sourceId: selectedItemId,
        type: newItemType,
        description,
        unit,
        price: Number(finalPrice),
        qty: Number(qty),
        numDays: Number(itemData.numDays ?? 1) || 1,
        total: Number(finalPrice) * Number(qty),
        hsnCode: itemData.hsnCode || '',
        tcList: itemData.tcList || itemData.tc_list || [],
        techList: itemData.techList || itemData.tech_list || [],
        paymentTermsList: itemData.paymentTermsList || itemData.payment_terms_list || [],
        // Include new service fields if it's a service
        ...(newItemType === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS && itemData
          ? {
            methodOfSampling: itemData.methodOfSampling || itemData.method_of_sampling || 'NA',
            numBHs: itemData.numBHs ?? itemData.num_bhs ?? 0,
            measure: itemData.measure || 'NA',
          }
          : {}),
      };

      if (targetPackageGroupId) {
        const group = uniquePackageGroups.find((g) => g.packageGroupId === targetPackageGroupId);
        if (group) {
          newItem.packageGroupId = group.packageGroupId;
          newItem.packageId = group.packageId;
          newItem.packageName = group.packageName;
        }
      }

      setItems((prev) => {
        if (newItem.packageGroupId) {
          let lastIndex = -1;
          for (let idx = prev.length - 1; idx >= 0; idx--) {
            if (prev[idx].packageGroupId === newItem.packageGroupId) {
              lastIndex = idx;
              break;
            }
          }
          if (lastIndex !== -1) {
            const newItems = [...prev];
            newItems.splice(lastIndex + 1, 0, newItem);
            return newItems;
          }
        }
        return [...prev, newItem];
      });

      // Reset selection
      setSelectedItemId('');
      setQty(1);
      setTargetPackageGroupId('');
    }
  };

  const handleAddPackage = () => {
    if (!selectedPackageId) return;

    const packageData = packages.find((p) => String(p.id) === String(selectedPackageId));
    if (!packageData) return;

    const packageGroupId = `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItems = [];

    const clientId = clients.find((c) => c.clientName === quoteDetails.clientName)?.id;

    packageData.items.forEach((pkgItem, idx) => {
      let itemData;
      let description = '';
      let price = 0;
      let unit = 'Nos';

      if (pkgItem.type === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS) {
        itemData = fieldTests.find((s) => String(s.id) === String(pkgItem.id));
        if (itemData) {
          description = itemData.fieldTestType;
          unit = itemData.unit || 'Nos';
        }
      } else if (pkgItem.type === DOCUMENT_ITEM_TYPE_KEYS.SAMPLING) {
        itemData = samplingData.find((s) => String(s.id) === String(pkgItem.id));
        if (itemData) {
          description = `${itemData.name} - ${Array.isArray(itemData.materials) ? itemData.materials.join(', ') : itemData.materials || ''}`;
          unit = itemData.unit || 'Nos';
        }
      } else {
        itemData = labTests.find((t) => String(t.id) === String(pkgItem.id));
        if (itemData) {
          description = `${itemData.testType} - ${Array.isArray(itemData.materials) ? itemData.materials.join(', ') : itemData.materials || ''}`;
          unit = 'Per Test';
        }
      }

      if (itemData) {
        const finalPrice = getAppropiatePrice(pkgItem.id, pkgItem.type, clientId);
        newItems.push({
          id: Date.now() + idx + Math.random(),
          sourceId: pkgItem.id,
          type: pkgItem.type,
          description,
          unit,
          price: Number(finalPrice),
          qty: Number(pkgItem.qty || 1),
          numDays: Number(itemData.numDays ?? 1) || 1,
          total: Number(finalPrice) * Number(pkgItem.qty || 1),
          hsnCode: itemData.hsnCode || '',
          tcList: itemData.tcList || itemData.tc_list || [],
          techList: itemData.techList || itemData.tech_list || [],
          paymentTermsList: itemData.paymentTermsList || itemData.payment_terms_list || [],
          packageGroupId,
          packageId: packageData.id,
          packageName: packageData.name,
          ...(pkgItem.type === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS && itemData
            ? {
              methodOfSampling: itemData.methodOfSampling || itemData.method_of_sampling || 'NA',
              numBHs: itemData.numBHs ?? itemData.num_bhs ?? 0,
              measure: itemData.measure || 'NA',
            }
            : {}),
        });
      }
    });

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      toast({
        title: 'Package Added',
        description: `Successfully added ${newItems.length} items from "${packageData.name}" to the document.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to add package items. Make sure the package contains valid items.',
        variant: 'destructive',
      });
    }

    setSelectedPackageId('');
  };

  const handleDeletePackage = (packageGroupId) => {
    setItems((prev) => prev.filter((item) => item.packageGroupId !== packageGroupId));
    toast({
      title: 'Package Removed',
      description: 'The package and all its items have been removed.',
    });
  };

  const handleDeleteItem = (rowId) => {
    setItems((prev) => prev.filter((item) => item.id !== rowId));
  };

  const handleUpdateItemPrice = (rowId, priceValue, editableElement) => {
    const normalizedValue = String(priceValue).replace(/,/g, '').trim();
    const newPrice = Number(normalizedValue);

    if (!Number.isFinite(newPrice)) {
      const currentItem = items.find((item) => item.id === rowId);
      if (editableElement && currentItem) {
        editableElement.textContent = currentItem.price;
      }
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? {
            ...item,
            price: newPrice,
            total: newPrice * Number(item.qty || 0),
          }
          : item
      )
    );
  };

  const handleUpdateItemQty = (rowId, qtyValue, editableElement) => {
    const normalizedValue = String(qtyValue).replace(/,/g, '').trim();
    const newQty = Number(normalizedValue);

    if (!Number.isFinite(newQty)) {
      const currentItem = items.find((item) => item.id === rowId);
      if (editableElement && currentItem) {
        editableElement.textContent = currentItem.qty;
      }
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? {
            ...item,
            qty: newQty,
            total: Number(item.price || 0) * newQty,
          }
          : item
      )
    );
  };

  const handleUpdateItemNumDays = (rowId, numDaysValue, editableElement) => {
    const normalizedValue = String(numDaysValue).replace(/,/g, '').trim();
    const newNumDays = Number(normalizedValue);

    if (!Number.isFinite(newNumDays) || newNumDays < 1) {
      const currentItem = items.find((item) => item.id === rowId);
      if (editableElement && currentItem) {
        editableElement.textContent = currentItem.numDays ?? 1;
      }
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? {
            ...item,
            numDays: newNumDays,
            total: Number(item.price || 0) * Number(item.qty || 0),
          }
          : item
      )
    );
  };

  const handleMoveItemUp = (index) => {
    if (index === 0) return;
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index] };
      const targetItem = { ...newItems[index - 1] };

      // Adjust package properties
      if (item.packageGroupId && targetItem.packageGroupId) {
        if (item.packageGroupId !== targetItem.packageGroupId) {
          // Move into a different package group
          item.packageGroupId = targetItem.packageGroupId;
          item.packageId = targetItem.packageId;
          item.packageName = targetItem.packageName;
        }
      } else if (!item.packageGroupId && targetItem.packageGroupId) {
        // Non-package item moving UP past a package item enters the package group
        item.packageGroupId = targetItem.packageGroupId;
        item.packageId = targetItem.packageId;
        item.packageName = targetItem.packageName;
      } else if (item.packageGroupId && !targetItem.packageGroupId) {
        // Package item moving UP past a non-package item exits the package group
        delete item.packageGroupId;
        delete item.packageId;
        delete item.packageName;
      }

      // Swap
      newItems[index] = targetItem;
      newItems[index - 1] = item;

      return newItems;
    });
  };

  const handleMoveItemDown = (index) => {
    setItems((prev) => {
      if (index === prev.length - 1) return prev;
      const newItems = [...prev];
      const item = { ...newItems[index] };
      const targetItem = { ...newItems[index + 1] };

      // Adjust package properties
      if (item.packageGroupId && targetItem.packageGroupId) {
        if (item.packageGroupId !== targetItem.packageGroupId) {
          // Move into a different package group
          item.packageGroupId = targetItem.packageGroupId;
          item.packageId = targetItem.packageId;
          item.packageName = targetItem.packageName;
        }
      } else if (!item.packageGroupId && targetItem.packageGroupId) {
        // Non-package item moving DOWN past a package item enters the package group
        item.packageGroupId = targetItem.packageGroupId;
        item.packageId = targetItem.packageId;
        item.packageName = targetItem.packageName;
      } else if (item.packageGroupId && !targetItem.packageGroupId) {
        // Package item moving DOWN past a non-package item exits the package group
        delete item.packageGroupId;
        delete item.packageId;
        delete item.packageName;
      }

      // Swap
      newItems[index] = targetItem;
      newItems[index + 1] = item;

      return newItems;
    });
  };

  const handleMovePackageUp = (packageGroupId) => {
    setItems((prev) => {
      const newItems = [...prev];
      const groupStart = newItems.findIndex((x) => x.packageGroupId === packageGroupId);
      if (groupStart <= 0) return prev; // Already at the top

      const groupItems = newItems.filter((x) => x.packageGroupId === packageGroupId);
      const groupLength = groupItems.length;

      const targetIndex = groupStart - 1;
      const targetItem = newItems[targetIndex];

      if (targetItem.packageGroupId) {
        // Above is another package group
        const otherGroupId = targetItem.packageGroupId;
        const otherGroupStart = newItems.findIndex((x) => x.packageGroupId === otherGroupId);
        const otherGroupItems = newItems.filter((x) => x.packageGroupId === otherGroupId);

        // Swap contiguous package blocks
        const before = newItems.slice(0, otherGroupStart);
        const after = newItems.slice(groupStart + groupLength);
        return [...before, ...groupItems, ...otherGroupItems, ...after];
      } else {
        // Above is a single non-package item
        const before = newItems.slice(0, targetIndex);
        const after = newItems.slice(groupStart + groupLength);
        return [...before, ...groupItems, targetItem, ...after];
      }
    });
  };

  const handleMovePackageDown = (packageGroupId) => {
    setItems((prev) => {
      const newItems = [...prev];
      const groupStart = newItems.findIndex((x) => x.packageGroupId === packageGroupId);
      if (groupStart === -1) return prev;

      const groupItems = newItems.filter((x) => x.packageGroupId === packageGroupId);
      const groupLength = groupItems.length;
      const groupEnd = groupStart + groupLength - 1;

      if (groupEnd >= newItems.length - 1) return prev; // Already at bottom

      const targetIndex = groupEnd + 1;
      const targetItem = newItems[targetIndex];

      if (targetItem.packageGroupId) {
        // Below is another package group
        const otherGroupId = targetItem.packageGroupId;
        const otherGroupItems = newItems.filter((x) => x.packageGroupId === otherGroupId);

        const before = newItems.slice(0, groupStart);
        const after = newItems.slice(targetIndex + otherGroupItems.length);
        return [...before, ...otherGroupItems, ...groupItems, ...after];
      } else {
        // Below is a single non-package item
        const before = newItems.slice(0, groupStart);
        const after = newItems.slice(targetIndex + 1);
        return [...before, targetItem, ...groupItems, ...after];
      }
    });
  };

  const handleUngroupPackage = (packageGroupId) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.packageGroupId === packageGroupId) {
          const newItem = { ...item };
          delete newItem.packageGroupId;
          delete newItem.packageId;
          delete newItem.packageName;
          return newItem;
        }
        return item;
      })
    );
    toast({
      title: 'Package dissolved',
      description: 'Package items have been converted to individual parameters.',
    });
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  // Always floor to nearest rupee (remove decimal portion)
  const roundAmount = (value) => Math.floor(value);

  const selectedDocumentItemType =
    DOCUMENT_ITEM_TYPE_OPTIONS.find((itemType) => itemType.key === newItemType) ||
    DOCUMENT_ITEM_TYPE_OPTIONS[0];
  const documentItemTypeIcons = {
    [DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS]: Drill,
    [DOCUMENT_ITEM_TYPE_KEYS.LAB_TESTS]: TestTube,
    [DOCUMENT_ITEM_TYPE_KEYS.SAMPLING]: SwatchBook,
  };
  const getSelectableItemOptions = () => {
    if (newItemType === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS) {
      return fieldTests.map((s) => ({ value: s.id, label: s.fieldTestType }));
    }

    if (newItemType === DOCUMENT_ITEM_TYPE_KEYS.SAMPLING) {
      return samplingData.map((s) => ({
        value: s.id,
        label: `${s.name} - ${Array.isArray(s.materials) ? s.materials.join(', ') : s.materials || ''}`,
      }));
    }

    return labTests.map((t) => ({
      value: t.id,
      label: `${t.testType} - ${Array.isArray(t.materials) ? t.materials.join(', ') : t.materials || ''}`,
    }));
  };
  const getSelectedItemDisplayLabel = () => {
    if (newItemType === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS) {
      return fieldTests.find((s) => s.id === selectedItemId)?.fieldTestType || '';
    }

    if (newItemType === DOCUMENT_ITEM_TYPE_KEYS.SAMPLING) {
      const item = samplingData.find((s) => s.id === selectedItemId);
      if (!item) return '';
      return `${item.name} - ${Array.isArray(item.materials) ? item.materials.join(', ') : item.materials || ''}`;
    }

    const item = labTests.find((t) => t.id === selectedItemId);
    if (!item) return '';
    return `${item.testType} - ${Array.isArray(item.materials) ? item.materials.join(', ') : item.materials || ''}`;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <div className="shrink-0">
        <Navbar isDirty={isDirty} isSaving={isSavingRecord} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 w-full px-6 py-4">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-4">
            {!isStandard() && (
              <button
                onClick={handleBack}
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <h1 className="text-1xl font-bold text-gray-900">Compose {documentType}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
                {documentType === 'Quotation' && savedRecordId && (
                  <div className="flex items-center gap-2 mr-2">
                    <Select
                      value={String(currentVersion)}
                      onValueChange={handleVersionChange}
                    >
                      <SelectTrigger className="w-[120px] h-9">
                        <SelectValue placeholder="Version" />
                      </SelectTrigger>
                      <SelectContent>
                        {docVersions.map((v) => (
                          <SelectItem key={v.id} value={String(v.version)}>
                            Version {v.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  onClick={() => {
                    if (documentType === 'Quotation' && savedRecordId) {
                      setShowUpdateConfirm(true);
                    } else {
                      handleSaveToDatabase();
                    }
                  }}
                  disabled={isSavingRecord}
                  className="bg-green-800 hover:bg-green-900 text-white"
                >
                  {isSavingRecord ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {savedRecordId ? 'Update' : 'Save'} {documentType}
                </Button>
                {documentType === 'Quotation' && savedRecordId && (
                  <Button
                    onClick={() => setShowSaveAsNewConfirm(true)}
                    disabled={isSavingRecord}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    {isSavingRecord ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Save as new version
                  </Button>
                )}
              </>
            )}
            <Button onClick={triggerPrint} className="bg-blue-800 hover:bg-blue-900 text-white">
              <Printer className="w-4 h-4 mr-2" /> Print PDF
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-2 pb-8 pr-2 custom-scrollbar">
          {/* Left Column: Editor */}
          <div className="lg:col-span-1 space-y-2">
            {/* Client Details Card */}
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
              <div className="mb-2">
                <Label>Document Type</Label>
                <Select
                  value={documentType}
                  onValueChange={(newType) => {
                    setDocumentType(newType);
                  }}
                  disabled={!!searchParams.get('type') || !!savedRecordId}
                >
                  <SelectTrigger
                    className={cn(
                      (!!searchParams.get('type') || !!savedRecordId) &&
                      'bg-gray-100 cursor-not-allowed'
                    )}
                  >
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tax Invoice">Tax Invoice</SelectItem>
                    <SelectItem value="Quotation">Quotation</SelectItem>
                    <SelectItem value="Proforma Invoice">Proforma Invoice</SelectItem>
                    <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                    <SelectItem value="Delivery Challan">Delivery Challan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-2 mb-2">
                <div>
                  <Label>{documentType} Number</Label>
                  <Input
                    value={quoteDetails.quoteNumber || ''}
                    readOnly
                    placeholder="Auto-generated on save"
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  {!quoteDetails.quoteNumber && (
                    <p className="text-xs text-red-500 mt-1 italic">
                      * {documentType} number will be generated when you save.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Date</Label>
                  <AppDatePicker
                    value={quoteDetails.date}
                    onChange={(e) => setQuoteDetails({ ...quoteDetails, date: e.target.value })}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label>Discount (%)</Label>
                  <Input
                    type="text"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    placeholder="Enter discount %"
                    disabled={isReadOnly}
                    className="w-full"
                  />
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="discountShow"
                      checked={discountShow}
                      onCheckedChange={(checked) => setDiscountShow(!!checked)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="discountShow" className="cursor-pointer select-none">
                      Show Discount?
                    </Label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="daysShow"
                    checked={daysShow}
                    onCheckedChange={(checked) => setDaysShow(!!checked)}
                    disabled={isReadOnly}
                  />
                  <Label htmlFor="daysShow" className="cursor-pointer select-none">
                    Show Days Column?
                  </Label>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="sealShow"
                    checked={sealShow}
                    onCheckedChange={(checked) => setSealShow(!!checked)}
                    disabled={isReadOnly}
                  />
                  <Label htmlFor="sealShow" className="cursor-pointer select-none">
                    Show Company Seal?
                  </Label>
                </div>
              </div>
              {/* <h2 className="text-lg font-semibold mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-primary" />
                                Client Details
                            </h2> */}
              <div className="space-y-2 pt-2">
                <div>
                  <Label>Client Name</Label>
                  <ReactSelect
                    isDisabled={isReadOnly}
                    value={
                      clientNameSelection
                        ? CLIENT_OPTIONS.find((o) => o.value === clientNameSelection) || null
                        : null
                    }
                    onChange={(option) => {
                      const value = option ? option.value : '';
                      setClientNameSelection(value);
                      if (value && value !== 'Other') {
                        const selectedClient = clients.find((c) => c.clientName === value);
                        const contacts = selectedClient?.contacts || [];
                        const primaryContact =
                          contacts.find((con) => con.is_primary) || contacts[0] || {};
                        const primaryIdx = contacts.findIndex((con) => con.is_primary);

                        setQuoteDetails({
                          ...quoteDetails,
                          clientName: value,
                          clientAddress: selectedClient?.clientAddress || '',
                          gstin: selectedClient?.gstin || '',
                          email: primaryContact.contact_email || selectedClient?.email || '',
                          phone: primaryContact.contact_phone || selectedClient?.phone || '',
                          name: primaryContact.contact_person || '',
                        });
                        setCustomClientName('');

                        if (primaryIdx >= 0) {
                          setContactSelectionIdx(primaryIdx.toString());
                        } else if (contacts.length > 0) {
                          setContactSelectionIdx('0');
                        } else {
                          setContactSelectionIdx('');
                        }

                        if (items.length > 0) {
                          const updatedItems = items.map((item) => {
                            const newPrice = getAppropiatePrice(
                              item.sourceId,
                              item.type,
                              selectedClient?.id
                            );
                            return {
                              ...item,
                              price: Number(newPrice),
                              total: Number(newPrice) * item.qty,
                            };
                          });
                          setItems(updatedItems);
                        }
                      } else if (value === 'Other') {
                        setQuoteDetails({
                          ...quoteDetails,
                          clientName: customClientName,
                          clientAddress: '',
                          gstin: '',
                          email: '',
                          phone: '',
                        });
                      } else {
                        setQuoteDetails({ ...quoteDetails, clientName: '' });
                      }
                    }}
                    options={CLIENT_OPTIONS}
                    placeholder="Search client..."
                    isSearchable
                    isClearable
                    classNamePrefix="react-select"
                    styles={themedReactSelectStyles({ borderRadius: '0.75rem' })}
                  />

                  {clientNameSelection !== 'Other' &&
                    clientNameSelection !== '' &&
                    (() => {
                      const selectedClient = clients.find(
                        (c) => (c.clientName || '').trim() === clientNameSelection.trim()
                      );
                      const contacts = selectedClient?.contacts || [];

                      if (contacts.length === 0) {
                        return (
                          <div className="mt-2 pt-2 text-amber-600 text-xs flex items-center bg-amber-50 p-2 rounded border border-amber-100 italic">
                            <AlertCircle className="w-3 h-3 mr-1.5" />
                            Setup a contact for this client in Admin Panel
                          </div>
                        );
                      }

                      return (
                        <div className="mt-2 pt-2 pb-2 border-t border-gray-100">
                          <Label className="text-gray-900 mb-2 block">Client Contact</Label>
                          <Select
                            value={contactSelectionIdx}
                            onValueChange={(idx) => {
                              setContactSelectionIdx(idx);
                              const contact = contacts[parseInt(idx)];
                              if (contact) {
                                setQuoteDetails((prev) => ({
                                  ...prev,
                                  email: contact.contact_email || '',
                                  phone: contact.contact_phone || '',
                                  name: contact.contact_person || '',
                                }));
                                toast({
                                  title: 'Contact Updated',
                                  description: `Using contact details for ${contact.contact_person || 'selected person'}.`,
                                });
                              }
                            }}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger
                              className={cn(
                                'h-10 text-sm border-gray-200 bg-gray-50/30',
                                isReadOnly && 'cursor-not-allowed'
                              )}
                            >
                              <SelectValue placeholder="Pick a contact..." />
                            </SelectTrigger>
                            <SelectContent>
                              {contacts.map((contact, idx) => (
                                <SelectItem key={idx} value={idx.toString()}>
                                  <div className="flex flex-col text-left py-1">
                                    <span className="font-medium text-gray-900">
                                      {contact.contact_person || 'Unnamed Contact'}{' '}
                                      {contact.is_primary ? '(Primary)' : ''}
                                    </span>
                                    {(contact.contact_email || contact.contact_phone) && (
                                      <span className="text-xs text-gray-500">
                                        {[contact.contact_email, contact.contact_phone]
                                          .filter(Boolean)
                                          .join(' | ')}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })()}

                  {clientNameSelection === 'Other' && (
                    <Input
                      className="mt-2"
                      value={customClientName}
                      onChange={(e) => {
                        setCustomClientName(e.target.value);
                        setQuoteDetails({ ...quoteDetails, clientName: e.target.value });
                      }}
                      placeholder="Enter custom client name"
                      disabled={isReadOnly}
                    />
                  )}
                </div>
                <div className="hidden">
                  <Label>Client Address</Label>
                  <Textarea
                    className="min-h-[100px]"
                    value={quoteDetails.clientAddress}
                    onChange={(e) =>
                      setQuoteDetails({ ...quoteDetails, clientAddress: e.target.value })
                    }
                    placeholder="Enter client address"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="hidden">
                  <Label>GSTIN</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      value={quoteDetails.gstin || ''}
                      onChange={(e) => setQuoteDetails({ ...quoteDetails, gstin: e.target.value })}
                      placeholder="Enter GSTIN"
                      disabled={isReadOnly}
                      className="flex-grow"
                    />
                    <div className="flex items-center space-x-2 shrink-0 pt-1">
                      <Checkbox
                        id="isInterstate"
                        checked={isInterstate}
                        onCheckedChange={(checked) => setIsInterstate(!!checked)}
                        disabled={isReadOnly}
                      />
                      <Label
                        htmlFor="isInterstate"
                        className="cursor-pointer select-none whitespace-nowrap"
                      >
                        Interstate Billing (IGST)
                      </Label>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <Label>Contractor Name</Label>
                  <Textarea
                    className="min-h-[100px]"
                    value={quoteDetails.contractorName}
                    onChange={(e) =>
                      setQuoteDetails({ ...quoteDetails, contractorName: e.target.value })
                    }
                    placeholder="Enter contractor name"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label>Contractor Address</Label>
                  <Textarea
                    className="min-h-[100px]"
                    value={quoteDetails.contractorAddress}
                    onChange={(e) =>
                      setQuoteDetails({ ...quoteDetails, contractorAddress: e.target.value })
                    }
                    placeholder="Enter contractor address"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="pt-2 border-t">
                  <Label>Project Name</Label>
                  <Textarea
                    className="min-h-[100px]"
                    value={quoteDetails.projectName}
                    onChange={(e) =>
                      setQuoteDetails({ ...quoteDetails, projectName: e.target.value })
                    }
                    placeholder="Enter project name"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label>Project Address</Label>
                  <Textarea
                    className="min-h-[100px]"
                    value={quoteDetails.projectAddress}
                    onChange={(e) =>
                      setQuoteDetails({ ...quoteDetails, projectAddress: e.target.value })
                    }
                    placeholder="Enter project address"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>

            {/* Billing & Bank Selection Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                <Building2 className="w-5 h-5 mr-2 text-primary" />
                Bank Account Selection
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Bank Account for this Document</Label>
                  <Select
                    value={quoteDetails.selectedBankId || ''}
                    onValueChange={(value) =>
                      setQuoteDetails({ ...quoteDetails, selectedBankId: value })
                    }
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-gray-50/30 border-gray-200">
                      <SelectValue placeholder="Select a bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No bank accounts configured
                        </SelectItem>
                      ) : (
                        bankAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            <div className="flex flex-col items-start py-1 text-left">
                              <span className="font-bold text-gray-900">
                                {acc.bank_name} {acc.is_default && '(Default)'}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {acc.bank_account_number} | {acc.branch_name}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-500 italic mt-1 ml-1">
                    The selected bank details will be shown in the print preview and PDF.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Received Details Section - Only for Tax Invoice */}
            {documentType === 'Tax Invoice' && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-primary" />
                  Payment Received Details
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Payment Received Date</Label>
                      <AppDatePicker
                        value={quoteDetails.paymentDate || ''}
                        onChange={(e) =>
                          setQuoteDetails({ ...quoteDetails, paymentDate: e.target.value })
                        }
                        disabled={isReadOnly}
                      />
                    </div>
                    <div>
                      <Label>Mode of Payment</Label>
                      <Select
                        value={quoteDetails.paymentMode || ''}
                        onValueChange={(value) =>
                          setQuoteDetails({ ...quoteDetails, paymentMode: value })
                        }
                        disabled={isReadOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="NEFT/RTGS">NEFT/RTGS</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>
                        Payment Amount (<Rupee />)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={quoteDetails.paymentAmount || ''}
                        onChange={(e) =>
                          setQuoteDetails({ ...quoteDetails, paymentAmount: e.target.value })
                        }
                        placeholder="Enter amount"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Bank / Transaction Details</Label>
                    <Textarea
                      value={quoteDetails.bankDetails || ''}
                      onChange={(e) =>
                        setQuoteDetails({ ...quoteDetails, bankDetails: e.target.value })
                      }
                      placeholder="Enter bank name, cheque number, or transaction ID"
                      rows={2}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Add Item Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Plus className="w-5 h-5 mr-2 text-primary" />
                Add Item
              </h2>
              <div className="space-y-4">
                {/* Packages Dropdown */}
                <div>
                  <Label>Packages</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="flex-1">
                      <ReactSelect
                        classNamePrefix="react-select"
                        isDisabled={isReadOnly}
                        options={packages.map((p) => ({ value: p.id, label: p.name }))}
                        value={
                          selectedPackageId
                            ? {
                              value: selectedPackageId,
                              label: packages.find((p) => p.id === selectedPackageId)?.name,
                            }
                            : null
                        }
                        onChange={(option) => setSelectedPackageId(option ? option.value : '')}
                        placeholder="Select a Package to add..."
                        isSearchable
                        isClearable
                        styles={themedReactSelectStyles({
                          minHeight: '44px',
                          borderRadius: '0.75rem',
                        })}
                      />
                    </div>
                    <Button
                      onClick={handleAddPackage}
                      disabled={!selectedPackageId || isReadOnly}
                      variant="outline"
                      className="h-[44px] px-4 rounded-xl shrink-0"
                    >
                      Add Package
                    </Button>
                  </div>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-100"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    Or Add Individual Item
                  </span>
                  <div className="flex-grow border-t border-gray-100"></div>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {DOCUMENT_ITEM_TYPE_OPTIONS.map((itemType) => {
                    const ItemTypeIcon = documentItemTypeIcons[itemType.key];

                    return (
                      <Button
                        key={itemType.key}
                        variant={newItemType === itemType.key ? 'default' : 'outline'}
                        onClick={() => {
                          if (!isReadOnly) {
                            setNewItemType(itemType.key);
                            setSelectedItemId('');
                          }
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 text-xs',
                          isReadOnly && 'opacity-50 cursor-not-allowed'
                        )}
                        disabled={isReadOnly}
                      >
                        <ItemTypeIcon className="w-2 h-2 hidden" /> {itemType.label}
                      </Button>
                    );
                  })}
                </div>

                <div>
                  <Label>Select {selectedDocumentItemType.label}</Label>
                  <ReactSelect
                    className="mt-1"
                    classNamePrefix="react-select"
                    isDisabled={isReadOnly}
                    options={getSelectableItemOptions()}
                    value={
                      selectedItemId
                        ? {
                          value: selectedItemId,
                          label: getSelectedItemDisplayLabel(),
                        }
                        : null
                    }
                    onChange={(option) => setSelectedItemId(option ? option.value : '')}
                    placeholder={`Search ${selectedDocumentItemType.label}...`}
                    isSearchable
                    isClearable
                    styles={themedReactSelectStyles({ minHeight: '44px', borderRadius: '0.75rem' })}
                  />
                </div>

                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>

                {uniquePackageGroups.length > 0 && (
                  <div>
                    <Label>Associate with Package Group (Optional)</Label>
                    <ReactSelect
                      className="mt-1"
                      classNamePrefix="react-select"
                      isDisabled={isReadOnly}
                      options={[
                        { value: '', label: 'None (Add as Independent Item)' },
                        ...uniquePackageGroups.map((g) => ({
                          value: g.packageGroupId,
                          label: g.packageName,
                        })),
                      ]}
                      value={
                        targetPackageGroupId
                          ? {
                            value: targetPackageGroupId,
                            label: uniquePackageGroups.find(
                              (g) => g.packageGroupId === targetPackageGroupId
                            )?.packageName,
                          }
                          : { value: '', label: 'None (Add as Independent Item)' }
                      }
                      onChange={(option) => setTargetPackageGroupId(option ? option.value : '')}
                      placeholder="Select package group..."
                      isSearchable
                      styles={themedReactSelectStyles({ minHeight: '44px', borderRadius: '0.75rem' })}
                    />
                  </div>
                )}

                <Button
                  onClick={handleAddItem}
                  className="w-full"
                  disabled={!selectedItemId || isReadOnly}
                >
                  Add Item
                </Button>
              </div>
            </div>

            {/* Manage Items Card */}
            {items.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-gray-900 border-b pb-2">
                  <span className="flex items-center">
                    <ListOrdered className="w-5 h-5 mr-2 text-primary" />
                    Added Items &amp; Packages ({items.length})
                  </span>
                </h2>
                
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {(() => {
                    let currentPkgGroupId = null;
                    return items.map((item, index) => {
                      const showPkgHeader = item.packageGroupId && item.packageGroupId !== currentPkgGroupId;
                      currentPkgGroupId = item.packageGroupId;

                      return (
                        <div key={item.id} className="space-y-2">
                          {showPkgHeader && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-2 flex items-center justify-between mt-2">
                              <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                                📦 {item.packageName}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleMovePackageUp(item.packageGroupId)}
                                  className="w-6 h-6 hover:bg-blue-100"
                                  title="Move Package Up"
                                  disabled={isReadOnly}
                                >
                                  <ArrowUp className="w-3 h-3 text-blue-700" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleMovePackageDown(item.packageGroupId)}
                                  className="w-6 h-6 hover:bg-blue-100"
                                  title="Move Package Down"
                                  disabled={isReadOnly}
                                >
                                  <ArrowDown className="w-3 h-3 text-blue-700" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleUngroupPackage(item.packageGroupId)}
                                  className="w-6 h-6 hover:bg-blue-100"
                                  title="Dissolve Package"
                                  disabled={isReadOnly}
                                >
                                  <Unlink className="w-3 h-3 text-blue-700" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeletePackage(item.packageGroupId)}
                                  className="w-6 h-6 hover:bg-red-100"
                                  title="Delete Package"
                                  disabled={isReadOnly}
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          <div className={`p-3 rounded-xl border ${item.packageGroupId ? 'border-l-4 border-l-blue-500 border-gray-100 ml-4 bg-blue-50/10' : 'border-gray-200 bg-white'} hover:shadow-sm transition-shadow`}>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                  Sl No. {index + 1} &bull; {item.type === 'service' ? 'Field Test' : item.type === 'lab' ? 'Lab Test' : 'Sampling'}
                                </span>
                                <span className="text-xs font-semibold text-gray-900 line-clamp-2" title={item.description}>
                                  {item.description}
                                </span>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleMoveItemUp(index)}
                                  className="w-6 h-6 hover:bg-gray-100"
                                  disabled={index === 0 || isReadOnly}
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3 h-3 text-gray-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleMoveItemDown(index)}
                                  className="w-6 h-6 hover:bg-gray-100"
                                  disabled={index === items.length - 1 || isReadOnly}
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3 h-3 text-gray-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="w-6 h-6 hover:bg-red-50"
                                  disabled={isReadOnly}
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-[10px] text-gray-500">Price (₹)</Label>
                                <Input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => handleUpdateItemPrice(item.id, e.target.value)}
                                  className="h-8 text-xs px-2 mt-0.5"
                                  disabled={isReadOnly}
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-500">Qty</Label>
                                <Input
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => handleUpdateItemQty(item.id, e.target.value)}
                                  className="h-8 text-xs px-2 mt-0.5"
                                  disabled={isReadOnly}
                                />
                              </div>
                              {documentType === 'Quotation' && daysShow && (
                                <div>
                                  <Label className="text-[10px] text-gray-500">Days</Label>
                                  <Input
                                    type="number"
                                    value={item.numDays ?? 1}
                                    onChange={(e) => handleUpdateItemNumDays(item.id, e.target.value)}
                                    className="h-8 text-xs px-2 mt-0.5"
                                    disabled={isReadOnly}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-100 min-h-[600px] shadow-inner bg-gray-100 overflow-hidden">
              <PagedPreview
                ref={pagedPreviewRef}
                documentTitle={`${documentType}_${quoteDetails.quoteNumber || 'draft'}`}
                contentNode={
                  <QuotationContent
                    quoteDetails={quoteDetails}
                    items={items}
                    documentType={documentType}
                    discount={discount}
                    discountShow={discountShow}
                    daysShow={daysShow}
                    sealShow={sealShow}
                    isInterstate={isInterstate}
                    selectedBank={selectedBank}
                    settings={settings}
                    currentVersion={currentVersion}
                    derivedPaymentTermsTypes={derivedPaymentTermsTypes}
                    derivedTcTypes={derivedTcTypes}
                    derivedTechTypes={derivedTechTypes}
                    paymentTerms={paymentTerms}
                    terms={terms}
                    technicals={technicals}
                    taxCGST={taxCGST}
                    taxSGST={taxSGST}
                    taxIGST={taxIGST}
                    taxTotalPercent={taxTotalPercent}
                    baseUrl={import.meta.env.BASE_URL}
                  />
                }
              />
            </div>
          </div>
        </div>

        <AlertDialog
          open={blocker.state === 'blocked'}
          onOpenChange={(open) => !open && blocker.reset()}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-amber-600">
                Unsaved Changes
              </AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes in your document. Leaving this page will discard all
                details added. Are you sure you want to leave?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => blocker.reset()}>Stay on Page</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => blocker.proceed()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Leave and Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showVersionSwitchConfirm}
          onOpenChange={(open) => {
            if (!open) {
              setShowVersionSwitchConfirm(false);
              setTargetVersionToLoad(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-amber-600">
                Unsaved Changes
              </AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes in the current version. Do you want to save them before switching to Version {targetVersionToLoad?.version}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
              <AlertDialogCancel
                onClick={() => {
                  setShowVersionSwitchConfirm(false);
                  setTargetVersionToLoad(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDiscardAndSwitch}
              >
                Discard & Switch
              </Button>
              <Button
                className="bg-green-800 hover:bg-green-900 text-white"
                onClick={handleSaveAndSwitch}
              >
                Save & Switch
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showSaveAsNewConfirm} onOpenChange={setShowSaveAsNewConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-primary">
                Save as New Version
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to save this quotation as a new version? This will create Version {docVersions.length + 1} and copy all current details to it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowSaveAsNewConfirm(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowSaveAsNewConfirm(false);
                  handleSaveAsNewVersion();
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showUpdateConfirm} onOpenChange={setShowUpdateConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-primary">
                Update Quotation Version
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to update the current version (Version {currentVersion}) of this quotation? All changes will overwrite the current version.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowUpdateConfirm(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowUpdateConfirm(false);
                  handleSaveToDatabase();
                }}
                className="bg-green-800 hover:bg-green-900 text-white"
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Auto-create Job Confirmation */}
      <AlertDialog open={showAutoJobDialog} onOpenChange={setShowAutoJobDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold">
              <BriefcaseBusiness className="w-5 h-5 text-primary" />
              Note
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 py-3">
              Before saving this {documentType.toLowerCase()}, the system will automatically create
              a <strong>new Job</strong> and link this {documentType.toLowerCase()} to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                bypassJobCheckRef.current = false;
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary-dark"
              onClick={() => {
                bypassJobCheckRef.current = true;
                handleSaveToDatabase();
              }}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NewQuotationPage;
