import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  FileText,
  Printer,
  RotateCcw,
  User,
  Calendar,
  Building2,
  Eye,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/lib/apiClient';
import { A4_PRINT_PAGE_STYLE } from '@/utils/a4PrintStyles';

const COMPANY_INFO = {
  name: 'EDGE2 Engineering Solutions India Pvt. Ltd.',
  addressLine1: 'Shivaganga Arcade, B35/130, 6th Cross, 6th Block,',
  addressLine2: 'Vishweshwaraiah Layout, Ullal Upanagar, Bangalore - 560056, Karnataka',
  phone: '09448377127 / 09880973810 / 080-50056086',
  email: 'info@edge2.in',
  website: 'https://edge2.in',
  gstin: '29AACCE1702A1ZD',
  pan: 'AACCE1702A',
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const getTodayInputStr = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const generateRefNo = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(100 + Math.random() * 900);
  return `EDGE2/HR/REL/${year}/${rand}`;
};

const RelievingLetterGenerator = () => {
  const { toast } = useToast();
  const printRef = useRef(null);
  const previewWrapperRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [usersList, setUsersList] = useState([]);

  // Responsive A4 preview scale: exactly mirrors NewQuotationPage in Documents
  useEffect(() => {
    const A4_NATIVE_WIDTH = 794; // 210mm at 96 DPI CSS pixels
    const SIDE_PADDING = 48; // combined horizontal padding of preview wrapper
    const recalcScale = () => {
      if (!previewWrapperRef.current) return;
      const available = previewWrapperRef.current.clientWidth - SIDE_PADDING;
      setPreviewScale(parseFloat(Math.min(1, Math.max(0.3, available / A4_NATIVE_WIDTH)).toFixed(4)));
    };
    recalcScale();
    const ro = new ResizeObserver(recalcScale);
    if (previewWrapperRef.current) ro.observe(previewWrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const initialForm = {
    selectedUserId: '',
    refNumber: generateRefNo(),
    issueDate: getTodayInputStr(),
    salutation: 'Mr.',
    employeeName: '',
    employeeId: '',
    designation: '',
    department: '',
    dateOfJoining: '',
    resignationDate: '',
    relievingDate: getTodayInputStr(),
    duesStatus: 'All organizational dues and accounts have been fully settled, and all company assets, documents, and credentials have been duly handed over.',
    conductNote:
      'During the tenure with us, his/her character, professional performance, and conduct were found to be exemplary and satisfactory. We thank him/her for the valuable contributions made to our organization and wish all the best in future professional endeavors.',
    signatoryName: 'Authorized Signatory',
    signatoryRole: 'Human Resources Department',
    includeLetterhead: true,
  };

  const [formData, setFormData] = useState(initialForm);

  // Fetch users for fast auto-fill
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await apiClient
          .from('users')
          .select('id, full_name, username, role, employee_id, departments');
        if (data) {
          const sorted = [...data].sort((a, b) =>
            (a.full_name || a.username || '').localeCompare(b.full_name || b.username || '')
          );
          setUsersList(sorted);
        }
      } catch (err) {
        console.error('Failed to fetch employee list:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleSelectUser = (userId) => {
    if (!userId || userId === 'manual') {
      setFormData((prev) => ({
        ...prev,
        selectedUserId: 'manual',
      }));
      return;
    }

    const selected = usersList.find((u) => u.id === userId);
    if (selected) {
      const dept = Array.isArray(selected.departments) && selected.departments.length > 0
        ? selected.departments.join(', ')
        : '';
      setFormData((prev) => ({
        ...prev,
        selectedUserId: userId,
        employeeName: selected.full_name || selected.username || '',
        employeeId: selected.employee_id || '',
        designation: selected.role || '',
        department: dept,
      }));
    }
  };

  const handleReset = () => {
    setFormData({
      ...initialForm,
      refNumber: generateRefNo(),
    });
    toast({
      title: 'Form Reset',
      description: 'Relieving letter fields have been reset.',
    });
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relieving_Letter_${(formData.employeeName || 'Employee').replace(/\s+/g, '_')}`,
    pageStyle: A4_PRINT_PAGE_STYLE,
  });

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            Relieving Letter Generator
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Generate and export formal employee relieving cum service certificates with the standard document layout
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="rounded-xl border-gray-200 hover:bg-gray-50 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md text-xs font-bold"
          >
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Section: Form Controls */}
        <div className="xl:col-span-5 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Employee Details
            </h3>
            {/* <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Step 1: Fill Info
            </span> */}
          </div>

          {/* Quick autofill from users */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
              <span>Auto-Fill From Staff Roster</span>
              {/* <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick fill
              </span> */}
            </Label>
            <Select
              value={formData.selectedUserId}
              onValueChange={handleSelectUser}
            >
              <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs">
                <SelectValue placeholder="Select an existing employee..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                <SelectItem value="manual" className="font-semibold text-gray-500">
                  -- Enter Manually / External Staff --
                </SelectItem>
                {usersList.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.username} {u.employee_id ? `(${u.employee_id})` : ''} - {u.role || 'Staff'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Salutation
              </Label>
              <Select
                value={formData.salutation}
                onValueChange={(val) => setFormData((p) => ({ ...p, salutation: val }))}
              >
                <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Ms.">Ms.</SelectItem>
                  <SelectItem value="Mrs.">Mrs.</SelectItem>
                  <SelectItem value="Dr.">Dr.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Full Name *
              </Label>
              <Input
                value={formData.employeeName}
                placeholder="e.g. Rahul Sharma"
                onChange={(e) => setFormData((p) => ({ ...p, employeeName: e.target.value }))}
                className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Employee ID
              </Label>
              <Input
                value={formData.employeeId}
                placeholder="e.g. EMP-104"
                onChange={(e) => setFormData((p) => ({ ...p, employeeId: e.target.value }))}
                className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Department
              </Label>
              <Input
                value={formData.department}
                placeholder="e.g. Soil & Civil Testing"
                onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Designation / Role *
            </Label>
            <Input
              value={formData.designation}
              placeholder="e.g. Senior Testing Engineer"
              onChange={(e) => setFormData((p) => ({ ...p, designation: e.target.value }))}
              className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
            />
          </div>

          {/* Key Dates */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Key Service Dates
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Date of Joining
                </Label>
                <Input
                  type="date"
                  value={formData.dateOfJoining}
                  onChange={(e) => setFormData((p) => ({ ...p, dateOfJoining: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Resignation Date
                </Label>
                <Input
                  type="date"
                  value={formData.resignationDate}
                  onChange={(e) => setFormData((p) => ({ ...p, resignationDate: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Relieving Date *
                </Label>
                <Input
                  type="date"
                  value={formData.relievingDate}
                  onChange={(e) => setFormData((p) => ({ ...p, relievingDate: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
                />
              </div>
            </div>
          </div>

          {/* Letter Meta & Statements */}
          <div className="pt-2 border-t border-gray-100 space-y-4">
            <div className="text-[11px] font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-primary" /> Letter Details & Statements
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Reference No.
                </Label>
                <Input
                  value={formData.refNumber}
                  onChange={(e) => setFormData((p) => ({ ...p, refNumber: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-mono font-bold text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Issue Date
                </Label>
                <Input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData((p) => ({ ...p, issueDate: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Clearance & Dues Clause
              </Label>
              <Textarea
                rows={2}
                value={formData.duesStatus}
                onChange={(e) => setFormData((p) => ({ ...p, duesStatus: e.target.value }))}
                className="rounded-xl bg-gray-50/50 border-gray-200 text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Conduct & Appraisal Statement
              </Label>
              <Textarea
                rows={3}
                value={formData.conductNote}
                onChange={(e) => setFormData((p) => ({ ...p, conductNote: e.target.value }))}
                className="rounded-xl bg-gray-50/50 border-gray-200 text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Signatory Name
                </Label>
                <Input
                  value={formData.signatoryName}
                  onChange={(e) => setFormData((p) => ({ ...p, signatoryName: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Signatory Title
                </Label>
                <Input
                  value={formData.signatoryRole}
                  onChange={(e) => setFormData((p) => ({ ...p, signatoryRole: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
                />
              </div>
            </div>

            {/* Layout Toggles */}
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includeLetterhead}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, includeLetterhead: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span>Include Company Letterhead Header</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Section: Standard Documents A4 Print Preview */}
        <div className="xl:col-span-7 flex flex-col items-center">
          {/* Right column header could go here */}

          {/* Standard Documents A4 Preview Shell */}
          <div
            ref={previewWrapperRef}
            className="a4-preview-wrapper rounded-xl border border-gray-100 min-h-[600px] print-container shadow-inner w-full"
          >
            {/* Printable Root Container */}
            <div ref={printRef} id="printable-relieving-root">
              <div
                className="a4-scale-wrapper mx-auto"
                style={{
                  width: `${794 * previewScale}px`,
                  height: `${1122.5 * previewScale}px`,
                  marginBottom: `${48 * previewScale}px`,
                }}
              >
                <div
                  className="a4-container"
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                    margin: 0,
                  }}
                >
                  {/* Watermark — matches NewQuotationPage standard */}
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{
                      transform: 'rotate(-55deg)',
                      zIndex: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '42pt',
                        fontWeight: 700,
                        color: 'rgba(0,0,0,0.02)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {COMPANY_INFO.name}
                    </span>
                  </div>

                  {/* A4 Page Content */}
                  <div className="a4-page-content flex flex-col justify-between relative z-10">
                    <div>
                      {/* 1. Header — standardized layout from NewQuotationPage */}
                      {formData.includeLetterhead ? (
                        <div className="flex justify-between items-start gap-2 border-b pb-4 mb-4 min-w-0 max-w-full overflow-hidden">
                          <div className="w-[35%] min-w-0 shrink">
                            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                              RELIEVING LETTER
                            </h3>
                            <p className="text-gray-500 mt-1 text-xs">
                              Ref: {formData.refNumber || 'Pending'}
                            </p>
                            <p className="text-gray-500 mt-1 text-xs">
                              Date: {formatDateDisplay(formData.issueDate)}
                            </p>
                          </div>

                          <div className="w-[65%] min-w-0 shrink flex items-center gap-2 text-right">
                            <div className="text-right min-w-0 flex-1">
                              <h2 className="font-bold text-sm sm:text-base text-gray-900">
                                {COMPANY_INFO.name}
                              </h2>
                              <p className="text-gray-600 text-[10.5px]">
                                {COMPANY_INFO.addressLine1}
                              </p>
                              <p className="text-gray-600 text-[10.5px]">
                                {COMPANY_INFO.addressLine2}
                              </p>
                              <p className="text-gray-600 text-[10.5px]">
                                <span className="font-bold">PAN:</span> {COMPANY_INFO.pan},{' '}
                                <span className="font-bold">GSTIN:</span> {COMPANY_INFO.gstin}
                              </p>
                              <p className="text-gray-600 text-[10.5px]">
                                <span className="font-bold">Phone:</span> {COMPANY_INFO.phone}
                              </p>
                              <p className="text-gray-600 text-[10.5px] flex justify-end gap-3">
                                <span>
                                  <span className="font-bold">Email:</span> {COMPANY_INFO.email}
                                </span>
                                <span>
                                  <span className="font-bold">Website:</span> {COMPANY_INFO.website}
                                </span>
                              </p>
                            </div>
                            <img
                              src={`${import.meta.env.BASE_URL}edge2-logo.png`}
                              alt="Company Logo"
                              className="w-16 h-16 object-contain flex-shrink-0"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="h-16 flex justify-between items-start text-xs text-gray-500 border-b pb-2 mb-4">
                          <span>Ref: {formData.refNumber}</span>
                          <span>Date: {formatDateDisplay(formData.issueDate)}</span>
                        </div>
                      )}

                      {/* 2. Employee Details Block — clean white background */}
                      <div
                        className="grid grid-cols-2 gap-4 mb-5 text-xs p-3.5 bg-white border border-gray-200 rounded-lg"
                        style={{ backgroundColor: '#ffffff', color: '#111827' }}
                      >
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                            Employee Details
                          </span>
                          <span className="font-bold text-gray-900 text-sm block mt-0.5">
                            {formData.salutation} {formData.employeeName || '[Employee Name]'}
                          </span>
                          {formData.employeeId && (
                            <span className="text-gray-600 block mt-0.5">
                              Emp ID: <span className="font-mono font-semibold text-gray-800">{formData.employeeId}</span>
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                            Designation & Department
                          </span>
                          <span className="font-semibold text-gray-900 text-sm block mt-0.5">
                            {formData.designation || '[Designation]'}
                          </span>
                          {formData.department && (
                            <span className="text-gray-600 block mt-0.5">
                              Dept: <span className="font-medium text-gray-800">{formData.department}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3. Certificate Heading */}
                      <div className="text-center my-6">
                        <span className="font-black text-sm tracking-widest uppercase border-b-2 border-gray-900 pb-0.5 text-gray-900">
                          TO WHOMSOEVER IT MAY CONCERN
                        </span>
                        <div className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                          Sub: Relieving Cum Service Certificate
                        </div>
                      </div>

                      {/* 4. Formal Letter Body */}
                      <div className="text-[12px] text-gray-800 leading-relaxed space-y-3.5 text-justify">
                        <p>
                          Dear <span className="font-bold">{formData.employeeName || 'Colleague'}</span>,
                        </p>

                        <p>
                          This has reference to your resignation letter{' '}
                          {formData.resignationDate ? (
                            <>tendered on <span className="font-bold">{formatDateDisplay(formData.resignationDate)}</span></>
                          ) : (
                            'submitted to the management'
                          )}
                          . We would like to confirm that your resignation has been accepted and you are officially relieved from the services and employment of <span className="font-bold text-gray-900">{COMPANY_INFO.name}</span> with effect from the close of business hours on{' '}
                          <span className="font-bold text-gray-900">
                            {formatDateDisplay(formData.relievingDate) || '[Relieving Date]'}
                          </span>
                          .
                        </p>

                        <p>
                          We confirm that you were associated with our organization as{' '}
                          <span className="font-bold text-gray-900">
                            {formData.designation || '[Designation]'}
                          </span>
                          {formData.department ? (
                            <> in the <span className="font-bold">{formData.department}</span> department</>
                          ) : ''}
                          {formData.dateOfJoining ? (
                            <>
                              {' '}from <span className="font-bold">{formatDateDisplay(formData.dateOfJoining)}</span> to{' '}
                              <span className="font-bold text-gray-900">
                                {formatDateDisplay(formData.relievingDate) || '[Relieving Date]'}
                              </span>
                            </>
                          ) : (
                            <>
                              {' '}up to{' '}
                              <span className="font-bold text-gray-900">
                                {formatDateDisplay(formData.relievingDate) || '[Relieving Date]'}
                              </span>
                            </>
                          )}
                          .
                        </p>

                        {formData.duesStatus && (
                          <p>
                            {formData.duesStatus}
                          </p>
                        )}

                        {formData.conductNote && (
                          <p>
                            {formData.conductNote}
                          </p>
                        )}
                      </div>

                      {/* 5. Signatory Block */}
                      <div className="mt-8 text-xs text-gray-800 space-y-1">
                        <p className="font-medium text-gray-600">Sincerely,</p>
                        <p className="font-bold text-gray-900 text-sm">
                          For {COMPANY_INFO.name}
                        </p>

                        <div className="h-16 flex items-end">
                          <div className="border-b border-dashed border-gray-400 w-48" />
                        </div>

                        <div className="pt-1">
                          <p className="font-bold text-gray-900 text-xs">
                            {formData.signatoryName || 'Authorized Signatory'}
                          </p>
                          <p className="text-[11px] text-gray-600">
                            {formData.signatoryRole || 'Human Resources Department'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 6. Page Footer — matches a4-page-footer in NewQuotationPage */}
                    <div className="a4-page-footer">
                      <span>{COMPANY_INFO.name}</span>
                      <span>
                        Relieving Letter {formData.refNumber ? `(${formData.refNumber})` : ''} | Page 1 of 1
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelievingLetterGenerator;
