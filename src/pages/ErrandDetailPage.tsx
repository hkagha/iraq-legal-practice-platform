import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { FormInput } from '@/components/ui/FormInput';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { FormDatePicker } from '@/components/ui/FormDatePicker';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Pencil, MoreHorizontal, User, Building2, Calendar, Scale, Plus,
  FileText, Loader2, ChevronDown, FileCheck, Check, Play, SkipForward,
  XCircle, RotateCcw, CheckCircle, Upload, Paperclip, Download, Trash2,
  RefreshCw, UserCog, CalendarClock, PlayCircle, CheckCircle2,
} from 'lucide-react';

const ERRAND_STATUSES = ['new','in_progress','awaiting_documents','submitted_to_government','under_review_by_government','additional_requirements','approved','rejected','completed','cancelled'] as const;

interface ErrandFull {
  id: string; errand_number: string; title: string; title_ar: string | null;
  description: string | null; description_ar: string | null;
  category: string; status: string; priority: string;
  client_id: string; case_id: string | null; assigned_to: string | null;
  government_entity: string | null; government_entity_ar: string | null;
  government_department: string | null; government_department_ar: string | null;
  reference_number: string | null;
  start_date: string | null; due_date: string | null; completed_date: string | null;
  government_fees: number | null; government_fees_currency: string | null;
  service_fee: number | null; service_fee_currency: string | null;
  total_cost: number | null; fees_paid: boolean;
  total_steps: number; completed_steps: number; progress_percentage: number | null;
  is_visible_to_client: boolean;
  outcome_notes: string | null; outcome_notes_ar: string | null;
  rejection_reason: string | null; rejection_reason_ar: string | null;
  created_at: string; updated_at: string; created_by: string | null;
}

interface StepRow {
  id: string; step_number: number; title: string; title_ar: string | null;
  description: string | null; description_ar: string | null;
  status: string; is_required: boolean; assigned_to: string | null;
  due_date: string | null; completed_at: string | null; completed_by: string | null;
  notes: string | null; notes_ar: string | null; attachments_count: number;
}

interface DocRow {
  id: string; file_name: string; file_name_ar: string | null; file_path: string;
  file_type: string | null; file_size_bytes: number | null; document_type: string | null;
  errand_step_id: string | null; uploaded_by: string | null; created_at: string;
  is_visible_to_client: boolean;
}

interface Activity {
  id: string; activity_type: string; title: string; title_ar: string | null;
  description: string | null; created_at: string; actor_id: string | null;
}

interface ClientInfo {
  id: string; first_name: string | null; last_name: string | null;
  first_name_ar: string | null; last_name_ar: string | null;
  company_name: string | null; company_name_ar: string | null;
  client_type: string; email: string | null; phone: string | null;
}

interface ProfileInfo {
  id: string; first_name: string; last_name: string;
  first_name_ar: string | null; last_name_ar: string | null;
  role: string; avatar_url: string | null; email: string;
}

interface CaseInfo {
  id: string; case_number: string; title: string; title_ar: string | null; status: string;
}

const DOCUMENT_TYPES = ['required_document','government_receipt','government_response','form','attachment','certificate','license','other'] as const;

const ACTIVITY_ICONS: Record<string, { icon: typeof FileCheck; color: string }> = {
  errand_created: { icon: FileCheck, color: 'hsl(42, 50%, 54%)' },
  status_changed: { icon: RefreshCw, color: 'hsl(38, 92%, 50%)' },
  step_completed: { icon: CheckCircle, color: 'hsl(142, 71%, 45%)' },
  step_started: { icon: PlayCircle, color: 'hsl(217, 91%, 60%)' },
  step_blocked: { icon: XCircle, color: 'hsl(0, 84%, 60%)' },
  document_uploaded: { icon: Upload, color: 'hsl(217, 91%, 60%)' },
  assigned_changed: { icon: UserCog, color: 'hsl(271, 91%, 65%)' },
  errand_completed: { icon: CheckCircle2, color: 'hsl(142, 71%, 45%)' },
  errand_cancelled: { icon: XCircle, color: 'hsl(215, 16%, 47%)' },
};

