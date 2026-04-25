
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Lock, FileText, Settings, LogOut, User, Package, Database, Briefcase, IndianRupee, Wallet, ClipboardCheck, ChevronDown } from 'lucide-react';
import { getSiteContent, VIEWS, ROLES, APP_CONFIG } from '@/data/config';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';


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
  const { user, logout } = useAuth();
  const { canView } = usePermissions();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    logout();
    toast({ title: "Logged Out", description: "Logged out successfully." });
    setLogoutDialogOpen(false);
  };

  const ALL_NAV_ITEMS = [
    { view: VIEWS.JOBS, path: '/settings/jobs', label: 'Jobs', icon: Briefcase },
    { view: VIEWS.EXPENSES, path: '/settings/expenses', label: 'Expenses', icon: IndianRupee },
    { id: 'work_log', view: VIEWS.WORK_LOG, path: '/settings/work_log', label: 'Work Log', icon: ClipboardCheck },
    { view: VIEWS.SETTINGS, path: '/settings/clients', label: 'Settings', icon: Settings }
  ];

  const navItems = ALL_NAV_ITEMS.filter(item => canView(item.view));

  const isActive = (path, id) => {
    if (path === '/settings/clients') { // Changed from /settings/services to /settings/clients
      // Highlight settings only for explicitly settings tabs, not for Inward/Reports/Accounts
      const isManagementTab = location.pathname.includes('/jobs') ||
        location.pathname.includes('/expenses') ||
        location.pathname.includes('/wages') ||
        location.pathname.includes('/inward_register') ||
        location.pathname.includes('/reports') ||
        location.pathname.includes('/accounts') ||
        location.pathname.includes('/work_log');

      return (location.pathname.startsWith('/settings') && !isManagementTab) ||
        location.pathname.startsWith('/service/') ||
        location.pathname.startsWith('/test/');
    }

    if (id === 'work_log') {
        return location.pathname === path || location.pathname.startsWith('/settings/work_log');
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
            {navItems.map((item) => {
              return (
                <Link
                  key={item.path}
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
              );
            })}
            {user && (
              <div className="relative">
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
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account</p>
                          <p className="text-sm font-bold text-gray-800 truncate">{user?.username}</p>
                        </div>
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


    </nav>
  );
};

export default Navbar;
