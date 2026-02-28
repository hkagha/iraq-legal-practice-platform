import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDateRange, type DateRangePreset } from './useReportData';
import { format, differenceInBusinessDays, eachDayOfInterval, isWeekend } from 'date-fns';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

export function useEmployee360Data(preset: DateRangePreset, selectedUserId: string | null) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [data, setData] = useState<any>(null);

  const range = useMemo(() => getDateRange(preset), [preset]);
  const startStr = format(range.start, 'yyyy-MM-dd');
  const endStr = format(range.end, 'yyyy-MM-dd');

  // Working days in period for utilization
  const workingDays = useMemo(() => {
    const days = eachDayOfInterval({ start: range.start, end: range.end });
    return days.filter(d => !isWeekend(d)).length;
  }, [range]);

  // Fetch team members
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('profiles')
      .select('id, first_name, last_name, first_name_ar, last_name_ar, email, role, avatar_url, created_at')
      .eq('organization_id', profile.organization_id)
      .in('role', ['firm_admin', 'lawyer', 'paralegal'])
      .order('first_name')
      .then(({ data }) => {
        if (data) setMembers(data as unknown as TeamMember[]);
      });
  }, [profile?.organization_id]);

  const fetchUserData = useCallback(async (userId: string) => {
    if (!profile?.organization_id) return null;
    const orgId = profile.organization_id;

    const [
      timeRes, caseTeamRes, tasksRes, errandsRes,
      hearingsRes, docsRes, notesRes, caseOutcomesRes,
    ] = await Promise.all([
      supabase.from('time_entries').select('id, duration_minutes, is_billable, entry_date, case_id, description')
        .eq('organization_id', orgId).eq('user_id', userId)
        .gte('entry_date', startStr).lte('entry_date', endStr),
      supabase.from('case_team_members').select('id, case_id, role')
        .eq('organization_id', orgId).eq('user_id', userId),
      supabase.from('tasks').select('id, status, completed_at, created_at')
        .eq('organization_id', orgId).eq('assigned_to', userId)
        .gte('created_at', startStr).lte('created_at', endStr),
      supabase.from('errands').select('id, status, completed_date')
        .eq('organization_id', orgId).eq('assigned_to', userId),
      supabase.from('case_hearings').select('id, hearing_date')
        .eq('organization_id', orgId)
        .gte('hearing_date', startStr).lte('hearing_date', endStr),
      supabase.from('documents').select('id')
        .eq('organization_id', orgId).eq('uploaded_by', userId)
        .gte('created_at', startStr).lte('created_at', endStr),
      supabase.from('case_notes').select('id')
        .eq('organization_id', orgId).eq('author_id', userId)
        .gte('created_at', startStr).lte('created_at', endStr),
      supabase.from('cases').select('id, status')
        .eq('organization_id', orgId)
        .in('status', ['won', 'lost', 'settled', 'closed']),
    ]);

    const timeEntries = timeRes.data || [];
    const caseTeam = caseTeamRes.data || [];
    const tasks = tasksRes.data || [];
    const errands = errandsRes.data || [];
    const docs = docsRes.data || [];
    const notes = notesRes.data || [];

    const totalMinutes = timeEntries.reduce((s: number, t: any) => s + Number(t.duration_minutes || 0), 0);
    const billableMinutes = timeEntries.filter((t: any) => t.is_billable).reduce((s: number, t: any) => s + Number(t.duration_minutes || 0), 0);
    const totalHours = +(totalMinutes / 60).toFixed(1);
    const billableHours = +(billableMinutes / 60).toFixed(1);
    const nonBillableHours = +(totalHours - billableHours).toFixed(1);
    const targetHours = workingDays * 8;
    const utilizationRate = targetHours > 0 ? Math.round((billableHours / targetHours) * 100) : 0;
    const avgHoursPerDay = workingDays > 0 ? +(totalHours / workingDays).toFixed(1) : 0;

    const casesAsLead = caseTeam.filter((c: any) => c.role === 'lead_attorney').length;
    const casesAsMember = caseTeam.length - casesAsLead;

    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
    const overdueTasks = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled').length;
    const completedErrands = errands.filter((e: any) => e.status === 'completed').length;

    // Lead attorney case outcomes
    const leadCaseIds = new Set(caseTeam.filter((c: any) => c.role === 'lead_attorney').map((c: any) => c.case_id));
    const caseOutcomes = (caseOutcomesRes.data || []).filter((c: any) => leadCaseIds.has(c.id));
    const outcomes = {
      won: caseOutcomes.filter((c: any) => c.status === 'won').length,
      lost: caseOutcomes.filter((c: any) => c.status === 'lost').length,
      settled: caseOutcomes.filter((c: any) => c.status === 'settled').length,
      closed: caseOutcomes.filter((c: any) => c.status === 'closed').length,
    };

    // Hours per day chart data
    const dayMap: Record<string, { billable: number; nonBillable: number }> = {};
    timeEntries.forEach((t: any) => {
      const d = t.entry_date;
      if (!dayMap[d]) dayMap[d] = { billable: 0, nonBillable: 0 };
      const mins = Number(t.duration_minutes || 0);
      if (t.is_billable) dayMap[d].billable += mins;
      else dayMap[d].nonBillable += mins;
    });
    const hoursPerDay = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: format(new Date(date), 'MMM d'),
        billable: +(v.billable / 60).toFixed(1),
        nonBillable: +(v.nonBillable / 60).toFixed(1),
      }));

    // Time by case
    const caseMap: Record<string, number> = {};
    timeEntries.forEach((t: any) => {
      const cid = t.case_id || 'uncategorized';
      caseMap[cid] = (caseMap[cid] || 0) + Number(t.duration_minutes || 0);
    });
    const timeByCase = Object.entries(caseMap).map(([caseId, mins]) => ({
      caseId,
      hours: +(mins / 60).toFixed(1),
    })).sort((a, b) => b.hours - a.hours);

    // Weekly task completion
    const weekMap: Record<string, number> = {};
    tasks.filter((t: any) => t.status === 'completed' && t.completed_at).forEach((t: any) => {
      const week = format(new Date(t.completed_at), 'MMM d');
      weekMap[week] = (weekMap[week] || 0) + 1;
    });
    const taskTrend = Object.entries(weekMap).map(([week, count]) => ({ week, count }));

    return {
      totalHours, billableHours, nonBillableHours, utilizationRate, avgHoursPerDay,
      casesHandled: caseTeam.length, casesAsLead, casesAsMember,
      completedTasks, overdueTasks, totalTasks: tasks.length,
      errandsAssigned: errands.length, completedErrands,
      documentsUploaded: docs.length, notesWritten: notes.length,
      outcomes, hoursPerDay, timeByCase, taskTrend,
    };
  }, [profile?.organization_id, startStr, endStr, workingDays]);

  // Fetch data for selected user or all
  const fetchData = useCallback(async () => {
    if (!profile?.organization_id || members.length === 0) return;
    setLoading(true);

    if (selectedUserId) {
      const userData = await fetchUserData(selectedUserId);
      setData({ individual: userData, team: null });
    } else {
      // Fetch summary for all members
      const teamData = await Promise.all(
        members.map(async (m) => {
          const d = await fetchUserData(m.id);
          return { member: m, ...d };
        })
      );
      setData({ individual: null, team: teamData });
    }
    setLoading(false);
  }, [profile?.organization_id, members, selectedUserId, fetchUserData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, members, range };
}
