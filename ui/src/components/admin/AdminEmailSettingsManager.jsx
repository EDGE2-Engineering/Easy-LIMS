import React, { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { authFetch } from '@/lib/apiClient';
import {
  Mail,
  Send,
  FileText,
  Key,
  Server,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Sparkles,
  Info,
  Check,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const PRESETS = {
  GMAIL: {
    name: 'Gmail / Google Workspace',
    host: 'smtp.gmail.com',
    port: '587',
    security: 'tls',
  },
  OUTLOOK: {
    name: 'Microsoft 365 / Outlook',
    host: 'smtp.office365.com',
    port: '587',
    security: 'tls',
  },
  YAHOO: {
    name: 'Yahoo Mail',
    host: 'smtp.mail.yahoo.com',
    port: '587',
    security: 'tls',
  },
};

const AdminEmailSettingsManager = () => {
  const { settings, updateSetting, loading: settingsLoading } = useSettings();
  const { toast } = useToast();

  const [campaignForm, setCampaignForm] = useState({
    smtp_campaign_email: '',
    smtp_campaign_password: '',
    smtp_campaign_sender_name: '',
    smtp_campaign_host: 'smtp.gmail.com',
    smtp_campaign_port: '587',
    smtp_campaign_security: 'tls',
    smtp_campaign_enabled: true,
  });

  const [reportForm, setReportForm] = useState({
    smtp_report_email: '',
    smtp_report_password: '',
    smtp_report_sender_name: '',
    smtp_report_host: 'smtp.gmail.com',
    smtp_report_port: '587',
    smtp_report_security: 'tls',
    smtp_report_reply_to: '',
    smtp_report_enabled: true,
  });

  const [hasInitialized, setHasInitialized] = useState(false);
  const [formUnlocked, setFormUnlocked] = useState(false);
  const [showCampaignPassword, setShowCampaignPassword] = useState(false);
  const [showReportPassword, setShowReportPassword] = useState(false);

  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Test Dialog State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testTarget, setTestTarget] = useState(null); // 'campaign' | 'report'
  const [testRecipient, setTestRecipient] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Release readOnly on input fields after initial mount so browser autofill heuristics skip these inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setFormUnlocked(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settingsLoading && settings && !hasInitialized) {
      const getCleanStr = (val) => {
        if (!val || typeof val !== 'string') return '';
        return val.trim();
      };

      setCampaignForm({
        smtp_campaign_email: getCleanStr(settings.smtp_campaign_email),
        smtp_campaign_password: settings.smtp_campaign_password ? String(settings.smtp_campaign_password) : '',
        smtp_campaign_sender_name: getCleanStr(settings.smtp_campaign_sender_name),
        smtp_campaign_host: settings.smtp_campaign_host || 'smtp.gmail.com',
        smtp_campaign_port: String(settings.smtp_campaign_port || '587'),
        smtp_campaign_security: settings.smtp_campaign_security || 'tls',
        smtp_campaign_enabled:
          settings.smtp_campaign_enabled === undefined ||
          settings.smtp_campaign_enabled === true ||
          settings.smtp_campaign_enabled === 'true',
      });

      setReportForm({
        smtp_report_email: getCleanStr(settings.smtp_report_email),
        smtp_report_password: settings.smtp_report_password ? String(settings.smtp_report_password) : '',
        smtp_report_sender_name: getCleanStr(settings.smtp_report_sender_name),
        smtp_report_host: settings.smtp_report_host || 'smtp.gmail.com',
        smtp_report_port: String(settings.smtp_report_port || '587'),
        smtp_report_security: settings.smtp_report_security || 'tls',
        smtp_report_reply_to: getCleanStr(settings.smtp_report_reply_to),
        smtp_report_enabled:
          settings.smtp_report_enabled === undefined ||
          settings.smtp_report_enabled === true ||
          settings.smtp_report_enabled === 'true',
      });

      setHasInitialized(true);
    }
  }, [settingsLoading, settings, hasInitialized]);

  const handleCampaignChange = (field, value) => {
    setCampaignForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReportChange = (field, value) => {
    setReportForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (section, preset) => {
    if (section === 'campaign') {
      setCampaignForm((prev) => ({
        ...prev,
        smtp_campaign_host: preset.host,
        smtp_campaign_port: preset.port,
        smtp_campaign_security: preset.security,
      }));
    } else {
      setReportForm((prev) => ({
        ...prev,
        smtp_report_host: preset.host,
        smtp_report_port: preset.port,
        smtp_report_security: preset.security,
      }));
    }
    toast({
      title: 'Preset Applied',
      description: `Applied ${preset.name} server settings.`,
    });
  };

  const handleSaveCampaign = async () => {
    setIsSavingCampaign(true);
    try {
      await updateSetting('smtp_campaign_email', campaignForm.smtp_campaign_email.trim());
      await updateSetting('smtp_campaign_password', campaignForm.smtp_campaign_password);
      await updateSetting('smtp_campaign_sender_name', campaignForm.smtp_campaign_sender_name.trim());
      await updateSetting('smtp_campaign_host', campaignForm.smtp_campaign_host.trim());
      await updateSetting('smtp_campaign_port', parseInt(campaignForm.smtp_campaign_port, 10) || 587);
      await updateSetting('smtp_campaign_security', campaignForm.smtp_campaign_security);
      await updateSetting('smtp_campaign_enabled', String(campaignForm.smtp_campaign_enabled));

      toast({
        title: 'Campaign SMTP Saved',
        description: 'Email campaigns SMTP configuration updated successfully.',
      });
    } catch (err) {
      console.error('Failed to save campaign settings:', err);
      toast({
        title: 'Error',
        description: 'Failed to save email campaign settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingCampaign(false);
    }
  };

  const handleSaveReport = async () => {
    setIsSavingReport(true);
    try {
      await updateSetting('smtp_report_email', reportForm.smtp_report_email.trim());
      await updateSetting('smtp_report_password', reportForm.smtp_report_password);
      await updateSetting('smtp_report_sender_name', reportForm.smtp_report_sender_name.trim());
      await updateSetting('smtp_report_host', reportForm.smtp_report_host.trim());
      await updateSetting('smtp_report_port', parseInt(reportForm.smtp_report_port, 10) || 587);
      await updateSetting('smtp_report_security', reportForm.smtp_report_security);
      await updateSetting('smtp_report_reply_to', reportForm.smtp_report_reply_to.trim());
      await updateSetting('smtp_report_enabled', String(reportForm.smtp_report_enabled));

      toast({
        title: 'Reports SMTP Saved',
        description: 'Client reports SMTP configuration updated successfully.',
      });
    } catch (err) {
      console.error('Failed to save reports settings:', err);
      toast({
        title: 'Error',
        description: 'Failed to save client reports settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSavingAll(true);
    try {
      await Promise.all([
        updateSetting('smtp_campaign_email', campaignForm.smtp_campaign_email.trim()),
        updateSetting('smtp_campaign_password', campaignForm.smtp_campaign_password),
        updateSetting('smtp_campaign_sender_name', campaignForm.smtp_campaign_sender_name.trim()),
        updateSetting('smtp_campaign_host', campaignForm.smtp_campaign_host.trim()),
        updateSetting('smtp_campaign_port', parseInt(campaignForm.smtp_campaign_port, 10) || 587),
        updateSetting('smtp_campaign_security', campaignForm.smtp_campaign_security),
        updateSetting('smtp_campaign_enabled', String(campaignForm.smtp_campaign_enabled)),

        updateSetting('smtp_report_email', reportForm.smtp_report_email.trim()),
        updateSetting('smtp_report_password', reportForm.smtp_report_password),
        updateSetting('smtp_report_sender_name', reportForm.smtp_report_sender_name.trim()),
        updateSetting('smtp_report_host', reportForm.smtp_report_host.trim()),
        updateSetting('smtp_report_port', parseInt(reportForm.smtp_report_port, 10) || 587),
        updateSetting('smtp_report_security', reportForm.smtp_report_security),
        updateSetting('smtp_report_reply_to', reportForm.smtp_report_reply_to.trim()),
        updateSetting('smtp_report_enabled', String(reportForm.smtp_report_enabled)),
      ]);

      toast({
        title: 'All Email Settings Saved',
        description: 'Campaigns and Reports SMTP configurations have been updated.',
      });
    } catch (err) {
      console.error('Failed to save email settings:', err);
      toast({
        title: 'Save Failed',
        description: 'Could not save all email settings. Please check your connection.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingAll(false);
    }
  };

  const openTestModal = (target) => {
    setTestTarget(target);
    setTestResult(null);
    if (target === 'campaign') {
      setTestRecipient(campaignForm.smtp_campaign_email || '');
    } else {
      setTestRecipient(reportForm.smtp_report_email || '');
    }
    setTestModalOpen(true);
  };

  const handleRunSmtpTest = async () => {
    const isCampaign = testTarget === 'campaign';
    const form = isCampaign ? campaignForm : reportForm;
    const host = isCampaign ? form.smtp_campaign_host : form.smtp_report_host;
    const port = isCampaign ? form.smtp_campaign_port : form.smtp_report_port;
    const security = isCampaign ? form.smtp_campaign_security : form.smtp_report_security;
    const email = isCampaign ? form.smtp_campaign_email : form.smtp_report_email;
    const password = isCampaign ? form.smtp_campaign_password : form.smtp_report_password;
    const senderName = isCampaign
      ? form.smtp_campaign_sender_name || 'Easy-LIMS Campaigns'
      : form.smtp_report_sender_name || 'Easy-LIMS Reports';

    if (!email || !password || !host) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please specify the Sender Email, Password, and SMTP Host before testing.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await authFetch('/api/email/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port: parseInt(port, 10) || 587,
          security,
          email: email.trim(),
          password,
          sender_name: senderName,
          test_recipient: testRecipient ? testRecipient.trim() : null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'SMTP Connection & Authentication successful!',
        });
        toast({
          title: 'SMTP Test Passed',
          description: data.message || 'SMTP authentication was successful.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.detail || 'Failed to authenticate with SMTP server.',
        });
      }
    } catch (err) {
      console.error('SMTP test error:', err);
      setTestResult({
        success: false,
        message: err.message || 'Network error or server unreachable during SMTP test.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-500 font-medium">Loading email configuration...</span>
      </div>
    );
  }

  const isCampaignConfigured = Boolean(
    campaignForm.smtp_campaign_email && campaignForm.smtp_campaign_password
  );
  const isReportConfigured = Boolean(
    reportForm.smtp_report_email && reportForm.smtp_report_password
  );

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Hidden dummy credentials to neutralize browser password manager autofill */}
      <form
        autoComplete="off"
        className="sr-only"
        aria-hidden="true"
        style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none' }}
      >
        <input type="text" name="chrome_prevent_autofill_user" tabIndex={-1} autoComplete="off" />
        <input type="password" name="chrome_prevent_autofill_pwd" tabIndex={-1} autoComplete="new-password" />
      </form>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
              <Mail className="w-6 h-6" />
            </div>
            Email SMTP Configuration
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Configure distinct outbound SMTP credentials for Email Campaigns and Client Report Dispatches
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveAll}
            disabled={isSavingAll}
            className="bg-primary hover:bg-primary-dark flex items-center text-white rounded-xl h-10 px-6 shadow-sm"
          >
            {isSavingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSavingAll ? 'Saving All...' : 'Save All Settings'}
          </Button>
        </div>
      </div>

      {/* Overview Notice */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-5 rounded-2xl border border-blue-100/80 shadow-sm flex items-start gap-3.5">
        <div className="p-2 bg-blue-100/80 rounded-xl text-blue-700 shrink-0 mt-0.5">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-gray-900">Separate Mail Channels Architecture</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Easy-LIMS separates outbound SMTP mailers into two dedicated pipelines. Use one account for <strong>Email Campaigns</strong> (newsletters, mass notices, updates) and a separate high-deliverability account for <strong>Client Reports</strong> (test certificates, job completion notifications, invoices). This prevents promotional bounces from impairing verified lab report delivery.
          </p>
        </div>
      </div>

      {/* Grid: 2 Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ========================================================================= */}
        {/* SECTION 1: EMAIL CAMPAIGNS                                                */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/50">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    Email Campaigns
                    {isCampaignConfigured ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold py-0.5">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-[10px] font-semibold py-0.5">
                        Not Configured
                      </Badge>
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    For marketing emails, announcements, and bulk notices
                  </p>
                </div>
              </div>

              {/* Status Toggle */}
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={campaignForm.smtp_campaign_enabled}
                  onChange={(e) => handleCampaignChange('smtp_campaign_enabled', e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600 relative"></div>
                <span className="ml-2 text-xs font-medium text-gray-600">
                  {campaignForm.smtp_campaign_enabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            {/* Quick Provider Presets */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Quick Server Presets
              </Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset('campaign', preset)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="campaign-email" className="text-xs font-semibold text-gray-700">
                    Sender Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <Input
                      id="campaign-email"
                      name="smtp_campaign_account_email"
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      readOnly={!formUnlocked}
                      onFocus={() => setFormUnlocked(true)}
                      placeholder="e.g. campaigns@laboratory.com"
                      value={campaignForm.smtp_campaign_email}
                      onChange={(e) => handleCampaignChange('smtp_campaign_email', e.target.value)}
                      className="pl-9 h-10 rounded-xl"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">The email address messages are sent from.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="campaign-sender-name" className="text-xs font-semibold text-gray-700">
                    Sender Display Name
                  </Label>
                  <Input
                    id="campaign-sender-name"
                    name="smtp_campaign_account_sender_name"
                    autoComplete="off"
                    placeholder="Easy-LIMS Updates"
                    value={campaignForm.smtp_campaign_sender_name}
                    onChange={(e) => handleCampaignChange('smtp_campaign_sender_name', e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  <p className="text-[11px] text-gray-400">Friendly name displayed in client inbox.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="campaign-password" className="text-xs font-semibold text-gray-700">
                    SMTP Password / App Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <Input
                      id="campaign-password"
                      name="smtp_campaign_account_password"
                      type={showCampaignPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      readOnly={!formUnlocked}
                      onFocus={() => setFormUnlocked(true)}
                      placeholder="Enter SMTP password or app password"
                      value={campaignForm.smtp_campaign_password}
                      onChange={(e) => handleCampaignChange('smtp_campaign_password', e.target.value)}
                      className="pl-9 pr-10 h-10 rounded-xl font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCampaignPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 p-0.5"
                      title={showCampaignPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCampaignPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">For Gmail, use a 16-character App Password.</p>
                </div>
              </div>

              {/* Host, Port, Security */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="campaign-host" className="text-xs font-semibold text-gray-700">
                    SMTP Host
                  </Label>
                  <div className="relative">
                    <Server className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3.5" />
                    <Input
                      id="campaign-host"
                      placeholder="smtp.gmail.com"
                      value={campaignForm.smtp_campaign_host}
                      onChange={(e) => handleCampaignChange('smtp_campaign_host', e.target.value)}
                      className="pl-8 h-10 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="campaign-port" className="text-xs font-semibold text-gray-700">
                    Port
                  </Label>
                  <Input
                    id="campaign-port"
                    type="number"
                    placeholder="587"
                    value={campaignForm.smtp_campaign_port}
                    onChange={(e) => handleCampaignChange('smtp_campaign_port', e.target.value)}
                    className="h-10 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="campaign-security" className="text-xs font-semibold text-gray-700">
                    Encryption
                  </Label>
                  <select
                    id="campaign-security"
                    value={campaignForm.smtp_campaign_security}
                    onChange={(e) => handleCampaignChange('smtp_campaign_security', e.target.value)}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="tls">TLS / STARTTLS (587)</option>
                    <option value="ssl">SSL (465)</option>
                    <option value="none">None (25)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section Action Footer */}
          <div className="pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openTestModal('campaign')}
              className="w-full sm:w-auto text-xs rounded-xl h-9 border-amber-200 text-amber-800 hover:bg-amber-50"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Test Connection
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveCampaign}
              disabled={isSavingCampaign}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-xl h-9 px-4"
            >
              {isSavingCampaign ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isSavingCampaign ? 'Saving...' : 'Save Campaign Settings'}
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: CLIENT REPORTS DISPATCH                                        */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200/50">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    Client Reports Dispatch
                    {isReportConfigured ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold py-0.5">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-[10px] font-semibold py-0.5">
                        Not Configured
                      </Badge>
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    For sending verified test reports, certificates & invoices
                  </p>
                </div>
              </div>

              {/* Status Toggle */}
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={reportForm.smtp_report_enabled}
                  onChange={(e) => handleReportChange('smtp_report_enabled', e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 relative"></div>
                <span className="ml-2 text-xs font-medium text-gray-600">
                  {reportForm.smtp_report_enabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            {/* Quick Provider Presets */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Quick Server Presets
              </Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset('report', preset)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="report-email" className="text-xs font-semibold text-gray-700">
                    Sender Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <Input
                      id="report-email"
                      name="smtp_report_account_email"
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      readOnly={!formUnlocked}
                      onFocus={() => setFormUnlocked(true)}
                      placeholder="e.g. reports@laboratory.com"
                      value={reportForm.smtp_report_email}
                      onChange={(e) => handleReportChange('smtp_report_email', e.target.value)}
                      className="pl-9 h-10 rounded-xl"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">Formal mailbox for sending test results & PDFs.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="report-sender-name" className="text-xs font-semibold text-gray-700">
                    Sender Display Name
                  </Label>
                  <Input
                    id="report-sender-name"
                    name="smtp_report_account_sender_name"
                    autoComplete="off"
                    placeholder="Easy-LIMS Test Reports"
                    value={reportForm.smtp_report_sender_name}
                    onChange={(e) => handleReportChange('smtp_report_sender_name', e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  <p className="text-[11px] text-gray-400">Laboratory or QA department name.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="report-password" className="text-xs font-semibold text-gray-700">
                    SMTP Password / App Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <Input
                      id="report-password"
                      name="smtp_report_account_password"
                      type={showReportPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      readOnly={!formUnlocked}
                      onFocus={() => setFormUnlocked(true)}
                      placeholder="Enter SMTP password or app password"
                      value={reportForm.smtp_report_password}
                      onChange={(e) => handleReportChange('smtp_report_password', e.target.value)}
                      className="pl-9 pr-10 h-10 rounded-xl font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowReportPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 p-0.5"
                      title={showReportPassword ? 'Hide password' : 'Show password'}
                    >
                      {showReportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">Dedicated password for this report email account.</p>
                </div>
              </div>

              {/* Host, Port, Security */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="report-host" className="text-xs font-semibold text-gray-700">
                    SMTP Host
                  </Label>
                  <div className="relative">
                    <Server className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3.5" />
                    <Input
                      id="report-host"
                      placeholder="smtp.gmail.com"
                      value={reportForm.smtp_report_host}
                      onChange={(e) => handleReportChange('smtp_report_host', e.target.value)}
                      className="pl-8 h-10 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="report-port" className="text-xs font-semibold text-gray-700">
                    Port
                  </Label>
                  <Input
                    id="report-port"
                    type="number"
                    placeholder="587"
                    value={reportForm.smtp_report_port}
                    onChange={(e) => handleReportChange('smtp_report_port', e.target.value)}
                    className="h-10 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="report-security" className="text-xs font-semibold text-gray-700">
                    Encryption
                  </Label>
                  <select
                    id="report-security"
                    value={reportForm.smtp_report_security}
                    onChange={(e) => handleReportChange('smtp_report_security', e.target.value)}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="tls">TLS / STARTTLS (587)</option>
                    <option value="ssl">SSL (465)</option>
                    <option value="none">None (25)</option>
                  </select>
                </div>
              </div>

              {/* Optional Reply-To Email */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="report-reply-to" className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Reply-To Email Address</span>
                  <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                </Label>
                <Input
                  id="report-reply-to"
                  name="smtp_report_account_reply_to"
                  type="text"
                  inputMode="email"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="support@laboratory.com"
                  value={reportForm.smtp_report_reply_to}
                  onChange={(e) => handleReportChange('smtp_report_reply_to', e.target.value)}
                  className="h-10 rounded-xl"
                />
                <p className="text-[11px] text-gray-400">Directs client replies to a customer support inbox.</p>
              </div>
            </div>
          </div>

          {/* Section Action Footer */}
          <div className="pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openTestModal('report')}
              className="w-full sm:w-auto text-xs rounded-xl h-9 border-blue-200 text-blue-800 hover:bg-blue-50"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Test Connection
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveReport}
              disabled={isSavingReport}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl h-9 px-4"
            >
              {isSavingReport ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isSavingReport ? 'Saving...' : 'Save Reports Settings'}
            </Button>
          </div>
        </div>
      </div>

      {/* Helpful Technical Documentation Box */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" /> Setup Guides & Authentication Tips
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-600">
          <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-2">
            <div className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Google Workspace / Gmail Configuration
            </div>
            <p className="leading-relaxed">
              Google blocks raw Gmail account passwords for SMTP. To connect:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700 pl-1">
              <li>Turn on <strong>2-Step Verification</strong> on your Google Account.</li>
              <li>Go to <strong>Security &gt; 2-Step Verification &gt; App passwords</strong>.</li>
              <li>Create a new App Password (name it "Easy-LIMS") and paste the 16-character code into the password field above.</li>
              <li>Use Host <code className="bg-white px-1.5 py-0.5 rounded border text-primary">smtp.gmail.com</code> and Port <code className="bg-white px-1.5 py-0.5 rounded border text-primary">587</code> with TLS.</li>
            </ol>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-2">
            <div className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Microsoft 365 / Outlook Configuration
            </div>
            <p className="leading-relaxed">
              For Microsoft 365 mailboxes:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700 pl-1">
              <li>Ensure <strong>Authenticated SMTP</strong> is enabled for the user in the Microsoft 365 Admin Center under Active Users &gt; Mail.</li>
              <li>Use Host <code className="bg-white px-1.5 py-0.5 rounded border text-primary">smtp.office365.com</code> and Port <code className="bg-white px-1.5 py-0.5 rounded border text-primary">587</code> with TLS/STARTTLS.</li>
              <li>If your tenant enforces Multi-Factor Authentication (MFA), generate an <strong>App Password</strong> or configure an SMTP Relay connector.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Test SMTP Connection Dialog */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Test {testTarget === 'campaign' ? 'Campaigns' : 'Reports'} SMTP Connection
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verify server connection and credentials by authenticating and optionally dispatching a test email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/60 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Channel:</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {testTarget === 'campaign' ? 'Email Campaigns' : 'Client Reports'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host & Port:</span>
                <span className="font-mono text-gray-800">
                  {testTarget === 'campaign'
                    ? `${campaignForm.smtp_campaign_host}:${campaignForm.smtp_campaign_port}`
                    : `${reportForm.smtp_report_host}:${reportForm.smtp_report_port}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sender Account:</span>
                <span className="font-medium text-gray-900">
                  {testTarget === 'campaign'
                    ? campaignForm.smtp_campaign_email || '(Not set)'
                    : reportForm.smtp_report_email || '(Not set)'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="test-recipient" className="text-xs font-semibold text-gray-700">
                Send Verification Email To:
              </Label>
              <Input
                id="test-recipient"
                type="email"
                placeholder="your.email@example.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
              <p className="text-[11px] text-gray-400">
                Leave blank to only test authentication without sending an email.
              </p>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTestModalOpen(false)}
              disabled={isTesting}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleRunSmtpTest}
              disabled={isTesting}
              className="bg-primary hover:bg-primary-dark text-white text-xs rounded-xl px-4"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run SMTP Test'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailSettingsManager;
