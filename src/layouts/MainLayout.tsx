import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import TopHeader from '@/components/TopHeader';
import GlobalTimerBar from '@/components/time-tracking/GlobalTimerBar';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { logAdminAction } from '@/lib/adminAudit';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import MobileFAB from '@/components/MobileFAB';
import TaskFormModal from '@/components/tasks/TaskFormModal';
import EventFormModal from '@/components/calendar/EventFormModal';
import ClientFormSlideOver from '@/components/clients/ClientFormSlideOver';
import AIChatPanel from '@/components/ai/AIChatPanel';

export default function MainLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('qanuni_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);

  useEffect(() => {
    localStorage.setItem('qanuni_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const handleNewTask = useCallback(() => setShowTaskModal(true), []);
  const handleNewEvent = useCallback(() => setShowEventModal(true), []);
  const handleStartTimer = useCallback(() => navigate('/time-tracking'), [navigate]);
  const handleFocusSearch = useCallback(() => {
    const input = document.querySelector('header input[type="text"]') as HTMLInputElement;
    if (input) input.focus();
  }, []);
  const handleLogTime = useCallback(() => navigate('/time-tracking'), [navigate]);
  const handleNewClient = useCallback(() => setShowClientForm(true), []);

  const { isImpersonating, impersonatedOrgName, impersonatedOrgId, originalAdminId, endImpersonation } = useImpersonation();

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {isImpersonating && (
        <div className="bg-warning text-warning-foreground px-4 py-2 text-body-sm font-semibold flex items-center justify-center gap-3 z-50">
          <span>⚠️ VIEWING AS: {impersonatedOrgName}</span>
          <button onClick={async () => {
            if (originalAdminId && impersonatedOrgId) await logAdminAction(originalAdminId, 'impersonate_end', 'organization', impersonatedOrgId, impersonatedOrgName || '');
            endImpersonation(); navigate('/admin/dashboard');
          }} className="underline hover:no-underline">Exit Impersonation</button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 start-0 z-50 lg:hidden">
            <AppSidebar
              collapsed={false}
              onToggle={() => setCollapsed(!collapsed)}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          showMenu
          onMenuClick={() => setMobileOpen(true)}
        />
        <GlobalTimerBar />
        <a href="#main-content" className="skip-to-content">{/* Skip to content */}Skip to content</a>
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 2xl:p-8">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Keyboard shortcuts */}
      <KeyboardShortcuts
        onNewTask={handleNewTask}
        onNewEvent={handleNewEvent}
        onStartTimer={handleStartTimer}
        onFocusSearch={handleFocusSearch}
      />

      {/* Mobile FAB */}
      <MobileFAB
        onNewTask={handleNewTask}
        onNewEvent={handleNewEvent}
        onLogTime={handleLogTime}
        onNewClient={handleNewClient}
      />

      {/* Global modals */}
      {showTaskModal && (
        <TaskFormModal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} onSaved={() => setShowTaskModal(false)} />
      )}
      {showEventModal && (
        <EventFormModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} onSaved={() => setShowEventModal(false)} />
      )}
      <ClientFormSlideOver isOpen={showClientForm} onClose={() => setShowClientForm(false)} onSaved={() => setShowClientForm(false)} />

      {/* AI Chat Panel */}
      <AIChatPanel />
      </div>
    </div>
  );
}


import { LayoutDashboard, Scale, Calendar, CheckSquare, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

function MobileBottomNav() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard },
    { key: 'cases', path: '/cases', icon: Scale },
    { key: 'calendar', path: '/calendar', icon: Calendar },
    { key: 'tasks', path: '/tasks', icon: CheckSquare },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 h-16 bg-card shadow-[0_-2px_10px_rgba(0,0,0,0.08)] flex items-center justify-around lg:hidden z-30">
      {items.map(item => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 ${isActive ? 'text-accent' : 'text-muted-foreground'}`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{t(`sidebar.${item.key}`)}</span>
          </button>
        );
      })}
      <button className="flex flex-col items-center gap-0.5 text-muted-foreground">
        <MoreHorizontal className="h-5 w-5" />
        <span className="text-[10px]">More</span>
      </button>
    </div>
  );
}
