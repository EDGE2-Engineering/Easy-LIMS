
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Lock, FileText, Settings, LogOut, User, Package, Database, LayoutDashboard } from 'lucide-react';
import { getSiteContent } from '@/config';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';


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
  const navigate = useNavigate();
  const { user, logout, isAdmin, isStandard } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const location = useLocation();
  const content = getSiteContent();



  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    logout();
    toast({ title: "Logged Out", description: "Logged out successfully." });
    setLogoutDialogOpen(false);
  };

  const navItems = [
    { path: '/settings/material-inward', label: 'Inward', icon: Package, roles: ['admin', 'standard'] },
    { path: '/settings/reports', label: 'Reports', icon: FileText, roles: ['admin', 'standard'] },
    { path: '/settings/accounts', label: 'Accounts', icon: Database, roles: ['admin', 'standard'] },
    { path: '/settings/jobs', label: 'Jobs', icon: LayoutDashboard, roles: ['admin', 'standard'] },
    { path: '/settings/clients', label: 'Settings', icon: Settings, roles: ['admin', 'standard'] }
  ].filter(item => {
    if (!item.roles) return true;
    if (item.roles.includes('admin') && isAdmin()) return true;
    if (item.roles.includes('standard') && isStandard()) return true;
    return false;
  });

  const isActive = (path) => {
    if (path === '/settings/clients') { // Changed from /settings/services to /settings/clients
      // Highlight settings only for explicitly settings tabs, not for Inward/Reports/Accounts
      const isManagementTab = location.pathname.includes('/material-inward') ||
        location.pathname.includes('/reports') ||
        location.pathname.includes('/accounts') ||
        location.pathname.includes('/jobs');

      return (location.pathname.startsWith('/settings') && !isManagementTab) ||
        location.pathname.startsWith('/service/') ||
        location.pathname.startsWith('/test/');
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
              {content.global?.siteName || "Easy Billing"}
            </span>
            <span className="text-sm font-bold text-gray-900 sm:hidden">
              {content.global?.siteName || "Easy Billing"}
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  state={item.path === '/doc/new' ? { forceReset: Date.now() } : undefined}
                  className={`flex items-center space-x-2 px-2 py-2 rounded-xl transition-all text-xs font-semibold ${isActive(item.path)
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
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center">
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  {user?.name || user?.username || 'Admin'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Logout</span>
                </Button>
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
                      Logged in as {user?.name || user?.username || 'Admin'}
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
