import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { AuthProvider as OidcProvider } from 'react-oidc-context';
import { cognitoConfig } from '@/config';
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

import ServiceDetailPage from '@/pages/ServiceDetailPage.jsx';
import TestDetailPage from '@/pages/TestDetailPage.jsx';
import AdminPage from '@/pages/AdminPage';
import NewQuotationPage from '@/pages/NewQuotationPage.jsx';
import DeviceRestriction from '@/components/DeviceRestriction';

const router = createHashRouter([
  {
    path: "/",
    element: <Navigate to="/settings/accounts" replace />,
  },
  {
    path: "/settings/:tab?",
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
      <OidcProvider {...cognitoConfig.oidc}>
        <DeviceRestriction>
          <AuthProvider>
            <ServicesProvider>
              <TestsProvider>
                <ClientsProvider>
                  <SettingsProvider>
                    <UnitTypesProvider>
                      <HSNCodesProvider>
                        <TermsAndConditionsProvider>
                          <TechnicalsProvider>
                            <Helmet>
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
                          </TechnicalsProvider>
                        </TermsAndConditionsProvider>
                      </HSNCodesProvider>
                    </UnitTypesProvider>
                  </SettingsProvider>
                </ClientsProvider>
              </TestsProvider>
            </ServicesProvider>
          </AuthProvider>
        </DeviceRestriction>
      </OidcProvider>
    </HelmetProvider >
  );
}

export default App;
