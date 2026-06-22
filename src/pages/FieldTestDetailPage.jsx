import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Trash2, Clock, Tag } from 'lucide-react';
import Navbar from '../components/Navbar';

import { Helmet } from 'react-helmet-async';
import { useFieldTests } from '@/contexts/FieldTestsContext';
import Rupee from '../components/Rupee';
import { useAuth } from '@/contexts/AuthContext';
import { getSiteContent } from '@/data/config';

const FieldTestDetailPage = () => {
  const { user, loading, isStandard } = useAuth();
  const siteName = getSiteContent().global?.siteName;
  const navigate = useNavigate();
  const { id } = useParams();
  const { fieldTests } = useFieldTests();

  React.useEffect(() => {
    if (!loading && isStandard()) {
      navigate('/doc');
    }
  }, [user, loading, navigate]);

  const fieldTest = fieldTests.find((ft) => ft.id === id);

  if (!fieldTests || fieldTests.length === 0) {
    return (
      <>
        <Navbar />
        <div className="w-full px-6 py-12 text-center">
          <p>Loading field test details...</p>
        </div>
      </>
    );
  }

  if (!fieldTest) {
    return (
      <>
        <Navbar />
        <div className="w-full px-6 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Field test not found</h2>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">
            Return to Dashboard
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {fieldTest.fieldTestType} | EDGE2 {siteName}
        </title>
        <meta name="description" content={`Field Test: ${fieldTest.fieldTestType}`} />
      </Helmet>

      <Navbar />

      <div className="bg-white py-4 border-b">
        <div className="w-full px-6 flex justify-between items-center">
          <Link to="/" className="inline-flex items-center text-primary transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="w-full px-6 py-8">
        <div className="w-full bg-white rounded-lg shadow-sm border p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 border-b pb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{fieldTest.fieldTestType}</h1>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 text-2xl font-bold text-primary">
                <span>
                  <Rupee />
                  {fieldTest.price}
                </span>
                {fieldTest.unit && (
                  <span className="text-gray-500 text-lg font-normal">/ {fieldTest.unit}</span>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-500">Default Qty: {fieldTest.qty}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FieldTestDetailPage;
