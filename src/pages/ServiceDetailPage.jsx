
import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Trash2, Clock, Tag } from 'lucide-react';
import Navbar from '../components/Navbar';

import { Helmet } from 'react-helmet-async';
import { useServices } from '@/contexts/ServicesContext';
import Rupee from '../components/Rupee';
import { useAuth } from '@/contexts/AuthContext';
import { getSiteContent } from '@/data/config';


const ServiceDetailPage = () => {
    const { user, loading, isStandard } = useAuth();
    const siteName = getSiteContent().global?.siteName || "Easy Billing";
    const navigate = useNavigate();
    const { id } = useParams();
    const { services } = useServices();

    React.useEffect(() => {
        if (!loading && isStandard()) {
            navigate('/doc');
        }
    }, [user, loading, navigate]);

    const service = services.find(s => s.id === id);

    if (!services || services.length === 0) {
        return (
            <>
                <Navbar />
                <div className="container mx-auto px-4 py-12 text-center">
                    <p>Loading service details...</p>
                </div>

            </>
        );
    }

    if (!service) {
        return (
            <>
                <Navbar />
                <div className="container mx-auto px-4 py-12 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Service not found</h2>
                    <Link to="/" className="text-primary hover:underline mt-4 inline-block">Return to Dashboard</Link>
                </div>

            </>
        );
    }

    return (
        <>
            <Helmet>
                <title>{service.serviceType} | EDGE2 {siteName}</title>
                <meta name="description" content={`Service: ${service.serviceType}`} />
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
                            <h1 className="text-3xl font-bold text-gray-900">{service.serviceType}</h1>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-2 text-2xl font-bold text-primary">
                                <span><Rupee />{service.price}</span>
                                {service.unit && <span className="text-gray-500 text-lg font-normal">/ {service.unit}</span>}
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                                Default Qty: {service.qty}
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </>
    );
};

export default ServiceDetailPage;
