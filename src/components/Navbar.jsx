
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Lock, FileText, Settings, LogOut, User, Package, Database, Briefcase, IndianRupee, Wallet, ClipboardCheck, Calculator, ChevronDown, TestTube, Cpu, SwatchBook, Drill, BriefcaseBusiness, CalendarOff, LayoutDashboard, CheckCircle2, Calendar, Loader2, Send, Building2 } from 'lucide-react';
import { getSiteContent, VIEWS } from '@/data/config';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/lib/customSupabaseClient';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


import { useAuth } from '@/contexts/AuthContext';
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


const Navbar = ({ isDirty = false, isSaving = false }) => {
  const content = getSiteContent();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { canView } = usePermissions();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [leaveRequest, setLeaveRequest] = useState({
      startDate: '',
      endDate: '',
      leaveType: 'Casual Leave',
      reason: ''
  });
  const location = useLocation();

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    logout();
    toast({ title: "Logged Out", description: "Logged out successfully." });
    setLogoutDialogOpen(false);
  };

  const handleLeaveRequest = async (e) => {
    e.preventDefault();
    setRequestLoading(true);
    try {
        const { error } = await supabase
            .from('request_approvals')
            .insert({
                request_type: 'LEAVE',
                requester_id: user.id,
                request_data: {
                    startDate: leaveRequest.startDate,
                    endDate: leaveRequest.endDate,
                    leaveType: leaveRequest.leaveType,
                    reason: leaveRequest.reason
                },
                status: 'PENDING'
            });

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
            description: "Failed to submit leave request.",
            variant: "destructive"
        });
    } finally {
        setRequestLoading(false);
    }
};

  const ALL_NAV_ITEMS = [
    { view: VIEWS.DASHBOARD, path: '/settings/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { view: VIEWS.JOBS, path: '/settings/jobs', label: 'Jobs', icon: Briefcase },
  ];

  const SETTINGS_SUB_ITEMS = [
    { id: 'organization', label: 'Organization', icon: Building2, path: '/settings/organization', description: 'Manage expenses, leaves, and approvals' },
    { id: 'clients', label: 'Clients', icon: BriefcaseBusiness, path: '/settings/clients', description: 'Manage your client database' },
    { id: 'client_pricing', label: 'Client Pricing', icon: IndianRupee, path: '/settings/client_pricing', description: 'Configure custom prices per client' },
    { id: 'field_tests', label: 'Field Tests', icon: Drill, path: '/settings/field_tests', description: 'Configure on-site testing services' },
    { id: 'lab_tests', label: 'Lab Tests', icon: TestTube, path: '/settings/lab_tests', description: 'Manage laboratory testing parameters' },
    { id: 'sampling', label: 'Sampling', icon: SwatchBook, path: '/settings/sampling', description: 'Configure material sampling methods' },
    { id: 'utilities', label: 'Utilities', icon: Calculator, path: '/settings/utilities', description: 'Access the handy tools' },
    { id: 'system', label: 'System', icon: Cpu, path: '/settings/system', description: 'General system settings and users' },
  ];

  const navItems = ALL_NAV_ITEMS.filter(item => canView(item.view));

  const isActive = (path, id) => {
    if (path === '/settings/clients') { // Changed from /settings/services to /settings/clients
      // Highlight settings only for explicitly settings tabs, not for Inward/Reports/Accounts
      const isManagementTab = location.pathname.includes('/jobs') ||
        location.pathname.includes('/inward_register') ||
        location.pathname.includes('/reports') ||
        location.pathname.includes('/accounts') ||
        location.pathname.includes('/dashboard');

      return (location.pathname.startsWith('/settings') && !isManagementTab) ||
        location.pathname.startsWith('/service/') ||
        location.pathname.startsWith('/test/');
    }

    if (id === 'utilities') {
        return location.pathname === path || location.pathname.startsWith('/settings/utilities');
    }
    // For other management tabs (Inward, Reports, Accounts), use precise matching
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

          <div className="hidden md:flex items-center space-x-2">
            <TooltipProvider>
              {navItems.map((item) => {
                  const descriptions = {
                  '/settings/dashboard': 'Overview of laboratory operations and metrics',
                  '/settings/jobs': 'Manage laboratory testing jobs',
                  '/settings/utilities': 'Access helpful calculation utilities',
                };

                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        state={item.path === '/doc/new' ? { forceReset: Date.now() } : undefined}
                        className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${isActive(item.path)
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-gray-600 hover:text-primary hover:bg-gray-300'
                          }`}
                      >
                        <item.icon className={`w-4 h-4 ${isActive(item.path) ? 'text-white' : ''}`} />
                        <span>{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 text-white border-gray-800">
                      <p className="text-xs">{descriptions[item.path] || item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Settings Dropdown */}
              {canView(VIEWS.SETTINGS) && (
                <div className="relative">
                  <TooltipProvider>
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
                      <TooltipContent className="bg-gray-900 text-white border-gray-800">
                        <p className="text-xs">System configuration and master data</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <AnimatePresence>
                    {settingsDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setSettingsDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute left-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-2"
                        >
                          {SETTINGS_SUB_ITEMS.map((subItem) => (
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
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </TooltipProvider>
            {user && (
              <div className="relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-300 border ${
                          dropdownOpen 
                            ? 'bg-primary/5 border-primary/20 shadow-inner' 
                            : 'bg-white border-gray-100 hover:border-primary/20 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Logged in as</span>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-bold text-gray-800">{user?.fullName || user?.username || 'Admin'}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 text-white border-gray-800">
                      <p className="text-xs">User settings and session management</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <AnimatePresence>
                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-2"
                      >
                        <div className="px-4 py-2 border-b border-gray-50 mb-1">
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">User</p>
                          <p className="text-sm font-bold text-gray-800 truncate">{user?.fullName}</p>
                          {/* <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Username</p>
                          <p className="text-sm font-bold text-gray-800 truncate">{user?.username}</p> */}
                        </div>
                        
                        {!isAdmin() && (
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              setIsRequestDialogOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                              <CalendarOff className="w-4 h-4 text-indigo-600" />
                            </div>
                            Apply for Leave
                          </button>
                        )}

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    setDropdownOpen(false);
                                    handleLogout();
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                    <LogOut className="w-4 h-4" />
                                  </div>
                                  Logout
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="bg-gray-900 text-white border-gray-800">
                                <p className="text-xs">End your current session</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="flex items-center md:hidden gap-4">

            <button
              className="text-gray-700"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navItems.map((item) => {
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    state={item.path === '/doc/new' ? { forceReset: Date.now() } : undefined}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 py-3 px-4 rounded-lg transition-colors ${isActive(item.path)
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {canView(VIEWS.SETTINGS) && (
                <div className="space-y-1 pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-3 py-2 px-4 text-gray-400">
                    <Settings className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
                  </div>
                  {SETTINGS_SUB_ITEMS.map((subItem) => (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 py-3 px-8 rounded-lg transition-colors ${location.pathname === subItem.path
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      <subItem.icon className="w-4 h-4" />
                      <span className="font-medium">{subItem.label}</span>
                    </Link>
                  ))}
                </div>
              )}
              {user && (
                <>
                  <div className="flex items-center space-x-3 py-3 px-4 rounded-lg bg-blue-50 text-blue-700 mb-2">
                    <User className="w-5 h-5" />
                    <span className="font-medium text-sm">
                      Logged in as {user?.fullName || user?.username || 'Admin'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center space-x-3 py-3 px-4 rounded-lg transition-colors text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              Clear Data & Logout?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout} className="bg-red-600 hover:bg-red-700 text-white">
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-[32px] border-none shadow-2xl p-8">
              <DialogHeader>
                  <DialogTitle className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl">
                          <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      Apply for Leave
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 font-medium">
                      Your request will be sent to the administrator for approval.
                  </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleLeaveRequest} className="space-y-6 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="startDate" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</Label>
                          <Input 
                              id="startDate" 
                              type="date" 
                              required
                              value={leaveRequest.startDate}
                              onChange={(e) => setLeaveRequest({...leaveRequest, startDate: e.target.value})}
                              className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all h-12 font-bold text-xs" 
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="endDate" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</Label>
                          <Input 
                              id="endDate" 
                              type="date" 
                              required
                              value={leaveRequest.endDate}
                              onChange={(e) => setLeaveRequest({...leaveRequest, endDate: e.target.value})}
                              className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all h-12 font-bold text-xs" 
                          />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Leave Type</Label>
                      <Select 
                        value={leaveRequest.leaveType} 
                        onValueChange={(val) => setLeaveRequest({...leaveRequest, leaveType: val})}
                      >
                        <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all h-12 font-bold text-xs">
                          <SelectValue placeholder="Select Leave Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-xl">
                          <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                          <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                          <SelectItem value="Compensatory Off">Compensatory Off</SelectItem>
                          <SelectItem value="Loss of Pay (LOP)">Loss of Pay (LOP)</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="reason" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason / Comments</Label>
                      <Textarea 
                          id="reason" 
                          placeholder="Briefly describe the reason for leave..." 
                          required
                          value={leaveRequest.reason}
                          onChange={(e) => setLeaveRequest({...leaveRequest, reason: e.target.value})}
                          className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all min-h-[100px] font-medium text-sm"
                      />
                  </div>
                  <DialogFooter className="pt-4">
                      <Button 
                          type="submit" 
                          disabled={requestLoading}
                          className="w-full rounded-xl h-10 bg-primary hover:bg-primary-dark text-white font-black shadow-lg shadow-primary/20 gap-3"
                      >
                          {requestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          Submit Request
                      </Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>

    </nav>
  );
};

export default Navbar;
