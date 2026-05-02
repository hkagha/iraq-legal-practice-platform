import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { TimerProvider } from "@/contexts/TimerContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { PortalOrgProvider } from '@/contexts/PortalOrgContext';
import PortalGate from '@/components/portal/PortalGate';
import MainLayout from "@/layouts/MainLayout";
import ClientLayout from "@/layouts/ClientLayout";
import AdminLayout from "@/layouts/AdminLayout";
import ErrorBoundary from '@/components/ErrorBoundary';
import { PageLoader } from '@/components/ui/PageLoader';

// Static imports (always needed)
import LoginPage from "@/pages/LoginPage";
import StaffLoginPage from "@/pages/StaffLoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import NotFound from "./pages/NotFound";
import InviteAcceptPage from "@/pages/InviteAcceptPage";
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import PortalLoginPage from '@/pages/portal/PortalLoginPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lazy-loaded main pages
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const CasesPage = React.lazy(() => import('@/pages/CasesPage'));
const CaseFormPage = React.lazy(() => import('@/pages/CaseFormPage'));
const CaseDetailPage = React.lazy(() => import('@/pages/CaseDetailPage'));
const ErrandsPage = React.lazy(() => import('@/pages/ErrandsPage'));
const ErrandFormPage = React.lazy(() => import('@/pages/ErrandFormPage'));
const ErrandDetailPage = React.lazy(() => import('@/pages/ErrandDetailPage'));
const ClientsPage = React.lazy(() => import('@/pages/ClientsPage'));
const ClientDetailPage = React.lazy(() => import('@/pages/ClientDetailPage'));
const CalendarPage = React.lazy(() => import('@/pages/CalendarPage'));
const TasksPage = React.lazy(() => import('@/pages/TasksPage'));
const DocumentsPage = React.lazy(() => import('@/pages/DocumentsPage'));
const DocumentArchivePage = React.lazy(() => import('@/pages/DocumentArchivePage'));
const DocumentsArchivedPage = React.lazy(() => import('@/pages/DocumentsArchivedPage'));
const TimeTrackingPage = React.lazy(() => import('@/pages/TimeTrackingPage'));
const BillingPage = React.lazy(() => import('@/pages/BillingPage'));
const InvoiceFormPage = React.lazy(() => import('@/pages/InvoiceFormPage'));
const InvoiceDetailPage = React.lazy(() => import('@/pages/InvoiceDetailPage'));
const NotificationsPage = React.lazy(() => import('@/pages/NotificationsPage'));
const ActivityFeedPage = React.lazy(() => import('@/pages/ActivityFeedPage'));
const ReportsPage = React.lazy(() => import('@/pages/ReportsPage'));
const FirmPerformanceReport = React.lazy(() => import('@/pages/FirmPerformanceReport'));
const Employee360Report = React.lazy(() => import('@/pages/Employee360Report'));
const FinancialSummaryReport = React.lazy(() => import('@/pages/FinancialSummaryReport'));
const CaseAnalyticsReport = React.lazy(() => import('@/pages/CaseAnalyticsReport'));
const ErrandAnalyticsReport = React.lazy(() => import('@/pages/ErrandAnalyticsReport'));
const ClientAnalyticsReport = React.lazy(() => import('@/pages/ClientAnalyticsReport'));
const TimeUtilizationReport = React.lazy(() => import('@/pages/TimeUtilizationReport'));
const BillingAgingReport = React.lazy(() => import('@/pages/BillingAgingReport'));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'));
const AIDocumentDraftPage = React.lazy(() => import('@/pages/AIDocumentDraftPage'));
const AILegalResearchPage = React.lazy(() => import('@/pages/AILegalResearchPage'));
const AITranslatePage = React.lazy(() => import('@/pages/AITranslatePage'));
const ConflictCheckerPage = React.lazy(() => import('@/pages/ConflictCheckerPage'));
const TrustAccountingPage = React.lazy(() => import('@/pages/TrustAccountingPage'));

