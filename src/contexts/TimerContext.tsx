import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface ActiveTimer {
  id: string;
  description: string;
  case_id?: string | null;
  errand_id?: string | null;
  timer_started_at: string;
  date: string;
}

interface StartTimerOpts {
  description?: string;
  case_id?: string;
  errand_id?: string;
  is_billable?: boolean;
}

interface TimerContextValue {
  isRunning: boolean;
  elapsedSeconds: number;
  activeTimer: ActiveTimer | null;
  startTimer: (opts: StartTimerOpts) => Promise<void>;
  stopTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  refresh: () => Promise<void>;
}

const TimerContext = createContext<TimerContextValue>({
  isRunning: false,
  elapsedSeconds: 0,
  activeTimer: null,
  startTimer: async () => {},
  stopTimer: async () => {},
  pauseTimer: async () => {},
  resumeTimer: async () => {},
  refresh: async () => {},
});

export const useTimer = () => useContext(TimerContext);

export function TimerProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const refresh = useCallback(async () => {
    if (!profile?.id || !profile?.organization_id) {
      setActiveTimer(null);
      return;
    }
    const { data } = await supabase
      .from('time_entries')
      .select('id, description, case_id, errand_id, timer_started_at, date')
      .eq('user_id', profile.id)
      .eq('organization_id', profile.organization_id)
      .eq('is_timer_running', true)
      .maybeSingle();
    if (data && data.timer_started_at) {
      setActiveTimer(data as ActiveTimer);
    } else {
      setActiveTimer(null);
      setElapsedSeconds(0);
    }
  }, [profile?.id, profile?.organization_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Tick every second
  useEffect(() => {
    if (!activeTimer?.timer_started_at) return;
    const tick = () => {
      const startMs = new Date(activeTimer.timer_started_at).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTimer?.timer_started_at]);

  const startTimer = useCallback(async (opts: StartTimerOpts) => {
    if (!profile?.id || !profile?.organization_id) {
      toast.error('Not signed in');
      return;
    }
    if (activeTimer) {
      toast.error('A timer is already running. Stop it first.');
      return;
    }
    const now = new Date();
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        organization_id: profile.organization_id,
        user_id: profile.id,
        description: opts.description || 'Timer',
        case_id: opts.case_id || null,
        errand_id: opts.errand_id || null,
        date: now.toISOString().split('T')[0],
        duration_minutes: 0,
        is_billable: opts.is_billable ?? true,
        is_timer_running: true,
        timer_started_at: now.toISOString(),
        status: 'draft',
      })
      .select('id, description, case_id, errand_id, timer_started_at, date')
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setActiveTimer(data as ActiveTimer);
    setElapsedSeconds(0);
  }, [profile?.id, profile?.organization_id, activeTimer]);

  const stopTimer = useCallback(async () => {
    if (!activeTimer) return;
    const startMs = new Date(activeTimer.timer_started_at).getTime();
    const minutes = Math.max(1, Math.round((Date.now() - startMs) / 60000));
    const now = new Date();
    const { error } = await supabase
      .from('time_entries')
      .update({
        is_timer_running: false,
        timer_started_at: null,
        duration_minutes: minutes,
        end_time: now.toTimeString().slice(0, 8),
      })
      .eq('id', activeTimer.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Logged ${minutes} minute${minutes === 1 ? '' : 's'}`);
    setActiveTimer(null);
    setElapsedSeconds(0);
  }, [activeTimer]);

  const pauseTimer = useCallback(async () => {
    if (!activeTimer) return;
    const startMs = new Date(activeTimer.timer_started_at).getTime();
    const minutes = Math.max(0, Math.round((Date.now() - startMs) / 60000));
    const { error } = await supabase
      .from('time_entries')
      .update({
        is_timer_running: false,
        timer_started_at: null,
        duration_minutes: minutes,
      })
      .eq('id', activeTimer.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setActiveTimer(null);
    setElapsedSeconds(0);
  }, [activeTimer]);

  const resumeTimer = useCallback(async () => {
    // No-op (paused entries are saved as drafts; user starts a new one)
  }, []);

  return (
    <TimerContext.Provider value={{
      isRunning: !!activeTimer,
      elapsedSeconds,
      activeTimer,
      startTimer,
      stopTimer,
      pauseTimer,
      resumeTimer,
      refresh,
    }}>
      {children}
    </TimerContext.Provider>
  );
}
