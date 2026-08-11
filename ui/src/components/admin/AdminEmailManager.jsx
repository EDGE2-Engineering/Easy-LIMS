import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSiteContent } from '@/data/config';
import {
  Mail,
  Send,
  Users,
  Search,
  CheckCircle2,
  X,
  Check,
  ChevronsUpDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIcon,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Loader2,
  History,
  FileText,
  AlertTriangle,
  Sparkles,
  Eye,
  Edit3,
  Trash2,
  Minus,
  Quote,
  Palette,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DEFAULT_TEMPLATES_SEED = [
  {
    id: 1,
    name: 'Test Report Released Notice',
    subject: 'Laboratory Test Report Available - {{client_name}}',
    body: `<h2>Laboratory Test Report Dispatch</h2><p>Dear <strong>{{contact_person}}</strong>,</p><p>We are pleased to inform you that the requested laboratory testing for your recent job sample has been completed and verified by our quality engineers.</p><p>You can access your verified report directly through your client portal or by contacting your account representative.</p><hr /><p>Best regards,<br /><strong>{{site_name}} Quality Laboratory Team</strong></p>`,
  },
  {
    id: 2,
    name: 'Work Order & Sample Receipt Confirmation',
    subject: 'Work Order & Sample Receipt Confirmation - {{client_name}}',
    body: `<h2>Sample Reception & Work Order Confirmation</h2><p>Dear <strong>{{contact_person}}</strong>,</p><p>Thank you for choosing <strong>{{site_name}}</strong>. We have officially logged your work order and material samples into our LIMS testing workflow.</p><p>Our technicians have begun sample preparation and testing per the required standards.</p><hr /><p>Regards,<br /><strong>Material Receiving Department</strong></p>`,
  },
  {
    id: 3,
    name: 'General Communication Notice',
    subject: 'Important Update from {{site_name}}',
    body: `<h2>Important Customer Update</h2><p>Dear Valued Partner,</p><p>We are writing to share an important announcement regarding our laboratory operations and technical testing services.</p><p>Please review the details below and reach out to our support team if you have any questions.</p><hr /><p>Sincerely,<br /><strong>Management Team - {{site_name}}</strong></p>`,
  },
];

const AdminEmailManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const siteName = getSiteContent().global?.siteName || 'Easy-LIMS';

  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'history'
  const [clients, setClients] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);

  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [editorMode, setEditorMode] = useState('edit'); // 'edit' | 'preview'

  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewHistoryItem, setViewHistoryItem] = useState(null);

  // Email Templates State
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '' });
  const [deleteTemplateDialog, setDeleteTemplateDialog] = useState({ isOpen: false, id: null, name: '' });

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchClients();
    fetchHistory();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await apiClient
        .from('email_templates')
        .select('*')
        .order('id');
      if (error && !error.message?.includes('does not exist')) throw error;
      setTemplates(data && data.length > 0 ? data : DEFAULT_TEMPLATES_SEED);
    } catch (err) {
      console.error('Failed to fetch email templates:', err);
      setTemplates(DEFAULT_TEMPLATES_SEED);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  const getClientContacts = (client) => {
    if (!client) return [];
    const contactsList = [];
    const seenEmails = new Set();

    let rawContacts = [];
    if (Array.isArray(client.contacts)) {
      rawContacts = client.contacts;
    } else if (typeof client.contacts === 'string' && client.contacts.trim()) {
      try {
        const parsed = JSON.parse(client.contacts);
        if (Array.isArray(parsed)) rawContacts = parsed;
      } catch (_) {}
    }

    // Top-level primary client contact
    const primaryName = (client.contact_person || client.contactPerson || client.client_name || client.clientName || '').trim();
    const primaryEmail = (client.email || '').trim();

    if (primaryEmail && isValidEmail(primaryEmail)) {
      contactsList.push({
        name: primaryName || 'Primary Contact',
        email: primaryEmail,
        is_primary: true,
      });
      seenEmails.add(primaryEmail.toLowerCase());
    }

    // Associated contacts array
    rawContacts.forEach((c) => {
      const cEmail = (c.contact_email || c.email || '').trim();
      const cName = (c.contact_person || c.name || c.contactPerson || '').trim() || primaryName || 'Contact';
      if (cEmail && isValidEmail(cEmail) && !seenEmails.has(cEmail.toLowerCase())) {
        contactsList.push({
          name: cName,
          email: cEmail,
          is_primary: Boolean(c.is_primary),
        });
        seenEmails.add(cEmail.toLowerCase());
      }
    });

    return contactsList;
  };

  const getClientContactsCsv = (client) => {
    const contacts = getClientContacts(client);
    const namesCsv = contacts
      .map((c) => (c.is_primary ? `${c.name} (Primary)` : c.name))
      .join(', ');
    const emailsCsv = contacts.map((c) => c.email).join(', ');
    return { contacts, namesCsv, emailsCsv, count: contacts.length };
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await apiClient
        .from('clients')
        .select('id, client_name, email, contact_person, contacts, client_address')
        .order('client_name');
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await apiClient
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error && !error.message?.includes('does not exist')) throw error;
      setHistoryLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch email history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ── Client Selection Handlers ─────────────────────────────────────
  const selectableClients = clients.filter((c) => getClientContactsCsv(c).count > 0);
  const isAllSelected =
    selectableClients.length > 0 &&
    selectableClients.every((c) => selectedClientIds.includes(String(c.id)));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClientIds([]);
    } else {
      // Only select clients that have at least 1 valid contact email address
      setSelectedClientIds(selectableClients.map((c) => String(c.id)));
    }
  };

  const handleToggleClient = (client) => {
    const { count } = getClientContactsCsv(client);
    if (count === 0) {
      toast({
        title: 'Selection Disabled',
        description: `"${client.client_name}" does not have any contact email addresses configured.`,
        variant: 'destructive',
      });
      return;
    }
    const idStr = String(client.id);
    setSelectedClientIds((prev) =>
      prev.includes(idStr)
        ? prev.filter((id) => id !== idStr)
        : [...prev, idStr]
    );
  };

  const handleRemoveRecipient = (clientId) => {
    const idStr = String(clientId);
    setSelectedClientIds((prev) => prev.filter((id) => id !== idStr));
  };

  const filteredClients = clients.filter((c) => {
    const term = clientSearchTerm.toLowerCase();
    const nameMatch = (c.client_name || '').toLowerCase().includes(term);
    const emailMatch = (c.email || '').toLowerCase().includes(term);
    const contactMatch = (c.contact_person || '').toLowerCase().includes(term);
    const { namesCsv, emailsCsv } = getClientContactsCsv(c);
    const contactsMatch = namesCsv.toLowerCase().includes(term) || emailsCsv.toLowerCase().includes(term);
    return nameMatch || emailMatch || contactMatch || contactsMatch;
  });

  const selectedClientsList = clients.filter((c) =>
    selectedClientIds.includes(String(c.id))
  );

  // ── Template Management Handlers ─────────────────────────────────────
  const handleOpenAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      subject: subject || '',
      body: bodyHtml || editorRef.current?.innerHTML || '',
    });
    setTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl, e) => {
    if (e) e.stopPropagation();
    setEditingTemplate(tmpl);
    setTemplateForm({
      name: tmpl.name || '',
      subject: tmpl.subject || '',
      body: tmpl.body || '',
    });
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast({ title: 'Template Name Required', description: 'Please enter a template name.', variant: 'destructive' });
      return;
    }
    if (!templateForm.subject.trim()) {
      toast({ title: 'Subject Line Required', description: 'Please enter a default subject line.', variant: 'destructive' });
      return;
    }

    try {
      if (editingTemplate && typeof editingTemplate.id === 'number') {
        const { error } = await apiClient
          .from('email_templates')
          .update({
            name: templateForm.name.trim(),
            subject: templateForm.subject.trim(),
            body: templateForm.body.trim(),
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast({ title: 'Template Updated', description: `Template "${templateForm.name}" updated successfully.` });
      } else {
        const { error } = await apiClient
          .from('email_templates')
          .insert({
            name: templateForm.name.trim(),
            subject: templateForm.subject.trim(),
            body: templateForm.body.trim(),
          });
        if (error) throw error;
        toast({ title: 'Template Saved', description: `New template "${templateForm.name}" created successfully.` });
      }
      setTemplateModalOpen(false);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
      toast({
        title: 'Failed to Save Template',
        description: err.message || 'An error occurred while saving the template.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDeleteTemplate = async () => {
    if (!deleteTemplateDialog.id) return;
    try {
      if (typeof deleteTemplateDialog.id === 'number') {
        const { error } = await apiClient
          .from('email_templates')
          .delete()
          .eq('id', deleteTemplateDialog.id);
        if (error) throw error;
      }
      toast({ title: 'Template Deleted', description: `Template "${deleteTemplateDialog.name}" removed.` });
      setDeleteTemplateDialog({ isOpen: false, id: null, name: '' });
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast({
        title: 'Failed to Delete Template',
        description: err.message || 'An error occurred while deleting the template.',
        variant: 'destructive',
      });
    }
  };

  // ── Editor Command Handlers ────────────────────────────────────────
  const execCmd = (command, value = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    updateBodyFromEditor();
  };

  const updateBodyFromEditor = () => {
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  const handleApplyTemplate = (template) => {
    let sub = template.subject.replace(/{{site_name}}/g, siteName);
    let body = template.body.replace(/{{site_name}}/g, siteName);

    if (selectedClientsList.length === 1) {
      const first = selectedClientsList[0];
      sub = sub
        .replace(/{{client_name}}/g, first.client_name || '')
        .replace(/{{contact_person}}/g, first.contact_person || first.client_name || '');
      body = body
        .replace(/{{client_name}}/g, first.client_name || '')
        .replace(/{{contact_person}}/g, first.contact_person || first.client_name || '');
    } else {
      sub = sub.replace(/{{client_name}}/g, 'Valued Client');
      body = body.replace(/{{contact_person}}/g, 'Valued Client');
    }

    setSubject(sub);
    setBodyHtml(body);
    if (editorRef.current) {
      editorRef.current.innerHTML = body;
    }
    toast({ title: 'Template Applied', description: `Loaded "${template.name}" template.` });
  };

  const handleInsertVariable = (varName) => {
    let insertVal = varName;
    if (varName === '{{current_date}}') {
      insertVal = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } else if (varName === '{{site_name}}') {
      insertVal = siteName;
    }
    execCmd('insertText', insertVal);
  };

  // Image insertion handlers
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Please select an image smaller than 5MB.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      insertImageToBody(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleInsertUrlImage = () => {
    if (!imageUrlInput || !imageUrlInput.trim()) return;
    insertImageToBody(imageUrlInput.trim());
    setImageUrlInput('');
    setImageModalOpen(false);
  };

  const insertImageToBody = (src) => {
    const imgHtml = `<img src="${src}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" alt="Embedded Image" />`;
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, imgHtml);
      updateBodyFromEditor();
    } else {
      setBodyHtml((prev) => prev + imgHtml);
    }
    toast({ title: 'Image Inserted', description: 'Image embedded into email body.' });
  };

  // ── Dispatch Handlers ──────────────────────────────────────────────
  const handleInitiateSend = () => {
    if (selectedClientIds.length === 0) {
      toast({ title: 'No Recipients Selected', description: 'Please select at least one client recipient.', variant: 'destructive' });
      return;
    }
    if (!subject || !subject.trim()) {
      toast({ title: 'Subject Required', description: 'Please enter an email subject line.', variant: 'destructive' });
      return;
    }
    const cleanBody = (bodyHtml || editorRef.current?.innerHTML || '').trim();
    if (!cleanBody || cleanBody === '<br>' || cleanBody === '<p></p>') {
      toast({ title: 'Email Body Required', description: 'Please compose the email body message.', variant: 'destructive' });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    setSending(true);
    try {
      const finalBody = editorRef.current?.innerHTML || bodyHtml;
      const recipientsData = [];
      selectedClientsList.forEach((c) => {
        const { contacts } = getClientContactsCsv(c);
        contacts.forEach((con) => {
          recipientsData.push({
            client_id: c.id,
            client_name: c.client_name,
            contact_name: con.name,
            email: con.email,
            is_primary: con.is_primary,
          });
        });
      });

      let userId = typeof user?.id === 'string' ? parseInt(user.id) : user?.id;
      const senderName = user?.full_name || user?.username || 'System Administrator';

      // 1. Post email payload to backend API endpoint
      const { data, error } = await apiClient.from('email_logs').insert({
        subject: subject.trim(),
        body_html: finalBody,
        recipients: recipientsData,
        recipient_count: recipientsData.length,
        sent_by: userId || null,
        sent_by_name: senderName,
        status: 'SENT',
      });

      if (error && !error.message?.includes('does not exist')) throw error;

      toast({
        title: 'Email Sent Successfully',
        description: `Communication dispatched to ${recipientsData.length} target contact email(s) across ${selectedClientsList.length} client(s).`,
      });

      // Clear compose form
      setSelectedClientIds([]);
      setSubject('');
      setBodyHtml('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setConfirmOpen(false);
      fetchHistory();
      setActiveTab('history');
    } catch (err) {
      console.error('Failed to send email:', err);
      toast({
        title: 'Failed to Send Email',
        description: err.message || 'An error occurred during email dispatch.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Email Communication</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send Email communication to clients, upload inline images, and track dispatch logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-gray-400 font-medium">Registered Clients</span>
            <p className="text-lg font-extrabold text-primary">{clients.length}</p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[200px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose" className="text-xs flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Compose
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> History
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeTab === 'compose' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 w-full">
          {/* Main Form (3 Cols) */}
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
              {/* Recipient Selection Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" /> Recipients (Clients)
                  </Label>
                  <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                    {selectedClientIds.length} of {clients.length} Selected
                  </Badge>
                </div>

                {/* Recipient Dropdown Popover */}
                <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientPopoverOpen}
                      className="w-full justify-between bg-gray-50/50 border-gray-200 text-left font-normal h-12 rounded-xl hover:bg-gray-50 px-3"
                    >
                      <span className="truncate text-xs text-gray-700 font-medium">
                        {selectedClientsList.length === 0
                          ? 'Select client recipients...'
                          : `${selectedClientsList.length} client(s) selected (${selectedClientsList.reduce((acc, c) => acc + getClientContactsCsv(c).count, 0)} total contact emails)`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[560px] sm:w-[620px] p-3 space-y-3" align="start">
                    {/* Search & Select All controls */}
                    <div className="flex items-center justify-between gap-2 border-b pb-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search client, contacts, or emails..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleToggleSelectAll}
                        className="h-8 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all px-3"
                      >
                        {isAllSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>

                    {/* Client Checklist with Contacts CSV */}
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {filteredClients.map((client) => {
                        const idStr = String(client.id);
                        const isChecked = selectedClientIds.includes(idStr);
                        const { contacts, namesCsv, emailsCsv, count } = getClientContactsCsv(client);
                        const hasEmails = count > 0;

                        return (
                          <div
                            key={client.id}
                            onClick={() => handleToggleClient(client)}
                            className={`flex items-start justify-between p-3 rounded-xl text-xs transition-all border ${
                              hasEmails
                                ? isChecked
                                  ? 'bg-primary/10 text-primary font-medium border-primary/30 shadow-sm cursor-pointer'
                                  : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-700 cursor-pointer'
                                : 'bg-gray-100/70 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed select-none'
                            }`}
                            title={hasEmails ? undefined : 'Selection Disabled: Client does not have any email addresses configured'}
                          >
                            <div className="flex flex-col truncate pr-2 space-y-1">
                              <span className={`font-bold text-sm truncate flex items-center gap-1.5 ${hasEmails ? 'text-gray-900' : 'text-gray-500'}`}>
                                {!hasEmails && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                {client.client_name}
                              </span>
                              {hasEmails ? (
                                <>
                                  <span className="text-[11px] text-gray-600 truncate">
                                    <strong className="text-gray-700">Contacts ({count}):</strong> {namesCsv}
                                  </span>
                                  <span className="text-[11px] text-primary/80 font-mono truncate">
                                    <strong className="text-gray-700 font-sans">Emails CSV:</strong> {emailsCsv}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                                  ⚠️ Disabled — No contact email configured for client
                                </span>
                              )}
                            </div>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                !hasEmails
                                  ? 'border-gray-300 bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                                  : isChecked
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-gray-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        );
                      })}
                      {filteredClients.length === 0 && (
                        <p className="text-center text-xs text-gray-400 py-4 italic">
                          No clients found matching "{clientSearchTerm}"
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Recipient Tag Badges with Contacts CSV */}
                {selectedClientsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                    {selectedClientsList.map((client) => {
                      const { namesCsv, emailsCsv, count } = getClientContactsCsv(client);
                      const hasEmails = count > 0;
                      return (
                        <Badge
                          key={client.id}
                          variant="secondary"
                          className={`text-xs p-2.5 rounded-xl flex items-center gap-2 border transition-all ${
                            hasEmails
                              ? 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 shadow-sm'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-300 font-bold'
                          }`}
                        >
                          {!hasEmails && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          <div className="flex flex-col text-left max-w-[320px]">
                            <span className="font-bold text-xs text-gray-900">{client.client_name}</span>
                            {hasEmails ? (
                              <>
                                <span className="text-[10px] text-gray-600 truncate">
                                  Contacts ({count}): {namesCsv}
                                </span>
                                <span className="text-[10px] text-primary/80 font-mono truncate">
                                  Emails CSV: {emailsCsv}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] text-red-600 font-bold">(No Contact Emails Configured)</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(client.id)}
                            className={`${hasEmails ? 'text-primary hover:text-red-600' : 'text-red-500 hover:text-red-900'} rounded-full p-1 ml-1 shrink-0`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subject Line Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Subject Line
                  </Label>
                  <span className="text-[11px] text-gray-400">{subject.length} characters</span>
                </div>
                <Input
                  type="text"
                  placeholder="e.g. Important Notification Regarding Test Reports - Easy LIMS"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-11 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Rich Text Editor Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Email Body Content
                  </Label>
                  <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditorMode('edit')}
                      className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                        editorMode === 'edit'
                          ? 'bg-white text-primary font-bold shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Edit3 className="w-3 h-3 inline mr-1" /> Rich Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateBodyFromEditor();
                        setEditorMode('preview');
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                        editorMode === 'preview'
                          ? 'bg-white text-primary font-bold shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Eye className="w-3 h-3 inline mr-1" /> Live Preview
                    </button>
                  </div>
                </div>

                {editorMode === 'edit' ? (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    {/* Rich Formatting Toolbar */}
                    <div className="bg-gray-50/80 p-2 border-b border-gray-200 flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('bold')}
                        title="Bold (Ctrl+B)"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <Bold className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('italic')}
                        title="Italic (Ctrl+I)"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <Italic className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('underline')}
                        title="Underline (Ctrl+U)"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <Underline className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('strikeThrough')}
                        title="Strikethrough"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <Strikethrough className="w-4 h-4" />
                      </Button>

                      <div className="h-4 w-px bg-gray-300 mx-1" />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('formatBlock', '<h1>')}
                        title="Heading 1"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <Heading1 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('formatBlock', '<h2>')}
                        title="Heading 2"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <Heading2 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('formatBlock', '<p>')}
                        title="P"
                        className="h-8 text-xs font-semibold text-gray-700 hover:bg-gray-200 px-1.5"
                      >
                        P
                      </Button>

                      <div className="h-4 w-px bg-gray-300 mx-1" />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('insertUnorderedList')}
                        title="Bullet List"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('insertOrderedList')}
                        title="Numbered List"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </Button>

                      <div className="h-4 w-px bg-gray-300 mx-1" />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('justifyLeft')}
                        title="Align Left"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <AlignLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('justifyCenter')}
                        title="Align Center"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <AlignCenter className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('justifyRight')}
                        title="Align Right"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <AlignRight className="w-4 h-4" />
                      </Button>

                      <div className="h-4 w-px bg-gray-300 mx-1" />

                      {/* Image Upload Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 text-xs font-semibold gap-1 text-primary border-primary/20 hover:bg-primary/10"
                        title="Upload Image file into body"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Upload Image
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setImageModalOpen(true)}
                        className="hidden h-8 text-xs font-medium text-gray-600 hover:bg-gray-200"
                        title="Insert Image URL"
                      >
                        Image URL
                      </Button>

                      <div className="h-4 w-px bg-gray-300 mx-1" />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('insertHorizontalRule')}
                        title="Horizontal Rule"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => execCmd('formatBlock', '<blockquote>')}
                        title="Blockquote"
                        className="h-8 w-8 text-gray-700 hover:bg-gray-200"
                      >
                        <Quote className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Content Editable Area */}
                    <div
                      ref={editorRef}
                      contentEditable
                      onInput={updateBodyFromEditor}
                      className="p-4 min-h-[300px] max-h-[500px] overflow-y-auto focus:outline-none text-sm text-gray-800 space-y-2 prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                  </div>
                ) : (
                  /* HTML Preview Area */
                  <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50/50 min-h-[340px] space-y-4">
                    <div className="bg-white border rounded-xl p-4 shadow-sm space-y-2">
                      <p className="text-xs text-gray-500 font-semibold border-b pb-2">
                        To: {selectedClientsList.map((c) => c.client_name).join(', ') || 'No clients selected'}
                      </p>
                      <p className="text-sm font-bold text-gray-900 border-b pb-2">
                        Subject: {subject || '(No Subject)'}
                      </p>
                      <div
                        className="text-sm text-gray-800 pt-2 prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: bodyHtml || '<p className="text-gray-400 italic">No email body content entered.</p>' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit & Action Footer */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-xs text-gray-400">
                  {selectedClientIds.length} recipient(s) ready
                </div>
                <Button
                  type="button"
                  onClick={handleInitiateSend}
                  className="bg-primary hover:bg-primary-dark text-white px-8 h-11 rounded-xl shadow-md flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send Email
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar Controls (1 Col) */}
          <div className="space-y-6">
            {/* Quick Templates Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Preset Templates
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddTemplate}
                  className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 border-primary/20 px-2 rounded-lg"
                >
                  + Add Template
                </Button>
              </div>

              {loadingTemplates ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-primary mr-2" />
                  <span className="text-xs text-gray-400">Loading templates...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
                  {templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="group relative p-3 rounded-xl border border-gray-100 hover:border-primary/40 hover:bg-primary/5 transition-all space-y-1.5 bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate(tmpl)}
                          className="text-left flex-1 space-y-0.5"
                        >
                          <span className="font-bold text-xs text-gray-900 group-hover:text-primary transition-colors block">
                            {tmpl.name}
                          </span>
                          <span className="text-[11px] text-gray-400 block truncate max-w-[200px]">
                            {tmpl.subject}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleOpenEditTemplate(tmpl, e)}
                            className="h-7 w-7 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg"
                            title="Edit Template"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTemplateDialog({ isOpen: true, id: tmpl.id, name: tmpl.name });
                            }}
                            className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="w-full h-6 text-[11px] font-semibold bg-gray-50 group-hover:bg-primary group-hover:text-white text-gray-600 transition-all"
                      >
                        Apply Template
                      </Button>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4 italic">
                      No email templates created yet.
                    </p>
                  )}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAddTemplate}
                className="w-full text-xs font-semibold text-gray-600 border-dashed hover:border-primary hover:text-primary h-9 rounded-xl flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Save Current Form as Template
              </Button>
            </div>

            {/* Template Variables Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Insert Template Variables
              </h3>
              <p className="text-xs text-muted-foreground">
                Click to insert dynamic values into the cursor position:
              </p>
              <div className="flex flex-wrap gap-2">
                {['{{client_name}}', '{{contact_person}}', '{{current_date}}', '{{site_name}}'].map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInsertVariable(v)}
                    className="text-xs h-7 px-2.5 bg-gray-50 border-gray-200 text-gray-700 hover:bg-primary hover:text-white transition-all font-mono"
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Email History Tab View */
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Email Communication History</h2>
              <p className="text-xs text-muted-foreground">
                Past email dispatches sent to client organizations.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              className="text-xs"
            >
              Refresh History
            </Button>
          </div>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <p className="text-xs text-gray-500">Loading communication logs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 font-bold text-gray-600">Date & Time</th>
                    <th className="p-3 font-bold text-gray-600">Subject</th>
                    <th className="p-3 font-bold text-gray-600">Recipients</th>
                    <th className="p-3 font-bold text-gray-600">Sent By</th>
                    <th className="p-3 font-bold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyLogs.map((log) => {
                    const recipientList = Array.isArray(log.recipients) ? log.recipients : [];
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="p-3 text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 font-semibold text-gray-900">{log.subject}</td>
                        <td className="p-3 text-gray-700">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            {log.recipient_count || recipientList.length} recipient(s)
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-600">{log.sent_by_name || 'Admin'}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewHistoryItem(log)}
                            className="h-7 text-xs text-primary hover:bg-primary/10"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View Email
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {historyLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                        No past email communications recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pre-Dispatch Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Confirm Email Dispatch
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-gray-600 space-y-2">
              Are you sure you want to send this email to{' '}
              <strong className="text-gray-900">{selectedClientsList.length} client organization(s)</strong> targeting{' '}
              <strong className="text-primary font-bold">{selectedClientsList.reduce((acc, c) => acc + getClientContactsCsv(c).count, 0)} contact email recipient(s)</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 border-y space-y-2.5 text-xs">
            <div>
              <span className="font-semibold text-gray-500 block">Subject:</span>
              <span className="font-bold text-gray-900">{subject}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block">Selected Clients & Contact Email Recipients:</span>
              <div className="max-h-40 overflow-y-auto space-y-2 pt-1.5">
                {selectedClientsList.map((c) => {
                  const { namesCsv, emailsCsv, count } = getClientContactsCsv(c);
                  const hasEmails = count > 0;
                  return (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded-xl text-xs space-y-1 border ${
                        hasEmails ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-red-50 border-red-200 text-red-700 font-bold'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 flex items-center gap-1">
                          {!hasEmails && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          • {c.client_name}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${hasEmails ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-700'}`}>
                          {hasEmails ? `${count} Email(s)` : 'No Emails'}
                        </span>
                      </div>
                      {hasEmails ? (
                        <>
                          <div className="text-[11px] text-gray-600"><strong className="text-gray-700">Contacts:</strong> {namesCsv}</div>
                          <div className="text-[11px] text-primary/90 font-mono"><strong className="text-gray-700 font-sans">Emails CSV:</strong> {emailsCsv}</div>
                        </>
                      ) : (
                        <div className="text-[11px] text-red-600">⚠️ No email addresses configured for client contacts</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSend}
              disabled={sending}
              className="bg-primary hover:bg-primary-dark text-white"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Confirm & Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert Image URL Dialog */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <ImageIcon className="w-5 h-5 text-primary" /> Insert Image URL
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Label className="text-xs font-semibold text-gray-700">Image Web Address (URL)</Label>
            <Input
              type="url"
              placeholder="https://example.com/logo.png"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="h-10 text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertUrlImage} className="bg-primary text-white">
              Insert Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Email History Item Dialog */}
      <Dialog open={!!viewHistoryItem} onOpenChange={() => setViewHistoryItem(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          {viewHistoryItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-gray-900">
                  {viewHistoryItem.subject}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Dispatched on {new Date(viewHistoryItem.created_at).toLocaleString()} by {viewHistoryItem.sent_by_name || 'Admin'}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 border-y space-y-3">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Recipients ({viewHistoryItem.recipient_count || 0}):</span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {Array.isArray(viewHistoryItem.recipients) &&
                      viewHistoryItem.recipients.map((r, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-gray-50">
                          {r.name || r.client_name} &lt;{r.email}&gt;
                        </Badge>
                      ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Message Body:</span>
                  <div
                    className="p-4 border rounded-xl bg-gray-50/50 text-sm prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: viewHistoryItem.body_html }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewHistoryItem(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Email Template Dialog */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-base font-bold">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {editingTemplate ? 'Edit Email Template' : 'Add New Email Template'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Create or modify reusable email templates for client dispatches. You can include dynamic tags like <code className="text-primary font-mono text-[11px] font-bold">&#123;&#123;client_name&#125;&#125;</code> and <code className="text-primary font-mono text-[11px] font-bold">&#123;&#123;contact_person&#125;&#125;</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Template Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g., Annual Calibration Notice"
                value={templateForm.name}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Default Subject Line <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g., Annual Calibration Notice - {{client_name}}"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, subject: e.target.value }))}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Template Body HTML Content
              </Label>
              <textarea
                rows={7}
                placeholder="Enter template HTML or text message body..."
                value={templateForm.body}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, body: e.target.value }))}
                className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setTemplateModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              className="bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold"
            >
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation Dialog */}
      <AlertDialog
        open={deleteTemplateDialog.isOpen}
        onOpenChange={(open) => setDeleteTemplateDialog((prev) => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2 text-base font-bold">
              <Trash2 className="w-5 h-5 text-red-500" /> Delete Email Template?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              Are you sure you want to delete the email template <strong>"{deleteTemplateDialog.name}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTemplate}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEmailManager;
