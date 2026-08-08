import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { DEPARTMENTS, ROLES, TICKET_STATUSES } from '@/data/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapUnderline from '@tiptap/extension-underline';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Plus,
  Search,
  Filter,
  MessageSquare,
  Paperclip,
  Download,
  Calendar,
  User,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  X,
  FileText,
  AlertCircle,
  SortAsc,
  SortDesc,
  ExternalLink,
  ArrowLeft,
  Trash2,
  Pencil,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  History,
  Eye,
  ChevronDown,
} from 'lucide-react';

const RichTextEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit, TiptapUnderline],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'tiptap focus:outline-none min-h-[140px] max-h-[300px] overflow-y-auto px-3.5 py-2.5',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-200 bg-white text-gray-800 dark:text-gray-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-gray-50 border-b border-gray-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${editor.isActive('bold') ? 'bg-gray-250 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100'}`}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${editor.isActive('italic') ? 'bg-gray-250 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100'}`}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${editor.isActive('underline') ? 'bg-gray-250 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100'}`}
        >
          <Underline className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${editor.isActive('bulletList') ? 'bg-gray-250 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100'}`}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${editor.isActive('orderedList') ? 'bg-gray-250 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100'}`}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

const DEFAULT_STATUS_FILTER_VALUES = [
  TICKET_STATUSES.OPEN,
  TICKET_STATUSES.IN_PROGRESS,
  TICKET_STATUSES.NEED_MORE_DETAILS,
  TICKET_STATUSES.NEEDS_VERIFICATION,
  TICKET_STATUSES.INVALID_REQUIREMENT,
  TICKET_STATUSES.VERIFIED,
  TICKET_STATUSES.DEFERRED,
];

const StatusMultiSelect = ({ selected, onChange }) => {
  const statuses = Object.values(TICKET_STATUSES);

  const toggleStatus = (status) => {
    if (selected.includes(status)) {
      onChange(selected.filter((s) => s !== status));
    } else {
      onChange([...selected, status]);
    }
  };

  const selectAll = () => {
    onChange(statuses);
  };

  const selectNone = () => {
    onChange([]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full min-h-[40px] px-3 py-1.5 text-sm bg-gray-50 border border-transparent hover:border-gray-200 rounded-xl flex items-center justify-between text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <div className="flex flex-wrap gap-1 items-center max-w-[90%]">
            {selected.length === 0 ? (
              <span className="text-gray-400 font-semibold">Select Statuses</span>
            ) : selected.length === statuses.length ? (
              <span className="text-gray-700 dark:text-gray-300 font-semibold">All Statuses</span>
            ) : (
              selected.map((status) => (
                <Badge
                  key={status}
                  variant="secondary"
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-200/65 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-none flex items-center gap-1"
                >
                  {status}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(status);
                    }}
                    className="hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 shadow-xl rounded-2xl" align="start">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100 dark:border-slate-800 mb-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Statuses</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="text-[10px] font-bold text-gray-400 hover:text-red-500 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="space-y-0.5">
          {statuses.map((status) => {
            const isChecked = selected.includes(status);
            return (
              <div
                key={status}
                onClick={() => toggleStatus(status)}
                className="flex items-center gap-2.5 px-2 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => { }}
                  className="pointer-events-none rounded-md border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function AdminTicketsManager({ id: propId }) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id: paramId } = useParams();

  // Use propId if passed, fallback to route param ID
  const ticketIdParam = propId || paramId;

  // DB States
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [schemaError, setSchemaError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Single Ticket Edit/Detail States
  const [ticketDetails, setTicketDetails] = useState(null);
  const [loadingTicketDetails, setLoadingTicketDetails] = useState(false);
  const [editTicketForm, setEditTicketForm] = useState({
    title: '',
    description: '',
    department: '',
    priority: 'medium',
    status: TICKET_STATUSES.OPEN,
  });
  const [editTicketAttachments, setEditTicketAttachments] = useState([]);
  const [newEditAttachments, setNewEditAttachments] = useState([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [ticketHistory, setTicketHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // New Ticket Form States (for full page create)
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    department: DEPARTMENTS[0]?.name || '',
    priority: 'medium',
  });
  const [ticketAttachments, setTicketAttachments] = useState([]);

  // Comment States
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingComment, setEditingComment] = useState(null); // comment id being edited
  const [editCommentValue, setEditCommentValue] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  // Search / Filter / Sort / Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER_VALUES);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [reportedByFilter, setReportedByFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState('custom');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Inline editing states for Ticket Detail page
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');

  // Drag-over states for the three attachment drop zones
  const [dragOverCreate, setDragOverCreate] = useState(false);
  const [dragOverDetail, setDragOverDetail] = useState(false);
  const [dragOverComment, setDragOverComment] = useState(false);

  // ───────────────────────────── Data Fetching ──────────────────────────────

  const fetchTickets = async () => {
    setLoadingTickets(true);
    setSchemaError(false);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, creator:users!created_by(full_name, role, username)')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setSchemaError(true);
        } else {
          throw error;
        }
      } else {
        setTickets(data || []);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      toast({ title: 'Error Fetching Tickets', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchTicketDetails = async (tId) => {
    setLoadingTicketDetails(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, creator:users!created_by(full_name, role, username)')
        .eq('id', tId)
        .single();

      if (error) throw error;
      setTicketDetails(data);
      setEditTicketForm({
        title: data.title,
        description: data.description || '',
        department: data.department,
        priority: data.priority,
        status: data.status,
      });
      setEditTicketAttachments(parseAttachments(data.attachments));
      fetchComments(tId);
      fetchTicketHistory(tId);
    } catch (err) {
      console.error('Error fetching ticket details:', err);
      toast({ title: 'Error Loading Ticket', description: err.message, variant: 'destructive' });
      navigate('/settings/tickets');
    } finally {
      setLoadingTicketDetails(false);
    }
  };

  const fetchComments = async (tId) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*, author:users!author_id(full_name, role, username)')
        .eq('ticket_id', tId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      toast({ title: 'Error Fetching Comments', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchTicketHistory = async (tId) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('ticket_history')
        .select('*, user:users!user_id(full_name, role, username)')
        .eq('ticket_id', tId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not load history table:', error.message);
        setTicketHistory([]);
      } else {
        setTicketHistory(data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setTicketHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load ticket list or single ticket based on parameters
  useEffect(() => {
    if (ticketIdParam && ticketIdParam !== 'new') {
      fetchTicketDetails(ticketIdParam);
    } else {
      fetchTickets();
      setTicketDetails(null);
    }
  }, [ticketIdParam]);

  // Reset page on filter/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    priorityFilter,
    deptFilter,
    authorFilter,
    reportedByFilter,
    fromDate,
    toDate,
    sortField,
    sortOrder,
  ]);

  // Initializing inline edit values when details change
  useEffect(() => {
    if (ticketDetails) {
      setTitleValue(ticketDetails.title);
      setDescValue(ticketDetails.description || '');
    }
  }, [ticketDetails]);

  // ─────────────────────────── Schema Helpers ───────────────────────────────

  const handleRetrySchema = async () => {
    setRetrying(true);
    await fetchTickets();
    setRetrying(false);
  };

  const handleDeleteTicket = async () => {
    if (!ticketDetails) return;
    setDeletingTicket(true);
    try {
      // Gather all storage file paths: from ticket attachments and all comment attachments
      const allPaths = [];

      // Ticket-level attachments
      parseAttachments(ticketDetails.attachments).forEach((a) => {
        if (a.path) allPaths.push(a.path);
      });

      // Comment attachments — fetch them first
      const { data: commentRows } = await supabase
        .from('ticket_comments')
        .select('attachments')
        .eq('ticket_id', ticketDetails.id);

      (commentRows || []).forEach((row) => {
        parseAttachments(row.attachments).forEach((a) => {
          if (a.path) allPaths.push(a.path);
        });
      });

      // Delete all storage files (ignore errors — files may have already been deleted)
      if (allPaths.length > 0) {
        await supabase.storage.from('ticket-attachments').remove(allPaths);
      }

      // Delete the ticket row — cascade deletes ticket_comments and ticket_history via FK
      const { error } = await supabase.from('tickets').delete().eq('id', ticketDetails.id);
      if (error) throw error;

      toast({
        title: 'Ticket Deleted',
        description: `TKT-${ticketDetails.id} has been permanently deleted.`,
      });
      navigate('/settings/tickets');
    } catch (err) {
      toast({ title: 'Error Deleting Ticket', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingTicket(false);
      setShowDeleteConfirm(false);
    }
  };

  // ─────────────────────────── Attachment Helpers ───────────────────────────

  const handleAttachmentUpload = (e, targetSetter) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: `"${file.name}" exceeds the 8MB limit.`,
          variant: 'destructive',
        });
        return;
      }
      targetSetter((prev) => [
        ...prev,
        { name: file.name, size: file.size, type: file.type, fileObject: file },
      ]);
    });
    e.target.value = '';
  };

  const handleDrop = (e, targetSetter) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: `"${file.name}" exceeds the 8MB limit.`,
          variant: 'destructive',
        });
        return;
      }
      targetSetter((prev) => [
        ...prev,
        { name: file.name, size: file.size, type: file.type, fileObject: file },
      ]);
    });
  };

  const handleDownloadAttachment = (fileObj) => {
    const link = document.createElement('a');
    if (fileObj.url) {
      link.href = fileObj.url;
      link.target = '_blank';
    } else if (fileObj.content) {
      link.href = fileObj.content;
    } else return;
    link.download = fileObj.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─────────────────────────── CRUD Actions ─────────────────────────────────

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.title.trim()) return;
    setSubmittingTicket(true);
    try {
      const uploadedAttachments = [];
      for (const att of ticketAttachments) {
        if (att.fileObject) {
          const fileExt = att.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `tickets/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, att.fileObject);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(filePath);
          uploadedAttachments.push({
            name: att.name,
            size: att.size,
            type: att.type,
            path: filePath,
            url: urlData.publicUrl,
          });
        }
      }
      const { error } = await supabase.from('tickets').insert([
        {
          title: newTicket.title,
          description: newTicket.description,
          department: newTicket.department,
          priority: newTicket.priority,
          attachments: uploadedAttachments,
          created_by: user.id,
          status: TICKET_STATUSES.OPEN,
        },
      ]);
      if (error) throw error;
      toast({
        title: 'Ticket Created',
        description: 'Your ticket has been submitted successfully.',
      });
      setNewTicket({
        title: '',
        description: '',
        department: DEPARTMENTS[0]?.name || '',
        priority: 'medium',
      });
      setTicketAttachments([]);
      navigate('/settings/tickets');
    } catch (err) {
      toast({ title: 'Error Creating Ticket', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    if (!editTicketForm.title.trim()) return;
    setSubmittingEdit(true);
    try {
      const uploadedAttachments = [];
      for (const att of newEditAttachments) {
        if (att.fileObject) {
          const fileExt = att.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `tickets/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, att.fileObject);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(filePath);
          uploadedAttachments.push({
            name: att.name,
            size: att.size,
            type: att.type,
            path: filePath,
            url: urlData.publicUrl,
          });
        }
      }

      const finalAttachments = [...editTicketAttachments, ...uploadedAttachments];

      const { error } = await supabase
        .from('tickets')
        .update({
          title: editTicketForm.title,
          description: editTicketForm.description,
          department: editTicketForm.department,
          priority: editTicketForm.priority,
          status: editTicketForm.status,
          attachments: finalAttachments,
        })
        .eq('id', ticketIdParam);

      if (error) throw error;
      toast({ title: 'Ticket Updated', description: 'Changes saved successfully.' });
      setNewEditAttachments([]);
      fetchTicketDetails(ticketIdParam);
    } catch (err) {
      toast({ title: 'Error Updating Ticket', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && commentAttachments.length === 0) return;
    setSubmittingComment(true);
    try {
      const uploadedAttachments = [];
      for (const att of commentAttachments) {
        if (att.fileObject) {
          const fileExt = att.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `comments/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, att.fileObject);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(filePath);
          uploadedAttachments.push({
            name: att.name,
            size: att.size,
            type: att.type,
            path: filePath,
            url: urlData.publicUrl,
          });
        }
      }
      const { error } = await supabase.from('ticket_comments').insert([
        {
          ticket_id: ticketIdParam,
          author_id: user.id,
          comment: newComment,
          attachments: uploadedAttachments,
        },
      ]);
      if (error) throw error;
      setNewComment('');
      setCommentAttachments([]);
      fetchComments(ticketIdParam);
    } catch (err) {
      toast({ title: 'Error Adding Comment', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (comment) => {
    if (!editCommentValue.trim()) return;
    setSavingComment(true);
    try {
      const { error } = await supabase
        .from('ticket_comments')
        .update({ comment: editCommentValue })
        .eq('id', comment.id);
      if (error) throw error;

      // Log to history
      try {
        await supabase.from('ticket_history').insert({
          ticket_id: ticketDetails.id,
          user_id: user.id,
          field_name: 'comment',
          old_value: comment.comment,
          new_value: editCommentValue,
        });
      } catch (histErr) {
        console.warn('Could not insert history record:', histErr.message);
      }

      setEditingComment(null);
      setEditCommentValue('');
      fetchComments(ticketIdParam);
      fetchTicketHistory(ticketDetails.id);
    } catch (err) {
      toast({ title: 'Error Editing Comment', description: err.message, variant: 'destructive' });
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async (comment) => {
    try {
      // Delete storage files attached to this comment
      const paths = parseAttachments(comment.attachments).filter((a) => a.path).map((a) => a.path);
      if (paths.length > 0) {
        await supabase.storage.from('ticket-attachments').remove(paths);
      }

      const { error } = await supabase.from('ticket_comments').delete().eq('id', comment.id);
      if (error) throw error;

      // Log to history
      try {
        await supabase.from('ticket_history').insert({
          ticket_id: ticketDetails.id,
          user_id: user.id,
          field_name: 'comment_deleted',
          old_value: comment.comment,
          new_value: 'Comment deleted',
        });
      } catch (histErr) {
        console.warn('Could not insert history record:', histErr.message);
      }

      fetchComments(ticketIdParam);
      fetchTicketHistory(ticketDetails.id);
      toast({ title: 'Comment Deleted' });
    } catch (err) {
      toast({ title: 'Error Deleting Comment', description: err.message, variant: 'destructive' });
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!ticketDetails) return;
    try {
      const oldValue = ticketDetails.status;
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketDetails.id);
      if (error) throw error;

      if (oldValue !== newStatus) {
        try {
          await supabase.from('ticket_history').insert({
            ticket_id: ticketDetails.id,
            user_id: user.id,
            field_name: 'status',
            old_value: String(oldValue || ''),
            new_value: String(newStatus || ''),
          });
        } catch (histErr) {
          console.warn('Could not insert history record:', histErr.message);
        }
      }

      toast({ title: 'Status Updated', description: `Ticket status updated to "${newStatus}"` });
      fetchTicketDetails(ticketDetails.id);
    } catch (err) {
      toast({ title: 'Error Updating Status', description: err.message, variant: 'destructive' });
    }
  };

  // ─────────────────────────── Permissions ──────────────────────────────────

  const canUserChangeStatus = (ticket) => {
    if (!ticket) return false;
    if (isAdmin()) return true;
    return ticket.created_by === user.id;
  };

  const getAllowedStatuses = (ticket) => {
    if (!ticket) return [];
    if (isAdmin()) return Object.values(TICKET_STATUSES);
    if (ticket.created_by === user.id) return [
      TICKET_STATUSES.OPEN,
      TICKET_STATUSES.NEED_MORE_DETAILS,
      TICKET_STATUSES.NEEDS_VERIFICATION,
      TICKET_STATUSES.VERIFIED,
      TICKET_STATUSES.RESOLVED,
      TICKET_STATUSES.INVALID_REQUIREMENT,
    ];
    return [];
  };

  const canUserEditTicket = (ticket) => {
    if (!ticket) return false;
    return isAdmin() || ticket.created_by === user.id;
  };

  // ─────────────────────────── Filter / Sort / Paginate ─────────────────────

  const applyDatePreset = (preset) => {
    const now = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    let start = '',
      end = '';
    switch (preset) {
      case 'this_month':
        start = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
        end = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'last_month':
        start = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        end = fmt(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'this_year':
        start = fmt(new Date(now.getFullYear(), 0, 1));
        end = fmt(new Date(now.getFullYear(), 11, 31));
        break;
      case 'last_year':
        start = fmt(new Date(now.getFullYear() - 1, 0, 1));
        end = fmt(new Date(now.getFullYear() - 1, 11, 31));
        break;
      case 'ytd':
        start = fmt(new Date(now.getFullYear(), 0, 1));
        end = fmt(now);
        break;
      default:
        break;
    }
    setFromDate(start);
    setToDate(end);
    setDatePreset(preset);
  };

  const resetAll = () => {
    setSearchTerm('');
    setStatusFilter(DEFAULT_STATUS_FILTER_VALUES);
    setPriorityFilter('all');
    setDeptFilter('all');
    setAuthorFilter('all');
    setReportedByFilter('all');
    setFromDate('');
    setToDate('');
    setDatePreset('custom');
    setSortField('date');
    setSortOrder('desc');
    setCurrentPage(1);
    setShowFilters(false);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const q = searchTerm.toLowerCase();
    if (
      q &&
      !(
        ticket.title.toLowerCase().includes(q) ||
        (ticket.description || '').toLowerCase().includes(q) ||
        (ticket.creator?.full_name || '').toLowerCase().includes(q) ||
        ticket.department.toLowerCase().includes(q)
      )
    )
      return false;

    if (!statusFilter.includes(ticket.status)) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (deptFilter !== 'all' && ticket.department !== deptFilter) return false;
    if (authorFilter === 'me' && ticket.created_by !== user.id) return false;
    if (
      reportedByFilter !== 'all' &&
      (ticket.creator?.username || ticket.creator?.full_name) !== reportedByFilter
    )
      return false;

    if (fromDate || toDate) {
      const d = new Date(ticket.created_at);
      d.setHours(0, 0, 0, 0);
      if (fromDate) {
        const s = new Date(fromDate);
        s.setHours(0, 0, 0, 0);
        if (d < s) return false;
      }
      if (toDate) {
        const e = new Date(toDate);
        e.setHours(0, 0, 0, 0);
        if (d > e) return false;
      }
    }
    return true;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let valA, valB;
    switch (sortField) {
      case 'title':
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
        break;
      case 'status':
        valA = a.status.toLowerCase();
        valB = b.status.toLowerCase();
        break;
      case 'priority': {
        const ord = { high: 0, medium: 1, low: 2 };
        valA = ord[a.priority] ?? 9;
        valB = ord[b.priority] ?? 9;
        break;
      }
      case 'department':
        valA = a.department.toLowerCase();
        valB = b.department.toLowerCase();
        break;
      case 'author':
        valA = (a.creator?.full_name || '').toLowerCase();
        valB = (b.creator?.full_name || '').toLowerCase();
        break;
      case 'date':
      default:
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
        break;
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = sortedTickets.slice(startIndex, endIndex);

  // ─────────────────────────── Style Helpers ────────────────────────────────

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isImageFile = (file) => {
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    const ext = (file.name || '').split('.').pop().toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  };

  const parseAttachments = (attachments) => {
    if (!attachments) return [];
    if (Array.isArray(attachments)) return attachments;
    if (typeof attachments === 'string') {
      try {
        const parsed = JSON.parse(attachments);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case TICKET_STATUSES.OPEN:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case TICKET_STATUSES.IN_PROGRESS:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case TICKET_STATUSES.NEED_MORE_DETAILS:
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case TICKET_STATUSES.NEEDS_VERIFICATION:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case TICKET_STATUSES.VERIFIED:
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case TICKET_STATUSES.RESOLVED:
        return 'bg-green-50 text-green-700 border-green-200';
      case TICKET_STATUSES.INVALID_REQUIREMENT:
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case TICKET_STATUSES.CLOSED:
        return 'bg-slate-200 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const isStatusFilterActive = statusFilter.length !== DEFAULT_STATUS_FILTER_VALUES.length || !statusFilter.every(s => DEFAULT_STATUS_FILTER_VALUES.includes(s));

  const hasActiveFilters =
    fromDate ||
    toDate ||
    isStatusFilterActive ||
    priorityFilter !== 'all' ||
    deptFilter !== 'all' ||
    authorFilter !== 'all' ||
    reportedByFilter !== 'all';

  // ─────────────────────────── Schema Error Screen ──────────────────────────

  if (schemaError) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
            Ticketing Database Schema Required
          </h2>
          <p className="text-gray-500 font-medium max-w-lg mx-auto mb-8 text-sm leading-relaxed">
            The database tables <code>tickets</code>, <code>ticket_comments</code>, and{' '}
            <code>ticket_history</code> do not exist yet. Please run the SQL setup script located in{' '}
            <code>tickets-schema.sql</code> in the <strong>SQL Editor</strong> of your Supabase
            Console.
          </p>
          <Button
            onClick={handleRetrySchema}
            disabled={retrying}
            className="h-12 rounded-xl px-6 font-bold flex items-center gap-2 bg-primary text-white hover:bg-primary-dark mx-auto"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            I've run the SQL, Retry
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────── DEDICATED CREATE PAGE ────────────────────────

  if (ticketIdParam === 'new') {
    return (
      <div className="w-full py-8 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/settings/tickets')}
                className="h-10 w-10 text-gray-500 hover:text-gray-900 rounded-xl"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                  Create New Ticket
                </h1>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                  Log a new issue or request for LIMS
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings/tickets')}
              className="h-10 w-10 text-gray-400 hover:text-gray-900 rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Title
              </Label>
              <Input
                required
                placeholder="Brief summary of the issue or request..."
                value={newTicket.title}
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                className="border-gray-100 bg-gray-50/50 rounded-xl focus:bg-white text-sm font-semibold h-12"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Priority
              </Label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                className="w-full h-12 px-3 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="space-y-2 text-slate-800 dark:text-slate-200">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Description
              </Label>
              <RichTextEditor
                content={newTicket.description}
                onChange={(html) => setNewTicket({ ...newTicket, description: html })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between">
                <span>Attachments</span>
                <span className="text-[9px] text-gray-400">Max 8MB per file</span>
              </Label>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  id="ticket-file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAttachmentUpload(e, setTicketAttachments)}
                />
                <div
                  onClick={() => document.getElementById('ticket-file').click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCreate(true);
                  }}
                  onDragLeave={() => setDragOverCreate(false)}
                  onDrop={(e) => {
                    handleDrop(e, setTicketAttachments);
                    setDragOverCreate(false);
                  }}
                  className={`h-20 border-dashed border-2 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer font-bold transition-all text-xs select-none ${dragOverCreate
                    ? 'border-primary bg-primary/5 text-primary scale-[1.01]'
                    : 'border-gray-200 text-gray-500 hover:text-primary hover:border-primary/40 hover:bg-primary/5'
                    }`}
                >
                  <Paperclip
                    className={`w-4 h-4 ${dragOverCreate ? 'text-primary' : 'text-gray-400'}`}
                  />
                  <span>
                    {dragOverCreate ? 'Drop files here' : 'Drag & drop files or click to browse'}
                  </span>
                  <span className="text-[9px] font-normal text-gray-400">Max 8MB per file</span>
                </div>
                {ticketAttachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {ticketAttachments.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                      >
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[180px]">
                          {f.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-400">
                            {formatFileSize(f.size)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setTicketAttachments((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            className="text-gray-400 hover:text-red-500 p-0.5 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigate('/settings/tickets');
                  setTicketAttachments([]);
                }}
                className="flex-1 h-12 rounded-xl font-bold text-gray-600 hover:bg-gray-50 border-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingTicket}
                className="flex-1 h-12 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20"
              >
                {submittingTicket ? 'Creating...' : 'Submit Ticket'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────── DEDICATED DETAIL/EDIT PAGE ───────────────────

  const saveField = async (fieldName, value) => {
    try {
      const oldValue = ticketDetails?.[fieldName];
      const { error } = await supabase
        .from('tickets')
        .update({ [fieldName]: value })
        .eq('id', ticketDetails.id);
      if (error) throw error;

      if (oldValue !== value) {
        try {
          await supabase.from('ticket_history').insert({
            ticket_id: ticketDetails.id,
            user_id: user.id,
            field_name: fieldName,
            old_value: String(oldValue || ''),
            new_value: String(value || ''),
          });
        } catch (histErr) {
          console.warn('Could not insert history record:', histErr.message);
        }
      }

      toast({ title: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} updated` });
      fetchTicketDetails(ticketDetails.id);
    } catch (err) {
      toast({ title: 'Error saving changes', description: err.message, variant: 'destructive' });
    }
  };

  const handleImmediateUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = [];
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: `"${file.name}" exceeds the 8MB limit.`,
          variant: 'destructive',
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    try {
      setSubmittingEdit(true);
      const uploadedAttachments = [];
      for (const file of validFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `tickets/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(filePath);
        uploadedAttachments.push({
          name: file.name,
          size: file.size,
          type: file.type,
          path: filePath,
          url: urlData.publicUrl,
        });
      }

      const currentAttach = parseAttachments(ticketDetails.attachments);
      const finalAttachments = [...currentAttach, ...uploadedAttachments];
      const { error } = await supabase
        .from('tickets')
        .update({ attachments: finalAttachments })
        .eq('id', ticketDetails.id);

      if (error) throw error;

      // History log
      try {
        await supabase.from('ticket_history').insert({
          ticket_id: ticketDetails.id,
          user_id: user.id,
          field_name: 'attachments',
          old_value: `${currentAttach.length} files`,
          new_value: `${finalAttachments.length} files (Added ${uploadedAttachments.map((f) => f.name).join(', ')})`,
        });
      } catch (histErr) {
        console.warn('Could not insert history record:', histErr.message);
      }

      toast({ title: 'Attachments uploaded successfully' });
      fetchTicketDetails(ticketDetails.id);
    } catch (err) {
      toast({ title: 'Error uploading files', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingEdit(false);
      e.target.value = '';
    }
  };

  const handleImmediateDeleteAttachment = async (idxToDelete) => {
    try {
      const currentAttach = parseAttachments(ticketDetails.attachments);
      const deletedFile = currentAttach[idxToDelete];
      const remaining = currentAttach.filter((_, i) => i !== idxToDelete);
      const { error } = await supabase
        .from('tickets')
        .update({ attachments: remaining })
        .eq('id', ticketDetails.id);
      if (error) throw error;

      // History log
      try {
        await supabase.from('ticket_history').insert({
          ticket_id: ticketDetails.id,
          user_id: user.id,
          field_name: 'attachments',
          old_value: `${currentAttach.length} files`,
          new_value: `${remaining.length} files (Removed ${deletedFile?.name || 'file'})`,
        });
      } catch (histErr) {
        console.warn('Could not insert history record:', histErr.message);
      }

      toast({ title: 'Attachment removed' });
      fetchTicketDetails(ticketDetails.id);
    } catch (err) {
      toast({
        title: 'Error deleting attachment',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  if (ticketIdParam) {
    if (loadingTicketDetails) {
      return (
        <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-gray-500 text-sm font-semibold">Loading ticket details...</p>
        </div>
      );
    }

    if (!ticketDetails) return null;

    const editable = canUserEditTicket(ticketDetails);

    return (
      <div className="w-full py-6 px-6 bg-white border border-gray-100 shadow-sm rounded-3xl animate-in fade-in duration-300 font-sans text-slate-800 dark:text-slate-200 font-sans">
        {/* Header Breadcrumbs and Navigation */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className="hover:underline cursor-pointer"
              onClick={() => navigate('/settings/tickets')}
            >
              Tickets
            </span>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-300 font-semibold">
              TKT-{ticketDetails.id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings/tickets')}
              className="h-8 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Back to List
            </Button>
            {user?.role === ROLES.SUPER_ADMIN.slug && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deletingTicket}
                className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1 text-xs"
                title="Delete Ticket"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" /> Delete Ticket TKT-{ticketDetails.id}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                This action <strong>cannot be undone</strong>. Deleting this ticket will permanently
                remove:
                <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                  <li>The ticket and all its details</li>
                  <li>All comments and their attachments</li>
                  <li>All activity history records</li>
                  <li>All uploaded files from storage</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingTicket}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTicket}
                disabled={deletingTicket}
                className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
              >
                {deletingTicket ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Yes, Delete Permanently
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Title Heading Area */}
        <div className="mb-4">
          {editable ? (
            <div className="relative group">
              {editingTitle ? (
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={() => {
                    setEditingTitle(false);
                    if (titleValue.trim() && titleValue !== ticketDetails.title) {
                      saveField('title', titleValue);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                    if (e.key === 'Escape') {
                      setTitleValue(ticketDetails.title);
                      setEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="w-full text-2xl font-semibold text-slate-900 dark:text-slate-100 border border-blue-500 dark:border-blue-600 bg-white dark:bg-slate-950/60 rounded-xl px-3 py-1.5 outline-none ring-2 ring-blue-100 dark:ring-blue-900/30 transition-all font-sans"
                />
              ) : (
                <div
                  onClick={() => setEditingTitle(true)}
                  className="w-full text-2xl font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-3 py-1.5 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800 min-h-[44px] flex items-center"
                >
                  {ticketDetails.title}
                </div>
              )}
            </div>
          ) : (
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 px-3 py-1.5">
              {ticketDetails.title}
            </h1>
          )}
        </div>

        {/* Jira-style Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
          {/* Status Dropdown - Styled like Jira Status Badge */}
          {canUserChangeStatus(ticketDetails) ? (
            <div className="w-32 hidden">
              <Select value={ticketDetails.status} onValueChange={handleStatusChange}>
                <SelectTrigger
                  className={`h-8 w-full font-bold text-xs border-none rounded-lg text-white shadow-sm flex items-center justify-between px-3 py-1 cursor-pointer transition-colors ${ticketDetails.status === TICKET_STATUSES.OPEN
                    ? 'bg-[#0052CC] hover:bg-[#0040A3]'
                    : ticketDetails.status === TICKET_STATUSES.IN_PROGRESS
                      ? 'bg-[#FFAB00] text-slate-900 hover:bg-[#E69A00]'
                      : ticketDetails.status === TICKET_STATUSES.NEED_MORE_DETAILS
                        ? 'bg-[#E56A54] text-white hover:bg-[#D45943]'
                        : ticketDetails.status === TICKET_STATUSES.NEEDS_VERIFICATION
                          ? 'bg-[#00B8D9] text-white hover:bg-[#0097B2]'
                          : ticketDetails.status === TICKET_STATUSES.VERIFIED
                            ? 'bg-[#00875A] text-white hover:bg-[#006644]'
                            : ticketDetails.status === TICKET_STATUSES.RESOLVED
                              ? 'bg-[#36B37E] hover:bg-[#2A9162]'
                              : ticketDetails.status === TICKET_STATUSES.INVALID_REQUIREMENT
                                ? 'bg-[#FF5630] hover:bg-[#DE350B]'
                                : 'bg-[#5E6C84] hover:bg-[#4A5568]'
                    }`}
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {getAllowedStatuses(ticketDetails).map((st) => (
                    <SelectItem key={st} value={st} className="text-xs font-semibold">
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span
              className={`inline-flex items-center h-8 px-3 rounded-lg text-xs font-bold border text-white ${ticketDetails.status === TICKET_STATUSES.OPEN
                ? 'bg-[#0052CC] border-[#0052CC]'
                : ticketDetails.status === TICKET_STATUSES.IN_PROGRESS
                  ? 'bg-[#FFAB00] text-slate-900 border-[#FFAB00]'
                  : ticketDetails.status === TICKET_STATUSES.NEED_MORE_DETAILS
                    ? 'bg-[#E56A54] border-[#E56A54]'
                    : ticketDetails.status === TICKET_STATUSES.NEEDS_VERIFICATION
                      ? 'bg-[#00B8D9] border-[#00B8D9]'
                      : ticketDetails.status === TICKET_STATUSES.VERIFIED
                        ? 'bg-[#00875A] border-[#00875A]'
                        : ticketDetails.status === TICKET_STATUSES.RESOLVED
                          ? 'bg-[#36B37E] border-[#36B37E]'
                          : ticketDetails.status === TICKET_STATUSES.INVALID_REQUIREMENT
                            ? 'bg-[#FF5630] border-[#FF5630]'
                            : 'bg-[#5E6C84] border-[#5E6C84]'
                }`}
            >
              {ticketDetails.status}
            </span>
          )}



          {/* Priority Badge */}
          <span
            className={`hidden inline-flex items-center h-8 px-3 rounded-lg text-xs font-semibold capitalize border ${ticketDetails.priority === 'high'
              ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
              : ticketDetails.priority === 'medium'
                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
              }`}
          >
            Priority: {ticketDetails.priority}
          </span>
        </div>

        {/* Jira-style Split Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Main Issue Body */}
          <div className="lg:col-span-8 space-y-6">
            {/* Description Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Description</h3>
              {editable ? (
                <div>
                  {editingDesc ? (
                    <div className="space-y-2">
                      <RichTextEditor content={descValue} onChange={setDescValue} />
                      <div className="flex gap-2 justify-start">
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingDesc(false);
                            saveField('description', descValue);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-lg"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDescValue(ticketDetails.description || '');
                            setEditingDesc(false);
                          }}
                          className="h-8 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingDesc(true)}
                      className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed hover:bg-slate-50 dark:hover:bg-slate-800/40 p-3.5 rounded-xl border border-transparent hover:border-slate-250 dark:hover:border-slate-800 cursor-pointer min-h-[60px] transition-all"
                    >
                      {ticketDetails.description ? (
                        <div
                          className="rich-text-content"
                          dangerouslySetInnerHTML={{ __html: ticketDetails.description }}
                        />
                      ) : (
                        <em className="text-slate-400 font-normal">Click to add description...</em>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed p-3.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/60 min-h-[60px]">
                  {ticketDetails.description ? (
                    <div
                      className="rich-text-content"
                      dangerouslySetInnerHTML={{ __html: ticketDetails.description }}
                    />
                  ) : (
                    <em className="text-slate-400 font-normal">No description provided.</em>
                  )}
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-slate-500" /> Attachments
              </h3>

              {/* Browse File / Drag area */}
              {editable && (
                <div className="relative">
                  <input
                    type="file"
                    id="direct-ticket-file"
                    multiple
                    className="hidden"
                    onChange={handleImmediateUpload}
                  />
                  <div
                    onClick={() => document.getElementById('direct-ticket-file').click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDetail(true);
                    }}
                    onDragLeave={() => setDragOverDetail(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverDetail(false);
                      if (submittingEdit) return;
                      // For the detail page we immediately upload dropped files
                      const syntheticE = { target: { files: e.dataTransfer.files, value: '' } };
                      handleImmediateUpload(syntheticE);
                    }}
                    className={`h-20 border-dashed border-2 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-all ${dragOverDetail
                      ? 'border-primary bg-primary/5 text-primary scale-[1.01]'
                      : 'border-gray-200 text-gray-500 hover:border-primary hover:bg-primary/5 hover:text-primary'
                      }`}
                  >
                    <Paperclip
                      className={`w-5 h-5 mb-0.5 ${dragOverDetail ? 'text-primary' : 'text-slate-400'}`}
                    />
                    <span className="text-xs font-semibold">
                      {dragOverDetail ? (
                        'Drop to upload'
                      ) : (
                        <>
                          <strong className="text-blue-600">Browse</strong> or drag &amp; drop files
                        </>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Max 8MB per file</span>
                  </div>
                  {submittingEdit && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center rounded-xl">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Uploading file(s)...
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Attachment Grid list */}
              {parseAttachments(ticketDetails.attachments).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-1">
                  {parseAttachments(ticketDetails.attachments).map((file, idx) => (
                    <div
                      key={idx}
                      className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 flex flex-col group h-40 transition-shadow hover:shadow-sm"
                    >
                      {/* Top Preview Area */}
                      {isImageFile(file) ? (
                        <div
                          className="flex-1 w-full overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer"
                          onClick={() => window.open(file.url || file.content, '_blank')}
                        >
                          <img
                            src={file.url || file.content}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          />
                        </div>
                      ) : (
                        <div
                          className="flex-1 w-full overflow-hidden bg-gray-50 flex flex-col items-center justify-center cursor-pointer gap-1.5"
                          onClick={() => handleDownloadAttachment(file)}
                        >
                          <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {file.name.split('.').pop()} file
                          </span>
                        </div>
                      )}

                      {/* Bottom Info Bar */}
                      <div className="bg-white border-t border-gray-100 p-2.5 flex items-center justify-between gap-1.5 shrink-0">
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title={file.name}
                            onClick={() =>
                              isImageFile(file)
                                ? window.open(file.url || file.content, '_blank')
                                : handleDownloadAttachment(file)
                            }
                          >
                            {file.name}
                          </p>
                          <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(file)}
                            className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {editable && (
                            <button
                              type="button"
                              onClick={() => handleImmediateDeleteAttachment(idx)}
                              className="p-1 text-slate-500 hover:text-red-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !editable && (
                  <p className="text-xs text-slate-400 italic">
                    No attachments linked to this ticket.
                  </p>
                )
              )}
            </div>

            {/* Comments / History Tabs Feed */}
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('comments')}
                  className={`text-xs font-bold uppercase tracking-wider pb-2 transition-colors border-b-2 -mb-2.5 px-1 ${activeTab === 'comments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                  Comments ({comments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`text-xs font-bold uppercase tracking-wider pb-2 transition-colors border-b-2 -mb-2.5 px-1 ${activeTab === 'history'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                  History ({ticketHistory.length})
                </button>
              </div>

              {activeTab === 'comments' ? (
                <>
                  {/* Feed List */}
                  <div className="space-y-4 pr-1">
                    {loadingComments ? (
                      <div className="flex items-center justify-center py-6 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                        <span className="text-xs">Loading comments...</span>
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No comments yet. Start the conversation below!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex gap-3 items-start text-xs group/comment"
                        >
                          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold uppercase flex items-center justify-center shrink-0 text-xs border border-gray-200">
                            {(comment.author?.full_name || 'U').substring(0, 2)}
                          </div>

                          <div className="flex-1 bg-gray-50 border border-gray-200 p-3.5 rounded-2xl min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {comment.author?.full_name || 'User'}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400">
                                  {new Date(comment.created_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {/* Edit / Delete actions — shown on hover */}
                                {editingComment !== comment.id && (
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity ml-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingComment(comment.id);
                                        setEditCommentValue(comment.comment);
                                      }}
                                      className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                      title="Edit comment"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(comment)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                      title="Delete comment"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Inline edit mode vs read mode */}
                            {editingComment === comment.id ? (
                              <div className="space-y-2 mt-1">
                                <Textarea
                                  value={editCommentValue}
                                  onChange={(e) => setEditCommentValue(e.target.value)}
                                  className="min-h-[70px] w-full border border-gray-200 rounded-xl bg-white text-gray-800 dark:text-gray-200 text-xs p-2.5 resize-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={savingComment}
                                    onClick={() => handleEditComment(comment)}
                                    className="h-7 text-[10px] px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                                  >
                                    {savingComment ? (
                                      <>
                                        <RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin" />{' '}
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-2.5 h-2.5 mr-1" /> Save
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingComment(null);
                                      setEditCommentValue('');
                                    }}
                                    className="h-7 text-[10px] px-3 text-slate-500 font-bold rounded-lg"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {comment.comment}
                              </p>
                            )}

                            {parseAttachments(comment.attachments).length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                                {parseAttachments(comment.attachments).map((file, idx) => (
                                  <div
                                    key={idx}
                                    className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 flex flex-col group h-28 transition-shadow hover:shadow-sm"
                                  >
                                    {/* Top Preview Area */}
                                    {isImageFile(file) ? (
                                      <div
                                        className="flex-1 w-full overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer"
                                        onClick={() =>
                                          window.open(file.url || file.content, '_blank')
                                        }
                                      >
                                        <img
                                          src={file.url || file.content}
                                          alt={file.name}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        className="flex-1 w-full overflow-hidden bg-gray-50 flex flex-col items-center justify-center cursor-pointer gap-1"
                                        onClick={() => handleDownloadAttachment(file)}
                                      >
                                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                          {file.name.split('.').pop()} file
                                        </span>
                                      </div>
                                    )}

                                    {/* Bottom Info Bar */}
                                    <div className="bg-white border-t border-gray-100 p-2 flex items-center justify-between gap-1 shrink-0 text-[10px]">
                                      <div className="min-w-0 flex-1">
                                        <p
                                          className="font-bold text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                          title={file.name}
                                          onClick={() =>
                                            isImageFile(file)
                                              ? window.open(file.url || file.content, '_blank')
                                              : handleDownloadAttachment(file)
                                          }
                                        >
                                          {file.name}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadAttachment(file)}
                                          className="p-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                          title="Download"
                                        >
                                          <Download className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input block */}
                  <form onSubmit={handleAddComment} className="flex gap-3 pt-2 items-start">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold uppercase flex items-center justify-center shrink-0 text-xs">
                      {(user?.fullName || 'Me').substring(0, 2)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div
                        className="relative"
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverComment(true);
                        }}
                        onDragLeave={(e) => {
                          // Only clear if leaving the wrapper entirely (not a child)
                          if (!e.currentTarget.contains(e.relatedTarget)) setDragOverComment(false);
                        }}
                        onDrop={(e) => {
                          handleDrop(e, setCommentAttachments);
                          setDragOverComment(false);
                        }}
                      >
                        <Textarea
                          placeholder={
                            dragOverComment ? 'Drop files to attach...' : 'Add a comment...'
                          }
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className={`min-h-[85px] w-full border rounded-xl bg-white text-gray-800 dark:text-gray-200 text-xs p-3 resize-none outline-none transition-all ${dragOverComment
                            ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30 bg-blue-50/40'
                            : 'border-gray-200 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30'
                            }`}
                        />
                        {dragOverComment && (
                          <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                            <Paperclip className="w-5 h-5 text-blue-500" />
                            <span className="text-xs font-bold text-blue-600">
                              Drop files to attach
                            </span>
                          </div>
                        )}
                      </div>
                      {commentAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {commentAttachments.map((f, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold"
                            >
                              <Paperclip className="w-2.5 h-2.5 text-slate-500" />
                              <span className="max-w-[120px] truncate">{f.name}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCommentAttachments((prev) =>
                                    prev.filter((_, idx) => idx !== i)
                                  )
                                }
                                className="text-slate-400 hover:text-slate-900 ml-1"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div>
                          <input
                            type="file"
                            id="comment-file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleAttachmentUpload(e, setCommentAttachments)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => document.getElementById('comment-file').click()}
                            className="h-8 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold flex items-center gap-1"
                          >
                            <Paperclip className="w-3.5 h-3.5" /> Attach files
                          </Button>
                        </div>
                        <Button
                          type="submit"
                          disabled={
                            submittingComment ||
                            (!newComment.trim() && commentAttachments.length === 0)
                          }
                          className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 rounded-lg"
                        >
                          {submittingComment ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                /* History List */
                <div className="space-y-4 pr-1 animate-in fade-in duration-150">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-6 text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                      <span className="text-xs">Loading activity history...</span>
                    </div>
                  ) : ticketHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No activity history logged yet.</p>
                  ) : (
                    ticketHistory.map((hist) => (
                      <div
                        key={hist.id}
                        onClick={() => setSelectedHistoryItem(hist)}
                        className="flex gap-3 items-start text-xs border-b border-gray-100/50 dark:border-gray-800/40 pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 p-2 -mx-2 rounded-xl transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold uppercase flex items-center justify-center shrink-0 text-xs border border-gray-200">
                          {(hist.user?.full_name || 'U').substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {hist.user?.full_name || 'User'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(hist.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                            Updated{' '}
                            <strong className="capitalize text-slate-900 dark:text-slate-100">
                              {hist.field_name}
                            </strong>
                            {hist.field_name !== 'description' &&
                              hist.field_name !== 'attachments' ? (
                              <>
                                {' from '}
                                <span className="font-semibold text-red-600 dark:text-red-400 line-through px-1">
                                  {hist.old_value || 'None'}
                                </span>
                                {' to '}
                                <span className="font-semibold text-green-600 dark:text-green-400 px-1">
                                  {hist.new_value || 'None'}
                                </span>
                              </>
                            ) : hist.field_name === 'attachments' ? (
                              <>
                                {': '}
                                <span className="font-semibold text-primary dark:text-primary-foreground">
                                  {hist.new_value}
                                </span>
                              </>
                            ) : (
                              <>{' (content edited)'}</>
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar (Details, People, Dates) */}
          <div className="lg:col-span-4 space-y-6 lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-6">
            {/* Details Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                Details
              </h4>

              <div className="grid grid-cols-3 gap-y-3.5 text-xs items-center">
                <span className="text-slate-500 dark:text-slate-400 font-semibold col-span-1">
                  Status
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-bold col-span-2 capitalize">
                  {editable ? (
                    <div className="w-full">
                      <Select
                        value={editTicketForm.status}
                        onValueChange={(val) => {
                          setEditTicketForm((prev) => ({ ...prev, status: val }));
                          saveField('status', val);
                        }}
                      >
                        <SelectTrigger className="w-full h-9 text-xs bg-white border-gray-200 rounded-lg">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(TICKET_STATUSES).map(
                            (st) => (
                              <SelectItem key={st} value={st} className="text-xs">
                                {st}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    ticketDetails.status
                  )}
                </span>


                <span className="text-slate-500 dark:text-slate-400 font-semibold col-span-1">
                  Priority
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-bold col-span-2 capitalize">
                  {editable ? (
                    <div className="w-full">
                      <Select
                        value={editTicketForm.priority}
                        onValueChange={(val) => {
                          setEditTicketForm((prev) => ({ ...prev, priority: val }));
                          saveField('priority', val);
                        }}
                      >
                        <SelectTrigger className="w-full h-9 text-xs bg-white border-gray-200 rounded-lg">
                          <SelectValue placeholder="Select Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low" className="text-xs">
                            Low
                          </SelectItem>
                          <SelectItem value="medium" className="text-xs">
                            Medium
                          </SelectItem>
                          <SelectItem value="high" className="text-xs">
                            High
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    ticketDetails.priority
                  )}
                </span>
              </div>
            </div>

            {/* People Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                People
              </h4>

              <div className="grid grid-cols-3 gap-y-3.5 text-xs items-center">
                <span className="text-slate-500 dark:text-slate-400 font-semibold col-span-1">
                  Reporter
                </span>
                <span className="col-span-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase">
                    {(ticketDetails.creator?.full_name || 'U').substring(0, 2)}
                  </div>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">
                    {ticketDetails.creator?.full_name || 'User'}
                  </span>
                </span>
              </div>
            </div>

            {/* Dates Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                Dates
              </h4>

              <div className="grid grid-cols-3 gap-y-3 text-xs items-center">
                <span className="text-slate-500 dark:text-slate-400 font-semibold col-span-1">
                  Created
                </span>
                <span
                  className="text-slate-800 dark:text-slate-200 font-medium col-span-2"
                  title={new Date(ticketDetails.created_at).toLocaleString()}
                >
                  {new Date(ticketDetails.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                <span className="text-slate-500 dark:text-slate-400 font-semibold col-span-1">
                  Updated
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-medium col-span-2">
                  {new Date(ticketDetails.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Dialog
          open={!!selectedHistoryItem}
          onOpenChange={(open) => !open && setSelectedHistoryItem(null)}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white dark:bg-card border border-gray-250 font-sans text-slate-850 dark:text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> Update History Details
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-450 dark:text-slate-400 mt-1">
                Field updated:{' '}
                <strong className="capitalize text-slate-800 dark:text-slate-200">
                  {selectedHistoryItem?.field_name}
                </strong>{' '}
                by {selectedHistoryItem?.user?.full_name || 'User'} on{' '}
                {selectedHistoryItem
                  ? new Date(selectedHistoryItem.created_at).toLocaleString()
                  : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-gray-150">
              {/* Old Value Card */}
              <div className="flex flex-col h-full bg-gray-50 border border-gray-200 rounded-xl overflow-hidden min-h-[220px]">
                <div className="bg-red-50/50 dark:bg-red-950/20 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" /> Previous Value
                  </span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {selectedHistoryItem?.field_name === 'description' ? (
                    selectedHistoryItem.old_value ? (
                      <div
                        className="rich-text-content font-semibold"
                        dangerouslySetInnerHTML={{ __html: selectedHistoryItem.old_value }}
                      />
                    ) : (
                      <em className="text-slate-400 italic">No previous description</em>
                    )
                  ) : (
                    <span className="font-semibold text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap">
                      {selectedHistoryItem?.old_value || 'None'}
                    </span>
                  )}
                </div>
              </div>

              {/* New Value Card */}
              <div className="flex flex-col h-full bg-gray-50 border border-gray-200 rounded-xl overflow-hidden min-h-[220px]">
                <div className="bg-green-50/50 dark:bg-green-950/20 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> New Value
                  </span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {selectedHistoryItem?.field_name === 'description' ? (
                    selectedHistoryItem.new_value ? (
                      <div
                        className="rich-text-content font-semibold"
                        dangerouslySetInnerHTML={{ __html: selectedHistoryItem.new_value }}
                      />
                    ) : (
                      <em className="text-slate-400 italic">No description provided</em>
                    )
                  ) : (
                    <span className="font-semibold text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap">
                      {selectedHistoryItem?.new_value || 'None'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─────────────────────────── MAIN TABLE LISTING ───────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Row 1: Search + Create ── */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by title, description, department or author..."
            className="pl-10 h-10 text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          onClick={() => navigate('/settings/tickets/new')}
          className="bg-primary hover:bg-primary-dark text-white h-10 px-6 rounded-xl shadow-sm text-sm font-semibold shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" /> Create Ticket
        </Button>
      </div>

      {/* ── Row 2: Filters toggle + Sort + Count ── */}
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
                {hasActiveFilters && (
                  <Badge className="ml-2 bg-primary text-white scale-75">!</Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-gray-800">
              <p className="text-xs">Show advanced filtering options</p>
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
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="author">Author</SelectItem>
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
            {sortedTickets.length === 0 ? 0 : startIndex + 1}–
            {Math.min(endIndex, sortedTickets.length)}
          </span>{' '}
          of <span className="text-primary">{sortedTickets.length}</span> Tickets
        </div>
      </div>

      {/* ── Advanced Filters Panel ── */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
              <Filter className="w-4 h-4 mr-2 text-primary" /> Advanced Filters
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
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Status
              </Label>
              <StatusMultiSelect selected={statusFilter} onChange={setStatusFilter} />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Priority
              </Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>



            {/* Scope */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Scope
              </Label>
              <Select value={authorFilter} onValueChange={setAuthorFilter}>
                <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                  <SelectValue placeholder="All Tickets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="me">Created By Me</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reported By */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Reported By
              </Label>
              <Select value={reportedByFilter} onValueChange={setReportedByFilter}>
                <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {Array.from(
                    new Map(
                      tickets
                        .filter((t) => t.creator)
                        .map((t) => [
                          t.creator.username || t.creator.full_name,
                          t.creator.full_name,
                        ])
                    ).entries()
                  ).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Date */}
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

            {/* From Date */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                From Date
              </Label>
              <AppDatePicker
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                To Date
              </Label>
              <AppDatePicker
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Pagination Controls — Top ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 px-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
            Items
          </span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(v) => {
              setItemsPerPage(Number(v));
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
            Showing {sortedTickets.length === 0 ? 0 : startIndex + 1}–
            {Math.min(endIndex, sortedTickets.length)} of {sortedTickets.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>

      {/* ── Tickets Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loadingTickets ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-gray-500 text-sm font-semibold">Loading tickets...</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    #
                  </th>
                  <th className="text-left py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                    Title
                  </th>
                  <th className="text-center py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Priority
                  </th>
                  <th className="text-center py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-left py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Author
                  </th>
                  <th className="text-left py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Created
                  </th>
                  <th className="text-center py-3 px-3 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-500">No tickets found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Try adjusting your filters or create a new ticket.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((ticket) => {
                    const dateStr = new Date(ticket.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    return (
                      <tr
                        key={ticket.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        {/* ID */}
                        <td className="py-4 px-3 align-top whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-gray-400">
                            #{ticket.id}
                          </span>
                        </td>

                        {/* Title + description snippet */}
                        <td className="py-4 px-3 align-top max-w-[260px]">
                          <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">
                            {ticket.title}
                          </p>
                          {ticket.description && (
                            <p className="hidden text-xs text-gray-400 mt-0.5 line-clamp-1">
                              {ticket.description}
                            </p>
                          )}
                          {parseAttachments(ticket.attachments).length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold mt-1">
                              <Paperclip className="w-3 h-3" />
                              {parseAttachments(ticket.attachments).length} file
                              {parseAttachments(ticket.attachments).length > 1 ? 's' : ''}
                            </span>
                          )}
                        </td>


                        {/* Priority */}
                        <td className="py-4 px-3 align-top text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize ${getPriorityStyle(ticket.priority)}`}
                          >
                            {ticket.priority}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-3 align-top text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusStyle(ticket.status)}`}
                          >
                            {ticket.status}
                          </span>
                        </td>

                        {/* Author */}
                        <td className="py-4 px-3 align-top whitespace-nowrap">
                          <span className="text-xs font-semibold text-gray-600">
                            {ticket.creator?.full_name || '—'}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-3 align-top whitespace-nowrap text-gray-500 text-xs font-semibold">
                          {dateStr}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-3 align-top">
                          <div className="flex justify-center items-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => navigate(`/settings/tickets/${ticket.id}`)}
                                >
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View / Edit Ticket</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Pagination Controls — Bottom ── */}
      {sortedTickets.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 px-4 rounded-xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
            Showing {startIndex + 1}–{Math.min(endIndex, sortedTickets.length)} of{' '}
            {sortedTickets.length} tickets
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-gray-200 bg-gray-50/50 rounded-lg disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
