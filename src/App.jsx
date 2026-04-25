import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { ServicesProvider } from '@/contexts/ServicesContext';
import { TestsProvider } from '@/contexts/TestsContext';
import { ClientsProvider } from '@/contexts/ClientsContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { UnitTypesProvider } from '@/contexts/UnitTypesContext';
import { HSNCodesProvider } from '@/contexts/HSNCodesContext';
import { TermsAndConditionsProvider } from '@/contexts/TermsAndConditionsContext';
import { TechnicalsProvider } from '@/contexts/TechnicalsContext';
import { MaterialsProvider } from '@/contexts/MaterialsContext';
import { SamplingProvider } from '@/contexts/SamplingContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { getSiteContent } from '@/data/config';


import ServiceDetailPage from '@/pages/ServiceDetailPage.jsx';
import TestDetailPage from '@/pages/TestDetailPage.jsx';
import AdminPage from '@/pages/AdminPage';
import NewQuotationPage from '@/pages/NewQuotationPage.jsx';
import DeviceRestriction from '@/components/DeviceRestriction';

const router = createHashRouter([
  {
    path: "/",
    element: <Navigate to="/settings/jobs" replace />,
  },
  {
    path: "/settings/:tab?/:id?",
    element: <AdminPage />,
  },
  {
    path: "/doc",
    element: (
      <ProtectedRoute>
        <NewQuotationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/doc/:id",
    element: (
      <ProtectedRoute>
        <NewQuotationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/doc/new",
    element: (
      <ProtectedRoute>
        <NewQuotationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/service/:id",
    element: (
      <ProtectedRoute>
        <ServiceDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/test/:id",
    element: (
      <ProtectedRoute>
        <TestDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: <Navigate to="/" replace />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
    v7_fetcherPersist: true,
  }
});

function App() {
  return (
    <HelmetProvider>
      <DeviceRestriction>
        <AuthProvider>
          <ServicesProvider>
            <SamplingProvider>
              <TestsProvider>
                <ClientsProvider>
                  <SettingsProvider>
                    <UnitTypesProvider>
                      <HSNCodesProvider>
                        <MaterialsProvider>
                          <TermsAndConditionsProvider>
                            <TechnicalsProvider>
                              <ExpensesProvider>

                                <Helmet>
                                  <title>{getSiteContent().global?.siteName}</title>
                                  <link rel="preconnect" href="https://fonts.googleapis.com" />
                                  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                                  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
                                </Helmet>
                                <div className="min-h-screen bg-[#F5F1ED]">
                                  <RouterProvider
                                    router={router}
                                    future={{
                                      v7_startTransition: true,
                                      v7_relativeSplatPath: true,
                                    }}
                                  />
                                  <Toaster />
                                </div>
                              </ExpensesProvider>
                            </TechnicalsProvider>
                          </TermsAndConditionsProvider>
                        </MaterialsProvider>
                      </HSNCodesProvider>
                    </UnitTypesProvider>
                  </SettingsProvider>
                </ClientsProvider>
              </TestsProvider>
            </SamplingProvider>
          </ServicesProvider>
        </AuthProvider>
      </DeviceRestriction>
    </HelmetProvider >
  );
}

export default App;
