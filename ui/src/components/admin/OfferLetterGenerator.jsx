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
  IndianRupee,
  Briefcase,
  Award,
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

const getFutureDateInputStr = (daysAhead = 15) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
};

const generateRefNo = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(100 + Math.random() * 900);
  return `EDGE2/HR/OFR/${year}/${rand}`;
};

const OfferLetterGenerator = () => {
  const { toast } = useToast();
  const printRef = useRef(null);
  const previewWrapperRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);

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
    refNumber: generateRefNo(),
    issueDate: getTodayInputStr(),
    salutation: 'Mr.',
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    candidateAddress: '',
    designation: 'Laboratory Testing Engineer',
    department: 'Civil Material Testing',
    employmentType: 'Full-Time, Permanent',
    joiningDate: getFutureDateInputStr(15),
    workLocation: 'Bangalore Central Laboratory',
    monthlySalary: '30,000',
    annualCtc: '3,60,000',
    probationPeriod: '3 Months',
    acceptanceDeadline: getFutureDateInputStr(7),
    reportingAuthority: 'Laboratory Technical Manager',
    signatoryName: 'Authorized Signatory',
    signatoryRole: 'Director & Head of Human Resources',
    includeLetterhead: true,
  };

  const [formData, setFormData] = useState(initialForm);

  const handleReset = () => {
    setFormData({
      ...initialForm,
      refNumber: generateRefNo(),
    });
    toast({
      title: 'Form Reset',
      description: 'Offer letter fields have been reset.',
    });
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Offer_Letter_${(formData.candidateName || 'Candidate').replace(/\s+/g, '_')}`,
    pageStyle: A4_PRINT_PAGE_STYLE,
  });

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Award className="w-5 h-5 text-primary" />
            </div>
            Offer Letter Generator
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Generate, customize, and export formal employment offer letters with the standard document layout
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
              <User className="w-4 h-4 text-primary" /> Candidate Details
            </h3>
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
                Candidate Name *
              </Label>
              <Input
                value={formData.candidateName}
                placeholder="e.g. Priya Venkatesh"
                onChange={(e) => setFormData((p) => ({ ...p, candidateName: e.target.value }))}
                className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Email Address
              </Label>
              <Input
                type="email"
                value={formData.candidateEmail}
                placeholder="e.g. priya.v@gmail.com"
                onChange={(e) => setFormData((p) => ({ ...p, candidateEmail: e.target.value }))}
                className="h-10 rounded-xl bg-gray-50/50 border-gray-200 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Phone Number
              </Label>
              <Input
                value={formData.candidatePhone}
                placeholder="e.g. +91 98765 43210"
                onChange={(e) => setFormData((p) => ({ ...p, candidatePhone: e.target.value }))}
                className="h-10 rounded-xl bg-gray-50/50 border-gray-200 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Address / City
            </Label>
            <Input
              value={formData.candidateAddress}
              placeholder="e.g. #14, 2nd Main, Vijayanagar, Bangalore - 560040"
              onChange={(e) => setFormData((p) => ({ ...p, candidateAddress: e.target.value }))}
              className="h-10 rounded-xl bg-gray-50/50 border-gray-200 text-xs"
            />
          </div>

          {/* Job Offer Terms */}
          <div className="pt-2 border-t border-gray-100 space-y-4">
            <div className="text-[11px] font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-primary" /> Designation & Role Terms
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Designation / Role *
                </Label>
                <Input
                  value={formData.designation}
                  placeholder="e.g. Testing Analyst"
                  onChange={(e) => setFormData((p) => ({ ...p, designation: e.target.value }))}
                  className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Department
                </Label>
                <Input
                  value={formData.department}
                  placeholder="e.g. Civil Testing"
                  onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                  className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Employment Type
                </Label>
                <Input
                  value={formData.employmentType}
                  placeholder="e.g. Full-Time, Permanent"
                  onChange={(e) => setFormData((p) => ({ ...p, employmentType: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Work Location
                </Label>
                <Input
                  value={formData.workLocation}
                  placeholder="e.g. Bangalore Main Lab"
                  onChange={(e) => setFormData((p) => ({ ...p, workLocation: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Monthly Gross (₹) *
                </Label>
                <Input
                  value={formData.monthlySalary}
                  placeholder="e.g. 35,000"
                  onChange={(e) => {
                    const val = e.target.value;
                    const num = parseFloat(val.replace(/,/g, ''));
                    setFormData((p) => ({
                      ...p,
                      monthlySalary: val,
                      annualCtc: !isNaN(num) ? (num * 12).toLocaleString('en-IN') : p.annualCtc,
                    }));
                  }}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-mono font-bold text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Annual CTC (₹)
                </Label>
                <Input
                  value={formData.annualCtc}
                  placeholder="e.g. 4,20,000"
                  onChange={(e) => setFormData((p) => ({ ...p, annualCtc: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-mono font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Date of Joining *
                </Label>
                <Input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData((p) => ({ ...p, joiningDate: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Probation Period
                </Label>
                <Input
                  value={formData.probationPeriod}
                  placeholder="e.g. 3 Months"
                  onChange={(e) => setFormData((p) => ({ ...p, probationPeriod: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Acceptance Due
                </Label>
                <Input
                  type="date"
                  value={formData.acceptanceDeadline}
                  onChange={(e) => setFormData((p) => ({ ...p, acceptanceDeadline: e.target.value }))}
                  className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
                />
              </div>
            </div>
          </div>

          {/* Letter Meta & Signatory */}
          <div className="pt-2 border-t border-gray-100 space-y-4">
            <div className="text-[11px] font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-primary" /> Reference & Signatory
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
          {/* <div className="w-full flex items-center justify-between mb-3 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-primary" /> Live Document Preview
            </span>
            <span className="text-[11px] text-gray-400">Standard A4 Layout (210mm × 297mm)</span>
          </div> */}

          {/* Standard Documents A4 Preview Shell */}
          <div
            ref={previewWrapperRef}
            className="a4-preview-wrapper rounded-xl border border-gray-100 min-h-[600px] print-container shadow-inner w-full"
          >
            {/* Printable Root Container */}
            <div ref={printRef} id="printable-offer-root">
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
                              OFFER LETTER
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

                      {/* 2. Candidate & Offer Details Box — clean white background */}
                      <div
                        className="grid grid-cols-2 gap-4 mb-4 text-xs p-3.5 bg-white border border-gray-200 rounded-lg"
                        style={{ backgroundColor: '#ffffff', color: '#111827' }}
                      >
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                            Candidate Details
                          </span>
                          <span className="font-bold text-gray-900 text-sm block mt-0.5">
                            {formData.salutation} {formData.candidateName || '[Candidate Full Name]'}
                          </span>
                          {formData.candidateAddress && (
                            <span className="text-gray-600 block mt-0.5 leading-snug">
                              {formData.candidateAddress}
                            </span>
                          )}
                          {(formData.candidatePhone || formData.candidateEmail) && (
                            <span className="text-gray-500 text-[11px] block mt-0.5">
                              {[formData.candidatePhone, formData.candidateEmail].filter(Boolean).join(' • ')}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                            Offered Role & Terms
                          </span>
                          <span className="font-bold text-gray-900 text-sm block mt-0.5">
                            {formData.designation || '[Designation]'}
                          </span>
                          {formData.department && (
                            <span className="text-gray-600 block mt-0.5">
                              Department: <span className="font-medium text-gray-800">{formData.department}</span>
                            </span>
                          )}
                          <span className="text-gray-600 block mt-0.5">
                            Joining Date: <span className="font-bold text-gray-900">{formatDateDisplay(formData.joiningDate) || '[Expected DOJ]'}</span>
                          </span>
                        </div>
                      </div>

                      {/* 3. Subject Heading */}
                      <div className="text-center my-4">
                        <span className="font-black text-sm tracking-widest uppercase border-b-2 border-gray-900 pb-0.5 text-gray-900">
                          OFFER OF EMPLOYMENT
                        </span>
                        <div className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                          Position: {formData.designation.toUpperCase()}
                        </div>
                      </div>

                      {/* 4. Formal Letter Body */}
                      <div className="text-[11.5px] text-gray-800 leading-relaxed space-y-2.5 text-justify">
                        <p>
                          Dear <span className="font-bold">{formData.candidateName || 'Candidate'}</span>,
                        </p>

                        <p>
                          Following your recent interview and discussions with our technical and management panel, we are pleased to offer you the position of{' '}
                          <span className="font-bold text-gray-900">{formData.designation || '[Designation]'}</span> with{' '}
                          <span className="font-bold text-gray-900">{COMPANY_INFO.name}</span>.
                        </p>

                        {/* Terms Summary Grid */}
                        <div
                          className="border border-gray-200 rounded-lg overflow-hidden my-3 text-xs"
                          style={{ backgroundColor: '#ffffff' }}
                        >
                          <div className="grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50 py-1.5 px-3 font-bold text-[10px] uppercase text-gray-600">
                            <div>Offer Parameter</div>
                            <div className="pl-3">Agreed Terms</div>
                          </div>
                          <div className="divide-y divide-gray-200">
                            <div className="grid grid-cols-2 divide-x divide-gray-200 py-1 px-3">
                              <span className="text-gray-600">Designation / Role:</span>
                              <span className="font-semibold text-gray-900 pl-3">{formData.designation}</span>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-gray-200 py-1 px-3">
                              <span className="text-gray-600">Department:</span>
                              <span className="font-semibold text-gray-900 pl-3">{formData.department}</span>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-gray-200 py-1 px-3">
                              <span className="text-gray-600">Employment Type:</span>
                              <span className="font-medium text-gray-900 pl-3">{formData.employmentType}</span>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-gray-200 py-1 px-3">
                              <span className="text-gray-600">Gross Monthly Remuneration:</span>
                              <span className="font-bold text-emerald-800 font-mono pl-3">₹{formData.monthlySalary}/- per month</span>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-gray-200 py-1 px-3">
                              <span className="text-gray-600">Annual Cost to Company (CTC):</span>
                              <span className="font-bold text-gray-900 font-mono pl-3">₹{formData.annualCtc}/- per annum</span>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-gray-200 py-1 px-3">
                              <span className="text-gray-600">Date of Joining:</span>
                              <span className="font-bold text-gray-900 pl-3">{formatDateDisplay(formData.joiningDate) || '[DOJ]'}</span>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-gray-200 py-1 px-3">
                              <span className="text-gray-600">Work Location:</span>
                              <span className="font-medium text-gray-900 pl-3">{formData.workLocation}</span>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-gray-200 py-1 px-3">
                              <span className="text-gray-600">Probation Period:</span>
                              <span className="font-medium text-gray-900 pl-3">{formData.probationPeriod}</span>
                            </div>
                          </div>
                        </div>

                        <p>
                          Your appointment will be governed by the standard service rules and code of conduct of the company. A formal Employment Agreement outlining detailed policies will be issued upon joining.
                        </p>

                        <p>
                          Please confirm your acceptance of this offer by signing the endorsement below and returning a scanned copy on or before{' '}
                          <span className="font-bold text-gray-900">{formatDateDisplay(formData.acceptanceDeadline) || '[Acceptance Deadline]'}</span>.
                        </p>
                      </div>

                      {/* 5. Dual Sign-off (Company & Candidate Acceptance) */}
                      <div className="grid grid-cols-2 gap-6 mt-6 pt-2 border-t border-gray-200 text-xs text-gray-800">
                        {/* Company Signature */}
                        <div>
                          <p className="font-medium text-gray-600">Sincerely,</p>
                          <p className="font-bold text-gray-900 text-xs">
                            For {COMPANY_INFO.name}
                          </p>
                          <div className="h-12 flex items-end">
                            <div className="border-b border-dashed border-gray-400 w-40" />
                          </div>
                          <div className="pt-1">
                            <p className="font-bold text-gray-900 text-xs">{formData.signatoryName}</p>
                            <p className="text-[10px] text-gray-600">{formData.signatoryRole}</p>
                          </div>
                        </div>

                        {/* Candidate Acceptance */}
                        <div
                          className="p-2.5 rounded-lg border border-gray-200 bg-white"
                          style={{ backgroundColor: '#ffffff', color: '#111827' }}
                        >
                          <p
                            className="font-bold text-gray-900 text-[11px] uppercase tracking-wider"
                            style={{ color: '#111827' }}
                          >
                            Candidate Acceptance
                          </p>
                          <p
                            className="text-[9.5px] text-gray-600 mt-0.5 leading-snug"
                            style={{ color: '#4b5563' }}
                          >
                            I accept the employment offer on the terms stated above and confirm joining on {formatDateDisplay(formData.joiningDate) || '[DOJ]'}.
                          </p>
                          <div className="h-9 flex items-end">
                            <div className="border-b border-dashed border-gray-400 w-36" style={{ borderColor: '#9ca3af' }} />
                          </div>
                          <div
                            className="pt-1 flex justify-between text-[10px] text-gray-600 font-medium"
                            style={{ color: '#4b5563' }}
                          >
                            <span>Signature</span>
                            <span>Date: ____________</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 6. Page Footer — matches a4-page-footer in NewQuotationPage */}
                    <div className="a4-page-footer mt-4">
                      <span>{COMPANY_INFO.name}</span>
                      <span>
                        Offer Letter {formData.refNumber ? `(${formData.refNumber})` : ''} | Page 1 of 1
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

export default OfferLetterGenerator;
