
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Beaker, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import TestingManager from './TestingManager';

const TestingDashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeJobId, setActiveJobId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            // Fetch jobs that are in testing related states
            const { data, error } = await supabase
                .from('jobs')
                .select('*, clients(client_name)')
                .in('status', ['UNDER_TESTING', 'SENT_TO_TESTING_DEPARTMENT', 'TEST_COMPLETED'])
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setJobs(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (activeJobId) {
        return <TestingManager initialJobId={activeJobId} onClose={() => { setActiveJobId(null); fetchJobs(); }} />;
    }

    const filteredJobs = jobs.filter(j => 
        j.job_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.clients?.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Laboratory Dashboard</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage and record test results for active lab jobs.</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                        placeholder="Search jobs..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : filteredJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredJobs.map(job => (
                        <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <Badge variant="outline" className="font-mono text-xs text-primary bg-primary/5 border-primary/20">
                                        {job.job_id}
                                    </Badge>
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px] uppercase font-bold">
                                        {job.status.replace(/_/g, ' ')}
                                    </Badge>
                                </div>
                                <h3 className="font-bold text-gray-900 truncate">{job.clients?.client_name}</h3>
                                <p className="text-sm text-gray-500 mt-1 truncate">{job.project_name}</p>
                                
                                <div className="mt-6 flex flex-wrap gap-2">
                                    {Array.isArray(job.job_categories) && job.job_categories.map(cat => (
                                        <Badge key={cat} variant="secondary" className="text-[9px] px-1.5 py-0 bg-gray-100 text-gray-600">
                                            {cat}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex justify-between items-center group-hover:bg-primary/5 transition-colors">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Beaker className="w-3 h-3" />
                                    {Object.values(job.test_types || {}).flat().length} Tests
                                </span>
                                <Button 
                                    size="sm" 
                                    onClick={() => setActiveJobId(job.id)}
                                    className="h-8 rounded-lg bg-white border-gray-200 text-gray-700 hover:bg-primary hover:text-white hover:border-primary shadow-sm"
                                >
                                    Open Console <ArrowRight className="w-3 h-3 ml-2" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Beaker className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">No Active Lab Jobs</h3>
                    <p className="text-gray-500 mt-1">There are currently no jobs in the testing phase.</p>
                </div>
            )}
        </div>
    );
};

export default TestingDashboard;
