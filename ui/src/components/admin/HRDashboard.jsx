import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { ROLES } from '@/data/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const HRDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
  });

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active employees list
      const usersData = await apiClient.get('/api/users', { params: { eq_is_active: true } });
      const employeeList = (usersData || []).filter((u) => u.role !== ROLES.SUPER_ADMIN.slug);

      setEmployees(employeeList.slice(0, 10));

      setStats({
        totalEmployees: (usersData || []).length,
      });
    } catch (error) {
      console.error('HR Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
            Loading HR Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <LayoutDashboard className="w-8 h-8 text-primary" />
              </div>
              HR Dashboard
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Welcome back,{' '}
              <span className="text-primary font-bold">{user?.fullName || user?.username}</span>.
            </p>
          </div>
          <Button
            onClick={fetchDashboardData}
            size="sm"
            variant="ghost"
            className="rounded-xl h-10 px-4 font-bold text-primary hover:bg-primary/10 transition-all border border-gray-100 bg-white shadow-sm"
          >
            <Zap className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: 'Active Employees',
              value: stats.totalEmployees,
              icon: Users,
              path: null,
              tooltip: 'Total active employees in the system',
            },
          ].map((stat, idx) => (
            <motion.div key={idx} variants={item}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="border-none shadow-sm bg-gray-50/30 relative overflow-hidden group transition-all">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gray-50 rounded-bl-[64px] -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110 duration-500" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                            {stat.label}
                          </p>
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                            {stat.value}
                          </h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                  <p className="text-xs">{stat.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          ))}
        </div>

        <div className="w-full">
          {/* Left Column: Active Employees Directory */}
          <motion.div variants={item} className="space-y-6">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30 p-6">
                <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Employee Directory
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                  {employees.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                      No active employees found.
                    </div>
                  ) : (
                    employees.map((emp) => (
                      <div
                        key={emp.id}
                        className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm uppercase">
                            {emp.full_name?.[0] || emp.username?.[0] || 'E'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {emp.full_name || emp.username}
                            </p>
                            <p className="text-xs text-gray-500 font-medium capitalize">
                              {emp.role ? emp.role.replace('_', ' ') : 'No Role'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export default HRDashboard;
