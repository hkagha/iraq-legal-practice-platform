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
import SuperAdminPage from "@/pages/SuperAdminPage";

import {
  LayoutDashboard, Scale, FileCheck, Users, Calendar, CheckSquare,
  FileText, Clock, Receipt, BarChart3, MessageSquare, Sparkles,
  UserCog, Settings, User, Building, CreditCard, Megaphone
} from "lucide-react";

const queryClient = new QueryClient();

// Main app placeholder pages
// DashboardPage imported above
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

const PortalDashboard = () => <PlaceholderPage titleKey="clientPortal.myDashboard" icon={LayoutDashboard} />;
const PortalCases = () => <PlaceholderPage titleKey="clientPortal.myCases" icon={Scale} />;
const PortalErrands = () => <PlaceholderPage titleKey="clientPortal.myErrands" icon={FileCheck} />;
const PortalDocuments = () => <PlaceholderPage titleKey="sidebar.documents" icon={FileText} />;
const PortalMessages = () => <PlaceholderPage titleKey="sidebar.messages" icon={MessageSquare} />;
const PortalInvoices = () => <PlaceholderPage titleKey="clientPortal.invoices" icon={Receipt} />;
const PortalProfile = () => <PlaceholderPage titleKey="clientPortal.myProfile" icon={User} />;

const AdminDashboard = () => <PlaceholderPage titleKey="admin.dashboard" icon={LayoutDashboard} />;
const AdminOrgs = () => <PlaceholderPage titleKey="admin.organizations" icon={Building} />;
const AdminUsers = () => <PlaceholderPage titleKey="admin.allUsers" icon={Users} />;
const AdminSubs = () => <PlaceholderPage titleKey="admin.subscriptions" icon={CreditCard} />;
const AdminAnalytics = () => <PlaceholderPage titleKey="admin.platformAnalytics" icon={BarChart3} />;
const AdminSettings = () => <PlaceholderPage titleKey="admin.systemSettings" icon={Settings} />;
const AdminAnnouncements = () => <PlaceholderPage titleKey="admin.announcements" icon={Megaphone} />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
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
                <Route path="dashboard" element={<PortalDashboard />} />
                <Route path="cases" element={<PortalCases />} />
                <Route path="errands" element={<PortalErrands />} />
                <Route path="documents" element={<PortalDocuments />} />
                <Route path="messages" element={<PortalMessages />} />
                <Route path="invoices" element={<PortalInvoices />} />
                <Route path="profile" element={<PortalProfile />} />
              </Route>

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin', 'sales_admin']}><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<SuperAdminPage />} />
                <Route path="organizations" element={<AdminOrgs />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="subscriptions" element={<AdminSubs />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="announcements" element={<AdminAnnouncements />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </TimerProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
