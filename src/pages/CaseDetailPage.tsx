import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SlideOver } from '@/components/ui/SlideOver';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormDatePicker } from '@/components/ui/FormDatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Scale, Pencil, MoreHorizontal, Archive, ArrowLeft, ArrowRight, User, Building2,
  Calendar, Clock, Plus, Eye, EyeOff, Pin, Trash2, Star, MessageSquare,
  FileText, Loader2, AlertTriangle, Phone, ChevronDown, FileCheck, Search,
} from 'lucide-react';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import EntityDocumentsTab from '@/components/documents/EntityDocumentsTab';
import CaseTimeBillingTab from '@/components/cases/CaseTimeBillingTab';
import CaseQuickTasks from '@/components/tasks/CaseQuickTasks';

const CASE_STATUS_ORDER = ['intake','active','pending_hearing','pending_judgment','on_hold','won','lost','settled','closed'] as const;
const STATUS_PROGRESS: Record<string, number> = {
  intake: 10, active: 25, pending_hearing: 40, pending_judgment: 60,
  on_hold: 50, won: 90, lost: 90, settled: 90, closed: 100, archived: 100,
};

const HEARING_TYPES = ['first_hearing','regular_hearing','evidence_hearing','witness_hearing','expert_hearing','pleading_hearing','judgment_hearing','appeal_hearing','mediation','arbitration','other'] as const;

const HEARING_STATUS_COLORS: Record<string, string> = {
  scheduled: '#3B82F6', completed: '#22C55E', adjourned: '#F59E0B', cancelled: '#64748B',
};

interface CaseFull {
  id: string; case_number: string; title: string; title_ar: string | null;
  description: string | null; description_ar: string | null;
  case_type: string; court_type: string | null; court_name: string | null; court_name_ar: string | null;
  court_location: string | null; court_case_number: string | null; court_chamber: string | null;
  judge_name: string | null; judge_name_ar: string | null;
  client_id: string; opposing_party_name: string | null; opposing_party_name_ar: string | null;
  opposing_party_lawyer: string | null; opposing_party_lawyer_ar: string | null;
  opposing_party_phone: string | null;
  filing_date: string | null; statute_of_limitations: string | null;
  estimated_value: number | null; estimated_value_currency: string | null;
  status: string; priority: string;
  billing_type: string | null; hourly_rate: number | null; fixed_fee_amount: number | null;
  retainer_amount: number | null; contingency_percentage: number | null;
  is_visible_to_client: boolean;
  created_by: string | null; updated_by: string | null;
  created_at: string; updated_at: string;
  outcome_summary: string | null; outcome_date: string | null;
}

interface ClientInfo {
  id: string; first_name: string | null; last_name: string | null;
  first_name_ar: string | null; last_name_ar: string | null;
  company_name: string | null; company_name_ar: string | null;
  client_type: string; email: string | null; phone: string | null;
}

interface TeamMember {
  user_id: string; role: string;
  first_name: string; last_name: string;
  first_name_ar: string | null; last_name_ar: string | null;
  avatar_url: string | null;
}

interface Hearing {
  id: string; hearing_date: string; hearing_time: string | null;
  hearing_type: string; court_room: string | null;
  judge_name: string | null; judge_name_ar: string | null;
  status: string; adjournment_reason: string | null; next_hearing_date: string | null;
  notes: string | null; outcome: string | null;
  is_visible_to_client: boolean; created_at: string;
}

interface CaseNote {
  id: string; content: string; content_ar: string | null;
  is_visible_to_client: boolean; is_pinned: boolean;
  author_id: string; created_at: string; updated_at: string;
  author_name?: string;
}

