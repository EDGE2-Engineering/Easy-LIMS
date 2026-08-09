import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { useSettings } from '@/contexts/SettingsContext';
import {
  TrendingUp,
  IndianRupee,
  FileText,
  CalendarRange,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Chart from 'chart.js/auto';

// ── Reusable Chart Component ──────────────────────────────────────────────────
const InsightBarChart = ({ labels, data, title, color }) => {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: title,
            data: data,
            backgroundColor: color || 'rgba(99, 102, 241, 0.65)',
            borderColor: color ? color.replace('0.65', '1') : 'rgba(99, 102, 241, 1)',
            borderWidth: 1.5,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.raw || 0;
                return ` ₹${val.toLocaleString('en-IN')}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                size: 10,
                weight: '600',
              },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 10,
                weight: '500',
              },
              callback: (value) => {
                if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
                return `₹${value}`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [labels, data, title, color]);

  return (
    <div className="relative w-full h-[280px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const BusinessInsightsManager = () => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);

  // Raw data from DB
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);

  // Date & Client filters
  const now = new Date();
  const initialStart = `${now.getFullYear()}-01-01`;
  const initialEnd = `${now.getFullYear()}-12-31`;

  const [filterDateStart, setFilterDateStart] = useState(initialStart);
  const [filterDateEnd, setFilterDateEnd] = useState(initialEnd);
  const [datePreset, setDatePreset] = useState('this_year');
  const [filterClient, setFilterClient] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Settings for taxes
  const taxCGST = settings?.tax_cgst ? Number(settings.tax_cgst) : 9;
  const taxSGST = settings?.tax_sgst ? Number(settings.tax_sgst) : 9;
  const taxIGST = settings?.tax_igst ? Number(settings.tax_igst) : 18;
  const taxTotalPercent = taxCGST + taxSGST;

  // Calculate total amount for a document based on its items and tax settings
  const calculateDocTotal = (doc) => {
    try {
      const content = doc.content || {};
      const items = content.items || [];
      const discount = content.discount || 0;

      const isInterstate = content.isInterstate === true;
      const recordTaxTotal = isInterstate ? taxIGST : taxTotalPercent;

      const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      const discountedSubtotal = subtotal * (1 - discount / 100);
      const total = discountedSubtotal * (1 + recordTaxTotal / 100);

      return total;
    } catch (error) {
      console.error('Error calculating document total:', error);
      return 0;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, expensesRes, clientsRes] = await Promise.all([
        apiClient
          .from('documents')
          .select('document_type, created_at, content, client_id')
          .in('document_type', ['Tax Invoice', 'Quotation']),
        apiClient.from('expenses').select('date, amount'),
        apiClient.from('clients').select('id, client_name').order('client_name').limit(10000),
      ]);

      if (docsRes.error) throw docsRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (clientsRes.error) throw clientsRes.error;

      const allDocs = docsRes.data || [];
      setInvoices(allDocs.filter((d) => d.document_type === 'Tax Invoice'));
      setQuotations(allDocs.filter((d) => d.document_type === 'Quotation'));
      setExpenses(expensesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error('Error loading Business Insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick Date presets
  const applyDatePreset = (preset) => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = '';
    let end = '';

    const formatDate = (date) => date.toISOString().split('T')[0];

    switch (preset) {
      case 'this_week': {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(diff);
        start = formatDate(startOfWeek);
        end = formatDate(today);
        break;
      }
      case 'last_week': {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(diff - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekStart.getDate() - 6);
        start = formatDate(lastWeekStart);
        end = formatDate(lastWeekEnd);
        break;
      }
      case 'this_month':
        start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'last_month':
        start = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'last_3_months':
        start = formatDate(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()));
        end = formatDate(today);
        break;
      case 'last_6_months':
        start = formatDate(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()));
        end = formatDate(today);
        break;
      case 'this_year':
        start = formatDate(new Date(now.getFullYear(), 0, 1));
        end = formatDate(new Date(now.getFullYear(), 11, 31));
        break;
      case 'last_year':
        start = formatDate(new Date(now.getFullYear() - 1, 0, 1));
        end = formatDate(new Date(now.getFullYear() - 1, 11, 31));
        break;
      case 'ytd':
        start = formatDate(new Date(now.getFullYear(), 0, 1));
        end = formatDate(today);
        break;
      case 'custom':
      default:
        start = '';
        end = '';
        break;
    }

    setFilterDateStart(start);
    setFilterDateEnd(end);
    setDatePreset(preset);
  };

  const resetFilters = () => {
    setFilterDateStart(initialStart);
    setFilterDateEnd(initialEnd);
    setDatePreset('this_year');
    setFilterClient('all');
  };

  // Find dynamic date limits if no custom range is set
  const dynamicDateBounds = useMemo(() => {
    let minDate = '';
    let maxDate = '';

    const allDates = [
      ...invoices.map((i) => i.created_at?.split('T')[0]),
      ...quotations.map((q) => q.created_at?.split('T')[0]),
      ...expenses.map((e) => e.date),
    ].filter(Boolean);

    if (allDates.length > 0) {
      allDates.sort();
      minDate = allDates[0];
      maxDate = allDates[allDates.length - 1];
    }

    return { minDate, maxDate };
  }, [invoices, quotations, expenses]);

  // Generate list of months for X-axis
  const monthLabels = useMemo(() => {
    const startStr = filterDateStart || dynamicDateBounds.minDate || `${now.getFullYear()}-01-01`;
    const endStr = filterDateEnd || dynamicDateBounds.maxDate || `${now.getFullYear()}-12-31`;

    const start = new Date(startStr);
    const end = new Date(endStr);

    const list = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= last) {
      const label = current.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      list.push({ key, label });
      current.setMonth(current.getMonth() + 1);
    }

    return list;
  }, [filterDateStart, filterDateEnd, dynamicDateBounds]);

  // Filtered & grouped chart datasets
  const chartDatasets = useMemo(() => {
    const startBound = filterDateStart || '0000-00-00';
    const endBound = filterDateEnd || '9999-12-31';

    const invoiceSums = monthLabels.map(() => 0);
    const expenseSums = monthLabels.map(() => 0);
    const quotationSums = monthLabels.map(() => 0);

    const clientMap = new Map(clients.map((c) => [String(c.id), c.client_name]));
    const clientInvoiceMap = {};
    const clientQuotationMap = {};

    // Sum Invoices
    invoices.forEach((inv) => {
      if (filterClient !== 'all' && String(inv.client_id) !== String(filterClient)) {
        return;
      }
      const dateStr = inv.created_at?.split('T')[0] || '';
      if (dateStr >= startBound && dateStr <= endBound) {
        const docTotal = calculateDocTotal(inv);
        const key = dateStr.substring(0, 7); // "YYYY-MM"
        const idx = monthLabels.findIndex((m) => m.key === key);
        if (idx !== -1) {
          invoiceSums[idx] += docTotal;
        }
        const clientName = clientMap.get(String(inv.client_id)) || 'Unknown Client';
        clientInvoiceMap[clientName] = (clientInvoiceMap[clientName] || 0) + docTotal;
      }
    });

    // Sum Quotations
    quotations.forEach((quote) => {
      if (filterClient !== 'all' && String(quote.client_id) !== String(filterClient)) {
        return;
      }
      const dateStr = quote.created_at?.split('T')[0] || '';
      if (dateStr >= startBound && dateStr <= endBound) {
        const docTotal = calculateDocTotal(quote);
        const key = dateStr.substring(0, 7); // "YYYY-MM"
        const idx = monthLabels.findIndex((m) => m.key === key);
        if (idx !== -1) {
          quotationSums[idx] += docTotal;
        }
        const clientName = clientMap.get(String(quote.client_id)) || 'Unknown Client';
        clientQuotationMap[clientName] = (clientQuotationMap[clientName] || 0) + docTotal;
      }
    });

    // Sum Expenses
    expenses.forEach((exp) => {
      if (filterClient !== 'all') {
        return; // Expenses are not associated with a specific client
      }
      const dateStr = exp.date || '';
      if (dateStr >= startBound && dateStr <= endBound) {
        const key = dateStr.substring(0, 7); // "YYYY-MM"
        const idx = monthLabels.findIndex((m) => m.key === key);
        if (idx !== -1) {
          expenseSums[idx] += Number(exp.amount) || 0;
        }
      }
    });

    // Calculate totals for KPI strip
    const totalInvoices = invoiceSums.reduce((a, b) => a + b, 0);
    const totalExpenses = expenseSums.reduce((a, b) => a + b, 0);
    const totalQuotations = quotationSums.reduce((a, b) => a + b, 0);

    // Convert client maps to sorted arrays
    const invoicesByClient = Object.entries(clientInvoiceMap)
      .map(([clientName, amount]) => ({ clientName, amount }))
      .sort((a, b) => b.amount - a.amount);

    const quotationsByClient = Object.entries(clientQuotationMap)
      .map(([clientName, amount]) => ({ clientName, amount }))
      .sort((a, b) => b.amount - a.amount);

    const clientInvoiceLabels = invoicesByClient.map((item) => item.clientName);
    const clientInvoiceData = invoicesByClient.map((item) => item.amount);

    const clientQuotationLabels = quotationsByClient.map((item) => item.clientName);
    const clientQuotationData = quotationsByClient.map((item) => item.amount);

    return {
      labels: monthLabels.map((m) => m.label),
      invoiceSums,
      expenseSums,
      quotationSums,
      totalInvoices,
      totalExpenses,
      totalQuotations,
      clientInvoiceLabels,
      clientInvoiceData,
      clientQuotationLabels,
      clientQuotationData,
    };
  }, [
    invoices,
    quotations,
    expenses,
    clients,
    monthLabels,
    filterDateStart,
    filterDateEnd,
    taxTotalPercent,
    taxIGST,
    filterClient,
  ]);

  if (loading) {
    return (
      <div className="h-[40vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
          Loading Insights Data...
        </p>
      </div>
    );
  }

  const isFilterActive =
    datePreset !== 'this_year' ||
    filterDateStart !== initialStart ||
    filterDateEnd !== initialEnd ||
    filterClient !== 'all';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Financial Performance Analytics
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            Realtime trends based on documents and logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className={`h-9 px-4 rounded-xl transition-all border-gray-200 text-xs font-bold uppercase tracking-widest ${
              showFilters ? 'bg-primary/10 text-primary border-primary/20' : 'bg-gray-50/50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-2" />
            <span>Date Range & Filters</span>
            {isFilterActive && (
              <Badge className="ml-2 bg-primary text-white scale-75">!</Badge>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchData}
            className="rounded-xl h-9 px-4 font-bold text-primary hover:bg-primary/10 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Date Filters Panel */}
      {showFilters && (
        <Card className="border-none shadow-sm bg-white dark:bg-gray-950 rounded-2xl overflow-hidden border border-gray-100 animate-in slide-in-from-top-2 duration-200">
          <CardContent className="p-5 flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 flex-grow">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <CalendarRange className="w-3 h-3" /> Quick Date
                </Label>
                <Select value={datePreset} onValueChange={applyDatePreset}>
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="This Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Range</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                    <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                    <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  From Date
                </Label>
                <AppDatePicker
                  value={filterDateStart}
                  onChange={(e) => {
                    setFilterDateStart(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  To Date
                </Label>
                <AppDatePicker
                  value={filterDateEnd}
                  onChange={(e) => {
                    setFilterDateEnd(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="h-10 text-sm bg-gray-50 border-transparent rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  Client
                </Label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="w-full h-10 text-sm bg-gray-50 border-transparent rounded-xl">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-10 rounded-xl font-bold px-3 text-gray-400 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 text-xs uppercase tracking-widest shrink-0"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Reset Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Invoiced',
            value: `₹${Math.floor(chartDatasets.totalInvoices).toLocaleString('en-IN')}`,
            icon: FileText,
            color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400',
          },
          {
            label: 'Total Expenditure',
            value: `₹${Math.floor(chartDatasets.totalExpenses).toLocaleString('en-IN')}`,
            icon: IndianRupee,
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400',
          },
          {
            label: 'Total Quotations',
            value: `₹${Math.floor(chartDatasets.totalQuotations).toLocaleString('en-IN')}`,
            icon: TrendingUp,
            color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-none shadow-sm bg-white dark:bg-gray-950 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {label}
                </p>
                <p className="text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">
                  {value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Invoice Amounts Chart */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-950 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 bg-gray-50/20 p-5">
            <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight flex items-center justify-between">
              <span>Invoice Amounts</span>
              <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-none font-bold">
                Monthly
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {chartDatasets.labels.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-xs text-gray-400 italic">
                No invoices found in timeframe
              </div>
            ) : (
              <InsightBarChart
                labels={chartDatasets.labels}
                data={chartDatasets.invoiceSums}
                title="Invoiced"
                color="rgba(99, 102, 241, 0.65)"
              />
            )}
          </CardContent>
        </Card>

        {/* Expenditure Chart */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-950 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 bg-gray-50/20 p-5">
            <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight flex items-center justify-between">
              <span>Expenditure Amounts</span>
              <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-none font-bold">
                Monthly
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {chartDatasets.labels.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-xs text-gray-400 italic">
                No expenditures found in timeframe
              </div>
            ) : (
              <InsightBarChart
                labels={chartDatasets.labels}
                data={chartDatasets.expenseSums}
                title="Expended"
                color="rgba(245, 158, 11, 0.65)"
              />
            )}
          </CardContent>
        </Card>

        {/* Quotation Chart */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-950 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 bg-gray-50/20 p-5">
            <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight flex items-center justify-between">
              <span>Quotation Amounts</span>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-none font-bold">
                Monthly
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {chartDatasets.labels.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-xs text-gray-400 italic">
                No quotations found in timeframe
              </div>
            ) : (
              <InsightBarChart
                labels={chartDatasets.labels}
                data={chartDatasets.quotationSums}
                title="Quoted"
                color="rgba(16, 185, 129, 0.65)"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client Analysis Subheading */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-900">
        <h3 className="text-md font-bold text-gray-800 dark:text-gray-200 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Client Performance Analysis
        </h3>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
          Breakdown of total values by individual client
        </p>
      </div>

      {/* Client Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Amounts by Client */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-950 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 bg-gray-50/20 p-5">
            <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight flex items-center justify-between">
              <span>Invoice Amounts by Client</span>
              <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-none font-bold">
                By Client
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {chartDatasets.clientInvoiceLabels.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-xs text-gray-400 italic">
                No client invoices found in timeframe
              </div>
            ) : (
              <InsightBarChart
                labels={chartDatasets.clientInvoiceLabels}
                data={chartDatasets.clientInvoiceData}
                title="Invoiced"
                color="rgba(99, 102, 241, 0.65)"
              />
            )}
          </CardContent>
        </Card>

        {/* Quotation Amounts by Client */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-950 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-50 bg-gray-50/20 p-5">
            <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight flex items-center justify-between">
              <span>Quotation Amounts by Client</span>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-none font-bold">
                By Client
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {chartDatasets.clientQuotationLabels.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-xs text-gray-400 italic">
                No client quotations found in timeframe
              </div>
            ) : (
              <InsightBarChart
                labels={chartDatasets.clientQuotationLabels}
                data={chartDatasets.clientQuotationData}
                title="Quoted"
                color="rgba(16, 185, 129, 0.65)"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessInsightsManager;
