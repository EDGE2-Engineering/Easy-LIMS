
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
    Plus, Trash2, Printer, FileText, ArrowLeft, X, Save, Loader2,
    CreditCard, ChevronUp, ChevronDown, AlertCircle, BriefcaseBusiness,
    TestTube, Clock, ArrowRight, LayoutDashboard, Search, Eye
} from 'lucide-react';
import { Link, useSearchParams, useLocation, useNavigate, useParams, useBlocker } from 'react-router-dom';
import { format } from 'date-fns';
import ReactSelect from 'react-select';

// Local project components & contexts
import Navbar from '@/components/Navbar';
import Rupee from '@/components/Rupee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useServices } from '@/contexts/ServicesContext';
import { useTests } from '@/contexts/TestsContext';
import { useClients } from '@/contexts/ClientsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTermsAndConditions } from '@/contexts/TermsAndConditionsContext';
import { useTechnicals } from '@/contexts/TechnicalsContext';
import { useToast } from '@/components/ui/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { getSiteContent, DB_TYPES } from '@/config';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { sendTelegramNotification } from '@/lib/notifier';
import { getNextDocNumber } from '@/utils/docUtils';

// Helper function to convert number to words (Indian numbering system)
const numberToWords = (num) => {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convertLessThanThousand = (n) => {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanThousand(n % 100) : '');
    };

    const [integerPart, decimalPart] = num.toFixed(2).split('.');
    const intNum = parseInt(integerPart);

    if (intNum === 0) {
        return decimalPart && parseInt(decimalPart) > 0
            ? 'Zero Rupees and ' + convertLessThanThousand(parseInt(decimalPart)) + ' Paise'
            : 'Zero Rupees';
    }

    let result = '';
    const remainingAfterCrore = intNum % 10000000;
    if (intNum >= 10000000) result += convertLessThanThousand(Math.floor(intNum / 10000000)) + ' Crore ';

    const lakhsPart = Math.floor(remainingAfterCrore / 100000);
    if (lakhsPart > 0) result += convertLessThanThousand(lakhsPart) + ' Lakh ';
    const thousandsPart = Math.floor((remainingAfterCrore % 100000) / 1000);
    if (thousandsPart > 0) result += convertLessThanThousand(thousandsPart) + ' Thousand ';
    const remainder = remainingAfterCrore % 1000;
    if (remainder > 0) result += convertLessThanThousand(remainder);

    result = result.trim() + ' Rupees';
    if (decimalPart && parseInt(decimalPart) > 0) result += ' and ' + convertLessThanThousand(parseInt(decimalPart)) + ' Paise';
    return result + ' Only';
};

