import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormDatePicker } from '@/components/ui/FormDatePicker';
import { FormField } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { FileText, Loader2, Printer, Save, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const TEMPLATE_CATEGORY_ICONS: Record<string, string> = {
  contract: '📄', pleading: '⚖️', power_of_attorney: '🔏', memorandum: '📝',
  letter: '✉️', notice: '📋', affidavit: '📜', motion: '📑', brief: '📓',
  corporate: '🏢', employment: '💼', real_estate: '🏠', other: '📎',
};

interface Placeholder {
  key: string; label: string; label_ar?: string; type: string; required?: boolean; options?: string[];
}

interface Template {
  id: string; name: string; name_ar: string | null; description: string | null; description_ar: string | null;
  category: string; language: string; content: string; placeholders: Placeholder[];
  is_system: boolean; is_active: boolean; created_at: string;
}

interface DocumentTemplatesViewProps {
  onDocumentSaved: () => void;
}

export default function DocumentTemplatesView({ onDocumentSaved }: DocumentTemplatesViewProps) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'list' | 'fill' | 'preview'>('list');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase.from('document_templates').select('*').eq('is_active', true).order('category').order('name');
      setTemplates((data || []) as unknown as Template[]);
      setLoading(false);
    };
    fetchTemplates();
  }, []);

  const selectTemplate = (tmpl: Template) => {
    setSelectedTemplate(tmpl);
    // Auto-fill date fields with today
    const values: Record<string, string> = {};
    (tmpl.placeholders as Placeholder[]).forEach(p => {
      if (p.type === 'date') values[p.key] = format(new Date(), 'yyyy-MM-dd');
    });
    setPlaceholderValues(values);
    setStep('fill');
  };

  const generateDocument = () => {
    if (!selectedTemplate) return;
    let html = selectedTemplate.content;
    Object.entries(placeholderValues).forEach(([key, value]) => {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `[${key}]`);
    });
    // Replace unfilled placeholders
    html = html.replace(/\{\{(\w+)\}\}/g, '[$1]');
    setGeneratedHtml(html);
    setStep('preview');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>${selectedTemplate?.name}</title><style>body{font-family:'Noto Sans Arabic',Arial,sans-serif;padding:40px;line-height:2;direction:rtl;}</style></head><body>${generatedHtml}</body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate || !profile?.organization_id) return;
    setSaving(true);
    try {
      // Create a Blob from the HTML and upload
      const blob = new Blob([generatedHtml], { type: 'text/html' });
      const fileName = `${selectedTemplate.name}-${format(new Date(), 'yyyyMMdd-HHmmss')}.html`;
      const storagePath = `${profile.organization_id}/templates/general/${Date.now()}-${fileName}`;

      const { error: uploadErr } = await supabase.storage.from('documents').upload(storagePath, blob, { contentType: 'text/html' });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from('documents').insert({
        organization_id: profile.organization_id,
        file_name: fileName,
        file_path: storagePath,
        file_size_bytes: blob.size,
        file_type: 'html',
        mime_type: 'text/html',
        document_category: selectedTemplate.category,
        title: `${language === 'ar' && selectedTemplate.name_ar ? selectedTemplate.name_ar : selectedTemplate.name}`,
        uploaded_by: profile.id,
        is_visible_to_client: false,
      } as any);
      if (insertErr) throw insertErr;

      toast.success(t('documents.messages.uploaded'));
      onDocumentSaved();
      resetFlow();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetFlow = () => {
    setStep('list');
    setSelectedTemplate(null);
    setPlaceholderValues({});
    setGeneratedHtml('');
  };

  const allRequired = selectedTemplate ? (selectedTemplate.placeholders as Placeholder[]).filter(p => p.required).every(p => placeholderValues[p.key]?.trim()) : false;

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>;
  }

  // Step: Fill Placeholders
  if (step === 'fill' && selectedTemplate) {
    const placeholders = selectedTemplate.placeholders as Placeholder[];
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={resetFlow}><ArrowLeft size={18} /></Button>
          <div>
            <h3 className="text-heading-lg font-semibold">{language === 'ar' ? `إنشاء مستند: ${selectedTemplate.name_ar || selectedTemplate.name}` : `Generate: ${selectedTemplate.name}`}</h3>
            <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'أكمل الحقول أدناه لإنشاء المستند' : 'Fill in the fields below to generate the document'}</p>
          </div>
        </div>
        <div className="space-y-4 max-w-xl">
          {placeholders.map(p => (
            <FormField key={p.key} label={language === 'ar' && p.label_ar ? p.label_ar : p.label} required={p.required}>
              {p.type === 'textarea' ? (
                <FormTextarea value={placeholderValues[p.key] || ''} onChange={e => setPlaceholderValues(prev => ({ ...prev, [p.key]: e.target.value }))} rows={3} />
              ) : p.type === 'date' ? (
                <FormInput type="date" value={placeholderValues[p.key] || ''} onChange={e => setPlaceholderValues(prev => ({ ...prev, [p.key]: e.target.value }))} />
              ) : (
                <FormInput value={placeholderValues[p.key] || ''} onChange={e => setPlaceholderValues(prev => ({ ...prev, [p.key]: e.target.value }))} />
              )}
            </FormField>
          ))}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={resetFlow}>{t('common.cancel')}</Button>
            <Button onClick={generateDocument} disabled={!allRequired} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {language === 'ar' ? 'إنشاء المستند' : 'Generate Document'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step: Preview
  if (step === 'preview') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setStep('fill')}><ArrowLeft size={18} /></Button>
          <h3 className="text-heading-lg font-semibold">{language === 'ar' ? 'معاينة المستند' : 'Document Preview'}</h3>
        </div>
        <div ref={previewRef} className="border border-border rounded-lg p-8 bg-white mb-4 min-h-[400px]" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('fill')}><ArrowLeft size={14} className="me-1" />{language === 'ar' ? 'تعديل' : 'Edit'}</Button>
          <Button variant="outline" onClick={handlePrint}><Printer size={14} className="me-1" />{language === 'ar' ? 'طباعة / PDF' : 'Print / PDF'}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? <Loader2 size={14} className="animate-spin me-1" /> : <Save size={14} className="me-1" />}
            {language === 'ar' ? 'حفظ في المستندات' : 'Save to Documents'}
          </Button>
        </div>
      </div>
    );
  }

  // Step: Template List
  return (
    <div>
      {templates.length === 0 ? (
        <EmptyState icon={FileText} title={language === 'ar' ? 'لا توجد قوالب بعد' : 'No templates yet'} titleAr="لا توجد قوالب بعد" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tmpl => {
            const catIcon = TEMPLATE_CATEGORY_ICONS[tmpl.category] || '📎';
            return (
              <div key={tmpl.id} className="bg-card border border-border rounded-lg p-5 hover:shadow-md hover:border-accent/50 transition-all cursor-pointer" onClick={() => selectTemplate(tmpl)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{catIcon}</span>
                  <span className="text-xs font-medium rounded-badge px-2 py-0.5 bg-muted text-muted-foreground">{t(`documents.templateCategories.${tmpl.category}`)}</span>
                </div>
                <h4 className="text-heading-sm font-semibold text-foreground mb-1">{language === 'ar' && tmpl.name_ar ? tmpl.name_ar : tmpl.name}</h4>
                <p className="text-body-sm text-muted-foreground line-clamp-2">{language === 'ar' && tmpl.description_ar ? tmpl.description_ar : tmpl.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs bg-muted rounded-badge px-2 py-0.5">{tmpl.language === 'ar' ? (language === 'ar' ? 'عربي' : 'Arabic') : tmpl.language === 'en' ? (language === 'ar' ? 'إنجليزي' : 'English') : (language === 'ar' ? 'ثنائي' : 'Bilingual')}</span>
                  {tmpl.is_system && <span className="text-xs bg-blue-50 text-blue-600 rounded-badge px-2 py-0.5">{language === 'ar' ? 'قالب النظام' : 'System'}</span>}
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full">{language === 'ar' ? 'استخدام القالب' : 'Use Template'}</Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
