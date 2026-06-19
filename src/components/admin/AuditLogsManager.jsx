import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, ChevronRight } from 'lucide-react';
import { APP_CONFIG } from '@/data/config';

const AuditLogsManager = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_workflow_logs')
        .select('*, jobs(job_code, project_name), users(full_name, username)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStateLabel = (state) => APP_CONFIG.workflow.states[state]?.label || state;

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Standardized Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            System Audit Logs
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Track system activity and changes
          </p>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
        {/* <CardHeader className="p-6 border-b border-gray-50">
                    <CardTitle className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" /> System Audit Logs
                    </CardTitle>
                </CardHeader> */}
        <CardContent className="p-0">
          <div className="divide-y divide-gray-50">
            {logs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-gray-400 italic">No activity found.</p>
              </div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="p-5 flex gap-4 hover:bg-gray-50/50 transition-all group">
                  <div className="mt-1">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-grow space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">
                        {log.users?.full_name || log.users?.username || 'System'}
                        <span className="text-gray-400 font-medium ml-1.5 tracking-tight">
                          moved
                        </span>
                        <span className="text-primary font-black ml-1.5 tracking-tighter">
                          #{log.jobs?.job_code || 'Unknown'}
                        </span>
                      </p>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 flex items-center gap-2">
                      {log.from_state && (
                        <>
                          <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[10px] border border-gray-200">
                            {getStateLabel(log.from_state)}
                          </span>
                          <ChevronRight className="w-3 h-3 text-gray-300" />
                        </>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md bg-primary/5 text-primary text-[10px] border border-primary/10">
                        {getStateLabel(log.to_state)}
                      </span>
                    </p>
                    {log.remarks && (
                      <p className="text-[11px] text-gray-500 italic mt-2 border-l-2 border-gray-100 pl-3 py-1 font-medium bg-gray-50/30 rounded-r-lg">
                        {log.remarks}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogsManager;
