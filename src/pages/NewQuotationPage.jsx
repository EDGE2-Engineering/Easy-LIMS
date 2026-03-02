
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import {
    FileText, Plus, Search, Trash2, Download, Printer, Save, ArrowLeft,
    Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Package,
    Settings, User, Calendar, IndianRupee, Hash, BriefcaseBusiness
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { format } from 'date-fns';
import { DB_TYPES } from '@/data/config';
import { sendTelegramNotification } from '@/lib/notifier';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
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
import { useReactToPrint } from 'react-to-print';

// Internal Components for PDF/Print
const QuotationDocument = React.forwardRef(({ data, client, siteInfo, appUsers, isPreview = false }, ref) => {
    const getSiteName = () => siteInfo?.siteName || "Easy Billing";

    return (
        <div ref={ref} className="bg-white p-0 text-gray-900 font-serif">
            {/* Multiple Pages Loop for long content */}
            {[1].map((page) => (
                <div key={page} className="a4-container relative p-12 min-h-[29.7cm] border-b last:border-0 print:border-0">
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none overflow-hidden">
                        <span className="text-[120px] font-bold -rotate-45 uppercase tracking-widest whitespace-nowrap">
                            {getSiteName()}
                        </span>
                    </div>

                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8 relative z-10">
                        <div>
                            <img src={`${import.meta.env.BASE_URL}edge2-logo.png`} alt="Logo" className="h-16 w-auto mb-2" />
                            <h1 className="text-xl font-bold text-primary">{getSiteName()}</h1>
                            <p className="text-xs text-gray-500 max-w-xs">{siteInfo?.address || "Engineering Solutions Provider"}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-black text-gray-200 uppercase tracking-tighter mb-1">Quotation</h2>
                            <p className="text-sm font-bold">No: <span className="font-mono">{data.quotation_no}</span></p>
                            <p className="text-sm">Date: {format(new Date(data.created_at || new Date()), 'dd/MM/yyyy')}</p>
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="grid grid-cols-2 gap-12 mb-8 relative z-10">
                        <div>
                            <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 border-b pb-1">To:</h3>
                            <p className="font-bold text-lg">{client?.client_name || "Valued Client"}</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{client?.address}</p>
                            {client?.gst_no && <p className="text-sm font-mono mt-1">GSTIN: {client.gst_no}</p>}
                        </div>
                        <div className="text-right">
                            <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 border-b pb-1 text-right">Project Details:</h3>
                            <p className="font-bold">{data.project_name || "N/A"}</p>
                            <p className="text-sm text-gray-600">Location: {data.location || "N/A"}</p>
                            {data.reference_no && <p className="text-sm mt-1italic">Ref: {data.reference_no}</p>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-8 relative z-10">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-y-2 border-gray-200">
                                    <th className="py-2 px-3 text-left text-xs font-bold uppercase">#</th>
                                    <th className="py-2 px-3 text-left text-xs font-bold uppercase">Description of Services</th>
                                    <th className="py-2 px-3 text-right text-xs font-bold uppercase">Qty</th>
                                    <th className="py-2 px-3 text-right text-xs font-bold uppercase">Unit</th>
                                    <th className="py-2 px-3 text-right text-xs font-bold uppercase">Rate</th>
                                    <th className="py-2 px-3 text-right text-xs font-bold uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 px-3 text-sm">{idx + 1}</td>
                                        <td className="py-3 px-3">
                                            <p className="font-bold text-sm">{item.description}</p>
                                            {item.details && <p className="text-xs text-gray-500 mt-1">{item.details}</p>}
                                        </td>
                                        <td className="py-3 px-3 text-right text-sm">{item.quantity}</td>
                                        <td className="py-3 px-3 text-right text-sm">{item.unit}</td>
                                        <td className="py-3 px-3 text-right text-sm font-mono">{parseFloat(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="py-3 px-3 text-right text-sm font-bold font-mono">{parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-gray-200">
                                <tr>
                                    <td colSpan="5" className="py-2 px-3 text-right text-sm font-bold">Sub Total:</td>
                                    <td className="py-2 px-3 text-right text-sm font-bold font-mono">{data.sub_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                                {data.gst_amount > 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-2 px-3 text-right text-sm font-bold">GST ({data.gst_percentage}%):</td>
                                        <td className="py-2 px-3 text-right text-sm font-bold font-mono">{data.gst_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )}
                                <tr className="bg-primary/5">
                                    <td colSpan="5" className="py-4 px-3 text-right text-lg font-black uppercase text-primary">Grand Total:</td>
                                    <td className="py-4 px-3 text-right text-lg font-black text-primary font-mono">₹{data.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Terms & Conditions (derived automatically) */}
                    <div className="grid grid-cols-1 gap-8 mb-12 relative z-10">
                        <div>
                            <h3 className="text-xs font-bold uppercase text-primary mb-3 border-b border-primary/20 pb-1">Terms & Conditions</h3>
                            <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                                {data.terms?.length > 0 ? (
                                    data.terms.map((t, i) => <li key={i}>{t}</li>)
                                ) : (
                                    <>
                                        <li>Standard payment terms apply (100% advance or as agreed).</li>
                                        <li>GST at 18% extra as applicable.</li>
                                        <li>Validity of this quotation is 30 days.</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Footer - Signatures */}
                    <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-end relative z-10">
                        <div className="text-xs text-gray-400 italic">
                            Generated by {(() => {
                                const u = appUsers.find(u => u.username === data.created_by || u.id === data.created_by || u.sub === data.created_by || u.email === data.created_by);
                                return u ? (u.full_name || u.fullName || u.name) : data.created_by;
                            })()}
                        </div>
                        <div className="text-center w-48">
                            <div className="h-16 border-b border-gray-300 mb-2"></div>
                            <p className="text-xs font-bold uppercase">Authorized Signatory</p>
                            <p className="text-[10px] text-gray-500">{getSiteName()}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

const NewQuotationPage = () => {
    const { user, idToken, isAdmin } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const printRef = useRef();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState([]);
    const [appUsers, setAppUsers] = useState([]);
    const [formData, setFormData] = useState({
        quotation_no: `QT-${Date.now()}`,
        client_id: '',
        project_name: '',
        location: '',
        reference_no: '',
        items: [
            { description: '', details: '', quantity: 1, unit: 'Nos', rate: 0, amount: 0 }
        ],
        gst_percentage: 18,
        sub_total: 0,
        gst_amount: 0,
        total_amount: 0,
        terms: []
    });

    const fetchInitialData = async () => {
        if (!idToken) return;
        setLoading(true);
        try {
            const [clientsData, servicesData, usersData] = await Promise.all([
                dynamoGenericApi.listByType(DB_TYPES.CLIENT, idToken),
                dynamoGenericApi.listByType(DB_TYPES.SERVICE, idToken),
                dynamoGenericApi.listByType(DB_TYPES.USER, idToken)
            ]);
            setClients(clientsData || []);
            setServices(servicesData || []);
            setAppUsers(usersData || []);

            if (id && id !== 'new') {
                const existing = await dynamoGenericApi.get(id, idToken);
                if (existing) {
                    setFormData(existing);
                }
            }
        } catch (err) {
            console.error("Error fetching data:", err);
            toast({ title: "Error", description: "Failed to load required data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [idToken, id]);

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { description: '', details: '', quantity: 1, unit: 'Nos', rate: 0, amount: 0 }]
        }));
    };

    const handleRemoveItem = (idx) => {
        const newItems = formData.items.filter((_, i) => i !== idx);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleItemChange = (idx, field, value) => {
        const newItems = [...formData.items];
        newItems[idx][field] = value;

        if (field === 'quantity' || field === 'rate') {
            newItems[idx].amount = (parseFloat(newItems[idx].quantity) || 0) * (parseFloat(newItems[idx].rate) || 0);
        }

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    useEffect(() => {
        const sub_total = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
        const gst_amount = (sub_total * (formData.gst_percentage || 0)) / 100;
        const total_amount = sub_total + gst_amount;

        setFormData(prev => ({ ...prev, sub_total, gst_amount, total_amount }));
    }, [formData.items, formData.gst_percentage]);

    const handleSave = async (isPrint = false) => {
        if (!formData.client_id) {
            toast({ title: "Error", description: "Please select a client", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const quotationData = {
                ...formData,
                created_by: formData.created_by || user.id || user.name || user.username,
                updated_at: new Date().toISOString()
            };

            // NEW LOGIC: Always treat quotations as part of a Job
            // We use patch to avoid overwriting material_inward or report data
            const record = await dynamoGenericApi.patch(quotationData.id || `JOB-${Date.now()}`, {
                quotation: quotationData
            }, idToken);

            toast({ title: "Success", description: "Quotation saved successfully" });

            if (!id || id === 'new') {
                navigate(`/quotation/${record.id}`);
            }

            // Telegram notification
            const client = clients.find(c => c.id === formData.client_id);
            const msg = `🧾 *Quotation Saved*\nNo: \`${formData.quotation_no}\`\nClient: \`${client?.client_name}\`\nAmount: \`₹${formData.total_amount.toLocaleString()}\`\nBy: \`${user.full_name || user.name || user.username}\``;
            sendTelegramNotification(msg);

        } catch (err) {
            console.error("Save failed:", err);
            toast({ title: "Error", description: "Failed to save quotation", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `Quotation_${formData.quotation_no}`,
        onAfterPrint: () => {
            const client = clients.find(c => c.id === formData.client_id);
            sendTelegramNotification(`🖨️ *Quotation Printed*\nNo: \`${formData.quotation_no}\`\nClient: \`${client?.client_name}\``);
        }
    });

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    const selectedClient = clients.find(c => c.id === formData.client_id);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Helmet><title>{id && id !== 'new' ? 'Edit' : 'New'} Quotation | EDGE2</title></Helmet>
            <Navbar />

            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Form Section */}
                    <div className="flex-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" onClick={() => navigate('/settings/accounts')} className="rounded-full">
                                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                                </Button>
                                <h1 className="text-2xl font-bold text-gray-900">{id && id !== 'new' ? 'Edit' : 'New'} Quotation</h1>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={handlePrint} className="gap-2">
                                    <Printer className="w-4 h-4" /> Print
                                </Button>
                                <Button onClick={() => handleSave()} disabled={saving} className="bg-primary hover:bg-primary-dark text-white gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Quotation
                                </Button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Quotation Number</Label>
                                <Input value={formData.quotation_no} onChange={e => setFormData(prev => ({ ...prev, quotation_no: e.target.value }))} className="font-mono bg-gray-50" />
                            </div>
                            <div className="space-y-2">
                                <Label>Client *</Label>
                                <Select value={formData.client_id} onValueChange={val => setFormData(prev => ({ ...prev, client_id: val }))}>
                                    <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                                    <SelectContent>
                                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Project Name</Label>
                                <Input value={formData.project_name} onChange={e => setFormData(prev => ({ ...prev, project_name: e.target.value }))} placeholder="e.g. Metro Rail Project" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                            <div className="flex justify-between items-center border-b pb-4">
                                <h3 className="font-bold text-lg flex items-center gap-2 text-primary"><Package className="w-5 h-5" /> Items & Services</h3>
                                <Button variant="outline" size="sm" onClick={handleAddItem} className="gap-1"><Plus className="w-4 h-4" /> Add Line</Button>
                            </div>

                            <div className="space-y-4">
                                {formData.items.map((item, idx) => (
                                    <div key={idx} className="group p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-primary/20 transition-all space-y-4 relative">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2 space-y-2">
                                                <Label className="text-xs">Description *</Label>
                                                <Input value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} placeholder="Service Title" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Unit</Label>
                                                <Input value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} placeholder="e.g. Nos, Mtrs" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Quantity</Label>
                                                <Input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Rate</Label>
                                                <div className="relative">
                                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                                    <Input type="number" value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} className="pl-8" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Amount</Label>
                                                <Input value={item.amount.toLocaleString()} readOnly className="font-bold bg-white" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-6 flex flex-col items-end space-y-2">
                                <div className="flex justify-between w-64 text-sm"><span className="text-gray-500">Sub Total:</span><span className="font-bold font-mono">₹{formData.sub_total.toLocaleString()}</span></div>
                                <div className="flex justify-between w-64 text-sm items-center">
                                    <span className="text-gray-500">GST (%):</span>
                                    <Input type="number" value={formData.gst_percentage} onChange={e => setFormData(prev => ({ ...prev, gst_percentage: parseFloat(e.target.value) || 0 }))} className="w-20 h-8 text-right font-mono" />
                                </div>
                                <div className="flex justify-between w-64 text-sm border-b pb-2"><span className="text-gray-500">GST Amount:</span><span className="font-bold font-mono">₹{formData.gst_amount.toLocaleString()}</span></div>
                                <div className="flex justify-between w-64 text-xl font-black text-primary pt-2"><span>TOTAL:</span><span>₹{formData.total_amount.toLocaleString()}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Section (Sticky) */}
                    <div className="hidden xl:block w-[400px]">
                        <div className="sticky top-8 bg-gray-200 p-4 rounded-xl shadow-inner overflow-y-auto max-h-[calc(100vh-100px)]">
                            <h3 className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Document Preview</h3>
                            <div className="bg-white shadow-2xl scale-[0.35] origin-top border border-gray-300">
                                <QuotationDocument data={formData} client={selectedClient} siteInfo={{ siteName: "Easy Billing", address: "Premium Engineering Lab" }} appUsers={appUsers} isPreview={true} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Hidden Print Content */}
            <div style={{ display: 'none' }}>
                <QuotationDocument ref={printRef} data={formData} client={selectedClient} siteInfo={{ siteName: "Easy Billing", address: "Premium Engineering Lab" }} appUsers={appUsers} />
            </div>
        </div>
    );
};

export default NewQuotationPage;