const NewQuotationPage = () => {
    const { services, clientServicePrices } = useServices();
    const { tests, clientTestPrices } = useTests();
    const { clients } = useClients();
    const { settings } = useSettings();
    const { terms } = useTermsAndConditions();
    const { technicals } = useTechnicals();
    const { user, isAdmin, idToken, isStandard } = useAuth();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const { id: pathId } = useParams();
    const navigate = useNavigate();

    const [savedRecordId, setSavedRecordId] = useState(pathId || searchParams.get('id') || null);
    const [loadedDocumentType, setLoadedDocumentType] = useState(null);
    const [isSavingRecord, setIsSavingRecord] = useState(false);
    const [lastSavedData, setLastSavedData] = useState(null);

    const taxCGST = settings?.tax_cgst ? Number(settings.tax_cgst) : 9;
    const taxSGST = settings?.tax_sgst ? Number(settings.tax_sgst) : 9;
    const taxTotalPercent = taxCGST + taxSGST;

    const defaultQuoteDetails = useMemo(() => ({
        client_name: '',
        client_address: '',
        contractor_name: '',
        contractor_address: '',
        project_name: '',
        project_address: '',
        email: '',
        phone: '',
        name: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        quote_number: '',
        generated_by: user?.fullName || user?.full_name || user?.name || '',
        payment_date: '',
        payment_mode: '',
        payment_amount: '',
        bank_details: '',
        selected_tc_types: [],
        selected_tech_types: []
    }), [user]);

    const [quoteDetails, setQuoteDetails] = useState(defaultQuoteDetails);
    const [items, setItems] = useState([]);
    const [newItemType, setNewItemType] = useState('service');
    const [selectedItemId, setSelectedItemId] = useState('');
    const [qty, setQty] = useState(1);
    const [documentType, setDocumentType] = useState('Quotation');
    const [discount, setDiscount] = useState(0);
    const [clientNameSelection, setClientNameSelection] = useState('');
    const [customClientName, setCustomClientName] = useState('');
    const [contactSelectionIdx, setContactSelectionIdx] = useState('');
    const [recordStatus, setRecordStatus] = useState('QUOTATION_CREATED');
    const [existingRecord, setExistingRecord] = useState(null);

    const currentData = useMemo(() => ({
        quoteDetails,
        items,
        documentType,
        discount
    }), [quoteDetails, items, documentType, discount]);

    const derivedTcTypes = useMemo(() => {
        const itemTcTypes = items.flatMap(item => item.tcList || []);
        const legacyTcTypes = quoteDetails.selected_tc_types || [];
        return [...new Set([...itemTcTypes, ...legacyTcTypes])];
    }, [items, quoteDetails.selected_tc_types]);

    const derivedTechTypes = useMemo(() => {
        const itemTechTypes = items.flatMap(item => item.techList || []);
        const legacyTechTypes = quoteDetails.selected_tech_types || [];
        return [...new Set([...itemTechTypes, ...legacyTechTypes])];
    }, [items, quoteDetails.selected_tech_types]);

    const isDirty = useMemo(() => {
        if (!lastSavedData) return false;
        try {
            return JSON.stringify(currentData) !== lastSavedData;
        } catch (e) {
            return false;
        }
    }, [currentData, lastSavedData]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const blocker = useBlocker(
        ({ nextLocation }) =>
            isDirty && !isSavingRecord && (nextLocation.pathname !== location.pathname || nextLocation.state?.forceReset)
    );

    const handleReset = useCallback(() => {
        setQuoteDetails(defaultQuoteDetails);
        setItems([]);
        setNewItemType('service');
        setSelectedItemId('');
        setQty(1);
        setDocumentType('Quotation');
        setDiscount(0);
        setClientNameSelection('');
        setCustomClientName('');
        setContactSelectionIdx('');
        setSavedRecordId(null);
        setExistingRecord(null);
        setLoadedDocumentType(null);
        setRecordStatus('QUOTATION_CREATED');
        setLastSavedData(JSON.stringify({
            quoteDetails: defaultQuoteDetails,
            items: [],
            documentType: 'Quotation',
            discount: 0
        }));
        navigate('/doc/new', { replace: true });
    }, [defaultQuoteDetails, navigate]);

    useEffect(() => {
        if (location.state?.forceReset) {
            handleReset();
        }
    }, [location.state?.forceReset, handleReset]);

    const CLIENT_OPTIONS = useMemo(() => [
        ...(clients || []).map(client => ({
            value: client.clientName,
            label: client.clientName
        })),
        { value: 'Other', label: 'Other (Custom)' }
    ], [clients]);

    useEffect(() => {
        if (clients.length > 0 && quoteDetails.client_name) {
            const foundClient = clients.find(c => (c.clientName || '').trim() === quoteDetails.client_name.trim());
            if (foundClient) {
                if (clientNameSelection !== foundClient.clientName) {
                    setClientNameSelection(foundClient.clientName);
                    const contacts = foundClient.contacts || [];
                    const primaryIdx = contacts.findIndex(con => con.is_primary);
                    const currentIdx = primaryIdx >= 0 ? primaryIdx : (contacts.length > 0 ? 0 : -1);
                    if (currentIdx >= 0 && contactSelectionIdx === '') {
                        setContactSelectionIdx(currentIdx.toString());
                    }
                }
            } else if (quoteDetails.client_name !== '' && !clientNameSelection) {
                setClientNameSelection('Other');
                setCustomClientName(quoteDetails.client_name);
            }
        }
    }, [clients, quoteDetails.client_name, clientNameSelection, contactSelectionIdx]);

    useEffect(() => {
        const loadFromDynamo = async (id) => {
            if (!idToken) return;
            try {
                const data = await dynamoGenericApi.get(id, idToken);
                if (data) {
                    const content = data.quotation || {};
                    const loadedQuoteDetails = content.quoteDetails || content || {};
                    const loadedItems = content.items || [];
                    const loadedDocType = data.document_type || content.documentType || 'Quotation';
                    const loadedDiscount = content.discount || 0;

                    setExistingRecord(data);
                    const mappedQuoteDetails = {
                        ...defaultQuoteDetails,
                        client_name: loadedQuoteDetails.client_name || loadedQuoteDetails.clientName || '',
                        client_address: loadedQuoteDetails.client_address || loadedQuoteDetails.clientAddress || '',
                        contractor_name: loadedQuoteDetails.contractor_name || loadedQuoteDetails.contractorName || '',
                        contractor_address: loadedQuoteDetails.contractor_address || loadedQuoteDetails.contractorAddress || '',
                        project_name: loadedQuoteDetails.project_name || loadedQuoteDetails.projectName || '',
                        project_address: loadedQuoteDetails.project_address || loadedQuoteDetails.projectAddress || '',
                        email: loadedQuoteDetails.email || '',
                        phone: loadedQuoteDetails.phone || '',
                        name: loadedQuoteDetails.name || '',
                        date: loadedQuoteDetails.date || format(new Date(), 'yyyy-MM-dd'),
                        quote_number: data.job_order_no || data.quote_number || loadedQuoteDetails.quote_number || loadedQuoteDetails.quoteNumber || '',
                        generated_by: loadedQuoteDetails.generated_by || loadedQuoteDetails.generatedBy || '',
                        payment_date: loadedQuoteDetails.payment_date || loadedQuoteDetails.paymentDate || '',
                        payment_mode: loadedQuoteDetails.payment_mode || loadedQuoteDetails.paymentMode || '',
                        payment_amount: loadedQuoteDetails.payment_amount || loadedQuoteDetails.paymentAmount || '',
                        bank_details: loadedQuoteDetails.bank_details || loadedQuoteDetails.bankDetails || '',
                        selected_tc_types: loadedQuoteDetails.selected_tc_types || loadedQuoteDetails.selectedTcTypes || [],
                        selected_tech_types: loadedQuoteDetails.selected_tech_types || loadedQuoteDetails.selectedTechTypes || []
                    };

                    setQuoteDetails(mappedQuoteDetails);
                    setItems(loadedItems);
                    setDocumentType(loadedDocType);
                    setLoadedDocumentType(loadedDocType);
                    setDiscount(loadedDiscount);
                    setSavedRecordId(data.id);
                    setRecordStatus(data.status || 'QUOTATION_CREATED');

                    const snapshot = {
                        quoteDetails: mappedQuoteDetails,
                        items: loadedItems,
                        documentType: loadedDocType,
                        discount: loadedDiscount
                    };
                    setLastSavedData(JSON.stringify(snapshot));
                }
            } catch (err) {
                console.error('Error loading record:', err);
                toast({ title: "Error", description: "Failed to load record.", variant: "destructive" });
            }
        };

        const id = pathId || searchParams.get('id');
        if (id && !isSavingRecord) {
            loadFromDynamo(id);
        }
    }, [searchParams, pathId, isSavingRecord, idToken, defaultQuoteDetails, toast]);

    const handleSaveToDatabase = async () => {
        if (!idToken) {
            toast({ title: "Authentication Required", description: "You must be logged in to save.", variant: "destructive" });
            return;
        }

        if (!quoteDetails.client_name) {
            toast({ title: "Client Required", description: "Please select a client before saving.", variant: "destructive" });
            return;
        }

        setIsSavingRecord(true);
        try {
            const isTypeChanged = savedRecordId && loadedDocumentType && documentType !== loadedDocumentType;
            let docNumber = quoteDetails.quote_number;
            if ((!savedRecordId || isTypeChanged) && (!docNumber || isTypeChanged)) {
                docNumber = await getNextDocNumber(dynamoGenericApi, documentType, idToken);
            }

            const updatedQuoteDetails = { ...quoteDetails, quote_number: docNumber };
            const selectedClient = clients.find(c => c.clientName === quoteDetails.client_name);

            const recordData = {
                ...existingRecord,
                id: isTypeChanged ? `doc_${Date.now()}` : (savedRecordId || `job_${crypto.randomUUID()}`),
                job_order_no: docNumber,
                document_type: documentType,
                client_id: selectedClient?.id || '',
                client_name: quoteDetails.client_name,
                project_name: quoteDetails.project_name,
                po_wo_number: documentType === 'Quotation' ? '' : quoteDetails.quote_number,
                status: (!savedRecordId || isTypeChanged)
                    ? (documentType === 'Quotation' ? 'QUOTATION_CREATED' : 'MATERIAL_RECEIVED')
                    : (recordStatus || 'MATERIAL_RECEIVED'),
                created_at: existingRecord?.created_at || new Date().toISOString(),
                quotation: {
                    quoteDetails: updatedQuoteDetails,
                    items,
                    discount,
                    documentType
                },
                created_by: existingRecord?.created_by || user.id || user.username || 'unknown',
                updated_at: new Date().toISOString()
            };

            await dynamoGenericApi.save(DB_TYPES.JOB, recordData, idToken);

            setSavedRecordId(recordData.id);
            setLoadedDocumentType(documentType);
            setQuoteDetails(updatedQuoteDetails);

            const snapshot = {
                quoteDetails: updatedQuoteDetails,
                items,
                documentType,
                discount
            };
            setLastSavedData(JSON.stringify(snapshot));

            toast({
                title: "Success",
                description: (savedRecordId && !isTypeChanged) ? `${documentType} updated.` : `${documentType} saved as ${docNumber}.`
            });

            if (!savedRecordId || isTypeChanged) {
                navigate(`/doc/${recordData.id}`, { replace: true });
            }

            try {
                const action = (savedRecordId && !isTypeChanged) ? "Updated" : "Created";
                const emoji = (savedRecordId && !isTypeChanged) ? "📝" : "📄";
                const message = `${emoji} *${documentType} ${action}*\n\n` +
                    `Number: \`${docNumber}\`\n` +
                    `Client: \`${quoteDetails.client_name}\`\n` +
                    `Generated By: \`${user.fullName || user.full_name || user.name}\``;
                await sendTelegramNotification(message);
            } catch (e) { }
        } catch (err) {
            console.error('Save Error:', err);
            toast({ title: "Error", description: err.message || "Failed to save.", variant: "destructive" });
        } finally {
            setIsSavingRecord(false);
        }
    };

    const getAppropiatePrice = (itemId, type, clientId) => {
        if (!clientId) {
            return (type === 'service' ? services : tests).find(s => s.id === itemId)?.price || 0;
        }
        if (type === 'service') {
            const cp = clientServicePrices.find(p => p.client_id === clientId && p.service_id === itemId);
            return cp ? cp.price : (services.find(s => s.id === itemId)?.price || 0);
        } else {
            const cp = clientTestPrices.find(p => p.client_id === clientId && p.test_id === itemId);
            return cp ? cp.price : (tests.find(t => t.id === itemId)?.price || 0);
        }
    };

    const componentRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `${documentType}_${quoteDetails.quote_number}`,
    });

    const triggerPrint = async () => {
        if (!quoteDetails.quote_number) {
            toast({ title: "Save Required", description: "Please save the document before printing.", variant: "destructive" });
            return;
        }
        try {
            const message = `🖨️ *Print Action*\n\n` +
                `Doc: \`${documentType}\`\nNo: \`${quoteDetails.quote_number}\`\nClient: \`${quoteDetails.client_name}\``;
            await sendTelegramNotification(message);
        } catch (e) { }
        handlePrint();
    };

    const handleAddItem = () => {
        if (!selectedItemId) return;
        const itemData = (newItemType === 'service' ? services : tests).find(i => i.id === selectedItemId);
        if (itemData) {
            const clientId = clients.find(c => c.clientName === quoteDetails.client_name)?.id;
            const finalPrice = getAppropiatePrice(selectedItemId, newItemType, clientId);
            setItems(prev => [...prev, {
                id: Date.now(),
                sourceId: selectedItemId,
                type: newItemType,
                description: newItemType === 'service' ? itemData.serviceType : `${itemData.testType} - ${itemData.materials}`,
                unit: newItemType === 'service' ? (itemData.unit || 'Nos') : 'Test',
                price: Number(finalPrice),
                qty: Number(qty),
                total: Number(finalPrice) * Number(qty),
                hsnCode: itemData.hsnCode || '',
                tcList: itemData.tcList || [],
                techList: itemData.techList || [],
                ...(newItemType === 'service' && {
                    methodOfSampling: itemData.methodOfSampling || 'NA',
                    numBHs: itemData.numBHs || 0,
                    measure: itemData.measure || 'NA'
                })
            }]);
            setSelectedItemId('');
            setQty(1);
        }
    };

    const handleDeleteItem = (id) => setItems(items.filter(item => item.id !== id));
    const handleMoveItemUp = (idx) => {
        if (idx === 0) return;
        const newItems = [...items];
        [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
        setItems(newItems);
    };
    const handleMoveItemDown = (idx) => {
        if (idx === items.length - 1) return;
        const newItems = [...items];
        [newItems[idx + 1], newItems[idx]] = [newItems[idx], newItems[idx + 1]];
        setItems(newItems);
    };

    const calculateTotal = () => items.reduce((sum, item) => sum + item.total, 0);

    // Site configuration for pagination
    const siteContent = getSiteContent();
    const p = siteContent.pagination || {};
    const ITEMS_PER_FIRST_PAGE = p.itemsPerFirstPage || 5;
    const ITEMS_PER_CONTINUATION_PAGE = p.itemsPerContinuationPage || 7;
    const TC_ITEMS_PER_FIRST_PAGE = p.tcItemsFirstPage || 15;
    const TC_ITEMS_PER_CONTINUATION_PAGE = p.tcItemsContinuationPage || 20;
    const TECH_ITEMS_PER_FIRST_PAGE = p.techItemsFirstPage || 15;
    const TECH_ITEMS_PER_CONTINUATION_PAGE = p.techItemsContinuationPage || 20;

    const paginateItems = () => {
        const pages = [];
        if (items.length === 0) {
            pages.push({ items: [], pageNumber: 1, isFirstPage: true, isContinuation: false });
        } else if (items.length <= ITEMS_PER_FIRST_PAGE) {
            pages.push({ items, pageNumber: 1, isFirstPage: true, isContinuation: false });
        } else {
            pages.push({ items: items.slice(0, ITEMS_PER_FIRST_PAGE), pageNumber: 1, isFirstPage: true, isContinuation: false });
            let remaining = items.slice(ITEMS_PER_FIRST_PAGE);
            let pNum = 2;
            while (remaining.length > 0) {
                pages.push({ items: remaining.slice(0, ITEMS_PER_CONTINUATION_PAGE), pageNumber: pNum, isFirstPage: false, isContinuation: true });
                remaining = remaining.slice(ITEMS_PER_CONTINUATION_PAGE);
                pNum++;
            }
        }
        return pages;
    };

    const paginateTerms = () => {
        if (!derivedTcTypes.length) return [];
        const pages = [];
        let curIdx = 0;
        const total = derivedTcTypes.length;

        const processPage = (limit, isFirst) => {
            const pageTypes = derivedTcTypes.slice(curIdx, curIdx + limit);
            const pageItems = [];
            pageTypes.forEach(type => {
                const ts = (terms || []).filter(t => t.type === type);
                if (ts.length) {
                    if (type.toLowerCase() !== 'general') pageItems.push({ type: 'header', text: type, id: `h-${type}` });
                    ts.forEach(t => pageItems.push({ type: 'term', text: t.text, id: t.id }));
                    pageItems.push({ type: 'spacer', id: `s-${type}` });
                }
            });
            if (pageItems.length && pageItems[pageItems.length - 1].type === 'spacer') pageItems.pop();
            pages.push({ items: pageItems, pageNumber: pages.length + 1, isFirstPage: isFirst });
            curIdx += limit;
        };

        processPage(TC_ITEMS_PER_FIRST_PAGE, true);
        while (curIdx < total) processPage(TC_ITEMS_PER_CONTINUATION_PAGE, false);
        return pages;
    };

    const paginateTechnicals = () => {
        if (!derivedTechTypes.length) return [];
        const pages = [];
        let curIdx = 0;
        const total = derivedTechTypes.length;

        const processPage = (limit, isFirst) => {
            const pageTypes = derivedTechTypes.slice(curIdx, curIdx + limit);
            const pageItems = [];
            pageTypes.forEach(type => {
                const tks = (technicals || []).filter(t => t.type === type);
                if (tks.length) {
                    pageItems.push({ type: 'header', text: type, id: `th-${type}` });
                    tks.forEach(tk => pageItems.push({ type: 'tech', text: tk.text, id: tk.id }));
                    pageItems.push({ type: 'spacer', id: `ts-${type}` });
                }
            });
            if (pageItems.length && pageItems[pageItems.length - 1].type === 'spacer') pageItems.pop();
            pages.push({ items: pageItems, pageNumber: pages.length + 1, isFirstPage: isFirst });
            curIdx += limit;
        };

        processPage(TECH_ITEMS_PER_FIRST_PAGE, true);
        while (curIdx < total) processPage(TECH_ITEMS_PER_CONTINUATION_PAGE, false);
        return pages;
    };

    const itemPages = paginateItems();
    const tcPages = paginateTerms();
    const techPages = paginateTechnicals();
    const totalItemPages = itemPages.length;
    const totalPages = totalItemPages + 1 + tcPages.length + techPages.length; // +1 for Bank page

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            <div className="shrink-0"><Navbar isDirty={isDirty} isSaving={isSavingRecord} /></div>

            <div className="flex-1 flex flex-col min-h-0 container mx-auto px-4 py-4">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <div className="flex items-center gap-4">
                        {!isStandard() && (
                            <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h1 className="text-lg font-bold text-gray-900">{savedRecordId ? 'Update' : 'Create new'} {documentType}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleSaveToDatabase}
                            disabled={isSavingRecord}
                            size="sm"
                            className="bg-green-800 hover:bg-green-900 text-white h-9 px-3 rounded-lg"
                        >
                            {isSavingRecord ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                            {savedRecordId ? 'Update' : 'Save'} {documentType}
                        </Button>
                        <Button
                            onClick={triggerPrint}
                            size="sm"
                            className="bg-blue-800 hover:bg-blue-900 text-white h-9 px-3 rounded-lg"
                        >
                            <Printer className="w-3.5 h-3.5 mr-2" /> Print / PDF
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-2 pb-8 pr-2 custom-scrollbar">
                    {/* Left Column: Editor */}
                    <div className="lg:col-span-1 space-y-2">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="mb-4">
                                <Label>Document Type</Label>
                                <Select value={documentType} onValueChange={setDocumentType}>
                                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Quotation">Quotation</SelectItem>
                                        <SelectItem value="Tax Invoice">Tax Invoice</SelectItem>
                                        <SelectItem value="Proforma Invoice">Proforma Invoice</SelectItem>
                                        <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                                        <SelectItem value="Delivery Challan">Delivery Challan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="mb-4">
                                <Label>{documentType} Number</Label>
                                <Input value={quoteDetails.quote_number || ''} readOnly placeholder="Auto-generated on save" className="bg-gray-50 cursor-not-allowed" />
                                {!quoteDetails.quote_number && <p className="text-[10px] text-red-500 mt-1 italic">* Number will be generated when you save.</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <Label>Date</Label>
                                    <Input type="date" value={quoteDetails.date} onChange={e => setQuoteDetails({ ...quoteDetails, date: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Discount (%)</Label>
                                    <Input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                                </div>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <div>
                                    <Label>Client Name <span className="text-red-500">*</span></Label>
                                    <Select value={clientNameSelection} onValueChange={(v) => {
                                        setClientNameSelection(v);
                                        if (v !== 'Other') {
                                            const sc = clients.find(c => c.clientName === v);
                                            const cs = sc?.contacts || [];
                                            const pIdx = cs.findIndex(c => c.is_primary);
                                            const idx = pIdx >= 0 ? pIdx : (cs.length ? 0 : -1);
                                            const pc = cs[idx] || {};
                                            setQuoteDetails({
                                                ...quoteDetails,
                                                client_name: v,
                                                client_address: sc?.clientAddress || '',
                                                email: pc.contact_email || sc?.email || '',
                                                phone: pc.contact_phone || sc?.phone || '',
                                                name: pc.contact_person || ''
                                            });
                                            setContactSelectionIdx(idx >= 0 ? idx.toString() : '');
                                        } else {
                                            setQuoteDetails({ ...quoteDetails, client_name: customClientName, client_address: '', email: '', phone: '', name: '' });
                                        }
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                                        <SelectContent>
                                            {CLIENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {clientNameSelection === 'Other' && (
                                        <Input className="mt-2" value={customClientName} onChange={e => {
                                            setCustomClientName(e.target.value);
                                            setQuoteDetails({ ...quoteDetails, client_name: e.target.value });
                                        }} placeholder="Enter custom client name" />
                                    )}
                                </div>

                                {clientNameSelection !== 'Other' && clientNameSelection !== '' && (() => {
                                    const sc = clients.find(c => c.clientName === clientNameSelection);
                                    const cs = sc?.contacts || [];
                                    if (cs.length === 0) return <div className="text-[10px] text-amber-600 italic bg-amber-50 p-2 rounded">Setup a contact in Admin Panel</div>;
                                    return (
                                        <div>
                                            <Label>Client Contact</Label>
                                            <Select value={contactSelectionIdx} onValueChange={(idx) => {
                                                setContactSelectionIdx(idx);
                                                const c = cs[parseInt(idx)];
                                                if (c) setQuoteDetails(prev => ({ ...prev, name: c.contact_person || '', email: c.contact_email || '', phone: c.contact_phone || '' }));
                                            }}>
                                                <SelectTrigger><SelectValue placeholder="Pick a contact" /></SelectTrigger>
                                                <SelectContent>{cs.map((c, i) => <SelectItem key={i} value={i.toString()}>{c.contact_person} {c.is_primary ? '(P)' : ''}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    );
                                })()}

                                <div>
                                    <Label>Client Address</Label>
                                    <Textarea value={quoteDetails.client_address} onChange={e => setQuoteDetails({ ...quoteDetails, client_address: e.target.value })} rows={2} />
                                </div>
                                <div className="grid grid-cols-1 gap-4 pt-2 border-t">
                                    <div><Label>Contractor Name</Label><Textarea value={quoteDetails.contractor_name} onChange={e => setQuoteDetails({ ...quoteDetails, contractor_name: e.target.value })} rows={2} /></div>
                                    <div><Label>Contractor Address</Label><Textarea value={quoteDetails.contractor_address} onChange={e => setQuoteDetails({ ...quoteDetails, contractor_address: e.target.value })} rows={2} /></div>
                                </div>
                                <div className="grid grid-cols-1 gap-4 pt-2 border-t">
                                    <div><Label>Project Name</Label><Textarea value={quoteDetails.project_name} onChange={e => setQuoteDetails({ ...quoteDetails, project_name: e.target.value })} rows={2} /></div>
                                    <div><Label>Project Address</Label><Textarea value={quoteDetails.project_address} onChange={e => setQuoteDetails({ ...quoteDetails, project_address: e.target.value })} rows={2} /></div>
                                </div>
                            </div>
                        </div>

                        {documentType === 'Tax Invoice' && (
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-primary"><CreditCard className="w-4 h-4" /> Payment Details</h2>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><Label>Received Date</Label><Input type="date" value={quoteDetails.payment_date || ''} onChange={e => setQuoteDetails({ ...quoteDetails, payment_date: e.target.value })} /></div>
                                        <div><Label>Mode</Label><Select value={quoteDetails.payment_mode} onValueChange={v => setQuoteDetails({ ...quoteDetails, payment_mode: v })}><SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="NEFT/RTGS">NEFT/RTGS</SelectItem><SelectItem value="UPI">UPI</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                                    </div>
                                    <div><Label>Amount (<Rupee />)</Label><Input type="number" value={quoteDetails.payment_amount} onChange={e => setQuoteDetails({ ...quoteDetails, payment_amount: e.target.value })} /></div>
                                    <div><Label>Bank / Transaction Details</Label><Textarea value={quoteDetails.bank_details} onChange={e => setQuoteDetails({ ...quoteDetails, bank_details: e.target.value })} rows={2} /></div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-primary"><Plus className="w-4 h-4" /> Add Item</h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant={newItemType === 'service' ? 'default' : 'outline'} onClick={() => setNewItemType('service')} className="w-full flex items-center gap-1"><BriefcaseBusiness className="w-3 h-3" /> Service</Button>
                                    <Button variant={newItemType === 'test' ? 'default' : 'outline'} onClick={() => setNewItemType('test')} className="w-full flex items-center gap-1"><TestTube className="w-3 h-3" /> Test</Button>
                                </div>
                                <ReactSelect
                                    options={newItemType === 'service'
                                        ? services.map(s => ({ value: s.id, label: s.serviceType }))
                                        : tests.map(t => ({ value: t.id, label: `${t.testType} - ${t.materials}` }))}
                                    onChange={(o) => setSelectedItemId(o ? o.value : '')}
                                    value={selectedItemId ? {
                                        value: selectedItemId,
                                        label: newItemType === 'service'
                                            ? services.find(s => s.id === selectedItemId)?.serviceType
                                            : tests.find(t => t.id === selectedItemId)?.testType + ' - ' + tests.find(t => t.id === selectedItemId)?.materials
                                    } : null}
                                    placeholder={`Search ${newItemType}...`}
                                    styles={{ control: (b) => ({ ...b, borderRadius: '0.5rem', fontSize: '14px' }) }}
                                />
                                <div><Label>Quantity</Label><Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} /></div>
                                <Button onClick={handleAddItem} className="w-full" disabled={!selectedItemId}>Add to List</Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: A4 Preview (EXACT Reference Style) */}
                    <div className="lg:col-span-2">
                        <div className="a4-preview-wrapper rounded-xl border border-gray-100 shadow-inner overflow-hidden">
                            <div ref={componentRef} id="printable-quote-root">
                                {itemPages.map((page, pIdx) => (
                                    <div key={`page-${pIdx}`} className="a4-container">
                                        {/* Watermark */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]" style={{ transform: 'rotate(-55deg)', zIndex: 0 }}>
                                            <span style={{ fontSize: '42pt', fontWeight: 700, whiteSpace: 'nowrap' }}>EDGE2 Engineering Solutions India Pvt. Ltd.</span>
                                        </div>

                                        <div className="a4-page-content relative z-10">
                                            {page.isFirstPage && (
                                                <>
                                                    <div className="flex justify-between items-start border-b pb-4 mb-2">
                                                        <div className="w-[30%]">
                                                            <h3 className="text-lg font-bold text-gray-900 tracking-tight uppercase">{documentType}</h3>
                                                            <p className="text-gray-500 mt-1 text-xs">#{quoteDetails.quote_number || 'PENDING'}</p>
                                                            <p className="text-gray-500 text-xs">Date: {format(new Date(quoteDetails.date), 'dd MMM yyyy')}</p>
                                                        </div>
                                                        <div className="w-[70%] flex items-center gap-4 text-right">
                                                            <div className="text-right flex-1">
                                                                <h2 className="font-bold text-md leading-tight">EDGE2 Engineering Solutions India Pvt. Ltd.</h2>
                                                                <p className="text-gray-600 text-[10px] leading-tight mt-1">Shivaganga Arcade, B35/130, 6th Cross, 6th Block, Vishweshwaraiah Layout, Ullal Upanagar, Bangalore - 560056, KA</p>
                                                                <p className="text-gray-600 text-[10px] leading-tight"><span className="font-bold">PAN:</span> AACCE1702A | <span className="font-bold">GSTIN:</span> 29AACCE1702A1ZD</p>
                                                                <p className="text-gray-600 text-[10px] leading-tight">Ph: 09448377127 / 080-50056086 | Email: info@edge2.in | Web: edge2.in</p>
                                                            </div>
                                                            <img src={`${import.meta.env.BASE_URL}edge2-logo.png`} alt="Logo" className="w-16 h-16 object-contain" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-6 mb-2 border-b pb-2">
                                                        <div className="space-y-1">
                                                            <h3 className="text-[10px] text-gray-400 font-bold uppercase border-b pb-0.5 mb-1">Client</h3>
                                                            <p className="font-bold text-[11px]">{quoteDetails.client_name || '-'}</p>
                                                            <p className="text-gray-600 text-[10px] whitespace-pre-wrap leading-tight">{quoteDetails.client_address}</p>
                                                            <p className="text-gray-600 text-[10px] mt-1">{quoteDetails.name} | {quoteDetails.phone}</p>
                                                        </div>
                                                        <div className="space-y-1 border-l pl-2">
                                                            <h3 className="text-[10px] text-gray-400 font-bold uppercase border-b pb-0.5 mb-1">Contractor</h3>
                                                            <p className="font-bold text-[11px]">{quoteDetails.contractor_name || '-'}</p>
                                                            <p className="text-gray-600 text-[10px] whitespace-pre-wrap leading-tight">{quoteDetails.contractor_address}</p>
                                                        </div>
                                                        <div className="space-y-1 border-l pl-2">
                                                            <h3 className="text-[10px] text-gray-400 font-bold uppercase border-b pb-0.5 mb-1">Project</h3>
                                                            <p className="font-bold text-[11px]">{quoteDetails.project_name || '-'}</p>
                                                            <p className="text-gray-600 text-[10px] whitespace-pre-wrap leading-tight">{quoteDetails.project_address}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] text-right italic mb-2">Generated by: {quoteDetails.generated_by}</p>
                                                </>
                                            )}

                                            {page.isContinuation && (
                                                <div className="border-b pb-2 mb-4">
                                                    <h3 className="text-md font-bold text-gray-900">{documentType} #{quoteDetails.quote_number} (Continued)</h3>
                                                </div>
                                            )}

                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 border-y border-gray-200">
                                                        <th className="p-2 border border-gray-200 text-left text-[9px] font-bold uppercase w-8">Sl No.</th>
                                                        <th className="p-2 border border-gray-200 text-left text-[9px] font-bold uppercase">Description</th>
                                                        <th className="p-2 border border-gray-200 text-left text-[9px] font-bold uppercase w-16">HSN/SAC</th>
                                                        <th className="p-2 border border-gray-200 text-right text-[9px] font-bold uppercase w-20">Rate</th>
                                                        <th className="p-2 border border-gray-200 text-right text-[9px] font-bold uppercase w-16">Qty</th>
                                                        <th className="p-2 border border-gray-200 text-right text-[9px] font-bold uppercase w-24">Total</th>
                                                        <th className="w-10 print:hidden"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {page.items.map((item, idx) => {
                                                        const slNo = pIdx === 0 ? idx + 1 : ITEMS_PER_FIRST_PAGE + (pIdx - 1) * ITEMS_PER_CONTINUATION_PAGE + idx + 1;
                                                        return (
                                                            <tr key={idx} className="border-b border-gray-100 group">
                                                                <td className="p-2 border border-gray-100 text-[10px] align-top text-center">{slNo}.</td>
                                                                <td className="p-2 border border-gray-100 text-[10px] align-top">
                                                                    <p className="font-bold leading-tight">{item.description}</p>
                                                                    <p className="text-[9px] text-gray-400 italic capitalize">{item.type} | {item.unit}</p>
                                                                    {item.type === 'service' && (
                                                                        <div className="mt-1 flex gap-2 text-[9px] text-gray-500">
                                                                            {item.methodOfSampling !== 'NA' && <span>Method: {item.methodOfSampling}</span>}
                                                                            {item.numBHs > 0 && <span>| BHs: {item.numBHs}</span>}
                                                                            {item.measure !== 'NA' && <span>| Measure: {item.measure}</span>}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-2 border border-gray-100 text-[10px] align-top text-center">{item.hsnCode || '-'}</td>
                                                                <td className="p-2 border border-gray-100 text-[10px] align-top text-right"><Rupee />{item.price.toLocaleString()}</td>
                                                                <td className="p-2 border border-gray-100 text-[10px] align-top text-right">{item.qty}</td>
                                                                <td className="p-2 border border-gray-100 text-[10px] align-top text-right font-bold"><Rupee />{item.total.toLocaleString()}</td>
                                                                <td className="text-right print:hidden align-top p-1">
                                                                    <div className="flex items-center justify-end gap-0.5">
                                                                        <button onClick={() => handleMoveItemUp(slNo - 1)} disabled={slNo === 1} className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-10 transition-colors"><ChevronUp className="w-3 h-3" /></button>
                                                                        <button onClick={() => handleMoveItemDown(slNo - 1)} disabled={slNo === items.length} className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-10 transition-colors"><ChevronDown className="w-3 h-3" /></button>
                                                                        <button onClick={() => handleDeleteItem(item.id)} className="text-red-300 hover:text-red-500 p-1 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>

                                            {pIdx === totalItemPages - 1 && (
                                                <div className="mt-6 flex flex-col items-end space-y-1">
                                                    <div className="w-1/2 divide-y divide-gray-100 border-t border-gray-200 pt-2">
                                                        <div className="flex justify-between text-[11px] mb-1"><span>Subtotal:</span><span className="font-bold"><Rupee />{calculateTotal().toLocaleString()}</span></div>
                                                        {discount > 0 && <div className="flex justify-between text-[11px] text-green-600 mb-1"><span>Discount ({discount}%):</span><span>- <Rupee />{(calculateTotal() * discount / 100).toLocaleString()}</span></div>}
                                                        <div className="flex justify-between text-[11px] mb-1"><span>CGST ({taxCGST}%):</span><span><Rupee />{((calculateTotal() * (1 - discount / 100)) * taxCGST / 100).toLocaleString()}</span></div>
                                                        <div className="flex justify-between text-[11px] mb-1"><span>SGST ({taxSGST}%):</span><span><Rupee />{((calculateTotal() * (1 - discount / 100)) * taxSGST / 100).toLocaleString()}</span></div>
                                                        <div className="flex justify-between text-[13px] font-black text-gray-900 border-t border-gray-400 mt-2 pt-1"><span>Grand Total:</span><span><Rupee />{((calculateTotal() * (1 - discount / 100)) * (1 + taxTotalPercent / 100)).toLocaleString()}</span></div>
                                                    </div>
                                                    {documentType === 'Tax Invoice' && quoteDetails.payment_amount > 0 && (
                                                        <div className="w-1/2 border-t pt-1 mt-1 text-right">
                                                            <div className="flex justify-between text-[11px] text-red-600"><span>Payment Received:</span><span>- <Rupee />{Number(quoteDetails.payment_amount).toLocaleString()}</span></div>
                                                            <div className="flex justify-between text-sm font-black text-primary mt-1 border-t pt-1"><span>Balance Due:</span><span><Rupee />{(((calculateTotal() * (1 - discount / 100)) * (1 + taxTotalPercent / 100)) - Number(quoteDetails.payment_amount)).toLocaleString()}</span></div>
                                                        </div>
                                                    )}
                                                    <div className="w-full mt-4 text-[10px] italic border-t pt-2 text-gray-600 font-medium">Amount in words: {numberToWords((calculateTotal() * (1 - discount / 100)) * (1 + taxTotalPercent / 100))}</div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="a4-page-footer absolute bottom-[10mm] left-[10mm] right-[10mm]">
                                            <span>EDGE2 Engineering Solutions India Pvt. Ltd.</span>
                                            <span className="font-bold uppercase">{documentType} #{quoteDetails.quote_number || 'Pending'} | Page {pIdx + 1} of {totalPages}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Bank and Signatory Page */}
                                <div className="a4-container">
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]" style={{ transform: 'rotate(-55deg)', zIndex: 0 }}>
                                        <span style={{ fontSize: '42pt', fontWeight: 700, whiteSpace: 'nowrap' }}>EDGE2 Engineering Solutions India Pvt. Ltd.</span>
                                    </div>
                                    <div className="a4-page-content relative z-10">
                                        <h2 className="text-center font-bold text-lg mb-8 uppercase border-b pb-4">Bank & Payment Terms</h2>
                                        <div className="grid grid-cols-2 gap-12 text-[11px]">
                                            <div className="space-y-4">
                                                <h3 className="font-bold text-gray-900 border-b pb-1 uppercase">Our Bank Details</h3>
                                                <table className="w-full text-[11px]">
                                                    <tbody className="space-y-2">
                                                        <tr><td className="font-bold w-24">A/c Holder:</td><td>{settings?.bank_account_holder_name || 'EDGE2 Engineering Solutions India Pvt. Ltd.'}</td></tr>
                                                        <tr><td className="font-bold">A/c Number:</td><td>{settings?.bank_account_number || '560321000022687'}</td></tr>
                                                        <tr><td className="font-bold">Bank Name:</td><td>{settings?.bank_name || 'Union Bank of India'}</td></tr>
                                                        <tr><td className="font-bold">Branch:</td><td>{settings?.branch_name || 'Peenya, Bangalore'}</td></tr>
                                                        <tr><td className="font-bold">IFSC Code:</td><td>{settings?.ifsc_code || 'UBIN0907634'}</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="flex flex-col items-center justify-center space-y-20 border-l pl-12">
                                                <h3 className="font-bold uppercase">Authorized Signatory</h3>
                                                <p className="border-t border-gray-400 w-full text-center pt-2 font-bold text-gray-600">For EDGE2 Engineering Solutions India Pvt. Ltd.</p>
                                            </div>
                                        </div>
                                        <div className="mt-12 space-y-4 border-t pt-8">
                                            <h3 className="font-bold text-gray-900 uppercase">Payment Terms:</h3>
                                            {settings?.payment_terms
                                                ? <div className="text-[11px] whitespace-pre-wrap leading-relaxed">{settings.payment_terms}</div>
                                                : <ul className="list-disc pl-5 text-[11px] space-y-2 text-gray-700">
                                                    <li>Advance Payment of 60% + GST ({taxTotalPercent}%) along with Work order as mobilization advance.</li>
                                                    <li>Mobilization of Men and Machines shall be done in 3–5 days after confirmation of Advance Payment.</li>
                                                    <li>Balance Payment to be done after completion of field work and submission of draft report.</li>
                                                </ul>
                                            }
                                        </div>
                                    </div>
                                    <div className="a4-page-footer absolute bottom-[10mm] left-[10mm] right-[10mm]">
                                        <span>EDGE2 Engineering Solutions India Pvt. Ltd.</span>
                                        <span className="font-bold uppercase">{documentType} #{quoteDetails.quote_number || 'Pending'} | Page {totalItemPages + 1} of {totalPages}</span>
                                    </div>
                                </div>

                                {/* Terms & Conditions Pages */}
                                {tcPages.map((page, tcIdx) => (
                                    <div key={`tc-${tcIdx}`} className="a4-container">
                                        <div className="a4-page-content relative z-10">
                                            <h2 className="text-center font-bold text-lg mb-8 uppercase border-b pb-4">{tcIdx === 0 ? "Terms & Conditions" : "Terms & Conditions (Cont.)"}</h2>
                                            <div className="space-y-4 text-[10px]">
                                                {page.items.map((item, idx) => (
                                                    <div key={idx}>
                                                        {item.type === 'header' && <h4 className="font-bold text-primary mt-4 mb-2 border-l-4 border-primary pl-2 uppercase">{item.text}</h4>}
                                                        {item.type === 'term' && <p className="text-gray-700 leading-relaxed text-justify mb-1">{item.text}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="a4-page-footer absolute bottom-[10mm] left-[10mm] right-[10mm]">
                                            <span>EDGE2 Engineering Solutions India Pvt. Ltd.</span>
                                            <span className="font-bold uppercase">{documentType} #{quoteDetails.quote_number || 'Pending'} | Page {totalItemPages + 2 + tcIdx} of {totalPages}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Technicals Pages */}
                                {techPages.map((page, techIdx) => (
                                    <div key={`tech-${techIdx}`} className="a4-container">
                                        <div className="a4-page-content relative z-10">
                                            <h2 className="text-center font-bold text-lg mb-8 uppercase border-b pb-4">{techIdx === 0 ? "Technicals" : "Technicals (Cont.)"}</h2>
                                            <div className="space-y-4 text-[10px]">
                                                {page.items.map((item, idx) => (
                                                    <div key={idx}>
                                                        {item.type === 'header' && <h4 className="font-bold text-primary mt-4 mb-2 border-l-4 border-primary pl-2 uppercase">{item.text}</h4>}
                                                        {item.type === 'tech' && <p className="text-gray-700 leading-relaxed text-justify mb-1">{item.text}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="a4-page-footer absolute bottom-[10mm] left-[10mm] right-[10mm]">
                                            <span>EDGE2 Engineering Solutions India Pvt. Ltd.</span>
                                            <span className="font-bold uppercase">{documentType} #{quoteDetails.quote_number || 'Pending'} | Page {totalItemPages + 2 + tcPages.length + techIdx} of {totalPages}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <AlertDialog open={blocker.state === 'blocked'} onOpenChange={blocker.reset}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle className="flex items-center text-amber-600"><AlertCircle className="w-5 h-5 mr-2" /> Unsaved Changes</AlertDialogTitle><AlertDialogDescription>You have unsaved changes in your document. Leaving this page will discard all details added. Are you sure you want to leave?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel onClick={blocker.reset}>Stay on Page</AlertDialogCancel><AlertDialogAction onClick={blocker.proceed} className="bg-amber-600 hover:bg-amber-700 text-white">Leave and Discard</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
};

export default NewQuotationPage;
