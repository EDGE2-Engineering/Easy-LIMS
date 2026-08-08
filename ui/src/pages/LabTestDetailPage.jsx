import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Trash2, Clock, Tag, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';

import { Helmet } from 'react-helmet-async';
import { useLabTests } from '@/contexts/LabTestsContext';
import Rupee from '../components/Rupee';
import { useAuth } from '@/contexts/AuthContext';
import { getSiteContent } from '@/data/config';

const LabTestDetailPage = () => {
  const { user, loading, isStandard } = useAuth();
  const siteName = getSiteContent().global?.siteName;
  const navigate = useNavigate();
  const { id } = useParams();
  const { labTests } = useLabTests();

  React.useEffect(() => {
    if (!loading && isStandard()) {
      navigate('/doc');
    }
  }, [user, loading, navigate]);

  const labTest = labTests.find((t) => t.id === id);

  if (!labTests || labTests.length === 0) {
    return (
      <>
        <Navbar />
        <div className="w-full px-6 py-12 text-center">
          <p>Loading lab test details...</p>
        </div>
      </>
    );
  }

  if (!labTest) {
    return (
      <>
        <Navbar />
        <div className="w-full px-6 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Lab test not found</h2>
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
          {labTest.testType} | EDGE2 {siteName}
        </title>
        <meta name="description" content={`Lab Test: ${labTest.testType}`} />
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
              {labTest.group && (
                <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full mb-3 inline-block">
                  {labTest.group}
                </span>
              )}
              <h1 className="text-3xl font-bold text-gray-900">{labTest.testType}</h1>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 text-2xl font-bold text-primary">
                <span>
                  <Rupee />
                  {labTest.price}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {labTest.materials && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Materials</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {Array.isArray(labTest.materials)
                      ? labTest.materials.join(', ')
                      : labTest.materials || '-'}
                  </p>
                </div>
              )}

              {labTest.testMethodSpecification && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Standard / Specification</h3>
                  <p className="text-gray-700 font-mono text-sm bg-gray-50 p-3 rounded">
                    {labTest.testMethodSpecification}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {labTest.numDays > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Turnaround Time</h3>
                  <p className="text-gray-700 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    {labTest.numDays} Days
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

export default LabTestDetailPage;
