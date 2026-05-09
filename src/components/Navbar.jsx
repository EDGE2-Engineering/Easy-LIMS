
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Lock, FileText, Settings, LogOut, User, Package, Database, Files, Briefcase, IndianRupee, Wallet, ClipboardCheck, Calculator, ChevronDown, TestTube, Cpu, SwatchBook, Drill, BriefcaseBusiness, CalendarOff, LayoutDashboard, CheckCircle2, Calendar, Loader2, Send, Building2, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { getSiteContent, VIEWS, ROLES, NAVBAR_ACTIONS, NAV_ITEM_IDS, SETTINGS_ITEM_IDS } from '@/data/config';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const Navbar = ({ isDirty = false, isSaving = false }) => {
  const { user, logout, isAdmin } = useAuth();
  const content = getSiteContent();
  const { canView, canShowNavbarAction, canShowNavItem, canShowSettingsItem } = usePermissions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [leaveRequest, setLeaveRequest] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'Casual Leave',
    reason: ''
  });
  const location = useLocation();
  const settingsDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsDropdownOpen && settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target)) {
        setSettingsDropdownOpen(false);
      }
      if (dropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsDropdownOpen, dropdownOpen]);

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = async () => {
    await logout();
    setLogoutDialogOpen(false);
    navigate('/');
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setRequestLoading(true);
    try {
      const { error } = await supabase
        .from('request_approvals')
        .insert([{
          requester_id: user.id,
          request_type: 'LEAVE',
          status: 'PENDING',
          request_data: leaveRequest
        }]);

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your leave request has been sent for approval.",
      });
      setIsRequestDialogOpen(false);
      setLeaveRequest({ startDate: '', endDate: '', leaveType: 'Casual Leave', reason: '' });
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRequestLoading(false);
    }
  };

  const ALL_NAV_ITEMS = [
    { navItemId: NAV_ITEM_IDS.DASHBOARD,          view: VIEWS.DASHBOARD,          path: '/settings/dashboard',        label: 'Dashboard',   icon: LayoutDashboard },
    { navItemId: NAV_ITEM_IDS.ANALYST_DASHBOARD,  view: VIEWS.ANALYST_DASHBOARD,  path: '/settings/analyst_dashboard',label: 'My Dashboard',icon: LayoutDashboard },
    { navItemId: NAV_ITEM_IDS.ACCOUNTS_DASHBOARD, view: VIEWS.ACCOUNTS_DASHBOARD, path: '/settings/accounts_dashboard',label: 'My Dashboard',icon: LayoutDashboard },
    { navItemId: NAV_ITEM_IDS.JOBS,               view: VIEWS.JOBS,               path: '/settings/jobs',             label: 'Jobs',        icon: Briefcase },
    { navItemId: NAV_ITEM_IDS.INQUIRIES,          view: VIEWS.INQUIRIES,          path: '/settings/inquiries',        label: 'Inquiries',   icon: MessageSquare },
    { navItemId: NAV_ITEM_IDS.MATERIAL_INWARD,    view: VIEWS.MATERIAL_INWARD,    path: '/settings/inward_register',  label: 'Inward',      icon: Package },
    // { navItemId: 'testing', view: VIEWS.TESTING, path: '/settings/testing', label: 'Testing', icon: TestTube },
    { navItemId: NAV_ITEM_IDS.DOCUMENTS,          view: VIEWS.DOCUMENTS,          path: '/settings/documents',        label: 'Documents',   icon: Files },
  ];

  const SETTINGS_SUB_ITEMS = [
    { id: SETTINGS_ITEM_IDS.ORGANIZATION,   label: 'Organization',   icon: Building2,        path: '/settings/organization',    description: 'Manage expenses, leaves, and approvals', views: [VIEWS.EXPENSES, VIEWS.WORK_LOG, VIEWS.APPROVALS] },
    { id: SETTINGS_ITEM_IDS.CLIENTS,        label: 'Clients',        icon: BriefcaseBusiness,path: '/settings/clients',          description: 'Manage your client database',             view: VIEWS.SETTINGS },
    { id: SETTINGS_ITEM_IDS.CLIENT_PRICING, label: 'Client Pricing', icon: IndianRupee,      path: '/settings/client_pricing',   description: 'Configure custom prices per client',      view: VIEWS.CLIENT_PRICING },
    { id: SETTINGS_ITEM_IDS.FIELD_TESTS,    label: 'Field Tests',    icon: Drill,            path: '/settings/field_tests',      description: 'Configure on-site testing services',     view: VIEWS.SETTINGS },
    { id: SETTINGS_ITEM_IDS.LAB_TESTS,      label: 'Lab Tests',      icon: TestTube,         path: '/settings/lab_tests',        description: 'Manage laboratory testing parameters',   view: VIEWS.SETTINGS },
    { id: SETTINGS_ITEM_IDS.SAMPLING,       label: 'Sampling',       icon: SwatchBook,       path: '/settings/sampling',         description: 'Configure material sampling methods',    view: VIEWS.SETTINGS },
    { id: SETTINGS_ITEM_IDS.UTILITIES,      label: 'Utilities',      icon: Calculator,       path: '/settings/utilities',        description: 'Access the handy tools',                 view: VIEWS.UTILITIES },
    { id: SETTINGS_ITEM_IDS.SYSTEM,         label: 'System',         icon: Cpu,              path: '/settings/system',           description: 'General system settings and users',      view: VIEWS.SETTINGS },
  ];

  const navItems = ALL_NAV_ITEMS.filter(item => canShowNavItem(item.navItemId, item.view));

  const visibleSettingsSubItems = SETTINGS_SUB_ITEMS.filter(item =>
    canShowSettingsItem(item.id, item.views ?? item.view)
  );

  const canShowSettings = canView(VIEWS.SETTINGS) || visibleSettingsSubItems.length > 0;

  const isActive = (path, id) => {
    if (path === '/settings/clients') {
      const isManagementTab = ALL_NAV_ITEMS.some(item => location.pathname.startsWith(item.path));

      return (location.pathname.startsWith('/settings') && !isManagementTab) ||
        location.pathname.startsWith('/service/') ||
        location.pathname.startsWith('/test/');
    }

    if (id === 'utilities') {
      return location.pathname === path || location.pathname.startsWith('/settings/utilities');
    }
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-2">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center bg-white p-1 rounded-md shadow-sm">
              <img
                src={`${import.meta.env.BASE_URL}edge2-logo.png`}
                alt="Logo"
                className="h-8 w-auto"
              />
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:inline-block">
              {content.global?.siteName}
            </span>
            <span className="text-sm font-bold text-gray-900 sm:hidden">
              {content.global?.siteName}
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const descriptions = {
                '/settings/dashboard': 'Overview of laboratory operations and metrics',
                '/settings/jobs': 'Manage laboratory testing jobs',
                '/settings/inquiries': 'Record and track client inquiries and requirements',
                '/settings/utilities': 'Access helpful calculation utilities',
                '/settings/inward_register': 'Register and manage material reception',
                '/settings/testing': 'Laboratory testing workflow and data entry',
                '/settings/documents': 'For accounts team to create quotes and invoices',
              };

              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      state={item.path === '/doc/new' ? { forceReset: Date.now() } : undefined}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${active
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-600 hover:text-primary hover:bg-gray-300'
                        }`}
                    >
                      <item.icon className={`w-4 h-4 ${active ? 'text-white' : ''}`} />
                      <span>{item.label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                    <p className="text-xs">{descriptions[item.path] || item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Settings Dropdown */}
            {canShowSettings && (
              <div className="relative" ref={settingsDropdownRef}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${isActive('/settings/clients')
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-600 hover:text-primary hover:bg-gray-300'
                        }`}
                    >
                      <Settings className={`w-4 h-4 ${isActive('/settings/clients') ? 'text-white' : ''}`} />
                      <span>Settings</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${settingsDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                    <p className="text-xs">System configuration and master data</p>
                  </TooltipContent>
                </Tooltip>

                <AnimatePresence>
                  {settingsDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-2"
                    >
                      {visibleSettingsSubItems.map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => setSettingsDropdownOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors ${location.pathname === subItem.path
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                            }`}
                        >
                          <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${location.pathname === subItem.path ? 'bg-primary/20' : 'bg-gray-100'}`}>
                            <subItem.icon className="w-4 h-4 shrink-0" />
                          </div>
                          <div>
                            <p className="font-bold">{subItem.label}</p>
                            <p className="text-[10px] text-gray-400 font-medium leading-tight">{subItem.description}</p>
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="h-6 w-px bg-gray-200 mx-2" />

            {user && (
              <div className="relative" ref={userDropdownRef}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={`flex items-center space-x-3 p-1.5 rounded-xl transition-all hover:bg-gray-50 border border-transparent ${dropdownOpen ? 'border-gray-100 bg-gray-50' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left hidden lg:block">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Logged in as</p>
                        <p className="text-sm font-bold text-gray-900 leading-none truncate max-w-[120px]">{user?.fullName || user?.username}</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                    <p className="text-xs">Account settings and options</p>
                  </TooltipContent>
                </Tooltip>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-2"
                    >
                      <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee Info</p>
                        <p className="text-sm font-bold text-gray-800">{user?.fullName}</p>
                        <p className="text-sm font-medium text-gray-400">{user?.emp_id}</p>
                        <p className="text-sm font-medium text-gray-400">{Object.values(ROLES).find(r => r.slug === user?.role)?.label || user?.role}</p>
                      </div>

                      {canShowNavbarAction(NAVBAR_ACTIONS.APPLY_LEAVE) && (
                        <button
                          onClick={() => {
                            setIsRequestDialogOpen(true);
                            setDropdownOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>Apply for Leave</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100 bg-white overflow-hidden shadow-inner"
          >
            <div className="px-4 py-6 space-y-4">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 p-4 rounded-2xl text-sm font-bold transition-all ${active
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {canShowSettings && (
                <div className="space-y-1 pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-3 py-2 px-4 text-gray-400">
                    <Settings className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Settings</span>
                  </div>
                  {visibleSettingsSubItems.map((subItem) => (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 p-4 rounded-2xl text-sm font-bold transition-all ${location.pathname === subItem.path
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      <subItem.icon className="w-5 h-5" />
                      <span>{subItem.label}</span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center space-x-3 px-4 py-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Logged in as</p>
                    <p className="text-sm font-bold text-gray-900 leading-none">{user?.fullName || user?.username}</p>
                  </div>
                </div>

                {canShowNavbarAction(NAVBAR_ACTIONS.APPLY_LEAVE) && (
                  <button
                    onClick={() => {
                      setIsRequestDialogOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 p-4 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Apply for Leave</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 p-4 rounded-2xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <LogOut className="w-8 h-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-gray-900 tracking-tight">Confirm Logout</DialogTitle>
            <DialogDescription className="text-center font-medium text-gray-500 text-lg">
              Are you sure you want to sign out? You will need to log back in to access your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button
              variant="outline"
              onClick={() => setLogoutDialogOpen(false)}
              className="flex-1 h-14 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 border-gray-100"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmLogout}
              className="flex-1 h-14 rounded-2xl font-bold bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200"
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-gray-900 tracking-tight">Apply for Leave</DialogTitle>
            <DialogDescription className="text-center font-medium text-gray-500">
              Submit your leave request for approval.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Start Date</Label>
                <input
                  type="date"
                  required
                  value={leaveRequest.startDate}
                  onChange={(e) => setLeaveRequest({ ...leaveRequest, startDate: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">End Date</Label>
                <input
                  type="date"
                  required
                  value={leaveRequest.endDate}
                  onChange={(e) => setLeaveRequest({ ...leaveRequest, endDate: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Leave Type</Label>
              <select
                value={leaveRequest.leaveType}
                onChange={(e) => setLeaveRequest({ ...leaveRequest, leaveType: e.target.value })}
                className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none"
              >
                <option>Casual Leave</option>
                <option>Sick Leave</option>
                <option>Earned Leave</option>
                <option>Loss of Pay</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reason</Label>
              <Textarea
                required
                value={leaveRequest.reason}
                onChange={(e) => setLeaveRequest({ ...leaveRequest, reason: e.target.value })}
                placeholder="Briefly explain your reason for leave..."
                className="min-h-[100px] rounded-xl border-gray-100 bg-gray-50 resize-none"
              />
            </div>
            <Button
              type="submit"
              disabled={requestLoading}
              className="w-full h-14 rounded-2xl font-bold bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20"
            >
              {requestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Request'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;
