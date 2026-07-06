import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { FieldTestsProvider } from '@/contexts/FieldTestsContext';
import { LabTestsProvider } from '@/contexts/LabTestsContext';
import { ClientsProvider } from '@/contexts/ClientsContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { UnitTypesProvider } from '@/contexts/UnitTypesContext';
import { HSNCodesProvider } from '@/contexts/HSNCodesContext';
import { TermsAndConditionsProvider } from '@/contexts/TermsAndConditionsContext';
import { TechnicalsProvider } from '@/contexts/TechnicalsContext';
import { PaymentTermsProvider } from '@/contexts/PaymentTermsContext';
import { MaterialsProvider } from '@/contexts/MaterialsContext';
import { SamplingProvider } from '@/contexts/SamplingContext';
import { PackagesProvider } from '@/contexts/PackagesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { WorkflowProvider } from '@/contexts/WorkflowContext';
import { BankAccountsProvider } from '@/contexts/BankAccountsContext';
import { BankStatementsProvider } from '@/contexts/BankStatementsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getSiteContent } from '@/data/config';
import { TooltipProvider } from '@/components/ui/tooltip';

import FieldTestDetailPage from '@/pages/FieldTestDetailPage.jsx';
import LabTestDetailPage from '@/pages/LabTestDetailPage.jsx';
import AdminPage from '@/pages/AdminPage';
import NewQuotationPage from '@/pages/NewQuotationPage.jsx';
import DeviceRestriction from '@/components/DeviceRestriction';
import UpdateDetector from '@/components/UpdateDetector';

const router = createHashRouter(
  [
    {
      path: '/',
      element: <Navigate to="/settings/dashboard" replace />,
    },
    {
      path: '/settings/:tab?/:id?',
      element: <AdminPage />,
    },
    {
      path: '/doc',
      element: (
        <ProtectedRoute>
          <NewQuotationPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/doc/:id',
      element: (
        <ProtectedRoute>
          <NewQuotationPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/doc/new',
      element: (
        <ProtectedRoute>
          <NewQuotationPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/field-test/:id',
      element: (
        <ProtectedRoute>
          <FieldTestDetailPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/lab-test/:id',
      element: (
        <ProtectedRoute>
          <LabTestDetailPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin',
      element: <Navigate to="/" replace />,
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
      v7_fetcherPersist: true,
    },
  }
);

function App() {
  return (
    <HelmetProvider>
      <DeviceRestriction>
        <AuthProvider>
          <ThemeProvider>
            <FieldTestsProvider>
              <WorkflowProvider>
                <SamplingProvider>
                  <LabTestsProvider>
                    <PackagesProvider>
                      <ClientsProvider>
                        <SettingsProvider>
                          <UnitTypesProvider>
                            <HSNCodesProvider>
                              <MaterialsProvider>
                                <TermsAndConditionsProvider>
                                  <TechnicalsProvider>
                                    <PaymentTermsProvider>
                                      <ExpensesProvider>
                                        <BankAccountsProvider>
                                          <BankStatementsProvider>
                                            <Helmet>
                                              <title>{getSiteContent().global?.siteName}</title>
                                              <link
                                                rel="preconnect"
                                                href="https://fonts.googleapis.com"
                                              />
                                              <link
                                                rel="preconnect"
                                                href="https://fonts.gstatic.com"
                                                crossOrigin="anonymous"
                                              />
                                              <link
                                                href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
                                                rel="stylesheet"
                                              />
                                            </Helmet>
                                            <div className="min-h-screen bg-background text-foreground">
                                              <TooltipProvider>
                                                <RouterProvider
                                                  router={router}
                                                  future={{
                                                    v7_startTransition: true,
                                                    v7_relativeSplatPath: true,
                                                  }}
                                                />
                                              </TooltipProvider>
                                              <Toaster />
                                              <UpdateDetector />
                                            </div>
                                          </BankStatementsProvider>
                                        </BankAccountsProvider>
                                      </ExpensesProvider>
                                    </PaymentTermsProvider>
                                  </TechnicalsProvider>
                                </TermsAndConditionsProvider>
                              </MaterialsProvider>
                            </HSNCodesProvider>
                          </UnitTypesProvider>
                        </SettingsProvider>
                      </ClientsProvider>
                    </PackagesProvider>
                  </LabTestsProvider>
                </SamplingProvider>
              </WorkflowProvider>
            </FieldTestsProvider>
          </ThemeProvider>
        </AuthProvider>
      </DeviceRestriction>
    </HelmetProvider>
  );
}

export default App;
