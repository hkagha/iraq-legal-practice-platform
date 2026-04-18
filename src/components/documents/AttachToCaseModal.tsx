import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The library document being attached */
  sourceDocument: any | null;
  onAttached?: () => void;
}

export default function AttachToCaseModal({ open, onClose, sourceDocument, onAttached }: Props) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [target, setTarget] = useState<'case' | 'errand' | 'client'>('case');
  const [targetId, setTargetId] = useState<string>('');
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [busy, setBusy] = useState(false);
  const [caseOpts, setCaseOpts] = useState<{ value: string; label: string }[]>([]);
  const [errandOpts, setErrandOpts] = useState<{ value: string; label: string }[]>([]);
  const [clientOpts, setClientOpts] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open || !profile?.organization_id) return;
    const orgId = profile.organization_id;
    Promise.all([
      supabase.from('cases').select('id,case_number,title,title_ar').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(200),
      supabase.from('errands').select('id,errand_number,title,title_ar').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(200),
      supabase.from('clients').select('id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,client_type').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(200),
    ]).then(([c, e, cl]) => {
      setCaseOpts((c.data || []).map((x: any) => ({ value: x.id, label: `${x.case_number} — ${language === 'ar' && x.title_ar ? x.title_ar : x.title}` })));
      setErrandOpts((e.data || []).map((x: any) => ({ value: x.id, label: `${x.errand_number} — ${language === 'ar' && x.title_ar ? x.title_ar : x.title}` })));
      setClientOpts((cl.data || []).map((x: any) => {
        const name = x.client_type === 'company'
          ? (language === 'ar' && x.company_name_ar ? x.company_name_ar : x.company_name || '')
          : (language === 'ar' && x.first_name_ar ? `${x.first_name_ar} ${x.last_name_ar || ''}` : `${x.first_name || ''} ${x.last_name || ''}`).trim();
        return { value: x.id, label: name };
      }));
    });
  }, [open, profile?.organization_id, language]);

  useEffect(() => { if (open) { setTargetId(''); setTarget('case'); setVisibleToClient(false); } }, [open]);

  const handleAttach = async () => {
    if (!sourceDocument || !profile?.organization_id || !profile?.id || !targetId) return;
    setBusy(true);
    try {
      // Copy storage object to a case-scoped path
      const orgId = profile.organization_id;
      const context = target === 'case' ? 'cases' : target === 'errand' ? 'errands' : 'clients';
      const newPath = `${orgId}/${context}/${targetId}/${Date.now()}-${sourceDocument.file_name}`;

      const { error: copyErr } = await supabase.storage.from('documents').copy(sourceDocument.file_path, newPath);
      if (copyErr) throw copyErr;

      const { data: newDoc, error: insertErr } = await supabase.from('documents').insert({
        organization_id: orgId,
        file_name: sourceDocument.file_name,
        file_path: newPath,
        file_size_bytes: sourceDocument.file_size_bytes,
        file_type: sourceDocument.file_type,
        mime_type: sourceDocument.mime_type,
        document_category: sourceDocument.document_category,
        title: sourceDocument.title,
        title_ar: sourceDocument.title_ar,
        tags: sourceDocument.tags || [],
        case_id: target === 'case' ? targetId : null,
        errand_id: target === 'errand' ? targetId : null,
        client_id: target === 'client' ? targetId : null,
        is_visible_to_client: visibleToClient,
        visibility_scope: 'case_specific',
        parent_document_id: sourceDocument.id,
        uploaded_by: profile.id,
        version: 1,
        is_latest_version: true,
      } as any).select().single();

      if (insertErr) throw insertErr;

      if (newDoc) {
        await supabase.from('document_activities').insert({
          document_id: newDoc.id,
          organization_id: orgId,
          actor_id: profile.id,
          activity_type: 'attached_from_library',
          title: `Attached from library: ${sourceDocument.file_name}`,
          title_ar: `تم الإرفاق من المكتبة: ${sourceDocument.file_name}`,
        } as any);
      }

      toast.success(language === 'ar' ? 'تم إرفاق المستند' : 'Document attached');
      onAttached?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to attach');
    } finally {
      setBusy(false);
    }
  };

  const targetOptions = target === 'case' ? caseOpts : target === 'errand' ? errandOpts : clientOpts;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{language === 'ar' ? 'إرفاق إلى قضية / معاملة / عميل' : 'Attach to Case / Errand / Client'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-body-sm font-medium block mb-1.5">{language === 'ar' ? 'النوع' : 'Type'}</label>
            <div className="flex gap-2">
              {(['case', 'errand', 'client'] as const).map(t => (
                <button key={t} onClick={() => { setTarget(t); setTargetId(''); }}
                  className={`flex-1 h-9 rounded-md border text-body-sm transition-colors ${target === t ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:bg-muted'}`}>
                  {t === 'case' ? (language === 'ar' ? 'قضية' : 'Case') : t === 'errand' ? (language === 'ar' ? 'معاملة' : 'Errand') : (language === 'ar' ? 'عميل' : 'Client')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-body-sm font-medium block mb-1.5">{language === 'ar' ? 'اختر' : 'Select'}</label>
            <FormSearchSelect
              options={targetOptions}
              value={targetId}
              onChange={setTargetId}
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
            />
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-body-sm">{language === 'ar' ? 'مرئي للعميل' : 'Visible to client'}</span>
            <Switch checked={visibleToClient} onCheckedChange={setVisibleToClient} />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleAttach} disabled={!targetId || busy} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {busy && <Loader2 size={14} className="animate-spin me-1.5" />}
            {language === 'ar' ? 'إرفاق' : 'Attach'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
