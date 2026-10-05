import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  FileText,
  Printer,
  RotateCcw,
  User,
  Calendar,
  Building2,
  Calculator,
  IndianRupee,
  Clock,
  Sparkles,
  Banknote,
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

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const generateRefNo = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EDGE2/PAY/${year}/${rand}`;
};

// Calculate standard working days excluding Sundays
const calculateWorkingDaysInMonth = (monthIndex, yearNum) => {
  const m = parseInt(monthIndex, 10);
  const y = parseInt(yearNum, 10);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(y, m, day);
    if (date.getDay() !== 0) {
      count++;
    }
  }
  return count;
};

const PayslipGenerator = () => {
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

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const initialWorkingDays = calculateWorkingDaysInMonth(currentMonthIdx, currentYear);

  const initialForm = {
    selectedUserId: '',
    refNumber: generateRefNo(),
    issueDate: getTodayInputStr(),
    month: currentMonthIdx.toString(),
    year: currentYear.toString(),
    salutation: 'Mr.',
    employeeName: '',
    employeeId: '',
    designation: '',
    department: '',
    monthlySalary: '',
    totalWorkingDays: initialWorkingDays.toString(),
    daysWorked: initialWorkingDays.toString(),
    paymentDate: getTodayInputStr(),
    paymentMethod: 'Bank Transfer',
    status: 'Paid',
    notes: '',
    includeLetterhead: true,
  };

  const [formData, setFormData] = useState(initialForm);

  // Fetch employees for auto-fill dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await apiClient
          .from('users')
          .select('id, full_name, username, role, employee_id, departments, base_salary');
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

  // When month or year changes, update default total working days
  const handlePeriodChange = (field, val) => {
    setFormData((prev) => {
      const nextMonth = field === 'month' ? val : prev.month;
      const nextYear = field === 'year' ? val : prev.year;
      const days = calculateWorkingDaysInMonth(nextMonth, nextYear);
      return {
        ...prev,
        [field]: val,
        totalWorkingDays: days.toString(),
        daysWorked: days.toString(),
      };
    });
  };

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
        monthlySalary: selected.base_salary ? String(selected.base_salary) : prev.monthlySalary,
      }));
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payslip_${(formData.employeeName || 'Employee').replace(/\s+/g, '_')}_${MONTHS[parseInt(formData.month, 10)]}_${formData.year}`,
    pageStyle: A4_PRINT_PAGE_STYLE,
  });

  const handleReset = () => {
    const days = calculateWorkingDaysInMonth(currentMonthIdx, currentYear);
    setFormData({
      ...initialForm,
      totalWorkingDays: days.toString(),
      daysWorked: days.toString(),
      refNumber: generateRefNo(),
    });
    toast({
      title: 'Form Reset',
      description: 'Payslip generator form has been reset.',
    });
  };

  // Salary Pro-rata calculations based on days worked out of total working days
  const calculation = useMemo(() => {
    const rawSalary = parseFloat(String(formData.monthlySalary).replace(/,/g, '')) || 0;
    const totalDays = parseFloat(formData.totalWorkingDays) || 0;
    const workedDays = parseFloat(formData.daysWorked) || 0;

    let dailyWage = 0;
    let earnedGross = rawSalary;
    let deductionForAbsence = 0;
    const daysNotWorked = Math.max(0, totalDays - workedDays);

    if (totalDays > 0 && rawSalary > 0) {
      dailyWage = rawSalary / totalDays;
      earnedGross = Math.round(dailyWage * workedDays);
      deductionForAbsence = Math.max(0, rawSalary - earnedGross);
    }

    // Standard earnings breakdown matching earnedGross
    const basicPay = Math.round(earnedGross * 0.5);
    const hra = Math.round(earnedGross * 0.3);
    const specialAllowance = Math.max(0, earnedGross - basicPay - hra);

    return {
      rawSalary,
      totalDays,
      workedDays,
      daysNotWorked,
      dailyWage,
      earnedGross,
      deductionForAbsence,
      basicPay,
      hra,
      specialAllowance,
      netPay: earnedGross,
    };
  }, [formData.monthlySalary, formData.totalWorkingDays, formData.daysWorked]);

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Banknote className="w-5 h-5 text-primary" />
            </div>
            Payslip Generator
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Generate and export formal employee pay slips with attendance-based pro-rata salary calculation
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
              <User className="w-4 h-4 text-primary" /> Employee & Salary Details
            </h3>
          </div>

          {/* Quick autofill / select existing employee */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
              <span>Auto-Fill From Existing Employee (Optional)</span>
            </Label>
            <Select
              value={formData.selectedUserId}
              onValueChange={handleSelectUser}
            >
              <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs">
                <SelectValue placeholder="Select employee to auto-fill..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                <SelectItem value="manual" className="font-semibold text-gray-500">
                  -- Enter Manually --
                </SelectItem>
                {usersList.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.username} {u.employee_id ? `(${u.employee_id})` : ''} - {u.role || 'Staff'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pay Period & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Pay Month *
              </Label>
              <Select
                value={formData.month}
                onValueChange={(val) => handlePeriodChange('month', val)}
              >
                <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  {MONTHS.map((m, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Pay Year *
              </Label>
              <Select
                value={formData.year}
                onValueChange={(val) => handlePeriodChange('year', val)}
              >
                <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employee Name & Salutation */}
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
                Employee Full Name *
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
                placeholder="e.g. Civil Testing Lab"
                onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Designation / Role
            </Label>
            <Input
              value={formData.designation}
              placeholder="e.g. Senior Testing Engineer"
              onChange={(e) => setFormData((p) => ({ ...p, designation: e.target.value }))}
              className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
            />
          </div>

          {/* Attendance & Wage Calculation Section */}
          <div className="pt-2 border-t border-gray-100 space-y-4">
            <div className="text-[11px] font-black text-gray-900 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5 text-primary" /> Attendance & Salary Calculation
              </span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                Auto-calculated
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Base Monthly Salary (₹) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  min="0"
                  value={formData.monthlySalary}
                  placeholder="e.g. 30000"
                  onChange={(e) => setFormData((p) => ({ ...p, monthlySalary: e.target.value }))}
                  className="pl-7 h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Total Working Days (Company) *
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.totalWorkingDays}
                  placeholder="e.g. 26"
                  onChange={(e) => setFormData((p) => ({ ...p, totalWorkingDays: e.target.value }))}
                  className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Days Worked (Employee) *
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={formData.totalWorkingDays || 31}
                  value={formData.daysWorked}
                  placeholder="e.g. 24"
                  onChange={(e) => setFormData((p) => ({ ...p, daysWorked: e.target.value }))}
                  className="h-10 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs"
                />
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>Daily Wage Rate:</span>
                <span className="font-mono font-semibold text-gray-900">
                  ₹{calculation.dailyWage.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / day
                </span>
              </div>
              {calculation.daysNotWorked > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span>Deduction ({calculation.daysNotWorked} days absent):</span>
                  <span className="font-mono font-semibold">
                    - ₹{calculation.deductionForAbsence.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center font-bold">
                <span className="text-gray-900">Final Payable Salary:</span>
                <span className="font-mono text-emerald-600 text-sm">
                  ₹{calculation.earnedGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Payment & Status */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Payment Date
              </Label>
              <Input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData((p) => ({ ...p, paymentDate: e.target.value }))}
                className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-medium text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Payment Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData((p) => ({ ...p, status: val }))}
              >
                <SelectTrigger className="h-9 rounded-xl bg-gray-50/50 border-gray-200 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Processed">Processed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes / Remarks */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Remarks / Deductions Note
            </Label>
            <Textarea
              rows={2}
              value={formData.notes}
              placeholder="e.g. Pro-rata salary computed for 24 days worked out of 26 total working days."
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              className="rounded-xl bg-gray-50/50 border-gray-200 text-xs"
            />
          </div>

          {/* Letterhead toggle */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.includeLetterhead}
                onChange={(e) => setFormData((p) => ({ ...p, includeLetterhead: e.target.checked }))}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span>Include Company Letterhead Header</span>
            </label>
          </div>
        </div>

        {/* Right Section: Standard Documents A4 Print Preview */}
        <div className="xl:col-span-7 flex flex-col items-center">
          <div
            ref={previewWrapperRef}
            className="a4-preview-wrapper rounded-xl border border-gray-100 min-h-[600px] print-container shadow-inner w-full"
          >
            {/* Printable Root Container */}
            <div ref={printRef} id="printable-payslip-root">
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
                  {/* Watermark — matches NewQuotationPage & Relieving Letter standard */}
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

                  <div className="a4-page-content flex flex-col justify-between relative z-10">
                    <div>
                      {/* 1. Header — standardized layout from Relieving and Offer Letter generators */}
                      {formData.includeLetterhead ? (
                        <div className="flex justify-between items-start gap-2 border-b pb-4 mb-4 min-w-0 max-w-full overflow-hidden">
                          <div className="w-[35%] min-w-0 shrink">
                            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                              PAYSLIP
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

                      {/* 2. Employee Details Block — matches Relieving and Offer letters */}
                      <div
                        className="grid grid-cols-2 gap-4 mb-4 text-xs p-3.5 bg-white border border-gray-200 rounded-lg"
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

                      {/* Pay Details Matrix Bar */}
                      <div className="mb-4">
                        <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                          {/* Header Row */}
                          <div className="grid grid-cols-5 bg-gray-50 text-gray-700 font-bold text-[10px] text-center uppercase tracking-wider divide-x divide-gray-200 border-b border-gray-200 py-1.5">
                            <div>PAY PERIOD</div>
                            <div>PAY DATE</div>
                            <div>WORKING DAYS</div>
                            <div>DAYS WORKED</div>
                            <div>STATUS</div>
                          </div>
                          {/* Values Row */}
                          <div
                            className="grid grid-cols-5 text-center text-xs divide-x divide-gray-200 bg-white py-1.5"
                            style={{ backgroundColor: '#ffffff', color: '#111827' }}
                          >
                            <div className="font-semibold">
                              {MONTHS[parseInt(formData.month, 10)]} {formData.year}
                            </div>
                            <div className="font-medium">{formatDateDisplay(formData.paymentDate) || '-'}</div>
                            <div className="font-mono font-medium">{formData.totalWorkingDays} Days</div>
                            <div className="font-mono font-bold text-gray-900">{formData.daysWorked} Days</div>
                            <div className="font-bold text-emerald-700">{formData.status}</div>
                          </div>
                        </div>

                        <div className="mt-1.5 text-xs text-gray-600 flex items-center justify-between px-1">
                          <span>Payment Method: <strong className="text-gray-900">{formData.paymentMethod}</strong></span>
                          <span className="text-[11px] text-gray-500">Currency: <strong className="text-gray-700">INR (₹)</strong></span>
                        </div>
                      </div>

                      {/* 3. EARNINGS Section */}
                      <div className="mb-4">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#BFBFBF] text-gray-900 font-bold uppercase tracking-wider text-[11px]">
                              <th className="py-1.5 px-3 text-left w-2/5">EARNINGS</th>
                              <th className="py-1.5 px-3 text-center w-1/6">ATTENDANCE</th>
                              <th className="py-1.5 px-3 text-center w-1/6">RATE (₹/DAY)</th>
                              <th className="py-1.5 px-3 text-right w-1/6">CURRENT (₹)</th>
                              <th className="py-1.5 px-3 text-right w-1/6">EARNED (₹)</th>
                            </tr>
                          </thead>
                          <tbody
                            className="divide-y divide-gray-200 text-gray-800 bg-white"
                            style={{ backgroundColor: '#ffffff', color: '#111827' }}
                          >
                            <tr>
                              <td className="py-1.5 px-3 font-medium">Basic Pay</td>
                              <td className="py-1.5 px-3 text-center font-mono">
                                {formData.daysWorked} / {formData.totalWorkingDays} Days
                              </td>
                              <td className="py-1.5 px-3 text-center font-mono">
                                ₹{(calculation.dailyWage * 0.5).toFixed(2)}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-medium">
                                {Math.round(calculation.rawSalary * 0.5).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-semibold">
                                {calculation.basicPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-3 font-medium">House Rent Allowance (HRA)</td>
                              <td className="py-1.5 px-3 text-center font-mono">Pro-rata</td>
                              <td className="py-1.5 px-3 text-center font-mono">
                                ₹{(calculation.dailyWage * 0.3).toFixed(2)}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-medium">
                                {Math.round(calculation.rawSalary * 0.3).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-semibold">
                                {calculation.hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-3 font-medium">Special / Conveyance Allowance</td>
                              <td className="py-1.5 px-3 text-center font-mono">Pro-rata</td>
                              <td className="py-1.5 px-3 text-center font-mono">
                                ₹{(calculation.dailyWage * 0.2).toFixed(2)}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-medium">
                                {Math.max(0, calculation.rawSalary - Math.round(calculation.rawSalary * 0.5) - Math.round(calculation.rawSalary * 0.3)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-semibold">
                                {calculation.specialAllowance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                            {formData.notes && (
                              <tr className="bg-white" style={{ backgroundColor: '#ffffff' }}>
                                <td colSpan={5} className="py-1.5 px-3 text-[11px] text-gray-600 italic">
                                  Notes: {formData.notes}
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#BFBFBF] text-gray-900 font-bold uppercase tracking-wider text-xs">
                              <td colSpan={3} className="py-1.5 px-3 text-right font-extrabold">
                                GROSS EARNED
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-medium text-xs">
                                ₹{calculation.rawSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-black text-xs sm:text-sm">
                                ₹{calculation.earnedGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* 4. DEDUCTIONS Section */}
                      <div className="mb-4">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#BFBFBF] text-gray-900 font-bold uppercase tracking-wider text-[11px]">
                              <th className="py-1.5 px-3 text-left w-3/5">DEDUCTIONS & ADJUSTMENTS</th>
                              <th className="py-1.5 px-3 text-center w-1/5">ABSENCE DAYS</th>
                              <th className="py-1.5 px-3 text-right w-1/5">DEDUCTION (₹)</th>
                            </tr>
                          </thead>
                          <tbody
                            className="divide-y divide-gray-200 text-gray-800 bg-white"
                            style={{ backgroundColor: '#ffffff', color: '#111827' }}
                          >
                            <tr>
                              <td className="py-1.5 px-3 font-medium">Unpaid Leave / Days Not Worked</td>
                              <td className="py-1.5 px-3 text-center font-mono">
                                {calculation.daysNotWorked} Days
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-medium text-rose-600">
                                ₹{calculation.deductionForAbsence.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-3 font-medium">Provident Fund (PF)</td>
                              <td className="py-1.5 px-3 text-center">-</td>
                              <td className="py-1.5 px-3 text-right font-mono font-medium">0.00</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-3 font-medium">Professional Tax (PT)</td>
                              <td className="py-1.5 px-3 text-center">-</td>
                              <td className="py-1.5 px-3 text-right font-mono font-medium">0.00</td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#BFBFBF] text-gray-900 font-bold uppercase tracking-wider text-xs">
                              <td colSpan={2} className="py-1.5 px-3 text-right font-extrabold">
                                TOTAL DEDUCTIONS
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-black text-xs sm:text-sm">
                                ₹{calculation.deductionForAbsence.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* 5. NET PAY Highlight Bar */}
                      <div className="flex justify-end mb-4">
                        <div className="w-full sm:w-3/5 bg-[#A6A6A6] text-gray-900 font-extrabold flex justify-between items-center py-2 px-4 text-xs sm:text-sm tracking-wider uppercase shadow-sm">
                          <span className="font-black">NET SALARY PAYABLE</span>
                          <span className="font-mono font-black text-gray-950 text-base">
                            ₹{calculation.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 6. Footer Notes */}
                    <div className="text-center pt-3 border-t border-gray-200 space-y-0.5 text-xs text-gray-600 mt-auto">
                      <p className="font-semibold text-gray-800">
                        For any queries regarding salary or attendance, please contact the HR & Accounts Department:
                      </p>
                      <p className="font-medium text-gray-900">
                        {COMPANY_INFO.name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Email: {COMPANY_INFO.email} | Phone: {COMPANY_INFO.phone} | Website: {COMPANY_INFO.website}
                      </p>
                      <p className="text-[10px] text-gray-400 pt-0.5 italic">
                        This is a computer-generated pay slip and does not require a physical signature.
                      </p>
                    </div>

                    {/* 7. Page Footer — matches a4-page-footer in Relieving and Offer letters */}
                    <div className="a4-page-footer">
                      <span>{COMPANY_INFO.name}</span>
                      <span>
                        Payslip {formData.refNumber ? `(${formData.refNumber})` : ''} | Page 1 of 1
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

export default PayslipGenerator;