// Portal pages
const PortalDashboardPage = React.lazy(() => import('@/pages/portal/PortalDashboardPage'));
const PortalOrgPickerPage = React.lazy(() => import('@/pages/portal/PortalOrgPickerPage'));
const PortalCasesPage = React.lazy(() => import('@/pages/portal/PortalCasesPage'));
const PortalCaseDetailPage = React.lazy(() => import('@/pages/portal/PortalCaseDetailPage'));
const PortalErrandsPage = React.lazy(() => import('@/pages/portal/PortalErrandsPage'));
const PortalErrandDetailPage = React.lazy(() => import('@/pages/portal/PortalErrandDetailPage'));
const PortalDocumentsPage = React.lazy(() => import('@/pages/portal/PortalDocumentsPage'));
const PortalDocumentDetailPage = React.lazy(() => import('@/pages/portal/PortalDocumentDetailPage'));
const PortalMessagesPage = React.lazy(() => import('@/pages/portal/PortalMessagesPage'));
const PortalInvoicesPage = React.lazy(() => import('@/pages/portal/PortalInvoicesPage'));
const PortalInvoiceDetailPage = React.lazy(() => import('@/pages/portal/PortalInvoiceDetailPage'));
const PortalProfilePage = React.lazy(() => import('@/pages/portal/PortalProfilePage'));

// Admin pages
const AdminDashboardPage = React.lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminOrganizationsPage = React.lazy(() => import('@/pages/admin/AdminOrganizationsPage'));
const AdminUsersPage = React.lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminBackupsPage = React.lazy(() => import('@/pages/admin/AdminBackupsPage'));
const AdminAnalyticsPage = React.lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminAuditLogPage = React.lazy(() => import('@/pages/admin/AdminAuditLogPage'));
const AdminAnnouncementsPage = React.lazy(() => import('@/pages/admin/AdminAnnouncementsPage'));
const AdminSettingsPage = React.lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminSystemHealthPage = React.lazy(() => import('@/pages/admin/AdminSystemHealthPage'));
const AdminOrganizationDetailPage = React.lazy(() => import('@/pages/admin/AdminOrganizationDetailPage'));
const AdminRevenuePage = React.lazy(() => import('@/pages/admin/AdminRevenuePage'));

// Redirect stubs for removed placeholders
const ProfilePage = () => <Navigate to="/settings" replace />;
const MessagesPage = () => <Navigate to="/dashboard" replace />;

/** Empty Outlet wrapper used as the parent route element for the portal. */
const PortalRoot = () => <Outlet />;
const TeamPage = () => <Navigate to="/settings" replace />;