interface Activity {
  id: string; activity_type: string; title: string; title_ar: string | null;
  description: string | null; created_at: string; actor_id: string | null;
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, t, isRTL } = useLanguage();
  const { profile } = useAuth();

  const [caseData, setCaseData] = useState<CaseFull | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Hearing modal
  const [hearingSlideOver, setHearingSlideOver] = useState(false);
  const [editingHearing, setEditingHearing] = useState<Hearing | null>(null);
  const [hearingForm, setHearingForm] = useState({ hearing_date: undefined as Date | undefined, hearing_time: '', hearing_type: '', court_room: '', judge_name: '', judge_name_ar: '', notes: '', is_visible_to_client: true });
  const [savingHearing, setSavingHearing] = useState(false);

  // Complete hearing modal
  const [completeModal, setCompleteModal] = useState<Hearing | null>(null);
  const [completeOutcome, setCompleteOutcome] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');

  // Adjourn hearing modal
  const [adjournModal, setAdjournModal] = useState<Hearing | null>(null);
  const [adjournReason, setAdjournReason] = useState('');
  const [adjournNextDate, setAdjournNextDate] = useState<Date | undefined>(undefined);

  // Cancel hearing
  const [cancelHearingId, setCancelHearingId] = useState<string | null>(null);

  // Hearing filter
  const [hearingStatusFilter, setHearingStatusFilter] = useState('all');

  // Notes
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteVisible, setNewNoteVisible] = useState(false);
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [postingNote, setPostingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // Status change
  const [confirmStatusDialog, setConfirmStatusDialog] = useState<string | null>(null);
  const [outcomeModal, setOutcomeModal] = useState<string | null>(null);
  const [outcomeSummary, setOutcomeSummary] = useState('');
  const [outcomeDate, setOutcomeDate] = useState<Date | undefined>(undefined);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Activity
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');

  const [savingAction, setSavingAction] = useState(false);

  // Linked errands
  const [linkedErrands, setLinkedErrands] = useState<any[]>([]);
  const [timeEntriesCount, setTimeEntriesCount] = useState(0);
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [showLinkErrandModal, setShowLinkErrandModal] = useState(false);
  const [linkableErrands, setLinkableErrands] = useState<{ value: string; label: string; subtitle?: string }[]>([]);
  const [selectedLinkErrand, setSelectedLinkErrand] = useState('');

  // Fetch all data
  const fetchCase = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data: c, error } = await supabase.from('cases').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!c) { setNotFound(true); setIsLoading(false); return; }
      setCaseData(c as unknown as CaseFull);

      // Fetch related data in parallel
      const [clientRes, teamRes, hearingsRes, notesRes, activitiesRes] = await Promise.all([
        supabase.from('clients').select('id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,client_type,email,phone').eq('id', c.client_id).maybeSingle(),
        supabase.from('case_team_members').select('user_id,role,profiles(first_name,last_name,first_name_ar,last_name_ar,avatar_url)').eq('case_id', id),
        supabase.from('case_hearings').select('*').eq('case_id', id).order('hearing_date', { ascending: false }),
        supabase.from('case_notes').select('*,profiles(first_name,last_name,first_name_ar,last_name_ar)').eq('case_id', id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('case_activities').select('*').eq('case_id', id).order('created_at', { ascending: false }).range(0, 19),
      ]);

      if (clientRes.data) setClientInfo(clientRes.data as unknown as ClientInfo);
      if (teamRes.data) {
        setTeamMembers((teamRes.data as any[]).map(tm => {
          const p = tm.profiles || {};
          return { user_id: tm.user_id, role: tm.role, first_name: p.first_name || '', last_name: p.last_name || '', first_name_ar: p.first_name_ar, last_name_ar: p.last_name_ar, avatar_url: p.avatar_url };
        }));
      }
      if (hearingsRes.data) setHearings(hearingsRes.data as unknown as Hearing[]);
      if (notesRes.data) {
        setNotes((notesRes.data as any[]).map(n => {
          const p = n.profiles || {};
          const authorName = language === 'ar' && p.first_name_ar ? `${p.first_name_ar} ${p.last_name_ar || ''}` : `${p.first_name || ''} ${p.last_name || ''}`;
          return { ...n, profiles: undefined, author_name: authorName.trim() } as CaseNote;
        }));
      }
      if (activitiesRes.data) {
        setActivities(activitiesRes.data as unknown as Activity[]);
        setHasMoreActivities((activitiesRes.data as any[]).length === 20);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [id, language]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  // Fetch linked errands
  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('errands').select('id,errand_number,title,title_ar,status,total_steps,completed_steps,progress_percentage')
        .eq('case_id', id).order('created_at', { ascending: false }),
      supabase.from('time_entries').select('*', { count: 'exact', head: true }).eq('case_id', id).eq('is_timer_running', false),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('case_id', id),
    ]).then(([errandsRes, teRes, invRes]) => {
      if (errandsRes.data) setLinkedErrands(errandsRes.data);
      setTimeEntriesCount(teRes.count || 0);
      setInvoicesCount(invRes.count || 0);
    });
  }, [id, caseData?.updated_at]);

  // Fetch linkable errands (same client, no case_id)
  const openLinkErrandModal = async () => {
    if (!caseData) return;
    const { data } = await supabase.from('errands')
      .select('id,errand_number,title,title_ar,status')
      .eq('client_id', caseData.client_id)
      .is('case_id', null)
      .order('created_at', { ascending: false });
    if (data) {
      setLinkableErrands(data.map((e: any) => ({
        value: e.id,
        label: `${e.errand_number} — ${language === 'ar' && e.title_ar ? e.title_ar : e.title}`,
        subtitle: t(`statuses.errand.${e.status}`),
      })));
    }
    setSelectedLinkErrand('');
    setShowLinkErrandModal(true);
  };

  const linkErrand = async () => {
    if (!selectedLinkErrand || !caseData) return;
    setSavingAction(true);
    try {
      const { error } = await supabase.from('errands').update({ case_id: caseData.id } as any).eq('id', selectedLinkErrand);
      if (error) throw error;
      toast({ title: language === 'ar' ? 'تم ربط المعاملة' : 'Errand linked' });
      setShowLinkErrandModal(false);
      // Refresh
      const { data } = await supabase.from('errands').select('id,errand_number,title,title_ar,status,total_steps,completed_steps,progress_percentage')
        .eq('case_id', caseData.id).order('created_at', { ascending: false });
      if (data) setLinkedErrands(data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSavingAction(false); }
  };

  const getClientName = (c: ClientInfo) => {
    if (c.client_type === 'company') return language === 'ar' && c.company_name_ar ? c.company_name_ar : c.company_name || '';
    return language === 'ar' && c.first_name_ar ? `${c.first_name_ar} ${c.last_name_ar || ''}` : `${c.first_name || ''} ${c.last_name || ''}`.trim();
  };

  const getTeamMemberName = (tm: TeamMember) => language === 'ar' && tm.first_name_ar ? `${tm.first_name_ar} ${tm.last_name_ar || ''}` : `${tm.first_name} ${tm.last_name}`;

  const fmtDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return language === 'ar' ? format(d, 'dd MMMM yyyy', { locale: arLocale }) : format(d, 'MMM dd, yyyy');
  };

  const fmtRelative = (dateStr: string) => formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined });

  const caseTitle = caseData ? (language === 'ar' && caseData.title_ar ? caseData.title_ar : caseData.title) : '';

  // --- STATUS CHANGE ---
  const handleStatusChange = async (newStatus: string, summary?: string, date?: Date) => {
    if (!caseData || !profile?.organization_id) return;
    setIsChangingStatus(true);
    try {
      const payload: Record<string, any> = { status: newStatus, updated_by: profile.id };
      if (['closed', 'archived'].includes(newStatus)) { payload.closed_at = new Date().toISOString(); payload.closed_by = profile.id; }
      if (summary) payload.outcome_summary = summary;
      if (date) payload.outcome_date = date.toISOString().split('T')[0];
      const { error } = await supabase.from('cases').update(payload as any).eq('id', caseData.id);
      if (error) throw error;
      await supabase.from('case_activities').insert({ case_id: caseData.id, organization_id: profile.organization_id, actor_id: profile.id, activity_type: 'status_changed', title: `Status changed to ${newStatus}`, title_ar: `تم تغيير الحالة إلى ${t(`cases.statuses.${newStatus}`)}`, metadata: { new_status: newStatus } } as any);
      toast({ title: t('cases.statusChange.statusChanged') });
      fetchCase();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsChangingStatus(false); setConfirmStatusDialog(null); setOutcomeModal(null); setOutcomeSummary(''); setOutcomeDate(undefined);
    }
  };

  const initiateStatusChange = (newStatus: string) => {
    if (['closed', 'archived'].includes(newStatus)) setConfirmStatusDialog(newStatus);
    else if (['won', 'lost', 'settled'].includes(newStatus)) setOutcomeModal(newStatus);
    else handleStatusChange(newStatus);
  };

  // --- VISIBILITY TOGGLE ---
  const toggleVisibility = async () => {
    if (!caseData) return;
    const { error } = await supabase.from('cases').update({ is_visible_to_client: !caseData.is_visible_to_client } as any).eq('id', caseData.id);
    if (!error) setCaseData(prev => prev ? { ...prev, is_visible_to_client: !prev.is_visible_to_client } : prev);
  };

  // --- HEARINGS ---
  const openHearingForm = (hearing?: Hearing) => {
    if (hearing) {
      setEditingHearing(hearing);
      setHearingForm({ hearing_date: new Date(hearing.hearing_date), hearing_time: hearing.hearing_time || '', hearing_type: hearing.hearing_type, court_room: hearing.court_room || '', judge_name: hearing.judge_name || '', judge_name_ar: hearing.judge_name_ar || '', notes: hearing.notes || '', is_visible_to_client: hearing.is_visible_to_client });
    } else {
      setEditingHearing(null);
      setHearingForm({ hearing_date: undefined, hearing_time: '', hearing_type: '', court_room: '', judge_name: caseData?.judge_name || '', judge_name_ar: caseData?.judge_name_ar || '', notes: '', is_visible_to_client: true });
    }
    setHearingSlideOver(true);
  };

  const saveHearing = async () => {
    if (!hearingForm.hearing_date || !hearingForm.hearing_type || !caseData || !profile?.organization_id) return;
    setSavingHearing(true);
    try {
      const payload = {
        case_id: caseData.id, organization_id: profile.organization_id,
        hearing_date: hearingForm.hearing_date.toISOString().split('T')[0],
        hearing_time: hearingForm.hearing_time || null, hearing_type: hearingForm.hearing_type,
        court_room: hearingForm.court_room || null, judge_name: hearingForm.judge_name || null,
        judge_name_ar: hearingForm.judge_name_ar || null, notes: hearingForm.notes || null,
        is_visible_to_client: hearingForm.is_visible_to_client, created_by: profile.id,
      };
      if (editingHearing) {
        const { error } = await supabase.from('case_hearings').update(payload as any).eq('id', editingHearing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('case_hearings').insert(payload as any);
        if (error) throw error;
        await supabase.from('case_activities').insert({ case_id: caseData.id, organization_id: profile.organization_id, actor_id: profile.id, activity_type: 'hearing_scheduled', title: 'Hearing scheduled', title_ar: 'تمت جدولة جلسة', metadata: { hearing_type: hearingForm.hearing_type, hearing_date: payload.hearing_date } } as any);
        // Auto-update case status to pending_hearing if active
        if (caseData.status === 'active') {
          await supabase.from('cases').update({ status: 'pending_hearing' } as any).eq('id', caseData.id);
        }
      }
      toast({ title: t('cases.hearings.scheduled') });
      setHearingSlideOver(false);
      fetchCase();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSavingHearing(false); }
  };

  const markHearingComplete = async () => {
    if (!completeModal || !profile?.organization_id || !caseData) return;
    setSavingAction(true);
    try {
      const { error } = await supabase.from('case_hearings').update({ status: 'completed', outcome: completeOutcome || null, notes: completeNotes || completeModal.notes || null } as any).eq('id', completeModal.id);
      if (error) throw error;
      await supabase.from('case_activities').insert({ case_id: caseData.id, organization_id: profile.organization_id, actor_id: profile.id, activity_type: 'hearing_completed', title: 'Hearing completed', title_ar: 'تمت الجلسة' } as any);
      toast({ title: t('cases.hearings.completed') });
      setCompleteModal(null); setCompleteOutcome(''); setCompleteNotes('');
      fetchCase();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setSavingAction(false); }
  };

  const adjournHearing = async () => {
    if (!adjournModal || !profile?.organization_id || !caseData) return;
    setSavingAction(true);
    try {
      const updatePayload: Record<string, any> = { status: 'adjourned', adjournment_reason: adjournReason || null };
      if (adjournNextDate) updatePayload.next_hearing_date = adjournNextDate.toISOString().split('T')[0];
      const { error } = await supabase.from('case_hearings').update(updatePayload as any).eq('id', adjournModal.id);
      if (error) throw error;
      // Auto-create next hearing
      if (adjournNextDate) {
        await supabase.from('case_hearings').insert({ case_id: caseData.id, organization_id: profile.organization_id, hearing_date: adjournNextDate.toISOString().split('T')[0], hearing_type: adjournModal.hearing_type, court_room: adjournModal.court_room, judge_name: adjournModal.judge_name, judge_name_ar: adjournModal.judge_name_ar, is_visible_to_client: adjournModal.is_visible_to_client, created_by: profile.id } as any);
      }
      await supabase.from('case_activities').insert({ case_id: caseData.id, organization_id: profile.organization_id, actor_id: profile.id, activity_type: 'hearing_adjourned', title: 'Hearing adjourned', title_ar: 'تم تأجيل الجلسة' } as any);
      toast({ title: t('cases.hearings.adjourned') });
      setAdjournModal(null); setAdjournReason(''); setAdjournNextDate(undefined);
      fetchCase();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setSavingAction(false); }
  };

  const cancelHearing = async () => {
    if (!cancelHearingId || !profile?.organization_id || !caseData) return;
    setSavingAction(true);
    try {
      const { error } = await supabase.from('case_hearings').update({ status: 'cancelled' } as any).eq('id', cancelHearingId);
      if (error) throw error;
      toast({ title: t('cases.hearings.cancelled') });
      setCancelHearingId(null);
      fetchCase();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setSavingAction(false); }
  };

  // --- NOTES ---
  const postNote = async () => {
    if (!newNoteContent.trim() || !caseData || !profile?.organization_id) return;
    setPostingNote(true);
    try {
      const { error } = await supabase.from('case_notes').insert({ case_id: caseData.id, organization_id: profile.organization_id, author_id: profile.id, content: newNoteContent.trim(), is_visible_to_client: newNoteVisible, is_pinned: newNotePinned } as any);
      if (error) throw error;
      await supabase.from('case_activities').insert({ case_id: caseData.id, organization_id: profile.organization_id, actor_id: profile.id, activity_type: 'note_added', title: 'Note added', title_ar: 'تمت إضافة ملاحظة' } as any);
      toast({ title: t('cases.notes.saved') });
      setNewNoteContent(''); setNewNoteVisible(false); setNewNotePinned(false);
      fetchCase();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setPostingNote(false); }
  };

  const saveEditNote = async (noteId: string) => {
    const { error } = await supabase.from('case_notes').update({ content: editingNoteContent } as any).eq('id', noteId);
    if (!error) { toast({ title: t('cases.notes.saved') }); setEditingNoteId(null); fetchCase(); }
  };

  const deleteNote = async () => {
    if (!deleteNoteId) return;
    const { error } = await supabase.from('case_notes').delete().eq('id', deleteNoteId);
    if (!error) { toast({ title: t('cases.notes.deleted') }); setDeleteNoteId(null); fetchCase(); }
  };

  const toggleNotePin = async (note: CaseNote) => {
    await supabase.from('case_notes').update({ is_pinned: !note.is_pinned } as any).eq('id', note.id);
    fetchCase();
  };

  const toggleNoteVisibility = async (note: CaseNote) => {
    await supabase.from('case_notes').update({ is_visible_to_client: !note.is_visible_to_client } as any).eq('id', note.id);
    toast({ title: note.is_visible_to_client ? t('cases.notes.nowHidden') : t('cases.notes.nowVisible') });
    fetchCase();
  };

  // --- ACTIVITIES ---
  const loadMoreActivities = async () => {
    const nextPage = activityPage + 1;
    const pageSize = 20;
    let query = supabase.from('case_activities').select('*').eq('case_id', id!).order('created_at', { ascending: false }).range((nextPage - 1) * pageSize, nextPage * pageSize - 1);
    if (activityFilter !== 'all') query = query.eq('activity_type', activityFilter);
    const { data } = await query;
    if (data) {
      setActivities(prev => [...prev, ...(data as unknown as Activity[])]);
      setHasMoreActivities(data.length === pageSize);
      setActivityPage(nextPage);
    }
  };

  // Filtered hearings
  const filteredHearings = useMemo(() => {
    if (hearingStatusFilter === 'all') return hearings;
    return hearings.filter(h => h.status === hearingStatusFilter);
  }, [hearings, hearingStatusFilter]);

  // Upcoming hearings (for overview)
  const upcomingHearings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return hearings.filter(h => h.hearing_date >= today && h.status === 'scheduled').sort((a, b) => a.hearing_date.localeCompare(b.hearing_date)).slice(0, 3);
  }, [hearings]);

  const recentNotes = useMemo(() => notes.slice(0, 3), [notes]);

  // Billing display
  const getBillingDisplay = () => {
    if (!caseData) return '—';
    const bt = caseData.billing_type;
    if (bt === 'hourly' && caseData.hourly_rate) return `${caseData.hourly_rate} ${caseData.estimated_value_currency || 'IQD'}/hr`;
    if (bt === 'fixed_fee' && caseData.fixed_fee_amount) return `${caseData.fixed_fee_amount.toLocaleString()} ${caseData.estimated_value_currency || 'IQD'}`;
    if (bt === 'retainer' && caseData.retainer_amount) return `${caseData.retainer_amount.toLocaleString()} ${caseData.estimated_value_currency || 'IQD'}/mo`;
    if (bt === 'contingency' && caseData.contingency_percentage) return `${caseData.contingency_percentage}%`;
    return '—';
  };

  // ---- RENDER ----
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Scale size={64} className="text-muted-foreground/30 mb-4" />
        <h2 className="text-display-sm font-semibold text-foreground mb-2">{t('cases.detail.caseNotFound')}</h2>
        <p className="text-body-md text-muted-foreground mb-6 text-center max-w-md">{t('cases.detail.caseNotFoundSubtitle')}</p>
        <Button variant="outline" onClick={() => navigate('/cases')}><ArrowLeft size={16} className="me-2" />{t('cases.detail.backToCases')}</Button>
      </div>
    );
  }

  if (isLoading || !caseData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <div className="space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-8 w-96" /><Skeleton className="h-5 w-64" /></div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}</div>
          <div className="lg:col-span-2 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
        </div>
      </div>
    );
  }

  const statuteWarning = caseData.statute_of_limitations ? differenceInDays(new Date(caseData.statute_of_limitations), new Date()) <= 30 && differenceInDays(new Date(caseData.statute_of_limitations), new Date()) > 0 : false;

  const DetailRow = ({ label, value, warning }: { label: string; value: React.ReactNode; warning?: boolean }) => (
    <div className="flex justify-between items-start py-2.5 border-b border-border/50 last:border-0">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className={cn('text-body-md text-end max-w-[60%]', warning ? 'text-warning flex items-center gap-1' : 'text-foreground')}>{value || '—'}</span>
    </div>
  );

  const hearingTypeOptions = HEARING_TYPES.map(ht => ({ value: ht, label: t(`cases.hearingTypes.${ht}`) }));

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-body-sm text-muted-foreground mb-3">
        <Link to="/dashboard" className="text-accent hover:underline">{t('sidebar.dashboard')}</Link>
        <span>{isRTL ? ' \\ ' : ' / '}</span>
        <Link to="/cases" className="text-accent hover:underline">{t('cases.title')}</Link>
        <span>{isRTL ? ' \\ ' : ' / '}</span>
        <span className="text-foreground">{caseData.case_number}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div className="min-w-0">
          <p className="text-body-sm text-muted-foreground font-mono mb-1">{caseData.case_number}</p>
          <h1 className="text-display-lg font-bold text-foreground">{caseTitle}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center text-xs font-medium rounded-badge px-2 py-0.5 bg-muted text-muted-foreground">{t(`cases.caseTypes.${caseData.case_type}`)}</span>
            <StatusBadge status={caseData.priority} type="priority" />
            <StatusBadge status={caseData.status} type="case" />
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-body-sm text-muted-foreground">
            {clientInfo && (
              <Link to={`/clients/${clientInfo.id}`} className="flex items-center gap-1 text-accent hover:underline">
                <User size={14} /> {getClientName(clientInfo)}
              </Link>
            )}
            {caseData.court_name && <span className="flex items-center gap-1"><Building2 size={14} /> {language === 'ar' && caseData.court_name_ar ? caseData.court_name_ar : caseData.court_name}</span>}
            {caseData.filing_date && <span className="flex items-center gap-1"><Calendar size={14} /> {fmtDate(caseData.filing_date)}</span>}
            {caseData.billing_type && <span className="flex items-center gap-1"><Clock size={14} /> {t(`cases.billingTypes.${caseData.billing_type}`)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" className="h-10" onClick={() => navigate(`/cases/${caseData.id}/edit`)}><Pencil size={16} className="me-2" /> {t('common.edit')}</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10">
                <StatusBadge status={caseData.status} type="case" size="sm" />
                <ChevronDown size={14} className="ms-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
              {CASE_STATUS_ORDER.map(s => (
                <DropdownMenuItem key={s} disabled={caseData.status === s} onClick={() => initiateStatusChange(s)}>
                  <StatusBadge status={s} type="case" size="sm" />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10"><MoreHorizontal size={18} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
              <DropdownMenuItem><Archive size={14} className="me-2" /> {t('cases.detail.archive')}</DropdownMenuItem>
              <DropdownMenuItem><FileText size={14} className="me-2" /> {t('cases.detail.exportPdf')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 mt-4">
        <Progress value={STATUS_PROGRESS[caseData.status] || 0} className="h-1" />
        <div className="flex justify-between mt-1.5">
          {CASE_STATUS_ORDER.map(s => (
            <div key={s} className="flex flex-col items-center" style={{ width: `${100 / CASE_STATUS_ORDER.length}%` }}>
              <div className={cn('w-2 h-2 rounded-full', caseData.status === s ? 'bg-accent' : 'bg-muted')} />
              <span className={cn('text-[9px] mt-0.5 hidden sm:block', caseData.status === s ? 'text-accent font-medium' : 'text-muted-foreground')}>{t(`cases.statuses.${s}`)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-0 overflow-x-auto">
          {[
            { key: 'overview', label: t('cases.detail.overview') },
            { key: 'hearings', label: t('cases.detail.hearings'), count: hearings.length },
            { key: 'notes', label: t('cases.detail.notes'), count: notes.length },
            { key: 'documents', label: t('cases.detail.documents'), count: undefined },
            { key: 'timeBilling', label: t('cases.detail.timeBilling'), count: timeEntriesCount + invoicesCount },
            { key: 'activity', label: t('cases.detail.activity') },
          ].map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} className={cn(
              'rounded-none border-b-2 border-transparent px-5 py-3 text-body-md font-medium text-muted-foreground',
              'data-[state=active]:border-accent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent',
              'hover:text-foreground hover:bg-muted/50',
            )}>
              {tab.label}
              {tab.count !== undefined && <span className="ms-2 text-body-sm bg-muted text-muted-foreground rounded-badge px-2 py-0.5">{tab.count}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              {/* Case Summary */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-heading-sm font-semibold text-foreground mb-3">{t('cases.detail.caseSummary')}</h3>
                {caseData.description ? <p className="text-body-md text-muted-foreground whitespace-pre-wrap">{language === 'ar' && caseData.description_ar ? caseData.description_ar : caseData.description}</p> : <p className="text-body-md text-muted-foreground italic">{t('cases.detail.noDescription')}</p>}
              </div>

              {/* Opposing Party */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-heading-sm font-semibold text-foreground mb-3">{t('cases.detail.opposingParty')}</h3>
                {caseData.opposing_party_name ? (
                  <div className="space-y-2">
                    <DetailRow label={t('cases.fields.opposingPartyName')} value={language === 'ar' && caseData.opposing_party_name_ar ? caseData.opposing_party_name_ar : caseData.opposing_party_name} />
                    {caseData.opposing_party_lawyer && <DetailRow label={t('cases.fields.opposingPartyLawyer')} value={caseData.opposing_party_lawyer} />}
                    {caseData.opposing_party_phone && <DetailRow label={t('cases.fields.opposingPartyPhone')} value={<a href={`tel:${caseData.opposing_party_phone}`} className="text-accent hover:underline">{caseData.opposing_party_phone}</a>} />}
                  </div>
                ) : <p className="text-body-md text-muted-foreground italic">{t('cases.detail.noOpposingParty')}</p>}
              </div>

              {/* Upcoming Hearings */}
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-heading-sm font-semibold text-foreground">{t('cases.detail.upcomingHearings')}</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="link" size="sm" className="text-accent p-0 h-auto" onClick={() => setActiveTab('hearings')}>{t('dashboard.viewAll')}</Button>
                    <Button variant="outline" size="sm" onClick={() => openHearingForm()}><Plus size={14} className="me-1" />{t('cases.detail.scheduleHearing')}</Button>
                  </div>
                </div>
                {upcomingHearings.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground italic">{t('cases.detail.noUpcomingHearings')}</p>
                ) : upcomingHearings.map(h => {
                  const d = new Date(h.hearing_date);
                  const isNear = differenceInDays(d, new Date()) <= 3;
                  return (
                    <div key={h.id} className={cn('flex items-start gap-3 py-3 border-b border-border/50 last:border-0', isNear && 'border-s-[3px] border-s-destructive ps-3')}>
                      <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground uppercase">{format(d, 'MMM')}</span>
                        <span className="text-heading-sm font-bold text-foreground leading-none">{format(d, 'dd')}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-md font-medium text-foreground">{t(`cases.hearingTypes.${h.hearing_type}`)}</p>
                        {h.hearing_time && <p className="text-body-sm text-muted-foreground">{h.hearing_time}</p>}
                        {h.court_room && <p className="text-body-sm text-muted-foreground">{h.court_room}</p>}
                      </div>
                      <StatusBadge status={h.status} type="custom" customColor={HEARING_STATUS_COLORS[h.status]} className="flex-shrink-0" />
                    </div>
                  );
                })}
              </div>

              {/* Linked Errands */}
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-heading-sm font-semibold text-foreground">{t('errands.linkedErrands')}</h3>
                  <Button variant="outline" size="sm" onClick={openLinkErrandModal}><Plus size={14} className="me-1" />{t('errands.linkErrand')}</Button>
                </div>
                {linkedErrands.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground italic">{t('errands.noLinkedErrands')}</p>
                ) : linkedErrands.map((e: any) => {
                  const pct = e.total_steps > 0 ? Math.round(((e.completed_steps || 0) / e.total_steps) * 100) : 0;
                  return (
                    <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm text-muted-foreground font-mono">{e.errand_number}</p>
                        <Link to={`/errands/${e.id}`} className="text-body-md font-medium text-accent hover:underline">
                          {language === 'ar' && e.title_ar ? e.title_ar : e.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16">
                          <Progress value={pct} className="h-1" />
                        </div>
                        <span className="text-body-sm text-muted-foreground">{e.completed_steps || 0}/{e.total_steps || 0}</span>
                        <StatusBadge status={e.status} type="errand" size="sm" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent Notes */}
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-heading-sm font-semibold text-foreground">{t('cases.detail.recentNotes')}</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="link" size="sm" className="text-accent p-0 h-auto" onClick={() => setActiveTab('notes')}>{t('dashboard.viewAll')}</Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('notes')}><Plus size={14} className="me-1" />{t('cases.detail.addNote')}</Button>
                  </div>
                </div>
                {recentNotes.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground italic">{t('cases.detail.noNotesYet')}</p>
                ) : recentNotes.map(n => (
                  <div key={n.id} className="py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-medium text-accent">{n.author_name?.[0] || '?'}</div>
                      <span className="text-body-sm font-medium text-foreground">{n.author_name}</span>
                      <span className="text-body-sm text-muted-foreground">{fmtRelative(n.created_at)}</span>
                      {n.is_pinned && <Pin size={12} className="text-accent" />}
                      {n.is_visible_to_client && <Eye size={12} className="text-muted-foreground" />}
                    </div>
                    <p className="text-body-md text-muted-foreground line-clamp-2">{n.content}</p>
                  </div>
                ))}
              </div>

              {/* Quick Tasks */}
              {caseData && <CaseQuickTasks caseId={caseData.id} />}
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Case Details */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-heading-sm font-semibold text-foreground mb-3">{t('cases.detail.caseDetails')}</h3>
                <DetailRow label={t('cases.caseNumber')} value={<span className="font-mono">{caseData.case_number}</span>} />
                <DetailRow label={t('common.status')} value={<StatusBadge status={caseData.status} type="case" />} />
                <DetailRow label={t('common.priority')} value={<StatusBadge status={caseData.priority} type="priority" />} />
                <DetailRow label={t('cases.fields.caseType')} value={t(`cases.caseTypes.${caseData.case_type}`)} />
                {caseData.court_type && <DetailRow label={t('cases.fields.courtType')} value={t(`cases.courtTypes.${caseData.court_type}`)} />}
                <DetailRow label={t('cases.fields.courtName')} value={caseData.court_name} />
                <DetailRow label={t('cases.fields.courtCaseNumber')} value={caseData.court_case_number} />
                <DetailRow label={t('cases.fields.courtChamber')} value={caseData.court_chamber} />
                <DetailRow label={t('cases.fields.judgeName')} value={caseData.judge_name} />
                <DetailRow label={t('cases.fields.filingDate')} value={fmtDate(caseData.filing_date)} />
                <DetailRow label={t('cases.fields.statuteOfLimitations')} value={statuteWarning ? <><AlertTriangle size={14} /> {fmtDate(caseData.statute_of_limitations)}</> : fmtDate(caseData.statute_of_limitations)} warning={statuteWarning} />
                <DetailRow label={t('cases.fields.estimatedValue')} value={caseData.estimated_value ? `${caseData.estimated_value.toLocaleString()} ${caseData.estimated_value_currency || 'IQD'}` : null} />
                <DetailRow label={t('cases.fields.billingType')} value={caseData.billing_type ? t(`cases.billingTypes.${caseData.billing_type}`) : null} />
                <DetailRow label={t('cases.detail.rate')} value={getBillingDisplay()} />
                <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                  <span className="text-body-sm text-muted-foreground">{t('cases.detail.visibleToClient')}</span>
                  <Switch checked={caseData.is_visible_to_client} onCheckedChange={toggleVisibility} />
                </div>
                <DetailRow label={t('cases.detail.createdBy')} value={fmtDate(caseData.created_at)} />
                <DetailRow label={t('cases.detail.lastUpdated')} value={fmtRelative(caseData.updated_at)} />
              </div>

              {/* Team */}
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-heading-sm font-semibold text-foreground">{t('cases.detail.team')}</h3>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${caseData.id}/edit`)}>{t('cases.detail.manageTeam')}</Button>
                </div>
                {teamMembers.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground italic">{t('cases.detail.noTeamMembers')}</p>
                ) : teamMembers.map(tm => (
                  <div key={tm.user_id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">{tm.first_name[0]}{tm.last_name[0]}</div>
                    <div className="min-w-0 flex-1">
                      <span className="text-body-md font-medium text-foreground">{getTeamMemberName(tm)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {tm.role === 'lead' && <Star size={12} className="text-accent fill-accent" />}
                      <span className={cn('text-[11px] font-medium rounded-badge px-2 py-0.5', tm.role === 'lead' ? 'bg-accent/10 text-accent' : tm.role === 'member' ? 'bg-info-light text-info' : 'bg-muted text-muted-foreground')}>
                        {t(`cases.teamRoles.${tm.role}`)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Client */}
              {clientInfo && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="text-heading-sm font-semibold text-foreground mb-3">{t('cases.detail.client')}</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium text-accent">{getClientName(clientInfo)[0]}</div>
                    <div>
                      <Link to={`/clients/${clientInfo.id}`} className="text-body-md font-medium text-accent hover:underline">{getClientName(clientInfo)}</Link>
                      <span className="ms-2 text-xs font-medium rounded-badge px-1.5 py-0.5 bg-muted text-muted-foreground">{clientInfo.client_type === 'individual' ? t('clients.individual') : t('clients.company')}</span>
                    </div>
                  </div>
                  {clientInfo.email && <p className="text-body-sm text-muted-foreground mt-2">{clientInfo.email}</p>}
                  {clientInfo.phone && <p className="text-body-sm text-muted-foreground">{clientInfo.phone}</p>}
                  <Link to={`/clients/${clientInfo.id}`} className="text-body-sm text-accent hover:underline mt-2 block">{t('cases.detail.viewClientProfile')}</Link>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* HEARINGS TAB */}
        <TabsContent value="hearings" className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-heading-lg font-semibold text-foreground">{t('cases.hearings.title')}</h2>
            <div className="flex items-center gap-2">
              <FormSelect value={hearingStatusFilter} onValueChange={setHearingStatusFilter} options={[{ value: 'all', label: t('common.all') }, ...['scheduled','completed','adjourned','cancelled'].map(s => ({ value: s, label: t(`cases.hearingStatuses.${s}`) }))]} className="w-40" />
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => openHearingForm()}><Plus size={16} className="me-1" />{t('cases.hearings.scheduleHearing')}</Button>
            </div>
          </div>

          {filteredHearings.length === 0 ? (
            <EmptyState icon={Calendar} title={t('cases.hearings.noHearings')} titleAr={t('cases.hearings.noHearings')} actionLabel={t('cases.hearings.scheduleFirst')} actionLabelAr={t('cases.hearings.scheduleFirst')} onAction={() => openHearingForm()} />
          ) : (
            <div className="relative">
              <div className={cn('absolute top-0 bottom-0 w-0.5 bg-border', isRTL ? 'right-5' : 'left-5')} />
              {filteredHearings.map(h => {
                const d = new Date(h.hearing_date);
                const dotColor = HEARING_STATUS_COLORS[h.status] || '#64748B';
                return (
                  <div key={h.id} className={cn('relative mb-4', isRTL ? 'pr-12' : 'pl-12')}>
                    <div className={cn('absolute top-5 w-3 h-3 rounded-full border-2 border-card', isRTL ? 'right-[14px]' : 'left-[14px]')} style={{ backgroundColor: dotColor }} />
                    <div className="bg-card border border-border rounded-lg p-4">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-heading-sm font-semibold text-foreground">{fmtDate(h.hearing_date)}</span>
                        {h.hearing_time && <span className="text-body-md text-muted-foreground">{h.hearing_time}</span>}
                        <StatusBadge status={h.status} type="custom" customColor={dotColor} />
                      </div>
                      <p className="text-heading-sm font-medium text-foreground mb-2">{t(`cases.hearingTypes.${h.hearing_type}`)}</p>
                      <div className="flex flex-wrap gap-4 text-body-sm text-muted-foreground mb-2">
                        {h.court_room && <span>🏛 {t('cases.hearings.courtRoom')}: {h.court_room}</span>}
                        {h.judge_name && <span>👤 {t('cases.hearings.judgeName')}: {h.judge_name}</span>}
                      </div>
                      {h.notes && <p className="text-body-sm text-muted-foreground mb-2">{h.notes}</p>}
                      {h.status === 'adjourned' && h.adjournment_reason && <p className="text-body-sm text-warning mb-1">{t('cases.hearings.adjournReason')}: {h.adjournment_reason}</p>}
                      {h.status === 'adjourned' && h.next_hearing_date && <p className="text-body-sm text-muted-foreground mb-1">{t('cases.hearings.nextHearingDate')}: {fmtDate(h.next_hearing_date)}</p>}
                      {h.status === 'completed' && h.outcome && <p className="text-body-sm text-success mb-1">{t('cases.hearings.hearingOutcome')}: {h.outcome}</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={() => openHearingForm(h)}><Pencil size={12} className="me-1" />{t('common.edit')}</Button>
                        {h.status === 'scheduled' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setCompleteModal(h)}>{t('cases.hearings.markComplete')}</Button>
                            <Button variant="outline" size="sm" onClick={() => setAdjournModal(h)}>{t('cases.hearings.adjourn')}</Button>
                            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setCancelHearingId(h.id)}>{t('cases.hearings.cancelHearing')}</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* NOTES TAB */}
        <TabsContent value="notes" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-lg font-semibold text-foreground">{t('cases.notes.title')}</h2>
          </div>

          {/* Add note form */}
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <FormTextarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} placeholder={t('cases.notes.addNotePlaceholder')} className="min-h-[80px] mb-3" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-body-sm text-muted-foreground cursor-pointer">
                  <Checkbox checked={newNoteVisible} onCheckedChange={(v) => setNewNoteVisible(!!v)} /> {t('cases.notes.visibleToClient')}
                </label>
                <label className="flex items-center gap-2 text-body-sm text-muted-foreground cursor-pointer">
                  <Checkbox checked={newNotePinned} onCheckedChange={(v) => setNewNotePinned(!!v)} /> {t('cases.notes.pinNote')}
                </label>
              </div>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm" onClick={postNote} disabled={!newNoteContent.trim() || postingNote}>
                {postingNote && <Loader2 size={14} className="animate-spin me-1" />} {t('cases.notes.postNote')}
              </Button>
            </div>
          </div>

          {notes.length === 0 ? (
            <EmptyState icon={MessageSquare} title={t('cases.notes.noNotes')} titleAr={t('cases.notes.noNotes')} subtitle={t('cases.notes.noNotesSubtitle')} subtitleAr={t('cases.notes.noNotesSubtitle')} />
          ) : notes.map(n => (
            <div key={n.id} className={cn('bg-card border border-border rounded-lg p-4 mb-3', n.is_pinned && 'border-s-[3px] border-s-accent')}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-medium text-accent">{n.author_name?.[0] || '?'}</div>
                  <span className="text-body-sm font-medium text-foreground">{n.author_name}</span>
                  <span className="text-body-sm text-muted-foreground">{fmtRelative(n.created_at)}</span>
                  {n.is_pinned && <span className="text-[11px] bg-accent/10 text-accent rounded-badge px-1.5 py-0.5">{t('cases.notes.pinned')}</span>}
                  {n.is_visible_to_client && <Eye size={12} className="text-muted-foreground" />}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal size={14} /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                    <DropdownMenuItem onClick={() => { setEditingNoteId(n.id); setEditingNoteContent(n.content); }}><Pencil size={12} className="me-2" />{t('cases.notes.editNote')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleNotePin(n)}><Pin size={12} className="me-2" />{n.is_pinned ? t('cases.notes.unpin') : t('cases.notes.pin')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleNoteVisibility(n)}>{n.is_visible_to_client ? <EyeOff size={12} className="me-2" /> : <Eye size={12} className="me-2" />}{t('cases.notes.toggleVisibility')}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteNoteId(n.id)}><Trash2 size={12} className="me-2" />{t('cases.notes.deleteNote')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {editingNoteId === n.id ? (
                <div>
                  <FormTextarea value={editingNoteContent} onChange={e => setEditingNoteContent(e.target.value)} className="min-h-[60px] mb-2" />
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEditNote(n.id)}>{t('common.save')}</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)}>{t('common.cancel')}</Button>
                  </div>
                </div>
              ) : (
                <p className="text-body-md text-muted-foreground whitespace-pre-wrap">{n.content}</p>
              )}
            </div>
          ))}
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-6">
          <EntityDocumentsTab entityType="case" entityId={id!} caseInfo={caseData ? { id: caseData.id, case_number: caseData.case_number, title: caseData.title } : undefined} />
        </TabsContent>

        {/* TIME & BILLING TAB */}
        <TabsContent value="timeBilling" className="mt-6">
          <CaseTimeBillingTab caseId={id!} clientId={caseData?.client_id} caseTitle={caseTitle} />
        </TabsContent>

        {/* ACTIVITY TAB */}
        <TabsContent value="activity" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-lg font-semibold text-foreground">{t('cases.detail.activity')}</h2>
          </div>
          {activities.length === 0 ? (
            <EmptyState icon={FileText} title={t('cases.detail.noActivityYet')} titleAr={t('cases.detail.noActivityYet')} size="sm" />
          ) : (
            <div className="space-y-3">
              {activities.map(a => (
                <div key={a.id} className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md text-foreground">{language === 'ar' && a.title_ar ? a.title_ar : a.title}</p>
                    {a.description && <p className="text-body-sm text-muted-foreground">{a.description}</p>}
                    <p className="text-body-sm text-muted-foreground mt-1">{fmtRelative(a.created_at)}</p>
                  </div>
                </div>
              ))}
              {hasMoreActivities && (
                <Button variant="outline" className="w-full" onClick={loadMoreActivities}>{t('cases.detail.loadMore')}</Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* === MODALS === */}

      {/* Schedule/Edit Hearing SlideOver */}
      <SlideOver isOpen={hearingSlideOver} onClose={() => setHearingSlideOver(false)} title={editingHearing ? t('common.edit') : t('cases.hearings.scheduleHearing')} titleAr={editingHearing ? t('common.edit') : t('cases.hearings.scheduleHearing')} width="md"
        footer={<><Button variant="outline" onClick={() => setHearingSlideOver(false)}>{t('common.cancel')}</Button><Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveHearing} disabled={savingHearing || !hearingForm.hearing_date || !hearingForm.hearing_type}>{savingHearing && <Loader2 size={14} className="animate-spin me-1" />}{t('common.save')}</Button></>}
      >
        <div className="space-y-4">
          <FormField label={t('cases.hearings.hearingDate')} required><FormDatePicker value={hearingForm.hearing_date} onChange={d => setHearingForm(f => ({ ...f, hearing_date: d }))} /></FormField>
          <FormField label={t('cases.hearings.hearingTime')}><FormInput type="time" value={hearingForm.hearing_time} onChange={e => setHearingForm(f => ({ ...f, hearing_time: e.target.value }))} /></FormField>
          <FormField label={t('cases.hearings.hearingType')} required><FormSelect value={hearingForm.hearing_type} onValueChange={v => setHearingForm(f => ({ ...f, hearing_type: v }))} options={hearingTypeOptions} /></FormField>
          <FormField label={t('cases.hearings.courtRoom')}><FormInput value={hearingForm.court_room} onChange={e => setHearingForm(f => ({ ...f, court_room: e.target.value }))} /></FormField>
          <FormField label={t('cases.hearings.judgeName')}><FormInput value={hearingForm.judge_name} onChange={e => setHearingForm(f => ({ ...f, judge_name: e.target.value }))} /></FormField>
          <FormField label={t('cases.hearings.judgeNameAr')}><FormInput value={hearingForm.judge_name_ar} onChange={e => setHearingForm(f => ({ ...f, judge_name_ar: e.target.value }))} dir="rtl" /></FormField>
          <FormField label={t('cases.hearings.notes')}><FormTextarea value={hearingForm.notes} onChange={e => setHearingForm(f => ({ ...f, notes: e.target.value }))} /></FormField>
          <label className="flex items-center gap-2 text-body-sm cursor-pointer"><Checkbox checked={hearingForm.is_visible_to_client} onCheckedChange={v => setHearingForm(f => ({ ...f, is_visible_to_client: !!v }))} /> {t('cases.hearings.visibleToClient')}</label>
        </div>
      </SlideOver>

      {/* Complete Hearing Modal */}
      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setCompleteModal(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-card rounded-modal shadow-xl p-6 max-w-[480px] w-[90%] mx-auto space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-heading-lg text-foreground">{t('cases.hearings.hearingOutcome')}</h3>
            <FormField label={t('cases.hearings.whatHappened')} required><FormTextarea value={completeOutcome} onChange={e => setCompleteOutcome(e.target.value)} /></FormField>
            <FormField label={t('cases.hearings.notes')}><FormTextarea value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} /></FormField>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCompleteModal(null)}>{t('common.cancel')}</Button>
              <Button className="flex-1 bg-accent text-accent-foreground" onClick={markHearingComplete} disabled={savingAction}>{savingAction && <Loader2 size={14} className="animate-spin me-1" />}{t('common.confirm')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Adjourn Hearing Modal */}
      {adjournModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setAdjournModal(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-card rounded-modal shadow-xl p-6 max-w-[480px] w-[90%] mx-auto space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-heading-lg text-foreground">{t('cases.hearings.adjournHearing')}</h3>
            <FormField label={t('cases.hearings.adjournReason')} required><FormTextarea value={adjournReason} onChange={e => setAdjournReason(e.target.value)} /></FormField>
            <FormField label={t('cases.hearings.nextHearingDate')}><FormDatePicker value={adjournNextDate} onChange={setAdjournNextDate} /></FormField>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAdjournModal(null)}>{t('common.cancel')}</Button>
              <Button className="flex-1 bg-accent text-accent-foreground" onClick={adjournHearing} disabled={savingAction || !adjournReason}>{savingAction && <Loader2 size={14} className="animate-spin me-1" />}{t('common.confirm')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Hearing */}
      <ConfirmDialog isOpen={!!cancelHearingId} onClose={() => setCancelHearingId(null)} onConfirm={cancelHearing} title={t('cases.hearings.cancelConfirmTitle')} titleAr={t('cases.hearings.cancelConfirmTitle')} message={t('cases.hearings.cancelConfirmMessage')} messageAr={t('cases.hearings.cancelConfirmMessage')} type="warning" isLoading={savingAction} />

      {/* Delete Note */}
      <ConfirmDialog isOpen={!!deleteNoteId} onClose={() => setDeleteNoteId(null)} onConfirm={deleteNote} title={t('cases.notes.deleteConfirmTitle')} titleAr={t('cases.notes.deleteConfirmTitle')} message={t('cases.notes.deleteConfirmMessage')} messageAr={t('cases.notes.deleteConfirmMessage')} type="danger" />

      {/* Status Change Confirm */}
      <ConfirmDialog isOpen={!!confirmStatusDialog} onClose={() => setConfirmStatusDialog(null)} onConfirm={() => confirmStatusDialog && handleStatusChange(confirmStatusDialog)} title={confirmStatusDialog === 'archived' ? t('cases.detail.archive') : t('cases.statusChange.changeStatus')} titleAr={confirmStatusDialog === 'archived' ? t('cases.detail.archive') : t('cases.statusChange.changeStatus')} message={confirmStatusDialog === 'archived' ? t('cases.statusChange.confirmArchive') : t('cases.statusChange.confirmClose')} messageAr={confirmStatusDialog === 'archived' ? t('cases.statusChange.confirmArchive') : t('cases.statusChange.confirmClose')} type="warning" isLoading={isChangingStatus} />

      {/* Outcome Modal */}
      {outcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setOutcomeModal(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-card rounded-modal shadow-xl p-6 max-w-[480px] w-[90%] mx-auto space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-heading-lg text-foreground">{t('cases.statusChange.outcomeTitle')}</h3>
            <FormField label={t('cases.statusChange.outcomeSummary')}><FormTextarea value={outcomeSummary} onChange={e => setOutcomeSummary(e.target.value)} /></FormField>
            <FormField label={t('cases.statusChange.outcomeDate')}><FormDatePicker value={outcomeDate} onChange={setOutcomeDate} /></FormField>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOutcomeModal(null)}>{t('common.cancel')}</Button>
              <Button className="flex-1 bg-accent text-accent-foreground" onClick={() => handleStatusChange(outcomeModal, outcomeSummary, outcomeDate)} disabled={isChangingStatus}>{isChangingStatus && <Loader2 size={14} className="animate-spin me-1" />}{t('common.confirm')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Link Errand Modal */}
      {showLinkErrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowLinkErrandModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-card rounded-modal shadow-xl p-6 max-w-[480px] w-[90%] mx-auto space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-heading-lg text-foreground">{t('errands.linkErrand')}</h3>
            {linkableErrands.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-body-md text-muted-foreground mb-3">{t('errands.noLinkedErrands')}</p>
                <Button className="bg-accent text-accent-foreground" onClick={() => { setShowLinkErrandModal(false); navigate(`/errands/new?clientId=${caseData?.client_id}&caseId=${caseData?.id}`); }}>
                  <Plus size={14} className="me-1" />{t('errands.createErrandForClient')}
                </Button>
              </div>
            ) : (
              <>
                <FormSearchSelect value={selectedLinkErrand} onChange={setSelectedLinkErrand} options={linkableErrands} placeholder={language === 'ar' ? 'اختر معاملة...' : 'Select errand...'} />
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowLinkErrandModal(false)}>{t('common.cancel')}</Button>
                  <Button className="flex-1 bg-accent text-accent-foreground" onClick={linkErrand} disabled={!selectedLinkErrand || savingAction}>{savingAction && <Loader2 size={14} className="animate-spin me-1" />}{t('common.confirm')}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}