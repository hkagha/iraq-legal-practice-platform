import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { TimerProvider } from "@/contexts/TimerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MainLayout from "@/layouts/MainLayout";
import ClientLayout from "@/layouts/ClientLayout";
import AdminLayout from "@/layouts/AdminLayout";
import PlaceholderPage from "@/components/PlaceholderPage";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import NotFound from "./pages/NotFound";
import InviteAcceptPage from "@/pages/InviteAcceptPage";

import {
  LayoutDashboard, Scale, FileCheck, Users, Calendar, CheckSquare,
  FileText, Clock, Receipt, BarChart3, MessageSquare, Sparkles,
  UserCog, Settings, User, Building, CreditCard, Megaphone
} from "lucide-react";

const queryClient = new QueryClient();

// Main app pages
import CasesPage from '@/pages/CasesPage';
import CaseFormPage from '@/pages/CaseFormPage';
import CaseDetailPage from '@/pages/CaseDetailPage';
import ErrandsPage from '@/pages/ErrandsPage';
import ErrandFormPage from '@/pages/ErrandFormPage';
import ErrandDetailPage from '@/pages/ErrandDetailPage';
import ClientsPage from '@/pages/ClientsPage';
import ClientDetailPage from '@/pages/ClientDetailPage';
import CalendarPage from '@/pages/CalendarPage';
import TasksPage from '@/pages/TasksPage';
import DocumentsPage from '@/pages/DocumentsPage';
import TimeTrackingPage from '@/pages/TimeTrackingPage';
import BillingPage from '@/pages/BillingPage';
import InvoiceFormPage from '@/pages/InvoiceFormPage';
import InvoiceDetailPage from '@/pages/InvoiceDetailPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ActivityFeedPage from '@/pages/ActivityFeedPage';
import ReportsPage from '@/pages/ReportsPage';
import FirmPerformanceReport from '@/pages/FirmPerformanceReport';
import Employee360Report from '@/pages/Employee360Report';
import FinancialSummaryReport from '@/pages/FinancialSummaryReport';
import CaseAnalyticsReport from '@/pages/CaseAnalyticsReport';
import ErrandAnalyticsReport from '@/pages/ErrandAnalyticsReport';
import ClientAnalyticsReport from '@/pages/ClientAnalyticsReport';
import TimeUtilizationReport from '@/pages/TimeUtilizationReport';
import BillingAgingReport from '@/pages/BillingAgingReport';
const MessagesPage = () => <PlaceholderPage titleKey="sidebar.messages" icon={MessageSquare} />;
const TeamPage = () => <PlaceholderPage titleKey="sidebar.team" icon={UserCog} />;
import SettingsPage from '@/pages/SettingsPage';
import AIDocumentDraftPage from '@/pages/AIDocumentDraftPage';
import AILegalResearchPage from '@/pages/AILegalResearchPage';
import AITranslatePage from '@/pages/AITranslatePage';
const ProfilePage = () => <PlaceholderPage titleKey="common.profile" icon={User} />;

// Portal pages
import PortalDashboardPage from '@/pages/portal/PortalDashboardPage';
import PortalCasesPage from '@/pages/portal/PortalCasesPage';
import PortalCaseDetailPage from '@/pages/portal/PortalCaseDetailPage';
import PortalErrandsPage from '@/pages/portal/PortalErrandsPage';
import PortalErrandDetailPage from '@/pages/portal/PortalErrandDetailPage';
import PortalDocumentsPage from '@/pages/portal/PortalDocumentsPage';
import PortalMessagesPage from '@/pages/portal/PortalMessagesPage';
import PortalInvoicesPage from '@/pages/portal/PortalInvoicesPage';
import PortalInvoiceDetailPage from '@/pages/portal/PortalInvoiceDetailPage';
import PortalProfilePage from '@/pages/portal/PortalProfilePage';

// Admin pages
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminOrganizationsPage from '@/pages/admin/AdminOrganizationsPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminBackupsPage from '@/pages/admin/AdminBackupsPage';
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage';
import AdminAuditLogPage from '@/pages/admin/AdminAuditLogPage';
import AdminAnnouncementsPage from '@/pages/admin/AdminAnnouncementsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminSystemHealthPage from '@/pages/admin/AdminSystemHealthPage';

import ErrorBoundary from '@/components/ErrorBoundary';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ErrorBoundary>
      <AuthProvider>
        <TimerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/invite/:token" element={<InviteAcceptPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Protected main routes */}
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
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
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/activity" element={<ActivityFeedPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Client portal */}
              <Route path="/portal" element={<ProtectedRoute allowedRoles={['client']}><ClientLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/portal/dashboard" replace />} />
                <Route path="dashboard" element={<PortalDashboardPage />} />
                <Route path="cases" element={<PortalCasesPage />} />
                <Route path="cases/:id" element={<PortalCaseDetailPage />} />
                <Route path="errands" element={<PortalErrandsPage />} />
                <Route path="errands/:id" element={<PortalErrandDetailPage />} />
                <Route path="documents" element={<PortalDocumentsPage />} />
                <Route path="messages" element={<PortalMessagesPage />} />
                <Route path="invoices" element={<PortalInvoicesPage />} />
                <Route path="invoices/:id" element={<PortalInvoiceDetailPage />} />
                <Route path="profile" element={<PortalProfilePage />} />
              </Route>

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="organizations" element={<AdminOrganizationsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="backups" element={<AdminBackupsPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="audit-log" element={<AdminAuditLogPage />} />
                <Route path="announcements" element={<AdminAnnouncementsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="system-health" element={<AdminSystemHealthPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </TimerProvider>
      </AuthProvider>
      </ErrorBoundary>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
