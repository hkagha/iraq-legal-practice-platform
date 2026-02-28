import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MainLayout from "@/layouts/MainLayout";
import ClientLayout from "@/layouts/ClientLayout";
import AdminLayout from "@/layouts/AdminLayout";
import PlaceholderPage from "@/components/PlaceholderPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import NotFound from "./pages/NotFound";

import {
  LayoutDashboard, Scale, FileCheck, Users, Calendar, CheckSquare,
  FileText, Clock, Receipt, BarChart3, MessageSquare, Sparkles,
  UserCog, Settings, User, Building, CreditCard, Megaphone
} from "lucide-react";

const queryClient = new QueryClient();

// Main app placeholder pages
const DashboardPage = () => <PlaceholderPage titleKey="dashboard.title" icon={LayoutDashboard} />;
const CasesPage = () => <PlaceholderPage titleKey="sidebar.cases" icon={Scale} />;
const ErrandsPage = () => <PlaceholderPage titleKey="sidebar.errands" icon={FileCheck} />;
const ClientsPage = () => <PlaceholderPage titleKey="sidebar.clients" icon={Users} />;
const CalendarPage = () => <PlaceholderPage titleKey="sidebar.calendar" icon={Calendar} />;
const TasksPage = () => <PlaceholderPage titleKey="sidebar.tasks" icon={CheckSquare} />;
const DocumentsPage = () => <PlaceholderPage titleKey="sidebar.documents" icon={FileText} />;
const TimeTrackingPage = () => <PlaceholderPage titleKey="sidebar.timeTracking" icon={Clock} />;
const BillingPage = () => <PlaceholderPage titleKey="sidebar.billing" icon={Receipt} />;
const ReportsPage = () => <PlaceholderPage titleKey="sidebar.reports" icon={BarChart3} />;
const MessagesPage = () => <PlaceholderPage titleKey="sidebar.messages" icon={MessageSquare} />;
const ResearchPage = () => <PlaceholderPage titleKey="sidebar.research" icon={Sparkles} />;
const TeamPage = () => <PlaceholderPage titleKey="sidebar.team" icon={UserCog} />;
const SettingsPage = () => <PlaceholderPage titleKey="sidebar.settings" icon={Settings} />;
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

              {/* Protected main routes */}
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/cases" element={<CasesPage />} />
                <Route path="/cases/new" element={<CasesPage />} />
                <Route path="/cases/:id" element={<CasesPage />} />
                <Route path="/errands" element={<ErrandsPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/:id" element={<ClientsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/time-tracking" element={<TimeTrackingPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/research" element={<ResearchPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/settings" element={<SettingsPage />} />
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
                <Route path="dashboard" element={<AdminDashboard />} />
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
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