export default function ErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, t, isRTL } = useLanguage();
  const { profile } = useAuth();

  const [errand, setErrand] = useState<ErrandFull | null>(null);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [assigneeInfo, setAssigneeInfo] = useState<ProfileInfo | null>(null);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('steps');

  // Activity pagination
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [activityPage, setActivityPage] = useState(1);

  // Status change
  const [confirmStatusDialog, setConfirmStatusDialog] = useState<string | null>(null);
  const [rejectionModal, setRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [allStepsCompletePrompt, setAllStepsCompletePrompt] = useState(false);
  const [incompleteStepsWarning, setIncompleteStepsWarning] = useState<string | null>(null);

  // Step actions
  const [savingStepId, setSavingStepId] = useState<string | null>(null);
  const [blockModal, setBlockModal] = useState<StepRow | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [prevStepWarning, setPrevStepWarning] = useState<{ stepId: string; action: string } | null>(null);

  // Step notes
  const [editingNoteStepId, setEditingNoteStepId] = useState<string | null>(null);
  const [stepNoteText, setStepNoteText] = useState('');

  // Add step inline
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepTitleAr, setNewStepTitleAr] = useState('');
  const [addingStep, setAddingStep] = useState(false);

  // Document upload
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState('attachment');
  const [uploadStepId, setUploadStepId] = useState('');
  const [uploadFileNameAr, setUploadFileNameAr] = useState('');
  const [uploadVisible, setUploadVisible] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete doc
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  // Org members for add step
  const [orgMembers, setOrgMembers] = useState<{ value: string; label: string; subtitle?: string }[]>([]);

  const fetchErrand = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data: e, error } = await supabase.from('errands').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!e) { setNotFound(true); setIsLoading(false); return; }
      setErrand(e as unknown as ErrandFull);

      const [stepsRes, docsRes, activitiesRes, clientRes] = await Promise.all([
        supabase.from('errand_steps').select('*').eq('errand_id', id).order('step_number'),
        supabase.from('errand_documents').select('*').eq('errand_id', id).order('created_at', { ascending: false }),
        supabase.from('errand_activities').select('*').eq('errand_id', id).order('created_at', { ascending: false }).range(0, 19),
        supabase.from('clients').select('id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,client_type,email,phone').eq('id', e.client_id).maybeSingle(),
      ]);
      if (stepsRes.data) setSteps(stepsRes.data as unknown as StepRow[]);
      if (docsRes.data) setDocs(docsRes.data as unknown as DocRow[]);
      if (activitiesRes.data) { setActivities(activitiesRes.data as unknown as Activity[]); setHasMoreActivities(activitiesRes.data.length === 20); }
      if (clientRes.data) setClientInfo(clientRes.data as unknown as ClientInfo);

      if (e.assigned_to) {
        const { data: assignee } = await supabase.from('profiles').select('id,first_name,last_name,first_name_ar,last_name_ar,role,avatar_url,email').eq('id', e.assigned_to).maybeSingle();
        if (assignee) setAssigneeInfo(assignee as unknown as ProfileInfo);
      }
      if (e.case_id) {
        const { data: caseData } = await supabase.from('cases').select('id,case_number,title,title_ar,status').eq('id', e.case_id).maybeSingle();
        if (caseData) setCaseInfo(caseData as unknown as CaseInfo);
      }

    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchErrand(); }, [fetchErrand]);

  // Load org members for add step
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase.from('profiles').select('id,first_name,last_name,first_name_ar,last_name_ar,role')
      .eq('organization_id', profile.organization_id).in('role', ['firm_admin','lawyer','paralegal']).eq('is_active', true)
      .then(({ data }) => {
        if (!data) return;
        setOrgMembers(data.map((p: any) => {
          const name = language === 'ar' && p.first_name_ar ? `${p.first_name_ar} ${p.last_name_ar || ''}` : `${p.first_name} ${p.last_name}`;
          return { value: p.id, label: name.trim(), subtitle: p.role };
        }));
      });
  }, [profile?.organization_id, language]);

  const getClientName = (c: ClientInfo) => {
    if (c.client_type === 'company') return language === 'ar' && c.company_name_ar ? c.company_name_ar : c.company_name || '';
    return (language === 'ar' && c.first_name_ar ? `${c.first_name_ar} ${c.last_name_ar || ''}` : `${c.first_name || ''} ${c.last_name || ''}`).trim();
  };

  const getProfileName = (p: ProfileInfo | null) => {
    if (!p) return '';
    return (language === 'ar' && p.first_name_ar ? `${p.first_name_ar} ${p.last_name_ar || ''}` : `${p.first_name} ${p.last_name}`).trim();
  };

  const fmtDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return language === 'ar' ? format(d, 'dd MMMM yyyy', { locale: arLocale }) : format(d, 'MMM dd, yyyy');
  };

  const fmtRelative = (dateStr: string) => formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined });

  const errandTitle = errand ? (language === 'ar' && errand.title_ar ? errand.title_ar : errand.title) : '';
  const progressPct = errand ? (errand.total_steps > 0 ? Math.round(((errand.completed_steps || 0) / errand.total_steps) * 100) : 0) : 0;

  const dueDateColor = (dateStr: string | null) => {
    if (!dateStr) return 'text-muted-foreground';
    const days = differenceInDays(new Date(dateStr), new Date());
    if (days < 0) return 'text-destructive';
    if (days <= 3) return 'text-warning';
    return 'text-muted-foreground';
  };

  const fmtFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const fmtCurrency = (amount: number | null, currency: string | null) => {
    if (amount === null || amount === undefined) return '—';
    const formatted = amount.toLocaleString();
    return `${formatted} ${currency || 'IQD'}`;
  };

  // --- LOG ACTIVITY ---
  const logActivity = async (type: string, title: string, titleAr: string, desc?: string) => {
    if (!errand || !profile?.organization_id) return;
    await supabase.from('errand_activities').insert({
      errand_id: errand.id, organization_id: profile.organization_id,
      actor_id: profile.id, activity_type: type, title, title_ar: titleAr, description: desc || null,
    } as any);
  };

  // --- STATUS CHANGE ---
  const handleStatusChange = async (newStatus: string) => {
    if (!errand || !profile?.organization_id) return;

    // Check required steps for completion/approval
    if (['completed', 'approved'].includes(newStatus)) {
      const requiredIncomplete = steps.filter(s => s.is_required && s.status !== 'completed' && s.status !== 'skipped');
      if (requiredIncomplete.length > 0) {
        setIncompleteStepsWarning(newStatus);
        return;
      }
    }
    if (newStatus === 'rejected') { setRejectionModal(true); return; }
    if (newStatus === 'cancelled') { setConfirmStatusDialog('cancelled'); return; }

    await executeStatusChange(newStatus);
  };

  const executeStatusChange = async (newStatus: string, reason?: string) => {
    if (!errand || !profile?.organization_id) return;
    setIsChangingStatus(true);
    try {
      const payload: Record<string, any> = { status: newStatus, updated_by: profile.id };
      if (newStatus === 'completed') payload.completed_date = new Date().toISOString().split('T')[0];
      if (newStatus === 'rejected' && reason) payload.rejection_reason = reason;
      const { error } = await supabase.from('errands').update(payload as any).eq('id', errand.id);
      if (error) throw error;
      await logActivity('status_changed', `Status changed to ${newStatus}`, `تم تغيير الحالة إلى ${t(`statuses.errand.${newStatus}`)}`);
      toast({ title: t('errands.messages.statusChanged') });
      fetchErrand();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsChangingStatus(false); setConfirmStatusDialog(null); setRejectionModal(false);
      setRejectionReason(''); setIncompleteStepsWarning(null);
    }
  };

  // --- STEP ACTIONS ---
  const updateStepStatus = async (step: StepRow, newStatus: string, extras?: Record<string, any>) => {
    if (!errand || !profile?.organization_id) return;
    setSavingStepId(step.id);
    try {
      const payload: Record<string, any> = { status: newStatus, ...extras };
      if (newStatus === 'completed') { payload.completed_at = new Date().toISOString(); payload.completed_by = profile.id; }
      if (['pending', 'in_progress'].includes(newStatus)) { payload.completed_at = null; payload.completed_by = null; }
      const { error } = await supabase.from('errand_steps').update(payload as any).eq('id', step.id);
      if (error) throw error;

      const actType = newStatus === 'completed' ? 'step_completed' : newStatus === 'in_progress' ? 'step_started' : newStatus === 'blocked' ? 'step_blocked' : 'status_changed';
      await logActivity(actType, `Step "${step.title}" → ${newStatus}`, `الخطوة "${step.title_ar || step.title}" → ${t(`errands.steps.${newStatus}`)}`);

      // Refresh steps to get updated counts from trigger
      const { data: updatedErrand } = await supabase.from('errands').select('total_steps,completed_steps').eq('id', errand.id).single();
      const { data: updatedSteps } = await supabase.from('errand_steps').select('*').eq('errand_id', errand.id).order('step_number');
      if (updatedSteps) setSteps(updatedSteps as unknown as StepRow[]);
      if (updatedErrand) setErrand(prev => prev ? { ...prev, ...updatedErrand } as ErrandFull : prev);

      if (newStatus === 'completed') {
        toast({ title: t('errands.messages.stepCompleted') });
        // Check all required steps complete
        const refreshedSteps = updatedSteps as unknown as StepRow[] || steps;
        const allRequiredDone = refreshedSteps.filter(s => s.is_required).every(s => s.status === 'completed' || s.status === 'skipped');
        if (allRequiredDone && errand.status !== 'completed') setAllStepsCompletePrompt(true);
      } else if (newStatus === 'in_progress') {
        toast({ title: t('errands.messages.stepStarted') });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingStepId(null); setPrevStepWarning(null);
    }
  };

  const handleStartStep = (step: StepRow, index: number) => {
    if (index > 0) {
      const prevStep = steps[index - 1];
      if (prevStep.status === 'pending') {
        setPrevStepWarning({ stepId: step.id, action: 'start' });
        return;
      }
    }
    updateStepStatus(step, 'in_progress');
  };

  const handleBlockStep = () => {
    if (!blockModal) return;
    updateStepStatus(blockModal, 'blocked', { notes: blockReason || null });
    if (errand?.status !== 'additional_requirements') {
      supabase.from('errands').update({ status: 'additional_requirements' } as any).eq('id', errand!.id);
    }
    setBlockModal(null);
    setBlockReason('');
  };

  // Step notes
  const saveStepNote = async (stepId: string) => {
    setSavingStepId(stepId);
    try {
      const { error } = await supabase.from('errand_steps').update({ notes: stepNoteText || null } as any).eq('id', stepId);
      if (error) throw error;
      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, notes: stepNoteText || null } : s));
      setEditingNoteStepId(null);
      setStepNoteText('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSavingStepId(null); }
  };

  // Add step inline
  const handleAddStep = async () => {
    if (!newStepTitle.trim() || !errand || !profile?.organization_id) return;
    setAddingStep(true);
    try {
      const stepNum = steps.length + 1;
      const { error } = await supabase.from('errand_steps').insert({
        errand_id: errand.id, organization_id: profile.organization_id,
        step_number: stepNum, title: newStepTitle.trim(), title_ar: newStepTitleAr.trim() || null,
        is_required: true,
      } as any);
      if (error) throw error;
      await logActivity('status_changed', `Step "${newStepTitle}" added`, `تم إضافة الخطوة "${newStepTitleAr || newStepTitle}"`);
      setNewStepTitle(''); setNewStepTitleAr(''); setShowAddStep(false);
      fetchErrand();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setAddingStep(false); }
  };

  // --- DOCUMENT UPLOAD ---
  const handleUpload = async () => {
    if (!uploadFile || !errand || !profile?.organization_id) return;
    setIsUploading(true);
    try {
      const filePath = `organizations/${profile.organization_id}/errands/${errand.id}/${Date.now()}_${uploadFile.name}`;
      const { error: storageErr } = await supabase.storage.from('errand-documents').upload(filePath, uploadFile);
      if (storageErr) throw storageErr;

      const { error: dbErr } = await supabase.from('errand_documents').insert({
        errand_id: errand.id, organization_id: profile.organization_id,
        file_name: uploadFile.name, file_name_ar: uploadFileNameAr || null,
        file_path: filePath, file_type: uploadFile.type, file_size_bytes: uploadFile.size,
        document_type: uploadDocType, errand_step_id: uploadStepId || null,
        uploaded_by: profile.id, is_visible_to_client: uploadVisible,
      } as any);
      if (dbErr) throw dbErr;

      if (uploadStepId) {
        const step = steps.find(s => s.id === uploadStepId);
        if (step) {
          await supabase.from('errand_steps').update({ attachments_count: (step.attachments_count || 0) + 1 } as any).eq('id', uploadStepId);
        }
      }

      await logActivity('document_uploaded', `Document "${uploadFile.name}" uploaded`, `تم رفع المستند "${uploadFile.name}"`);
      toast({ title: t('errands.detail.documentUploaded') });
      setUploadModal(false); setUploadFile(null); setUploadDocType('attachment');
      setUploadStepId(''); setUploadFileNameAr(''); setUploadVisible(true);
      fetchErrand();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setIsUploading(false); }
  };

  const downloadDoc = async (doc: DocRow) => {
    const { data } = await supabase.storage.from('errand-documents').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const deleteDoc = async () => {
    if (!deleteDocId) return;
    const doc = docs.find(d => d.id === deleteDocId);
    if (!doc) return;
    try {
      await supabase.storage.from('errand-documents').remove([doc.file_path]);
      await supabase.from('errand_documents').delete().eq('id', doc.id);
      if (doc.errand_step_id) {
        const step = steps.find(s => s.id === doc.errand_step_id);
        if (step && step.attachments_count > 0) {
          await supabase.from('errand_steps').update({ attachments_count: Math.max(0, step.attachments_count - 1) } as any).eq('id', doc.errand_step_id);
        }
      }
      toast({ title: t('errands.detail.documentDeleted') });
      setDeleteDocId(null);
      fetchErrand();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Toggle visibility
  const toggleVisibility = async () => {
    if (!errand) return;
    const { error } = await supabase.from('errands').update({ is_visible_to_client: !errand.is_visible_to_client } as any).eq('id', errand.id);
    if (!error) setErrand(prev => prev ? { ...prev, is_visible_to_client: !prev.is_visible_to_client } : prev);
  };

  // Toggle fees paid
  const toggleFeesPaid = async () => {
    if (!errand) return;
    const { error } = await supabase.from('errands').update({ fees_paid: !errand.fees_paid } as any).eq('id', errand.id);
    if (!error) setErrand(prev => prev ? { ...prev, fees_paid: !prev.fees_paid } : prev);
  };

  // Load more activities
  const loadMoreActivities = async () => {
    if (!errand) return;
    const nextPage = activityPage + 1;
    const { data } = await supabase.from('errand_activities').select('*').eq('errand_id', errand.id).order('created_at', { ascending: false }).range(nextPage * 20 - 20, nextPage * 20 - 1);
    if (data) {
      setActivities(prev => [...prev, ...(data as unknown as Activity[])]);
      setHasMoreActivities(data.length === 20);
      setActivityPage(nextPage);
    }
  };

  // --- RENDER ---
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound || !errand) {
    return (
      <EmptyState
        icon={FileCheck}
        title={language === 'ar' ? 'المعاملة غير موجودة' : 'Errand not found'}
        titleAr="المعاملة غير موجودة"
        subtitle={language === 'ar' ? 'المعاملة التي تبحث عنها غير موجودة' : 'The errand you are looking for does not exist'}
        subtitleAr="المعاملة التي تبحث عنها غير موجودة"
        actionLabel={language === 'ar' ? 'العودة للمعاملات' : 'Back to Errands'}
        actionLabelAr="العودة للمعاملات"
        onAction={() => navigate('/errands')}
      />
    );
  }

  const stepIndicatorClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-accent text-accent-foreground';
      case 'in_progress': return 'bg-card border-2 border-accent';
      case 'skipped': return 'bg-muted';
      case 'blocked': return 'bg-destructive/10';
      default: return 'bg-card border-2 border-border';
    }
  };

  const stepLineColor = (status: string) => status === 'completed' ? 'bg-accent' : 'bg-border';

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-body-sm text-muted-foreground">
        <Link to="/dashboard" className="text-accent hover:underline">{t('sidebar.dashboard')}</Link>
        <span>{isRTL ? ' \\ ' : ' / '}</span>
        <Link to="/errands" className="text-accent hover:underline">{t('sidebar.errands')}</Link>
        <span>{isRTL ? ' \\ ' : ' / '}</span>
        <span className="text-foreground">{errand.errand_number}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-body-sm text-muted-foreground font-mono">{errand.errand_number}</p>
            <h1 className="text-display-lg text-foreground">{errandTitle}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center text-body-sm font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t(`errands.categories.${errand.category}`)}</span>
              <StatusBadge status={errand.priority} type="priority" />
              <StatusBadge status={errand.status} type="errand" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-body-sm text-muted-foreground">
              {clientInfo && (
                <Link to={`/clients/${clientInfo.id}`} className="flex items-center gap-1 text-accent hover:underline">
                  <User size={14} /> {getClientName(clientInfo)}
                </Link>
              )}
              {errand.government_entity && (
                <span className="flex items-center gap-1">
                  <Building2 size={14} /> {language === 'ar' && errand.government_entity_ar ? errand.government_entity_ar : errand.government_entity}
                </span>
              )}
              {errand.due_date && (
                <span className={cn('flex items-center gap-1', dueDateColor(errand.due_date))}>
                  <Calendar size={14} /> {fmtDate(errand.due_date)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <User size={14} /> {assigneeInfo ? getProfileName(assigneeInfo) : <em>{language === 'ar' ? 'غير مسند' : 'Unassigned'}</em>}
              </span>
              {caseInfo && (
                <Link to={`/cases/${caseInfo.id}`} className="flex items-center gap-1 text-accent hover:underline">
                  <Scale size={14} /> {caseInfo.case_number}
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => navigate(`/errands/${errand.id}/edit`)} className="h-9">
              <Pencil size={14} /> {t('common.edit')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9">
                  {t('cases.statusChange.changeStatus')} <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                {ERRAND_STATUSES.filter(s => s !== errand.status).map(s => (
                  <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} disabled={isChangingStatus}>
                    {t(`statuses.errand.${s}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9"><MoreHorizontal size={16} /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                <DropdownMenuItem onClick={() => handleStatusChange('cancelled')} className="text-destructive">
                  {language === 'ar' ? 'إلغاء المعاملة' : 'Cancel Errand'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-body-sm text-muted-foreground text-center">
            {language === 'ar'
              ? `${errand.completed_steps || 0} من ${errand.total_steps} خطوة مكتملة (${progressPct}%)`
              : `${errand.completed_steps || 0} of ${errand.total_steps} steps completed (${progressPct}%)`
            }
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
          {[
            { key: 'steps', label: t('errands.steps.title') },
            { key: 'documents', label: `${t('errands.detail.documents')} (${docs.length})` },
            { key: 'details', label: t('errands.detail.details') },
            { key: 'activity', label: t('errands.detail.activity') },
          ].map(tab => (
            <TabsTrigger key={tab.key} value={tab.key}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-body-md"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ==================== STEPS TAB ==================== */}
        <TabsContent value="steps" className="mt-6">
          <div className="relative">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex gap-4 relative">
                {/* Indicator + Line */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center z-10', stepIndicatorClass(step.status))}>
                    {step.status === 'completed' && <Check size={16} className="text-accent-foreground" />}
                    {step.status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
                    {step.status === 'skipped' && <SkipForward size={14} className="text-muted-foreground" />}
                    {step.status === 'blocked' && <XCircle size={14} className="text-destructive" />}
                    {step.status === 'pending' && <span className="text-body-sm text-muted-foreground">{step.step_number}</span>}
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={cn('w-0.5 flex-1 min-h-[24px]', stepLineColor(step.status))} />
                  )}
                </div>

                {/* Step Card */}
                <div className="flex-1 mb-4 rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-body-sm font-medium text-muted-foreground">{t('errands.steps.stepNumber')} {step.step_number}: </span>
                      <span className="text-heading-sm text-foreground">
                        {language === 'ar' && step.title_ar ? step.title_ar : step.title}
                      </span>
                    </div>
                    <StatusBadge status={t(`errands.steps.${step.status}`)} type="custom"
                      customColor={step.status === 'completed' ? '#22C55E' : step.status === 'in_progress' ? '#C9A84C' : step.status === 'blocked' ? '#EF4444' : step.status === 'skipped' ? '#9CA3AF' : '#64748B'}
                    />
                  </div>

                  {(step.description || step.description_ar) && (
                    <p className="text-body-md text-muted-foreground mt-2">
                      {language === 'ar' && step.description_ar ? step.description_ar : step.description}
                    </p>
                  )}

                  {/* Info row */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-body-sm text-muted-foreground">
                    {step.due_date && (
                      <span className={cn('flex items-center gap-1', dueDateColor(step.due_date))}>
                        <CalendarClock size={14} /> {fmtDate(step.due_date)}
                      </span>
                    )}
                    {step.attachments_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip size={14} /> {step.attachments_count} {language === 'ar' ? 'ملفات' : 'files'}
                      </span>
                    )}
                    {step.completed_at && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Check size={14} /> {fmtDate(step.completed_at)}
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  {step.notes && editingNoteStepId !== step.id && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-body-sm text-muted-foreground whitespace-pre-wrap">{step.notes}</p>
                      <button onClick={() => { setEditingNoteStepId(step.id); setStepNoteText(step.notes || ''); }} className="text-body-sm text-accent hover:underline mt-1">
                        {language === 'ar' ? 'تعديل الملاحظة' : 'Edit Note'}
                      </button>
                    </div>
                  )}

                  {/* Inline note editor */}
                  {editingNoteStepId === step.id && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <Textarea value={stepNoteText} onChange={e => setStepNoteText(e.target.value)} rows={2} placeholder={language === 'ar' ? 'أضف ملاحظة...' : 'Add a note...'} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveStepNote(step.id)} disabled={savingStepId === step.id}>
                          {savingStepId === step.id && <Loader2 size={14} className="animate-spin" />}
                          {t('common.save')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingNoteStepId(null); setStepNoteText(''); }}>{t('common.cancel')}</Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {step.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleStartStep(step, idx)} disabled={savingStepId === step.id}
                          className="text-accent border-accent/30 hover:bg-accent/5">
                          {savingStepId === step.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                          {t('errands.steps.markInProgress')}
                        </Button>
                        {!step.is_required && (
                          <Button variant="ghost" size="sm" onClick={() => updateStepStatus(step, 'skipped')} disabled={savingStepId === step.id}
                            className="text-muted-foreground">
                            <SkipForward size={14} /> {t('errands.steps.skipStep')}
                          </Button>
                        )}
                      </>
                    )}
                    {step.status === 'in_progress' && (
                      <>
                        <Button size="sm" onClick={() => updateStepStatus(step, 'completed')} disabled={savingStepId === step.id}
                          className="bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success))]/90">
                          {savingStepId === step.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          {t('errands.steps.markComplete')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setBlockModal(step); setBlockReason(''); }} className="text-destructive">
                          <XCircle size={14} /> {t('errands.steps.blockStep')}
                        </Button>
                      </>
                    )}
                    {step.status === 'completed' && (
                      <Button variant="ghost" size="sm" onClick={() => updateStepStatus(step, 'in_progress')} className="text-muted-foreground">
                        <RotateCcw size={14} /> {language === 'ar' ? 'تراجع' : 'Undo'}
                      </Button>
                    )}
                    {step.status === 'skipped' && (
                      <Button variant="ghost" size="sm" onClick={() => updateStepStatus(step, 'pending')} className="text-muted-foreground">
                        <RotateCcw size={14} /> {language === 'ar' ? 'استعادة' : 'Restore'}
                      </Button>
                    )}
                    {step.status === 'blocked' && (
                      <Button variant="ghost" size="sm" onClick={() => updateStepStatus(step, 'in_progress')}
                        className="text-[hsl(var(--success))]">
                        {language === 'ar' ? 'إلغاء الحظر' : 'Unblock'}
                      </Button>
                    )}
                    {!step.notes && editingNoteStepId !== step.id && (
                      <Button variant="ghost" size="sm" onClick={() => { setEditingNoteStepId(step.id); setStepNoteText(''); }}
                        className="text-accent">
                        {language === 'ar' ? 'إضافة ملاحظة' : 'Add Note'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add Step */}
            {showAddStep ? (
              <div className="ms-12 rounded-lg border border-dashed p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder={language === 'ar' ? 'عنوان الخطوة (إنجليزي)' : 'Step title'} value={newStepTitle} onChange={e => setNewStepTitle(e.target.value)} />
                  <Input placeholder={language === 'ar' ? 'عنوان الخطوة (عربي)' : 'Step title (Arabic)'} dir="rtl" value={newStepTitleAr} onChange={e => setNewStepTitleAr(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddStep} disabled={addingStep || !newStepTitle.trim()}>
                    {addingStep && <Loader2 size={14} className="animate-spin" />}
                    {t('common.save')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddStep(false); setNewStepTitle(''); setNewStepTitleAr(''); }}>{t('common.cancel')}</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddStep(true)}
                className="ms-12 w-[calc(100%-3rem)] border-2 border-dashed rounded-lg p-3 text-body-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2">
                <Plus size={16} /> {t('errands.steps.addStep')}
              </button>
            )}
          </div>
        </TabsContent>

        {/* ==================== DOCUMENTS TAB ==================== */}
        <TabsContent value="documents" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-sm text-foreground">{t('errands.detail.errandDocuments')}</h2>
            <Button size="sm" onClick={() => setUploadModal(true)} className="bg-accent text-accent-foreground hover:bg-accent-dark">
              <Upload size={14} /> {t('errands.detail.uploadDocument')}
            </Button>
          </div>

          {docs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={language === 'ar' ? 'لم يتم رفع مستندات بعد' : 'No documents uploaded yet'}
              titleAr="لم يتم رفع مستندات بعد"
              subtitle={language === 'ar' ? 'ارفع أول مستند' : 'Upload your first document'}
              subtitleAr="ارفع أول مستند"
              actionLabel={t('errands.detail.uploadDocument')}
              actionLabelAr={language === 'ar' ? 'رفع مستند' : 'Upload Document'}
              onAction={() => setUploadModal(true)}
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-start p-3 font-medium text-muted-foreground">{language === 'ar' ? 'اسم الملف' : 'File Name'}</th>
                    <th className="text-start p-3 font-medium text-muted-foreground">{language === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="text-start p-3 font-medium text-muted-foreground hidden sm:table-cell">{language === 'ar' ? 'الحجم' : 'Size'}</th>
                    <th className="text-start p-3 font-medium text-muted-foreground hidden md:table-cell">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(doc => (
                    <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <button onClick={() => downloadDoc(doc)} className="text-accent hover:underline flex items-center gap-2">
                          <FileText size={14} /> {doc.file_name}
                        </button>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-body-sm bg-muted text-muted-foreground">
                          {t(`errands.detail.docTypes.${doc.document_type || 'other'}`)}
                        </span>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">{fmtFileSize(doc.file_size_bytes)}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{fmtDate(doc.created_at)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadDoc(doc)}><Download size={14} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteDocId(doc.id)}><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ==================== DETAILS TAB ==================== */}
        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <h3 className="text-heading-sm text-foreground">{t('errands.detail.errandInfo')}</h3>
                {[
                  { label: t('errands.errandNumber'), value: <span className="font-mono">{errand.errand_number}</span> },
                  { label: t('errands.fields.category'), value: t(`errands.categories.${errand.category}`) },
                  { label: t('errands.fields.status'), value: <StatusBadge status={errand.status} type="errand" /> },
                  { label: t('errands.fields.priority'), value: <StatusBadge status={errand.priority} type="priority" /> },
                  { label: t('errands.fields.governmentEntity'), value: (language === 'ar' && errand.government_entity_ar ? errand.government_entity_ar : errand.government_entity) || '—' },
                  { label: t('errands.fields.governmentDepartment'), value: errand.government_department || '—' },
                  { label: t('errands.fields.referenceNumber'), value: errand.reference_number || '—' },
                  { label: t('errands.fields.startDate'), value: fmtDate(errand.start_date) },
                  { label: t('errands.fields.dueDate'), value: <span className={dueDateColor(errand.due_date)}>{fmtDate(errand.due_date)}</span> },
                  ...(errand.completed_date ? [{ label: language === 'ar' ? 'تاريخ الإكمال' : 'Completed Date', value: fmtDate(errand.completed_date) }] : []),
                  { label: t('errands.fields.visibleToClient'), value: <Switch checked={errand.is_visible_to_client} onCheckedChange={toggleVisibility} /> },
                  { label: t('common.createdAt'), value: fmtDate(errand.created_at) },
                  { label: t('common.updatedAt'), value: fmtRelative(errand.updated_at) },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-body-sm text-muted-foreground">{row.label}</span>
                    <span className="text-body-md text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Fees card */}
              <div className="rounded-lg border bg-card p-5 space-y-3">
                <h3 className="text-heading-sm text-foreground">{t('errands.form.feesCost')}</h3>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-body-sm text-muted-foreground">{t('errands.fields.governmentFees')}</span>
                  <span className="text-body-md">{fmtCurrency(errand.government_fees, errand.government_fees_currency)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-body-sm text-muted-foreground">{t('errands.fields.serviceFee')}</span>
                  <span className="text-body-md">{fmtCurrency(errand.service_fee, errand.service_fee_currency)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-body-sm text-muted-foreground">{t('errands.fields.totalCost')}</span>
                  <span className="text-heading-sm">{fmtCurrency((errand.government_fees || 0) + (errand.service_fee || 0), errand.government_fees_currency)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-body-sm text-muted-foreground">{t('errands.fields.feesPaid')}</span>
                  <Switch checked={errand.fees_paid} onCheckedChange={toggleFeesPaid} />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Client card */}
              {clientInfo && (
                <div className="rounded-lg border bg-card p-5 space-y-3">
                  <h3 className="text-heading-sm text-foreground">{t('errands.fields.client')}</h3>
                  <Link to={`/clients/${clientInfo.id}`} className="text-accent hover:underline text-heading-sm">{getClientName(clientInfo)}</Link>
                  {clientInfo.email && <p className="text-body-sm text-muted-foreground">{clientInfo.email}</p>}
                  {clientInfo.phone && <p className="text-body-sm text-muted-foreground">{clientInfo.phone}</p>}
                </div>
              )}

              {/* Linked case */}
              {caseInfo && (
                <div className="rounded-lg border bg-card p-5 space-y-2">
                  <h3 className="text-heading-sm text-foreground">{t('errands.detail.linkedCase')}</h3>
                  <p className="font-mono text-body-sm text-muted-foreground">{caseInfo.case_number}</p>
                  <Link to={`/cases/${caseInfo.id}`} className="text-accent hover:underline text-heading-sm block">
                    {language === 'ar' && caseInfo.title_ar ? caseInfo.title_ar : caseInfo.title}
                  </Link>
                  <StatusBadge status={caseInfo.status} type="case" />
                </div>
              )}

              {/* Assigned to */}
              <div className="rounded-lg border bg-card p-5 space-y-2">
                <h3 className="text-heading-sm text-foreground">{t('errands.fields.assignedTo')}</h3>
                {assigneeInfo ? (
                  <div>
                    <p className="text-heading-sm text-foreground">{getProfileName(assigneeInfo)}</p>
                    <StatusBadge status={assigneeInfo.role} type="custom" customColor="#8B5CF6" className="mt-1" />
                    <p className="text-body-sm text-muted-foreground mt-1">{assigneeInfo.email}</p>
                  </div>
                ) : (
                  <p className="text-body-sm text-muted-foreground italic">{language === 'ar' ? 'غير مسند' : 'Unassigned'}</p>
                )}
              </div>

              {/* Outcome */}
              {['completed', 'rejected'].includes(errand.status) && (
                <div className={cn('rounded-lg border bg-card p-5', errand.status === 'completed' ? 'border-s-[3px] border-s-[hsl(var(--success))]' : 'border-s-[3px] border-s-destructive')}>
                  <h3 className="text-heading-sm text-foreground mb-2">{language === 'ar' ? 'النتيجة' : 'Outcome'}</h3>
                  <p className="text-body-md text-muted-foreground whitespace-pre-wrap">
                    {errand.status === 'completed'
                      ? (language === 'ar' && errand.outcome_notes_ar ? errand.outcome_notes_ar : errand.outcome_notes || '—')
                      : (language === 'ar' && errand.rejection_reason_ar ? errand.rejection_reason_ar : errand.rejection_reason || '—')
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ==================== ACTIVITY TAB ==================== */}
        <TabsContent value="activity" className="mt-6">
          {activities.length === 0 ? (
            <p className="text-body-md text-muted-foreground text-center py-8">{language === 'ar' ? 'لا يوجد نشاط بعد' : 'No activity yet'}</p>
          ) : (
            <div className="space-y-0">
              {activities.map((a, idx) => {
                const cfg = ACTIVITY_ICONS[a.activity_type] || { icon: FileCheck, color: 'hsl(215, 16%, 47%)' };
                const Icon = cfg.icon;
                return (
                  <div key={a.id} className="flex gap-3 relative">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cfg.color}15` }}>
                        <Icon size={16} style={{ color: cfg.color }} />
                      </div>
                      {idx < activities.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                    </div>
                    <div className="pb-6">
                      <p className="text-body-md text-foreground">{language === 'ar' && a.title_ar ? a.title_ar : a.title}</p>
                      <p className="text-body-sm text-muted-foreground">{fmtRelative(a.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              {hasMoreActivities && (
                <Button variant="ghost" onClick={loadMoreActivities} className="w-full">
                  {t('cases.detail.loadMore')}
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ========== MODALS ========== */}

      {/* Cancel confirm */}
      <ConfirmDialog
        isOpen={confirmStatusDialog === 'cancelled'}
        onClose={() => setConfirmStatusDialog(null)}
        onConfirm={() => executeStatusChange('cancelled')}
        title="Cancel Errand" titleAr="إلغاء المعاملة"
        message="Are you sure you want to cancel this errand?" messageAr="هل أنت متأكد من إلغاء هذه المعاملة؟"
        type="danger" isLoading={isChangingStatus}
      />

      {/* Rejection modal */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectionModal(false)} />
          <div className="relative bg-card rounded-lg shadow-xl p-6 max-w-md w-[90%] space-y-4">
            <h3 className="text-heading-lg text-foreground">{language === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}</h3>
            <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3}
              placeholder={language === 'ar' ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'} />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setRejectionModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => executeStatusChange('rejected', rejectionReason)} disabled={!rejectionReason.trim() || isChangingStatus}
                className="bg-destructive text-destructive-foreground">
                {isChangingStatus && <Loader2 size={14} className="animate-spin" />}
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Incomplete steps warning */}
      {incompleteStepsWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIncompleteStepsWarning(null)} />
          <div className="relative bg-card rounded-lg shadow-xl p-6 max-w-md w-[90%] space-y-4">
            <h3 className="text-heading-lg text-foreground">{language === 'ar' ? 'خطوات غير مكتملة' : 'Incomplete Steps'}</h3>
            <p className="text-body-md text-muted-foreground">
              {language === 'ar' ? 'لم يتم إكمال جميع الخطوات المطلوبة. أكملها أولاً أو تابع على أي حال؟' : 'Not all required steps are completed. Complete them first or continue anyway?'}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setIncompleteStepsWarning(null); setActiveTab('steps'); }}>
                {language === 'ar' ? 'إكمال الخطوات أولاً' : 'Complete Steps First'}
              </Button>
              <Button onClick={() => executeStatusChange(incompleteStepsWarning)}
                className="bg-accent text-accent-foreground">
                {language === 'ar' ? 'متابعة على أي حال' : 'Mark Complete Anyway'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* All steps complete prompt */}
      {allStepsCompletePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAllStepsCompletePrompt(false)} />
          <div className="relative bg-card rounded-lg shadow-xl p-6 max-w-md w-[90%] space-y-4">
            <h3 className="text-heading-lg text-foreground">{language === 'ar' ? 'جميع الخطوات مكتملة!' : 'All Steps Complete!'}</h3>
            <p className="text-body-md text-muted-foreground">
              {language === 'ar' ? 'هل تريد تعيين المعاملة كمكتملة؟' : 'Would you like to mark this errand as completed?'}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setAllStepsCompletePrompt(false)}>{t('common.no')}</Button>
              <Button onClick={() => { setAllStepsCompletePrompt(false); executeStatusChange('completed'); }}
                className="bg-[hsl(var(--success))] text-white">
                {t('common.yes')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Previous step warning */}
      <ConfirmDialog
        isOpen={!!prevStepWarning}
        onClose={() => setPrevStepWarning(null)}
        onConfirm={() => {
          if (prevStepWarning) {
            const step = steps.find(s => s.id === prevStepWarning.stepId);
            if (step) updateStepStatus(step, 'in_progress');
          }
        }}
        title="Previous Step Incomplete" titleAr="الخطوة السابقة غير مكتملة"
        message="The previous step hasn't been completed yet. Start this step anyway?"
        messageAr="الخطوة السابقة لم تكتمل بعد. هل تريد بدء هذه الخطوة؟"
        type="warning"
      />

      {/* Block step modal */}
      {blockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBlockModal(null)} />
          <div className="relative bg-card rounded-lg shadow-xl p-6 max-w-md w-[90%] space-y-4">
            <h3 className="text-heading-lg text-foreground">{language === 'ar' ? 'سبب الحظر' : 'Block Reason'}</h3>
            <Textarea value={blockReason} onChange={e => setBlockReason(e.target.value)} rows={3}
              placeholder={language === 'ar' ? 'أدخل سبب حظر الخطوة...' : 'Enter reason for blocking this step...'} />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setBlockModal(null)}>{t('common.cancel')}</Button>
              <Button onClick={handleBlockStep} className="bg-destructive text-destructive-foreground">
                {t('errands.steps.blockStep')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload document modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isUploading && setUploadModal(false)} />
          <div className="relative bg-card rounded-lg shadow-xl p-6 max-w-lg w-[90%] space-y-4">
            <h3 className="text-heading-lg text-foreground">{t('errands.detail.uploadDocument')}</h3>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg h-28 flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors"
            >
              <Upload size={28} className="text-muted-foreground mb-2" />
              <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'اسحب وأفلت أو انقر للاختيار' : 'Drag & drop or click to browse'}</p>
              <p className="text-body-sm text-muted-foreground/50">{language === 'ar' ? 'الحد الأقصى ١٠ ميجابايت' : 'Max 10MB per file'}</p>
            </div>
            <input ref={fileInputRef} type="file" className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
              onChange={e => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]); }} />

            {uploadFile && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 rounded bg-muted text-body-sm">
                  <FileText size={14} /> {uploadFile.name} <span className="text-muted-foreground">({fmtFileSize(uploadFile.size)})</span>
                </div>
                <select value={uploadDocType} onChange={e => setUploadDocType(e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  {DOCUMENT_TYPES.map(dt => (
                    <option key={dt} value={dt}>{t(`errands.detail.docTypes.${dt}`)}</option>
                  ))}
                </select>
                <select value={uploadStepId} onChange={e => setUploadStepId(e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">{language === 'ar' ? 'ربط بخطوة (اختياري)' : 'Link to step (optional)'}</option>
                  {steps.map(s => (
                    <option key={s.id} value={s.id}>{s.step_number}. {language === 'ar' && s.title_ar ? s.title_ar : s.title}</option>
                  ))}
                </select>
                <Input placeholder={language === 'ar' ? 'اسم الملف (عربي)' : 'File name (Arabic)'} dir="rtl" value={uploadFileNameAr} onChange={e => setUploadFileNameAr(e.target.value)} />
                <label className="flex items-center gap-2 text-body-sm">
                  <input type="checkbox" checked={uploadVisible} onChange={e => setUploadVisible(e.target.checked)} className="rounded" />
                  {t('errands.fields.visibleToClient')}
                </label>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setUploadModal(false)} disabled={isUploading}>{t('common.cancel')}</Button>
              <Button onClick={handleUpload} disabled={!uploadFile || isUploading}
                className="bg-accent text-accent-foreground">
                {isUploading && <Loader2 size={14} className="animate-spin" />}
                {language === 'ar' ? 'رفع' : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete document confirm */}
      <ConfirmDialog
        isOpen={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={deleteDoc}
        title="Delete Document" titleAr="حذف المستند"
        message="Are you sure you want to delete this document?" messageAr="هل أنت متأكد من حذف هذا المستند؟"
        type="danger"
      />
    </div>
  );
}
