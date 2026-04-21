
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Plus, Trash2, Printer, FileText, ArrowLeft, X, Save, Loader2, CreditCard, ChevronUp, ChevronDown, AlertCircle, Axe, TestTube, BriefcaseBusiness, Drill, SwatchBook } from 'lucide-react';
import { Link, useSearchParams, useLocation, useNavigate, useParams, useBlocker } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { getNextDocNumber } from '@/utils/docUtils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useServices } from '@/contexts/ServicesContext';
import { useTests } from '@/contexts/TestsContext';
import { useSampling } from '@/contexts/SamplingContext';
import { useClients } from '@/contexts/ClientsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTermsAndConditions } from '@/contexts/TermsAndConditionsContext';
import { useTechnicals } from '@/contexts/TechnicalsContext';
import Rupee from '@/components/Rupee';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import ReactSelect from 'react-select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { getSiteContent } from '@/data/config';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { sendTelegramNotification } from '@/lib/notifier';


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
    const { services, clientServicePrices } = useServices();
    const { tests, clientTestPrices } = useTests();
    const { samplingData } = useSampling();
    const { clients } = useClients();
    const { settings } = useSettings();
    const { terms } = useTermsAndConditions();
    const { technicals } = useTechnicals();
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
    const isNavigatingRef = useRef(false);


    const taxCGST = settings?.tax_cgst ? Number(settings.tax_cgst) : 9;
    const taxSGST = settings?.tax_sgst ? Number(settings.tax_sgst) : 9;
    const taxTotalPercent = taxCGST + taxSGST;

    const defaultQuoteDetails = useMemo(() => ({
        clientName: '',
        clientAddress: '',
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
        selectedTcTypes: [],
        selectedTechTypes: []
    }), [user?.fullName]);

    const [quoteDetails, setQuoteDetails] = useState(defaultQuoteDetails);
    const [items, setItems] = useState([]);
    const [newItemType, setNewItemType] = useState('service'); // 'service' or 'test'
    const [selectedItemId, setSelectedItemId] = useState('');
    const [qty, setQty] = useState(1);
    const [documentType, setDocumentType] = useState(searchParams.get('type') || 'Quotation'); // 'Tax Invoice', 'Quotation', 'Proforma Invoice', 'Purchase Order', or 'Delivery Challan'
    const [discount, setDiscount] = useState(0);
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [clientNameSelection, setClientNameSelection] = useState(''); // Predefined client or 'Other'
    const [customClientName, setCustomClientName] = useState('');
    const [contactSelectionIdx, setContactSelectionIdx] = useState('');

    const currentData = useMemo(() => ({
        quoteDetails,
        items,
        documentType,
        discount
    }), [quoteDetails, items, documentType, discount]);

    // Compute aggregated T&C and Technicals from items, merging with legacy manually selected ones if present
    const derivedTcTypes = useMemo(() => {
        const itemTcTypes = items.flatMap(item => item.tcList || []);
        const legacyTcTypes = quoteDetails.selectedTcTypes || [];
        return [...new Set([...itemTcTypes, ...legacyTcTypes])];
    }, [items, quoteDetails.selectedTcTypes]);

    const derivedTechTypes = useMemo(() => {
        const itemTechTypes = items.flatMap(item => item.techList || []);
        const legacyTechTypes = quoteDetails.selectedTechTypes || [];
        return [...new Set([...itemTechTypes, ...legacyTechTypes])];
    }, [items, quoteDetails.selectedTechTypes]);

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
            isDirty && !isSavingRecord && (nextLocation.pathname !== location.pathname || nextLocation.state?.forceReset)
    );

    const handleReset = React.useCallback(() => {
        setQuoteDetails(defaultQuoteDetails);
        setItems([]);
        setNewItemType('service');
        setSelectedItemId('');
        setQty(1);
        setDocumentType('Quotation');
        setDiscount(0);
        setComboboxOpen(false);
        setSearchValue('');
        setClientNameSelection('');
        setCustomClientName('');
        setContactSelectionIdx('');
        setSavedRecordId(null);
        setLoadedDocumentType(null);

        const initialSnapshot = {
            quoteDetails: defaultQuoteDetails,
            items: [],
            documentType: 'Quotation',
            discount: 0
        };
        setLastSavedData(JSON.stringify(initialSnapshot));

        navigate('/doc/new', { replace: true });
    }, [defaultQuoteDetails, setSearchParams, navigate]);

    const handleBack = () => {
        navigate('/');
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
        const isAbandonedRecord = location.pathname === '/doc/new' && !pathId && savedRecordId !== null && !isSavingRecord && !isNavigatingRef.current;

        if (isExplicitReset || isAbandonedRecord) {
            handleReset();
        }
    }, [location.pathname, location.state?.forceReset, handleReset, savedRecordId, isSavingRecord, pathId]);

    // Generate client options from loaded clients
    const CLIENT_OPTIONS = [
        ...(clients || []).map(client => ({
            value: client.clientName,
            label: client.clientName
        }))
    ];



    // Reset selection and search when switching between Service and Test
    useEffect(() => {
        setSelectedItemId('');
        setSearchValue('');
    }, [newItemType]);

    // Auto-populate generatedBy from logged-in user if not already set
    useEffect(() => {
        if (user?.fullName && !quoteDetails.generatedBy) {
            setQuoteDetails(prev => {
                const updated = { ...prev, generatedBy: user.fullName };
                
                // Keep lastSavedData synchronized so auto-population doesn't mark doc as dirty
                setLastSavedData(prevSaved => {
                    if (!prevSaved) return JSON.stringify({ quoteDetails: updated, items, documentType, discount });
                    try {
                        const parsed = JSON.parse(prevSaved);
                        if (JSON.stringify(parsed.quoteDetails) === JSON.stringify(prev)) {
                            parsed.quoteDetails.generatedBy = user.fullName;
                            return JSON.stringify(parsed);
                        }
                    } catch (e) {}
                    return prevSaved;
                });
                
                return updated;
            });
        }
    }, [user, quoteDetails.generatedBy, items, documentType, discount]);



    // Sync clientNameSelection with quoteDetails.clientName on mount/load
    useEffect(() => {
        if (clients.length > 0 && quoteDetails.clientName) {
            const foundClient = clients.find(c => (c.clientName || '').trim() === quoteDetails.clientName.trim());

            if (foundClient) {
                if (clientNameSelection !== foundClient.clientName) {
                    setClientNameSelection(foundClient.clientName);

                    // Also try to find matching contact or set primary
                    const contacts = foundClient.contacts || [];
                    const primaryIdx = contacts.findIndex(con => con.is_primary);
                    const currentIdx = primaryIdx >= 0 ? primaryIdx : (contacts.length > 0 ? 0 : -1);

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
                    .select('*, clients(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (data && data.content) {
                    const content = data.content;
                    const loadedQuoteDetails = { ...(content.quoteDetails || {}) };

                    // Fallback to joined client data if specific fields are missing in JSON
                    if (!loadedQuoteDetails.clientName && data.clients?.client_name) {
                        loadedQuoteDetails.clientName = data.clients.client_name;
                    }
                    if (!loadedQuoteDetails.clientAddress && data.clients?.client_address) {
                        loadedQuoteDetails.clientAddress = data.clients.client_address;
                    }

                    const loadedItems = content.items || [];
                    const loadedDocType = data.document_type || 'Quotation';
                    const loadedDiscount = content.discount || 0;

                    // Ensure quoteNumber is synced from the top-level column if it's missing or empty in JSON content
                    const finalQuoteNumber = loadedQuoteDetails.quoteNumber || data.quote_number;
                    if (finalQuoteNumber) {
                        loadedQuoteDetails.quoteNumber = finalQuoteNumber;
                    }

                    setQuoteDetails(loadedQuoteDetails);
                    setItems(loadedItems);
                    setDocumentType(loadedDocType);
                    setLoadedDocumentType(loadedDocType);
                    setDiscount(loadedDiscount);
                    setSavedRecordId(data.id);

                    const snapshot = {
                        quoteDetails: loadedQuoteDetails,
                        items: loadedItems,
                        documentType: loadedDocType,
                        discount: loadedDiscount
                    };
                    setLastSavedData(JSON.stringify(snapshot));

                    toast({
                        title: `${data.document_type} Loaded`,
                        description: `Loaded ${data.document_type} ${data.quote_number}`
                    });
                }
            } catch (err) {
                console.error('Error loading record:', err);
                toast({
                    title: "Error",
                    description: "Failed to load record from database.",
                    variant: "destructive"
                });
            }
        };

        const id = pathId || searchParams.get('id');
        if (id && !isSavingRecord) {
            loadFromSupabase(id);
        }
    }, [searchParams, pathId, isSavingRecord]); // Removed clients from dependencies to break loop

    // Load job details if jobId is present in searchParams (to pre-fill for a new document)
    useEffect(() => {
        const jobId = searchParams.get('jobId');
        if (jobId && !savedRecordId && clients.length > 0) {
            const loadJobDetails = async () => {
                try {
                    const { data, error } = await supabase
                        .from('jobs')
                        .select(`
                            *,
                            clients(*)
                        `)
                        .eq('id', jobId)
                        .single();

                    if (error) throw error;

                    if (data) {
                        const client = data.clients;
                        const contacts = client?.contacts || [];
                        const primaryContact = contacts.find(con => con.is_primary) || contacts[0] || {};
                        const primaryIdx = contacts.findIndex(con => con.is_primary);

                        setQuoteDetails(prev => {
                            const newDetails = {
                                ...prev,
                                clientName: client?.client_name || '',
                                clientAddress: client?.client_address || '',
                                projectName: data.project_name || '',
                                projectAddress: data.project_address || '',
                                email: primaryContact.contact_email || client?.email || '',
                                phone: primaryContact.contact_phone || client?.phone || '',
                                name: primaryContact.contact_person || ''
                            };
                            
                            // Synchronize lastSavedData to avoid marking doc as dirty immediately on job load
                            setLastSavedData(prevSaved => {
                                if (!prevSaved) return JSON.stringify({ quoteDetails: newDetails, items, documentType, discount });
                                try {
                                    const parsed = JSON.parse(prevSaved);
                                    if (JSON.stringify(parsed.quoteDetails) === JSON.stringify(prev)) {
                                        parsed.quoteDetails = newDetails;
                                        return JSON.stringify(parsed);
                                    }
                                } catch (e) {}
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
    }, [searchParams, savedRecordId, clients]);

    const handleSaveToDatabase = async () => {
        if (!user) {
            toast({
                title: "Authentication Required",
                description: "You must be logged in to save to the database.",
                variant: "destructive"
            });
            return;
        }

        setIsSavingRecord(true);
        try {
            // Detect if the document type has changed from what was loaded
            const isTypeChanged = savedRecordId && loadedDocumentType && documentType !== loadedDocumentType;

            // Generate doc number on first save OR when doc type has changed
            let docNumber = quoteDetails.quoteNumber;
            if ((!savedRecordId || isTypeChanged) && (!docNumber || isTypeChanged)) {
                docNumber = await getNextDocNumber(supabase, documentType);
            }

            const updatedQuoteDetails = { ...quoteDetails, quoteNumber: docNumber };

            const selectedClient = clients.find(c => c.clientName === quoteDetails.clientName);
            const clientId = selectedClient?.id || null;

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
                    discount
                },
                job_id: searchParams.get('jobId') || null,
                created_by: user.id,
                updated_at: new Date().toISOString()
            };

            let error;
            if (savedRecordId && !isTypeChanged) {
                // Update existing – keep the same doc number
                const { error: updateError } = await supabase
                    .from('documents')
                    .update(recordData)
                    .eq('id', savedRecordId);
                error = updateError;
            } else {
                // Create new (Clone if isTypeChanged)
                const { data, error: insertError } = await supabase
                    .from('documents')
                    .insert([recordData])
                    .select()
                    .single();

                if (!insertError && data) {
                    setSavedRecordId(data.id);
                    setLoadedDocumentType(documentType); // Update loaded type to new one
                    
                    // Update the state with the doc number BEFORE navigating
                    setQuoteDetails(updatedQuoteDetails);
                    
                    isNavigatingRef.current = true;
                    navigate(`/doc/${data.id}`, { replace: true });
                }
                error = insertError;
            }

            if (error) throw error;

            // Update the doc number in state after successful save
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
                description: (savedRecordId && !isTypeChanged) ? `${documentType} updated successfully.` : `${documentType} saved as ${docNumber}.`
            });

            // If we have a jobId and just created a Quotation or Purchase Order, update the job status
            const jobId = searchParams.get('jobId');
            if (jobId && (!savedRecordId || isTypeChanged)) {
                let targetStatus = null;
                if (documentType === 'Quotation') targetStatus = 'QUOTATION_SENT';
                if (documentType === 'Purchase Order') targetStatus = 'WORK_ORDER_RECEIVED';

                if (targetStatus) {
                    try {
                        await supabase
                            .from('jobs')
                            .update({ status: targetStatus })
                            .eq('id', jobId);
                    } catch (err) {
                        console.error('Error updating job status:', err);
                    }
                }
            }

            // Send Telegram Notification
            try {
                const action = (savedRecordId && !isTypeChanged) ? "Updated" : "Created";
                const emoji = (savedRecordId && !isTypeChanged) ? "📝" : "📄";
                const message = `${emoji} *${documentType} ${action}*\n\n` +
                    `Number: \`${docNumber}\`\n` +
                    `Client: \`${quoteDetails.clientName}\`\n` +
                    `${action} By: \`${user.fullName}\``;
                await sendTelegramNotification(message);
            } catch (notifyErr) {
                console.error('Error sending Telegram notification:', notifyErr);
            }
        } catch (err) {
            console.error('Error saving record:', err);

            let finalErrorMessage = err.message || "Failed to save record.";

            // Comprehensive check for Supabase/Postgres unique constraint violation (23505)
            const isUniqueError =
                err.code === '23505' ||
                String(err.code) === '23505' ||
                (err.message && (
                    err.message.toLowerCase().includes('unique constraint') ||
                    err.message.toLowerCase().includes('already exists')
                ));

            if (isUniqueError) {
                finalErrorMessage = `A ${documentType.toLowerCase()} with this number already exists. Please try saving again.`;
            }

            toast({
                title: "Error",
                description: finalErrorMessage,
                variant: "destructive"
            });
        } finally {
            setIsSavingRecord(false);
            // Reset the navigation ref after a delay to ensure the URL has changed in the browser
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 1000);
        }
    };

    const getAppropiatePrice = (itemId, type, clientId) => {
        if (!clientId) {
            if (type === 'service') {
                return services.find(s => s.id === itemId)?.price || 0;
            } else {
                return tests.find(t => t.id === itemId)?.price || 0;
            }
        }

        if (type === 'service') {
            const clientPrice = clientServicePrices.find(p => p.client_id === clientId && p.service_id === itemId);
            if (clientPrice) return clientPrice.price;
            return services.find(s => s.id === itemId)?.price || 0;
        } else if (type === 'sampling') {
            // For now, sampling doesn't have client-specific prices
            return samplingData.find(s => s.id === itemId)?.price || 0;
        } else {
            const clientPrice = clientTestPrices.find(p => p.client_id === clientId && p.test_id === itemId);
            if (clientPrice) return clientPrice.price;
            return tests.find(t => t.id === itemId)?.price || 0;
        }
    };

    const componentRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `${documentType}_${quoteDetails.quoteNumber}`,
    });

    const triggerPrint = async () => {
        // Handle "Saving" state to prevent race conditions
        if (isSavingRecord) {
            toast({
                title: "Save in Progress",
                description: "The document is being saved. Please wait a moment before printing.",
            });
            return;
        }

        // Ensure document has been saved (and thus has a doc number) before printing
        if (!quoteDetails.quoteNumber) {
            toast({
                title: "Save Required",
                description: "Please save the document first to generate a document number before printing.",
                variant: "destructive"
            });
            return;
        }

        try {
            const message = `🖨️ *Print/PDF Action*\n\n` +
                `Document: \`${documentType}\`\n` +
                `Number: \`${quoteDetails.quoteNumber}\`\n` +
                `Client: \`${quoteDetails.clientName}\`\n` +
                `Action By: \`${user?.fullName || 'Unknown User'}\``;
            await sendTelegramNotification(message);
        } catch (error) {
            console.error('Error sending print notification:', error);
        }
        handlePrint();
    };

    const handleAddItem = () => {
        if (!selectedItemId) return;

        let itemData;
        let description = '';
        let price = 0;
        let unit = 'Nos';

        if (newItemType === 'service') {
            itemData = services.find(s => s.id === selectedItemId);
            if (itemData) {
                description = itemData.serviceType;
                price = itemData.price;
                unit = itemData.unit || 'Nos';
            }
        } else if (newItemType === 'sampling') {
            itemData = samplingData.find(s => s.id === selectedItemId);
            if (itemData) {
                description = `${itemData.serviceType} - ${Array.isArray(itemData.materials) ? itemData.materials.join(', ') : (itemData.materials || '')}`;
                price = itemData.price;
                unit = itemData.unit || 'Nos';
            }
        } else {
            itemData = tests.find(t => t.id === selectedItemId);
            if (itemData) {
                description = `${itemData.testType} - ${Array.isArray(itemData.materials) ? itemData.materials.join(', ') : (itemData.materials || '')}`;
                price = itemData.price;

                unit = 'Test';
            }
        }

        if (itemData) {
            const clientId = clients.find(c => c.clientName === quoteDetails.clientName)?.id;
            const finalPrice = getAppropiatePrice(selectedItemId, newItemType, clientId);

            setItems(prev => [...prev, {
                id: Date.now(), // unique ID for row
                sourceId: selectedItemId,
                type: newItemType,
                description,
                unit,
                price: Number(finalPrice),
                qty: Number(qty),
                total: Number(finalPrice) * Number(qty),
                hsnCode: itemData.hsnCode || '',
                tcList: itemData.tcList || itemData.tc_list || [],
                techList: itemData.techList || itemData.tech_list || [],
                // Include new service fields if it's a service
                ...(newItemType === 'service' && itemData ? {
                    methodOfSampling: itemData.methodOfSampling || itemData.method_of_sampling || 'NA',
                    numBHs: itemData.numBHs ?? itemData.num_bhs ?? 0,
                    measure: itemData.measure || 'NA'
                } : {})
            }]);

            // Reset selection
            setSelectedItemId('');
            setQty(1);
        }
    };

    const handleDeleteItem = (rowId) => {
        setItems(prev => prev.filter(item => item.id !== rowId));
    };

    const handleMoveItemUp = (index) => {
        if (index === 0) return; // Already at the top
        setItems(prev => {
            const newItems = [...prev];
            [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
            return newItems;
        });
    };

    const handleMoveItemDown = (index) => {
        if (index === items.length - 1) return; // Already at the bottom
        setItems(prev => {
            const newItems = [...prev];
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
            return newItems;
        });
    };


    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.total, 0);
    };

    // Dynamic pagination: Split items across pages
    const siteContent = getSiteContent();
    const ITEMS_PER_FIRST_PAGE = siteContent.pagination?.itemsPerFirstPage || 6;
    const ITEMS_PER_CONTINUATION_PAGE = siteContent.pagination?.itemsPerContinuationPage || 7;
    const TC_ITEMS_PER_FIRST_PAGE = siteContent.pagination?.tcItemsFirstPage || 12;
    const TC_ITEMS_PER_CONTINUATION_PAGE = siteContent.pagination?.tcItemsContinuationPage || 16;
    const TECH_ITEMS_PER_FIRST_PAGE = siteContent.pagination?.techItemsFirstPage || 12;
    const TECH_ITEMS_PER_CONTINUATION_PAGE = siteContent.pagination?.techItemsContinuationPage || 16;

    const paginateItems = () => {
        const pages = [];

        if (items.length === 0) {
            // No items, just show the main page
            pages.push({
                items: [],
                pageNumber: 1,
                isFirstPage: true,
                isContinuation: false
            });
        } else if (items.length <= ITEMS_PER_FIRST_PAGE) {
            // All items fit on first page
            pages.push({
                items: items,
                pageNumber: 1,
                isFirstPage: true,
                isContinuation: false
            });
        } else {
            // Need multiple pages
            // First page
            pages.push({
                items: items.slice(0, ITEMS_PER_FIRST_PAGE),
                pageNumber: 1,
                isFirstPage: true,
                isContinuation: false
            });

            // Continuation pages
            let remainingItems = items.slice(ITEMS_PER_FIRST_PAGE);
            let pageNum = 2;

            while (remainingItems.length > 0) {
                const pageItems = remainingItems.slice(0, ITEMS_PER_CONTINUATION_PAGE);
                pages.push({
                    items: pageItems,
                    pageNumber: pageNum,
                    isFirstPage: false,
                    isContinuation: true
                });
                remainingItems = remainingItems.slice(ITEMS_PER_CONTINUATION_PAGE);
                pageNum++;
            }
        }
        return pages;
    };

    const paginateTerms = () => {
        if (!derivedTcTypes || derivedTcTypes.length === 0) {
            return [{
                items: [],
                pageNumber: 1,
                isFirstPage: true
            }]; // Empty page if nothing selected
        }

        const pages = [];
        const totalTypes = derivedTcTypes.length;
        let currentTypeIndex = 0;

        // Logic: Pagination is based on number of T&C Types (groups), not individual lines.
        // Page 1 gets TC_ITEMS_PER_FIRST_PAGE types.
        // Subsequent pages get TC_ITEMS_PER_CONTINUATION_PAGE types.

        // --- First Page ---
        const firstPageLimit = TC_ITEMS_PER_FIRST_PAGE;
        const firstPageTypes = derivedTcTypes.slice(0, firstPageLimit);
        const firstPageItems = [];

        firstPageTypes.forEach(type => {
            const typeTerms = terms.filter(t => t.type === type);
            if (typeTerms.length > 0) {
                if (type !== 'general' && type !== 'General') {
                    firstPageItems.push({ type: 'header', text: type, id: `header-${type}` });
                }
                typeTerms.forEach(term => {
                    firstPageItems.push({ type: 'term', text: term.text, id: term.id });
                });
                firstPageItems.push({ type: 'spacer', id: `spacer-${type}` });
            }
        });
        // Remove last spacer for this page
        if (firstPageItems.length > 0 && firstPageItems[firstPageItems.length - 1].type === 'spacer') {
            firstPageItems.pop();
        }

        pages.push({
            items: firstPageItems,
            pageNumber: 1,
            isFirstPage: true
        });

        currentTypeIndex = firstPageLimit;

        // --- Continuation Pages ---
        while (currentTypeIndex < totalTypes) {
            const contLimit = TC_ITEMS_PER_CONTINUATION_PAGE;
            const pageTypes = derivedTcTypes.slice(currentTypeIndex, currentTypeIndex + contLimit);
            const pageItems = [];

            pageTypes.forEach(type => {
                const typeTerms = terms.filter(t => t.type === type);
                if (typeTerms.length > 0) {
                    if (type !== 'general' && type !== 'General') {
                        pageItems.push({ type: 'header', text: type, id: `header-${type}` });
                    }
                    typeTerms.forEach(term => {
                        pageItems.push({ type: 'term', text: term.text, id: term.id });
                    });
                    pageItems.push({ type: 'spacer', id: `spacer-${type}` });
                }
            });

            // Remove last spacer
            if (pageItems.length > 0 && pageItems[pageItems.length - 1].type === 'spacer') {
                pageItems.pop();
            }

            pages.push({
                items: pageItems,
                pageNumber: pages.length + 1,
                isFirstPage: false
            });

            currentTypeIndex += contLimit;
        }

        return pages;
    };

    const paginateTechnicals = () => {
        if (!derivedTechTypes || derivedTechTypes.length === 0) {
            return [];
        }

        const pages = [];
        const totalTypes = derivedTechTypes.length;
        let currentTypeIndex = 0;

        // --- First Page ---
        const firstPageLimit = TECH_ITEMS_PER_FIRST_PAGE;
        const firstPageTypes = derivedTechTypes.slice(0, firstPageLimit);
        const firstPageItems = [];

        firstPageTypes.forEach(type => {
            const typeTech = (technicals || []).filter(t => t.type === type);
            if (typeTech.length > 0) {
                firstPageItems.push({ type: 'header', text: type, id: `header-${type}` });
                typeTech.forEach(tech => {
                    firstPageItems.push({ type: 'tech', text: tech.text, id: tech.id });
                });
                firstPageItems.push({ type: 'spacer', id: `spacer-${type}` });
            }
        });

        if (firstPageItems.length > 0 && firstPageItems[firstPageItems.length - 1].type === 'spacer') {
            firstPageItems.pop();
        }

        pages.push({
            items: firstPageItems,
            pageNumber: 1,
            isFirstPage: true
        });

        currentTypeIndex = firstPageLimit;

        // --- Continuation Pages ---
        while (currentTypeIndex < totalTypes) {
            const contLimit = TECH_ITEMS_PER_CONTINUATION_PAGE;
            const pageTypes = derivedTechTypes.slice(currentTypeIndex, currentTypeIndex + contLimit);
            const pageItems = [];

            pageTypes.forEach(type => {
                const typeTech = (technicals || []).filter(t => t.type === type);
                if (typeTech.length > 0) {
                    pageItems.push({ type: 'header', text: type, id: `header-${type}` });
                    typeTech.forEach(tech => {
                        pageItems.push({ type: 'tech', text: tech.text, id: tech.id });
                    });
                    pageItems.push({ type: 'spacer', id: `spacer-${type}` });
                }
            });

            if (pageItems.length > 0 && pageItems[pageItems.length - 1].type === 'spacer') {
                pageItems.pop();
            }

            pages.push({
                items: pageItems,
                pageNumber: pages.length + 1,
                isFirstPage: false
            });

            currentTypeIndex += contLimit;
        }

        return pages;
    };


    const itemPages = paginateItems();
    const totalItemPages = itemPages.length;

    const tcPages = paginateTerms();
    const techPages = paginateTechnicals();

    // Total pages calculation
    const totalPages = totalItemPages + tcPages.length + techPages.length;

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            <div className="shrink-0">
                <Navbar isDirty={isDirty} isSaving={isSavingRecord} />
            </div>

            <div className="flex-1 flex flex-col min-h-0 container mx-auto px-4 py-4">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <div className="flex items-center gap-4">
                        {!isStandard() && (
                            <button onClick={handleBack} className="text-gray-500 hover:text-gray-900 transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        )}
                        <h1 className="text-1xl font-bold text-gray-900">Create new {documentType}</h1>
                    </div>
                    <div className="flex items-center gap-2">

                        <Button onClick={handleSaveToDatabase} disabled={isSavingRecord} className="bg-green-800 hover:bg-green-900 text-white">
                            {isSavingRecord ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {savedRecordId ? 'Update' : 'Save'} {documentType}
                        </Button>
                        <Button onClick={triggerPrint} className="bg-blue-800 hover:bg-blue-900 text-white">
                            <Printer className="w-4 h-4 mr-2" /> Print / PDF
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
                                    <SelectTrigger className={cn((!!searchParams.get('type') || !!savedRecordId) && "bg-gray-100 cursor-not-allowed")}>
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
                                        <p className="text-xs text-red-500 mt-1 italic">* {documentType} number will be generated when you save.</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        style={{ width: '100%', paddingInline: '17%' }}
                                        value={quoteDetails.date}
                                        onChange={e => setQuoteDetails({ ...quoteDetails, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Discount (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={discount}
                                        onChange={e => setDiscount(Number(e.target.value))}
                                        placeholder="Enter discount %"
                                    />
                                </div>
                            </div>

                            {/* <h2 className="text-lg font-semibold mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-primary" />
                                Client Details
                            </h2> */}
                            <div className="space-y-2 border-t pt-2">
                                <div>
                                    <Label>Client Name</Label>
                                    <Select

                                        value={clientNameSelection}
                                        onValueChange={(value) => {
                                            setClientNameSelection(value);
                                            if (value !== 'Other') {
                                                const selectedClient = clients.find(c => c.clientName === value);
                                                const contacts = selectedClient?.contacts || [];
                                                const primaryContact = contacts.find(con => con.is_primary) || contacts[0] || {};
                                                const primaryIdx = contacts.findIndex(con => con.is_primary);

                                                setQuoteDetails({
                                                    ...quoteDetails,
                                                    clientName: value,
                                                    clientAddress: selectedClient?.clientAddress || '',
                                                    email: primaryContact.contact_email || selectedClient?.email || '',
                                                    phone: primaryContact.contact_phone || selectedClient?.phone || '',
                                                    name: primaryContact.contact_person || ''
                                                });
                                                setCustomClientName('');

                                                // Pre-select the primary contact in the dropdown
                                                if (primaryIdx >= 0) {
                                                    setContactSelectionIdx(primaryIdx.toString());
                                                } else if (contacts.length > 0) {
                                                    setContactSelectionIdx('0');
                                                } else {
                                                    setContactSelectionIdx('');
                                                }

                                                // Update item prices based on the new client
                                                if (items.length > 0) {
                                                    const updatedItems = items.map(item => {
                                                        const newPrice = getAppropiatePrice(item.sourceId, item.type, selectedClient?.id);
                                                        return {
                                                            ...item,
                                                            price: Number(newPrice),
                                                            total: Number(newPrice) * item.qty
                                                        };
                                                    });
                                                    setItems(updatedItems);
                                                }
                                            } else {
                                                setQuoteDetails({
                                                    ...quoteDetails,
                                                    clientName: customClientName,
                                                    clientAddress: '',
                                                    email: '',
                                                    phone: ''
                                                });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-15 text-sm border-gray-200 bg-gray-50/30" style={{ textAlign: 'left' }}>
                                            <SelectValue
                                                placeholder="Select client"
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CLIENT_OPTIONS.map(option => (
                                                <SelectItem key={option.value} value={option.value} className="font-normal text-sm justify-start max-w-[420px]">
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {clientNameSelection !== 'Other' && clientNameSelection !== '' && (() => {
                                        const selectedClient = clients.find(c => (c.clientName || '').trim() === clientNameSelection.trim());
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
                                                <Label className="text-gray-900 mb-2 block">
                                                    Client Contact
                                                </Label>
                                                <Select
                                                    value={contactSelectionIdx}
                                                    onValueChange={(idx) => {
                                                        setContactSelectionIdx(idx);
                                                        const contact = contacts[parseInt(idx)];
                                                        if (contact) {
                                                            setQuoteDetails(prev => ({
                                                                ...prev,
                                                                email: contact.contact_email || '',
                                                                phone: contact.contact_phone || '',
                                                                name: contact.contact_person || ''
                                                            }));
                                                            toast({
                                                                title: "Contact Updated",
                                                                description: `Using contact details for ${contact.contact_person || 'selected person'}.`
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-10 text-sm border-gray-200 bg-gray-50/30">
                                                        <SelectValue placeholder="Pick a contact..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {contacts.map((contact, idx) => (
                                                            <SelectItem key={idx} value={idx.toString()}>
                                                                <div className="flex flex-col text-left py-1">
                                                                    <span className="font-medium text-gray-900">
                                                                        {contact.contact_person || 'Unnamed Contact'} {contact.is_primary ? '(Primary)' : ''}
                                                                    </span>
                                                                    {(contact.contact_email || contact.contact_phone) && (
                                                                        <span className="text-xs text-gray-500">
                                                                            {[contact.contact_email, contact.contact_phone].filter(Boolean).join(' | ')}
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
                                            onChange={e => {
                                                setCustomClientName(e.target.value);
                                                setQuoteDetails({ ...quoteDetails, clientName: e.target.value });
                                            }}
                                            placeholder="Enter custom client name"
                                        />
                                    )}
                                </div>
                                <div>
                                    <Label>Client Address</Label>
                                    <Textarea
                                        className="min-h-[100px]"
                                        value={quoteDetails.clientAddress}
                                        onChange={e => setQuoteDetails({ ...quoteDetails, clientAddress: e.target.value })}
                                        placeholder="Enter client address"
                                    />
                                </div>
                                <div className="pt-2 border-t">
                                    <Label>Contractor Name</Label>
                                    <Textarea
                                        className="min-h-[100px]"
                                        value={quoteDetails.contractorName}
                                        onChange={e => setQuoteDetails({ ...quoteDetails, contractorName: e.target.value })}
                                        placeholder="Enter contractor name"
                                    />
                                </div>
                                <div>
                                    <Label>Contractor Address</Label>
                                    <Textarea
                                        className="min-h-[100px]"
                                        value={quoteDetails.contractorAddress}
                                        onChange={e => setQuoteDetails({ ...quoteDetails, contractorAddress: e.target.value })}
                                        placeholder="Enter contractor address"
                                    />
                                </div>
                                <div className="pt-2 border-t">
                                    <Label>Project Name</Label>
                                    <Textarea
                                        className="min-h-[100px]"
                                        value={quoteDetails.projectName}
                                        onChange={e => setQuoteDetails({ ...quoteDetails, projectName: e.target.value })}
                                        placeholder="Enter project name"
                                    />
                                </div>
                                <div>
                                    <Label>Project Address</Label>
                                    <Textarea
                                        className="min-h-[100px]"
                                        value={quoteDetails.projectAddress}
                                        onChange={e => setQuoteDetails({ ...quoteDetails, projectAddress: e.target.value })}
                                        placeholder="Enter project address"
                                    />
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
                                            <Input
                                                type="date"
                                                value={quoteDetails.paymentDate || ''}
                                                onChange={e => setQuoteDetails({ ...quoteDetails, paymentDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Mode of Payment</Label>
                                            <Select
                                                value={quoteDetails.paymentMode || ''}
                                                onValueChange={(value) => setQuoteDetails({ ...quoteDetails, paymentMode: value })}
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
                                            <Label>Payment Amount (<Rupee />)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={quoteDetails.paymentAmount || ''}
                                                onChange={e => setQuoteDetails({ ...quoteDetails, paymentAmount: e.target.value })}
                                                placeholder="Enter amount"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Bank / Transaction Details</Label>
                                        <Textarea
                                            value={quoteDetails.bankDetails || ''}
                                            onChange={e => setQuoteDetails({ ...quoteDetails, bankDetails: e.target.value })}
                                            placeholder="Enter bank name, cheque number, or transaction ID"
                                            rows={2}
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
                                <div className="grid grid-cols-3 gap-1">
                                    <Button
                                        variant={newItemType === 'service' ? 'default' : 'outline'}
                                        onClick={() => { setNewItemType('service'); setSelectedItemId(''); }}
                                        className="w-full flex items-center gap-2 text-xs"
                                    >
                                        <Drill className="w-2 h-2" /> Field Tests
                                    </Button>
                                    <Button
                                        variant={newItemType === 'test' ? 'default' : 'outline'}
                                        onClick={() => { setNewItemType('test'); setSelectedItemId(''); }}
                                        className="w-full flex items-center gap-2 text-xs"
                                    >
                                        <TestTube className="w-2 h-2" /> Lab Tests
                                    </Button>
                                    <Button
                                        variant={newItemType === 'sampling' ? 'default' : 'outline'}
                                        onClick={() => { setNewItemType('sampling'); setSelectedItemId(''); }}
                                        className="w-full flex items-center gap-2 text-xs"
                                    >
                                        <SwatchBook className="w-2 h-2" /> Sampling
                                    </Button>
                                </div>

                                <div>
                                    <Label>Select {newItemType === 'service' ? 'Service' : (newItemType === 'sampling' ? 'Sampling Item' : 'Test')}</Label>
                                    <ReactSelect
                                        className="mt-1"
                                        classNamePrefix="react-select"
                                        options={newItemType === 'service'
                                            ? services.map(s => ({ value: s.id, label: s.serviceType }))
                                            : newItemType === 'sampling'
                                                ? samplingData.map(s => ({ value: s.id, label: `${s.serviceType} - ${Array.isArray(s.materials) ? s.materials.join(', ') : (s.materials || '')}` }))
                                                : tests.map(t => ({ value: t.id, label: `${t.testType} - ${Array.isArray(t.materials) ? t.materials.join(', ') : (t.materials || '')}` }))
                                        }
                                        value={selectedItemId ? {
                                            value: selectedItemId,
                                            label: newItemType === 'service'
                                                ? services.find(s => s.id === selectedItemId)?.serviceType
                                                : newItemType === 'sampling'
                                                    ? (samplingData.find(s => s.id === selectedItemId)?.serviceType + ' - ' + (Array.isArray(samplingData.find(s => s.id === selectedItemId)?.materials) ? samplingData.find(s => s.id === selectedItemId)?.materials.join(', ') : (samplingData.find(s => s.id === selectedItemId)?.materials || '')))
                                                    : (tests.find(t => t.id === selectedItemId)?.testType + ' - ' + (Array.isArray(tests.find(t => t.id === selectedItemId)?.materials) ? tests.find(t => t.id === selectedItemId)?.materials.join(', ') : (tests.find(t => t.id === selectedItemId)?.materials || '')))
                                        } : null}
                                        onChange={(option) => setSelectedItemId(option ? option.value : '')}
                                        placeholder={`Search ${newItemType}s...`}
                                        isSearchable
                                        isClearable
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                borderColor: '#e5e7eb',
                                                borderRadius: '0.75rem',
                                                paddingTop: '2px',
                                                paddingBottom: '2px',
                                                boxShadow: 'none',
                                                '&:hover': {
                                                    borderColor: '#3b82f6'
                                                }
                                            }),
                                            option: (base, state) => ({
                                                ...base,
                                                backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                                                color: state.isSelected ? 'white' : '#1f2937',
                                                fontSize: '0.875rem'
                                            })
                                        }}
                                    />
                                </div>

                                <div>
                                    <Label>Quantity</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={qty}
                                        onChange={e => setQty(e.target.value)}
                                    />
                                </div>

                                <Button onClick={handleAddItem} className="w-full" disabled={!selectedItemId}>
                                    Add Item
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="lg:col-span-2">
                        <div className="a4-preview-wrapper rounded-xl border border-gray-100 min-h-[600px] print-container shadow-inner">
                            {/* Printable Area Root */}
                            <div ref={componentRef} id="printable-quote-root">
                                {/* Dynamically render quotation pages based on items */}
                                {itemPages.map((page, pageIndex) => (
                                    <div key={`quote-page-${page.pageNumber}`} className="a4-container" id={pageIndex === 0 ? "printable-quote" : undefined}>
                                        {/* Watermark */}
                                        <div
                                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                            style={{
                                                transform: 'rotate(-55deg)',
                                                zIndex: 0
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '42pt',
                                                    fontWeight: 700,
                                                    color: 'rgba(0,0,0,0.02)',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                EDGE2 Engineering Solutions India Pvt. Ltd.
                                            </span>
                                        </div>
                                        <div className="a4-page-content">
                                            {/* Header - only on first page */}
                                            {page.isFirstPage && (
                                                <>
                                                    <div className="flex justify-between items-start border-b pb-4 mb-2">
                                                        <div className="w-[30%]">
                                                            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                                                {documentType.toUpperCase()}
                                                            </h3>
                                                            <p className="text-gray-500 mt-1 text-xs break-all">
                                                                {quoteDetails.quoteNumber ? `#${quoteDetails.quoteNumber}` : <span className="text-red-500 italic">Pending</span>}
                                                            </p>
                                                            <p className="text-gray-500 mt-1 text-xs">
                                                                Date: {format(new Date(quoteDetails.date), 'dd MMM yyyy')}
                                                            </p>
                                                        </div>

                                                        <div className="w-[70%] flex items-center gap-4 text-right">
                                                            <div className="text-right">
                                                                <h2 className="font-bold text-lg">
                                                                    EDGE2 Engineering Solutions India Pvt. Ltd.
                                                                </h2>
                                                                <p className="text-gray-600 text-xs">
                                                                    Shivaganga Arcade, B35/130, 6th Cross, 6th Block,
                                                                    Vishweshwaraiah Layout, Ullal Upanagar,
                                                                </p>
                                                                <p className="text-gray-600 text-xs">
                                                                    Bangalore - 560056, Karnataka
                                                                </p>
                                                                <p className="text-gray-600 text-xs">
                                                                    <span className="font-bold">PAN:</span> AACCE1702A, <span className="font-bold">GSTIN:</span> 29AACCE1702A1ZD
                                                                </p>
                                                                <p className="text-gray-600 text-xs">
                                                                    <span className="font-bold">Phone:</span> 09448377127 / 09880973810 / 080-50056086
                                                                </p>
                                                                <p className="text-gray-600 text-xs flex justify-end gap-4">
                                                                    <span><span className="font-bold">Email:</span> info@edge2.in</span>
                                                                    <span><span className="font-bold">Website:</span> https://edge2.in</span>
                                                                </p>
                                                            </div>
                                                            <img
                                                                src={`${import.meta.env.BASE_URL}edge2-logo.png`}
                                                                alt="EDGE2 Logo"
                                                                className="w-20 h-20 object-contain"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Client, Contractor, Project Details - 3 Columns */}
                                                    <div className="grid grid-cols-3 gap-6 mb-2 text-sm py-0 border-b">
                                                        {/* Column 1: Client */}
                                                        <div className="space-y-1">
                                                            <h3 className="text-gray-500 font-semibold uppercase tracking-wide border-b pb-1 mb-2">
                                                                Client
                                                            </h3>
                                                            <p className="font-bold text-gray-900 text-xs">{quoteDetails.clientName || '-'}</p>
                                                            <p className="text-gray-600 whitespace-pre-wrap text-xs">{quoteDetails.clientAddress}</p>
                                                            <p className="text-gray-600 mt-1 text-xs">Name: {quoteDetails.name || '-'}</p>
                                                            <p className="text-gray-600 mt-1 text-xs">Email: {quoteDetails.email || '-'}</p>
                                                            <p className="text-gray-600 text-xs">Phone: {quoteDetails.phone || '-'}</p>
                                                        </div>

                                                        {/* Column 2: Contractor */}
                                                        <div className="space-y-1 border-l pl-2">
                                                            <h3 className="text-gray-500 font-semibold uppercase tracking-wide border-b pb-1 mb-2">
                                                                Contractor
                                                            </h3>
                                                            <p className="font-bold text-gray-900 text-xs">{quoteDetails.contractorName || '-'}</p>
                                                            <p className="text-gray-600 whitespace-pre-wrap text-xs">{quoteDetails.contractorAddress}</p>
                                                        </div>

                                                        {/* Column 3: Project */}
                                                        <div className="space-y-1 border-l pl-2">
                                                            <h3 className="text-gray-500 font-semibold uppercase tracking-wide border-b pb-1 mb-2">
                                                                Project Details
                                                            </h3>
                                                            <p className="font-bold text-gray-900 text-xs">{quoteDetails.projectName || '-'}</p>
                                                            <p className="text-gray-600 whitespace-pre-wrap text-xs">{quoteDetails.projectAddress}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-right">Created by: {quoteDetails.generatedBy}</div>
                                                </>
                                            )}

                                            {/* Continuation page header */}
                                            {page.isContinuation && (
                                                <div className="border-b pb-3 mb-4">
                                                    <h3 className="text-lg font-bold text-gray-900">
                                                        {documentType} {quoteDetails.quoteNumber ? `#${quoteDetails.quoteNumber}` : ''} (Continued)
                                                    </h3>
                                                </div>
                                            )}

                                            {/* Table */}
                                            <table className="w-full mb-8 mt-2">
                                                <thead>
                                                    <tr>
                                                        <th className="text-left border-r border-t border-b border-l border-gray-200 py-3 px-1 font-semibold text-gray-600 text-xs w-5">Sl No.</th>
                                                        <th className="text-left border-r border-t border-b border-l border-gray-200 py-3 px-1 font-semibold text-gray-600 text-xs">Description</th>
                                                        <th className="text-left border-r border-t border-b border-l border-gray-200 py-3 px-1 font-semibold text-gray-600 text-xs w-1">HSN/SAC</th>
                                                        <th className="text-right border-r border-t border-b border-l border-gray-200 py-3 px-1 font-semibold text-gray-600 text-xs w-12">Price Per Unit</th>
                                                        <th className="text-right border-r border-t border-b border-l border-gray-200 py-3 px-1 font-semibold text-gray-600 text-xs w-12">Unit</th>
                                                        <th className="text-right border-r border-t border-b border-l border-gray-200 py-3 px-1 font-semibold text-gray-600 text-xs w-2">Qty</th>
                                                        <th className="text-right border-r border-t border-b border-l border-gray-200 py-3 px-1 font-semibold text-gray-600 text-xs w-15">Total</th>
                                                        <th className="w-10 print:hidden"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {page.items.map((item, index) => {
                                                        const slNo = page.isFirstPage
                                                            ? index + 1
                                                            : ITEMS_PER_FIRST_PAGE + (page.pageNumber - 2) * ITEMS_PER_CONTINUATION_PAGE + index + 1;

                                                        return (
                                                            <tr key={item.id} className="border-b border-gray-50">
                                                                <td className="py-3 px-1 text-gray-500 text-xs align-top border-r border-l border-gray-200">{slNo}.</td>
                                                                <td className="py-2 px-1 text-gray-900 align-top border-r border-l border-gray-200">
                                                                    <p className="font-small text-xs">{item.description}</p>
                                                                    <p className="text-xs text-gray-500 capitalize italic" style={{ fontSize: '10px' }}>{item.type}</p>
                                                                    {item.type === 'service' && (
                                                                        (() => {
                                                                            const values = [
                                                                                item.methodOfSampling && item.methodOfSampling !== 'NA'
                                                                                    ? `Method: ${item.methodOfSampling}`
                                                                                    : null,

                                                                                typeof item.numBHs === 'number' && item.numBHs > 0
                                                                                    ? `BHs: ${item.numBHs}`
                                                                                    : null,

                                                                                item.measure && item.measure !== 'NA'
                                                                                    ? `Measure: ${item.measure}`
                                                                                    : null
                                                                            ].filter(Boolean);

                                                                            return values.length ? (
                                                                                <p className="mt-1 text-xs text-gray-400">
                                                                                    {values.join('   |   ')}
                                                                                </p>
                                                                            ) : null;
                                                                        })()
                                                                    )}
                                                                </td>
                                                                <td className="py-2 px-1 text-left text-gray-600 font-medium text-xs align-top border-r border-l border-gray-200">{item.hsnCode || '—'}</td>
                                                                <td className="py-2 px-1 text-right text-gray-600 font-medium text-xs align-top border-r border-l border-gray-200"><Rupee />{item.price}</td>
                                                                <td className="py-2 px-1 text-right text-gray-600 font-medium text-xs align-top border-r border-l border-gray-200">{item.unit}</td>
                                                                <td className="py-2 px-1 text-right text-gray-600 font-medium text-xs align-top border-r border-l border-gray-200">{item.qty}</td>
                                                                <td className="py-2 px-1 text-right text-gray-900 font-medium text-xs align-top border-r border-l border-gray-200"><Rupee />{item.total.toLocaleString()}</td>
                                                                <td className="text-right print:hidden align-top">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button
                                                                            onClick={() => handleMoveItemUp(slNo - 1)}
                                                                            disabled={slNo === 1}
                                                                            className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-30 transition-colors"
                                                                            title="Move Up"
                                                                        >
                                                                            <ChevronUp className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleMoveItemDown(slNo - 1)}
                                                                            disabled={slNo === items.length}
                                                                            className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-30 transition-colors"
                                                                            title="Move Down"
                                                                        >
                                                                            <ChevronDown className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteItem(item.id)}
                                                                            className="text-red-400 hover:text-red-600 p-1 transition-colors"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {page.items.length === 0 && (
                                                        <tr>
                                                            <td colSpan="5" className="py-8 text-center text-gray-400 italic">
                                                                No items added yet.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>

                                            {/* Footer Totals, Bank Details, Payment Terms - only on last quotation page */}
                                            {pageIndex === itemPages.length - 1 && (
                                                <>
                                                    {/* Footer Totals */}
                                                    <div className="flex justify-left">
                                                        <div className="w-full space-y-3">
                                                            <div className="flex justify-between text-gray-600 text-xs">
                                                                <span>Subtotal</span>
                                                                <span><Rupee />{calculateTotal().toLocaleString()}</span>
                                                            </div>
                                                            {discount > 0 && (
                                                                <div className="flex justify-between text-green-600 text-xs">
                                                                    <span>Discount ({discount}%)</span>
                                                                    <span>- <Rupee />{(calculateTotal() * (discount / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between text-gray-600 text-xs">
                                                                <span>CGST ({taxCGST}%)</span>
                                                                <span><Rupee />{((calculateTotal() * (1 - discount / 100)) * (taxCGST / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="flex justify-between text-gray-600 text-xs">
                                                                <span>SGST ({taxSGST}%)</span>
                                                                <span><Rupee />{((calculateTotal() * (1 - discount / 100)) * (taxSGST / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="flex justify-between text-gray-600 text-xs font-medium">
                                                                <span>Total Tax Amount</span>
                                                                <span><Rupee />{((calculateTotal() * (1 - discount / 100)) * (taxTotalPercent / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                                                                <span>Total</span>
                                                                <span><Rupee />{((calculateTotal() * (1 - discount / 100)) * (1 + (taxTotalPercent / 100))).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            {documentType === 'Tax Invoice' && quoteDetails.paymentAmount > 0 && (
                                                                <>
                                                                    <div className="flex justify-between text-xs text-red-600">
                                                                        <span>Less: Payment Received</span>
                                                                        <span>- <Rupee />{Number(quoteDetails.paymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                                                                        <span>Balance Due</span>
                                                                        <span><Rupee />{(((calculateTotal() * (1 - discount / 100)) * (1 + (taxTotalPercent / 100))) - Number(quoteDetails.paymentAmount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="mt-2 text-xs text-gray-600 italic">
                                                                <span className="font-medium">Amount in Words: Rupees </span>
                                                                <span>{numberToWords((calculateTotal() * (1 - discount / 100)) * (1 + (taxTotalPercent / 100)))} /-</span>
                                                            </div>
                                                        </div>
                                                    </div>


                                                </>
                                            )}

                                        </div>
                                        {/* Page Footer */}
                                        <div className="a4-page-footer">
                                            <span>EDGE2 Engineering Solutions India Pvt. Ltd.</span>
                                            <span>{documentType} {quoteDetails.quoteNumber ? `#${quoteDetails.quoteNumber}` : '#Pending'} | Page {page.pageNumber} of {totalPages}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Page 2: Bank */}
                                <div className="a4-container">
                                    {/* Watermark */}
                                    <div
                                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                        style={{
                                            transform: 'rotate(-55deg)',
                                            zIndex: 0
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '42pt',
                                                fontWeight: 700,
                                                color: 'rgba(0,0,0,0.02)',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            EDGE2 Engineering Solutions India Pvt. Ltd.
                                        </span>
                                    </div>
                                    <div className="a4-page-content flex flex-col">
                                        <div className="text-gray-500 text-sm flex-1">

                                            {/* Bank + Signatory (Grid) */}
                                            <div className="grid grid-cols-2 gap-8 mt-2 text-left text-xs">
                                                {/* Bank Details */}
                                                <div>
                                                    <h2 className="font-semibold mb-2 text-sm">Bank Details</h2>
                                                    <table className="w-full text-sm border-collapse">
                                                        <tbody>
                                                            <tr>
                                                                <td className="py-1 font-semibold w-32">Name:</td>
                                                                <td className="py-1">{settings?.bank_account_holder_name || 'EDGE2 Engineering Solutions India Pvt. Ltd.'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="py-1 font-semibold">A/c. No:</td>
                                                                <td className="py-1">{settings?.bank_account_number || '560321000022687'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="py-1 font-semibold">IFSC Code:</td>
                                                                <td className="py-1">{settings?.ifsc_code || 'UBIN0907634'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="py-1 font-semibold">Branch:</td>
                                                                <td className="py-1">{settings?.branch_name || 'Bangalore - Peenya'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="py-1 font-semibold">Bank:</td>
                                                                <td className="py-1">{settings?.bank_name || 'Union Bank of India'}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Authorized Signatory */}
                                                <div className="flex flex-col items-center">
                                                    <h2 className="font-semibold mb-20 text-sm">Authorized Signatory</h2>
                                                    <table className="w-full text-sm border-collapse">
                                                        <tbody>
                                                            <tr>
                                                                <td className="py-1">For EDGE2 Engineering Solutions India Pvt. Ltd.</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="py-1 h-10"></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Payment Received Details - Only for Tax Invoice */}
                                            {documentType === 'Tax Invoice' && quoteDetails.paymentDate && (
                                                <div className="mt-6 pt-4 border-t">
                                                    <h2 className="font-semibold text-left mb-3 text-sm">Payment Received Details</h2>
                                                    <table className="w-full text-xs border-collapse">
                                                        <tbody>
                                                            <tr>
                                                                <td className="py-1 font-semibold w-40">Payment Received Date:</td>
                                                                <td className="py-1">{format(new Date(quoteDetails.paymentDate), 'dd MMM yyyy')}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="py-1 font-semibold">Mode of Payment:</td>
                                                                <td className="py-1">{quoteDetails.paymentMode}</td>
                                                            </tr>
                                                            {quoteDetails.paymentAmount && (
                                                                <tr>
                                                                    <td className="py-1 font-semibold">Amount Received:</td>
                                                                    <td className="py-1"><Rupee />{Number(quoteDetails.paymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                </tr>
                                                            )}
                                                            {quoteDetails.bankDetails && (
                                                                <tr>
                                                                    <td className="py-1 font-semibold">Transaction Details:</td>
                                                                    <td className="py-1">{quoteDetails.bankDetails}</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* Payment Terms */}
                                            <div className="mt-6 pt-4 border-t">
                                                <h2 className="font-semibold text-left mb-3">Payment Terms:</h2>
                                                {settings?.payment_terms ? (
                                                    <div className="text-xs whitespace-pre-wrap">{settings.payment_terms}</div>
                                                ) : (
                                                    <ul className="list-disc pl-5 text-xs">
                                                        <li>
                                                            Advance Payment of 60% + GST ({taxTotalPercent}%) along with Work order
                                                            as mobilization advance.
                                                        </li>
                                                        <li>
                                                            Mobilization of Men and Machines shall be done in 3–5 days after the
                                                            confirmation of Advance Payment.
                                                        </li>
                                                        <li>
                                                            Balance Payment to be done after completion of field work.
                                                        </li>
                                                    </ul>
                                                )}
                                            </div>

                                        </div>

                                        {/* Page Footer */}
                                        <div className="a4-page-footer">
                                            <span>EDGE2 Engineering Solutions India Pvt. Ltd.</span>
                                            <span>{documentType} {quoteDetails.quoteNumber ? `#${quoteDetails.quoteNumber}` : '#Pending'} | Page {totalItemPages + 1} of {totalPages}</span>
                                        </div>
                                    </div>
                                </div>


                                {/* Page: Terms & Conditions (Dynamic Pagination) */}
                                {tcPages.map((tcPage, tcIndex) => (
                                    <div key={`tc-page-${tcIndex}`} className="a4-container">
                                        {/* Watermark */}
                                        <div
                                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                            style={{
                                                transform: 'rotate(-55deg)',
                                                zIndex: 0
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '42pt',
                                                    fontWeight: 700,
                                                    color: 'rgba(0,0,0,0.02)',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                EDGE2 Engineering Solutions India Pvt. Ltd.
                                            </span>
                                        </div>
                                        <div className="a4-page-content">
                                            <div className="text-left text-gray-500 text-sm">
                                                <h2 className="font-semibold text-lg mb-4 text-center">
                                                    {tcIndex === 0 ? "Terms & Conditions" : "Terms & Conditions (Continued)"}
                                                </h2>

                                                {tcPage.items.length === 0 ? (
                                                    <div className="text-center italic text-gray-400 py-10">
                                                        No Terms & Conditions selected.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {tcPage.items.map((item, idx) => {
                                                            if (item.type === 'header') {
                                                                return (
                                                                    // <h3 key={item.id} className="font-semibold text-gray-800 text-sm mt-4 mb-2">
                                                                    //     {item.text}
                                                                    // </h3>
                                                                    <h3 key={item.id} className="font-bold text-sm text-gray-800 border-l-4 border-primary pl-2 mb-2">
                                                                        {item.text}
                                                                    </h3>
                                                                );
                                                            } else if (item.type === 'term') {
                                                                return (
                                                                    <div key={item.id} className="flex gap-2 text-xs leading-relaxed mb-1">
                                                                        <span className="whitespace-pre-line pl-2">{item.text}</span>
                                                                    </div>
                                                                );
                                                            } else if (item.type === 'spacer') {
                                                                return <div key={item.id} className="h-2"></div>;
                                                            }
                                                            return null;
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Page Footer */}
                                        <div className="a4-page-footer">
                                            <span>EDGE2 Engineering Solutions India Pvt. Ltd.</span>
                                            <span>{documentType} {quoteDetails.quoteNumber ? `#${quoteDetails.quoteNumber}` : '#Pending'} | Page {totalItemPages + 2 + tcIndex} of {totalPages}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Dynamic Technicals Pages */}
                                {techPages.map((page, techIndex) => (
                                    <div key={`tech-page-${page.pageNumber}`} className="a4-container">
                                        {/* Watermark */}
                                        <div
                                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                            style={{
                                                transform: 'rotate(-55deg)',
                                                zIndex: 0
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '42pt',
                                                    fontWeight: 700,
                                                    color: 'rgba(0,0,0,0.02)',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                EDGE2 Engineering Solutions India Pvt. Ltd.
                                            </span>
                                        </div>
                                        <div className="a4-page-content">
                                            {page.isFirstPage && (
                                                <h2 className="font-semibold text-lg mb-6 text-center pb-2">
                                                    Technicals
                                                </h2>
                                            )}
                                            <div className="space-y-4">
                                                {page.items.map((item) => {
                                                    if (item.type === 'header') {
                                                        return (
                                                            <h3 key={item.id} className="font-bold text-sm text-gray-800 border-l-4 border-primary pl-2 mb-2">
                                                                {item.text}
                                                            </h3>
                                                        );
                                                    } else if (item.type === 'tech') {
                                                        return (
                                                            <div key={item.id} className="text-xs text-gray-700 leading-relaxed mb-1 pl-2">
                                                                <p className="whitespace-pre-wrap">{item.text}</p>
                                                            </div>
                                                        );
                                                    } else if (item.type === 'spacer') {
                                                        return <div key={item.id} className="h-4"></div>;
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        </div>

                                        {/* Page Footer */}
                                        <div className="a4-page-footer">
                                            <span>EDGE2 Engineering Solutions India Pvt. Ltd.</span>
                                            <span>{documentType} {quoteDetails.quoteNumber ? `#${quoteDetails.quoteNumber}` : '#Pending'} | Page {totalItemPages + tcPages.length + (techIndex + 1)} of {totalPages}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.reset()}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center text-amber-600">Unsaved Changes</AlertDialogTitle>
                            <AlertDialogDescription>
                                You have unsaved changes in your document. Leaving this page will discard all details added. Are you sure you want to leave?
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
            </div>
        </div>
    );
};

export default NewQuotationPage;
