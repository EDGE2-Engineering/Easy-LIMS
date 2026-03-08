
import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Trash2, Clock, Tag, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';

import { Helmet } from 'react-helmet-async';
import { useTests } from '@/contexts/TestsContext';
import Rupee from '../components/Rupee';
import { useAuth } from '@/contexts/AuthContext';
import { getSiteContent } from '@/config';


const TestDetailPage = () => {
    const { user, loading, isStandard } = useAuth();
    const siteName = getSiteContent().global?.siteName || "Easy Billing";
    const navigate = useNavigate();
    const { id } = useParams();
    const { tests } = useTests();

    React.useEffect(() => {
        if (!loading && isStandard()) {
            navigate('/doc');
        }
    }, [user, loading, navigate]);

    const test = tests.find(t => t.id === id);

    if (!tests || tests.length === 0) {
        return (
            <>
                <Navbar />
                <div className="container mx-auto px-4 py-12 text-center">
                    <p>Loading test details...</p>
                </div>

            </>
        );
    }

    if (!test) {
        return (
            <>
                <Navbar />
                <div className="container mx-auto px-4 py-12 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Test not found</h2>
                    <Link to="/" className="text-primary hover:underline mt-4 inline-block">Return to Dashboard</Link>
                </div>

            </>
        );
    }

    return (
        <>
            <Helmet>
                <title>{test.testType} | EDGE2 {siteName}</title>
                <meta name="description" content={`Test: ${test.testType}`} />
            </Helmet>

            <Navbar />

            <div className="bg-white py-4 border-b">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <Link to="/" className="inline-flex items-center text-primary transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 border-b pb-8">
                        <div>
                            {test.group && (
                                <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full mb-3 inline-block">
                                    {test.group}
                                </span>
                            )}
                            <h1 className="text-3xl font-bold text-gray-900">{test.testType}</h1>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-2 text-2xl font-bold text-primary">
                                <span><Rupee />{test.price}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            {test.materials && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Materials</h3>
                                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{test.materials}</p>
                                </div>
                            )}

                            {test.testMethodSpecification && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Standard / Specification</h3>
                                    <p className="text-gray-700 font-mono text-sm bg-gray-50 p-3 rounded">{test.testMethodSpecification}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            {test.numDays > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Turnaround Time</h3>
                                    <p className="text-gray-700 flex items-center">
                                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                                        {test.numDays} Days
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>


        </>
    );
};

export default TestDetailPage;
