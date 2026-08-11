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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EMAIL_TEMPLATES = [
  {
    id: 'report_notice',
    name: 'Test Report Released Notice',
    subject: 'Laboratory Test Report Available - {{client_name}}',
    body: `
      <h2>Laboratory Test Report Dispatch</h2>
      <p>Dear <strong>{{contact_person}}</strong>,</p>
      <p>We are pleased to inform you that the requested laboratory testing for your recent job sample has been completed and verified by our quality engineers.</p>
      <p>You can access your verified report directly through your client portal or by contacting your account representative.</p>
      <hr />
      <p>Best regards,<br /><strong>{{site_name}} Quality Laboratory Team</strong></p>
    `,
  },
  {
    id: 'work_order_update',
    name: 'Work Order & Sample Receipt Confirmation',
    subject: 'Work Order & Sample Receipt Confirmation - {{client_name}}',
    body: `
      <h2>Sample Reception & Work Order Confirmation</h2>
      <p>Dear <strong>{{contact_person}}</strong>,</p>
      <p>Thank you for choosing <strong>{{site_name}}</strong>. We have officially logged your work order and material samples into our LIMS testing workflow.</p>
      <p>Our technicians have begun sample preparation and testing per the required standards.</p>
      <hr />
      <p>Regards,<br /><strong>Material Receiving Department</strong></p>
    `,
  },
  {
    id: 'general_notice',
    name: 'General Communication Notice',
    subject: 'Important Update from {{site_name}}',
    body: `
      <h2>Important Customer Update</h2>
      <p>Dear Valued Partner,</p>
      <p>We are writing to share an important announcement regarding our laboratory operations and technical testing services.</p>
      <p>Please review the details below and reach out to our support team if you have any questions.</p>
      <hr />
      <p>Sincerely,<br /><strong>Management Team - {{site_name}}</strong></p>
    `,
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

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchClients();
    fetchHistory();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await apiClient
        .from('clients')
        .select('id, client_name, email, contact_person, client_address')
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
  const isAllSelected =
    clients.length > 0 && selectedClientIds.length === clients.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(clients.map((c) => String(c.id)));
    }
  };

  const handleToggleClient = (clientId) => {
    const idStr = String(clientId);
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
    return (
      c.client_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.contact_person?.toLowerCase().includes(term)
    );
  });

  const selectedClientsList = clients.filter((c) =>
    selectedClientIds.includes(String(c.id))
  );

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
      const recipientsData = selectedClientsList.map((c) => ({
        id: c.id,
        name: c.client_name,
        email: c.email || 'no-email@client.com',
      }));

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
        description: `Communication dispatched to ${recipientsData.length} client recipient(s).`,
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
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
                      className="w-full justify-between bg-gray-50/50 border-gray-200 text-left font-normal h-11 rounded-xl hover:bg-gray-50"
                    >
                      <span className="truncate text-xs text-gray-700">
                        {selectedClientsList.length === 0
                          ? 'Select client recipients...'
                          : `${selectedClientsList.length} client(s) selected`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-3 space-y-3" align="start">
                    {/* Search & Select All controls */}
                    <div className="flex items-center justify-between gap-2 border-b pb-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search client name or email..."
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

                    {/* Client Checklist */}
                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                      {filteredClients.map((client) => {
                        const idStr = String(client.id);
                        const isChecked = selectedClientIds.includes(idStr);
                        return (
                          <div
                            key={client.id}
                            onClick={() => handleToggleClient(client.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all ${
                              isChecked
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="flex flex-col truncate pr-2">
                              <span className="font-semibold text-gray-900 truncate">
                                {client.client_name}
                              </span>
                              <span className="text-[11px] text-gray-500 truncate">
                                {client.email || 'No email configured'}
                              </span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                isChecked
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

                {/* Recipient Tag Badges */}
                {selectedClientsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto">
                    {selectedClientsList.map((client) => (
                      <Badge
                        key={client.id}
                        variant="secondary"
                        className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        <span className="font-semibold">{client.client_name}</span>
                        {client.email && (
                          <span className="text-[10px] text-primary/70">
                            &lt;{client.email}&gt;
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(client.id)}
                          className="text-primary hover:text-red-600 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
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
                        title="Paragraph"
                        className="h-8 text-xs font-semibold text-gray-700 hover:bg-gray-200 px-1.5"
                      >
                        Paragraph
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
                        className="h-8 text-xs font-medium text-gray-600 hover:bg-gray-200"
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
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Preset Templates
              </h3>
              <div className="space-y-2">
                {EMAIL_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-primary/40 hover:bg-primary/5 transition-all space-y-1 group"
                  >
                    <span className="font-semibold text-xs text-gray-900 group-hover:text-primary transition-colors block">
                      {tmpl.name}
                    </span>
                    <span className="text-[11px] text-gray-400 block truncate">
                      {tmpl.subject}
                    </span>
                  </button>
                ))}
              </div>
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Confirm Email Dispatch
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-gray-600 space-y-2">
              Are you sure you want to send this email to{' '}
              <strong className="text-gray-900">{selectedClientsList.length} client recipient(s)</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 border-y space-y-2.5 text-xs">
            <div>
              <span className="font-semibold text-gray-500 block">Subject:</span>
              <span className="font-bold text-gray-900">{subject}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block">Recipients ({selectedClientsList.length}):</span>
              <div className="max-h-24 overflow-y-auto space-y-1 pt-1">
                {selectedClientsList.map((c) => (
                  <div key={c.id} className="text-gray-700 font-medium">
                    • {c.client_name} {c.email ? `<${c.email}>` : ''}
                  </div>
                ))}
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
    </div>
  );
};

export default AdminEmailManager;
