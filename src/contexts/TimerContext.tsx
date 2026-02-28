import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TimerEntry {
  id: string;
  description: string;
  case_id: string | null;
  errand_id: string | null;
  client_id: string | null;
  timer_started_at: string;
  case_number?: string;
  errand_number?: string;
}

interface TimerContextType {
  activeTimer: TimerEntry | null;
  elapsedSeconds: number;
  isLoading: boolean;
  startTimer: (data: { description: string; case_id?: string; errand_id?: string; client_id?: string; is_billable?: boolean; billing_rate?: number }) => Promise<void>;
  stopTimer: () => Promise<void>;
  discardTimer: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [activeTimer, setActiveTimer] = useState<TimerEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const calcElapsed = useCallback((startedAt: string) => {
    return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  }, []);

  // Check for running timer on mount
  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    const checkTimer = async () => {
      const { data } = await supabase
        .from('time_entries')
        .select('id, description, case_id, errand_id, client_id, timer_started_at')
        .eq('user_id', user.id)
        .eq('is_timer_running', true)
        .maybeSingle();
      if (data && data.timer_started_at) {
        // Fetch linked entity numbers
        let case_number: string | undefined;
        let errand_number: string | undefined;
        if (data.case_id) {
          const { data: c } = await supabase.from('cases').select('case_number').eq('id', data.case_id).maybeSingle();
          case_number = c?.case_number;
        }
        if (data.errand_id) {
          const { data: e } = await supabase.from('errands').select('errand_number').eq('id', data.errand_id).maybeSingle();
          errand_number = e?.errand_number;
        }
        setActiveTimer({ ...data, timer_started_at: data.timer_started_at, case_number, errand_number });
        setElapsedSeconds(calcElapsed(data.timer_started_at));
      }
      setIsLoading(false);
    };
    checkTimer();
  }, [user, calcElapsed]);

  // Tick every second
  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calcElapsed(activeTimer.timer_started_at));
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeTimer, calcElapsed]);

  const startTimer = useCallback(async (data: { description: string; case_id?: string; errand_id?: string; client_id?: string; is_billable?: boolean; billing_rate?: number }) => {
    if (!user || !profile?.organization_id) return;
    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        description: data.description || 'Timer',
        case_id: data.case_id || null,
        errand_id: data.errand_id || null,
        client_id: data.client_id || null,
        is_billable: data.is_billable ?? true,
        billing_rate: data.billing_rate || null,
        duration_minutes: 1, // placeholder, will be updated on stop
        timer_started_at: new Date().toISOString(),
        is_timer_running: true,
        date: new Date().toISOString().split('T')[0],
      } as any)
      .select('id, description, case_id, errand_id, client_id, timer_started_at')
      .single();
    if (entry && entry.timer_started_at) {
      setActiveTimer({ ...entry, timer_started_at: entry.timer_started_at });
      setElapsedSeconds(0);
    }
  }, [user, profile]);

  const stopTimer = useCallback(async () => {
    if (!activeTimer) return;
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const now = new Date();
    const startedAt = new Date(activeTimer.timer_started_at);
    await supabase
      .from('time_entries')
      .update({
        is_timer_running: false,
        timer_started_at: null,
        duration_minutes: durationMinutes,
        start_time: startedAt.toTimeString().slice(0, 8),
        end_time: now.toTimeString().slice(0, 8),
      } as any)
      .eq('id', activeTimer.id);
    setActiveTimer(null);
    setElapsedSeconds(0);
  }, [activeTimer, elapsedSeconds]);

  const discardTimer = useCallback(async () => {
    if (!activeTimer) return;
    await supabase.from('time_entries').delete().eq('id', activeTimer.id);
    setActiveTimer(null);
    setElapsedSeconds(0);
  }, [activeTimer]);

  return (
    <TimerContext.Provider value={{ activeTimer, elapsedSeconds, isLoading, startTimer, stopTimer, discardTimer }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