const SuperAdminOnly = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useAuth();
  return profile?.role === 'super_admin' ? <>{children}</> : <Navigate to="/admin/dashboard" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ErrorBoundary>
      <AuthProvider>
        <ImpersonationProvider>
        <TimerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LoginPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/login/staff" element={<StaffLoginPage />} />
                <Route path="/register" element={<Navigate to="/login/staff" replace />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/invite/:token" element={<InviteAcceptPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/portal/login" element={<PortalLoginPage />} />
                {/* Protected main routes */}
                <Route element={<ProtectedRoute allowedRoles={['firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant']}><MainLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/cases" element={<CasesPage />} />
                  <Route path="/cases/new" element={<CaseFormPage />} />
                  <Route path="/cases/:id/edit" element={<CaseFormPage />} />
                  <Route path="/cases/:id" element={<CaseDetailPage />} />
                  <Route path="/errands" element={<ErrandsPage />} />
                  <Route path="/errands/new" element={<ErrandFormPage />} />
                  <Route path="/errands/:id/edit" element={<ErrandFormPage />} />
                  <Route path="/errands/:id" element={<ErrandDetailPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                 <Route path="/documents" element={<DocumentsPage />} />
                 <Route path="/documents/archive" element={<DocumentArchivePage />} />
                 <Route path="/documents/archived" element={<DocumentsArchivedPage />} />
                  <Route path="/time-tracking" element={<TimeTrackingPage />} />
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/billing/new" element={<InvoiceFormPage />} />
                  <Route path="/billing/:id" element={<InvoiceDetailPage />} />
                  <Route path="/billing/:id/edit" element={<InvoiceFormPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/reports/firm-performance" element={<FirmPerformanceReport />} />
                  <Route path="/reports/employee-360" element={<Employee360Report />} />
                  <Route path="/reports/financial" element={<FinancialSummaryReport />} />
                  <Route path="/reports/cases" element={<CaseAnalyticsReport />} />
                  <Route path="/reports/errands" element={<ErrandAnalyticsReport />} />
                  <Route path="/reports/clients" element={<ClientAnalyticsReport />} />
                  <Route path="/reports/time" element={<TimeUtilizationReport />} />
                  <Route path="/reports/billing-aging" element={<BillingAgingReport />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/ai/draft" element={<AIDocumentDraftPage />} />
                  <Route path="/ai/research" element={<AILegalResearchPage />} />
                  <Route path="/ai/translate" element={<AITranslatePage />} />
                  <Route path="/conflict-checker" element={<ConflictCheckerPage />} />
                  <Route path="/trust-accounting" element={<TrustAccountingPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/activity" element={<ActivityFeedPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>

                {/* Client portal */}
                <Route
                  path="/portal"
                  element={
                    <ProtectedRoute>
                      <PortalOrgProvider>
                        {/* Outlet renders either the picker (full-screen) or the gated layout below */}
                        <PortalRoot />
                      </PortalOrgProvider>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/portal/dashboard" replace />} />
                  <Route path="select" element={<PortalOrgPickerPage />} />

                  {/* Everything below requires an active org (PortalGate) and renders inside ClientLayout */}
                  <Route element={<PortalGate><ClientLayout /></PortalGate>}>
                    <Route path="dashboard" element={<PortalDashboardPage />} />
                    <Route path="cases" element={<PortalCasesPage />} />
                    <Route path="cases/:id" element={<PortalCaseDetailPage />} />
                    <Route path="errands" element={<PortalErrandsPage />} />
                    <Route path="errands/:id" element={<PortalErrandDetailPage />} />
                    <Route path="documents" element={<PortalDocumentsPage />} />
                    <Route path="documents/:id" element={<PortalDocumentDetailPage />} />
                    <Route path="messages" element={<PortalMessagesPage />} />
                    <Route path="invoices" element={<PortalInvoicesPage />} />
                    <Route path="invoices/:id" element={<PortalInvoiceDetailPage />} />
                    <Route path="profile" element={<PortalProfilePage />} />
                  </Route>
                </Route>

                {/* Admin */}
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin', 'sales_admin']}><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="organizations" element={<AdminOrganizationsPage />} />
                  <Route path="users" element={<SuperAdminOnly><AdminUsersPage /></SuperAdminOnly>} />
                  <Route path="backups" element={<SuperAdminOnly><AdminBackupsPage /></SuperAdminOnly>} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="audit-log" element={<SuperAdminOnly><AdminAuditLogPage /></SuperAdminOnly>} />
                  <Route path="announcements" element={<SuperAdminOnly><AdminAnnouncementsPage /></SuperAdminOnly>} />
                  <Route path="settings" element={<SuperAdminOnly><AdminSettingsPage /></SuperAdminOnly>} />
                  <Route path="organizations/:id" element={<SuperAdminOnly><AdminOrganizationDetailPage /></SuperAdminOnly>} />
                  <Route path="revenue" element={<AdminRevenuePage />} />
                  <Route path="system-health" element={<SuperAdminOnly><AdminSystemHealthPage /></SuperAdminOnly>} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
        </TimerProvider>
        </ImpersonationProvider>
      </AuthProvider>
      </ErrorBoundary>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
