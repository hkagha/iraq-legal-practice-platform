import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download, Users, Scale, FileCheck, Clock, Receipt } from 'lucide-react';

function downloadCSV(data: any[], filename: string) {
  if (!data.length) {
    toast({ title: 'No data to export', variant: 'destructive' });
    return;
  }
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataExportSection() {
  const { organization } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState<string | null>(null);

  const exportTable = async (table: string, filename: string) => {
    if (!organization?.id) return;
    setLoading(table);
    try {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('organization_id', organization.id)
        .limit(10000);
      if (error) throw error;
      downloadCSV(data || [], filename);
      toast({ title: language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully' });
    } catch {
      toast({ title: language === 'ar' ? 'فشل التصدير' : 'Export failed', variant: 'destructive' });
    }
    setLoading(null);
  };

  const exports = [
    { key: 'clients', icon: Users, label: language === 'ar' ? 'تصدير العملاء (CSV)' : 'Export Clients (CSV)', file: 'clients.csv' },
    { key: 'cases', icon: Scale, label: language === 'ar' ? 'تصدير القضايا (CSV)' : 'Export Cases (CSV)', file: 'cases.csv' },
    { key: 'errands', icon: FileCheck, label: language === 'ar' ? 'تصدير المعاملات (CSV)' : 'Export Errands (CSV)', file: 'errands.csv' },
    { key: 'time_entries', icon: Clock, label: language === 'ar' ? 'تصدير سجلات الوقت (CSV)' : 'Export Time Entries (CSV)', file: 'time_entries.csv' },
    { key: 'invoices', icon: Receipt, label: language === 'ar' ? 'تصدير الفواتير (CSV)' : 'Export Invoices (CSV)', file: 'invoices.csv' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-lg text-foreground">{language === 'ar' ? 'تصدير بياناتك' : 'Export Your Data'}</h2>
        <p className="text-body-md text-muted-foreground mt-1">
          {language === 'ar' ? 'حمّل نسخة كاملة من بيانات مكتبك' : 'Download a complete copy of your firm\'s data'}
        </p>
      </div>

      <div className="space-y-3">
        {exports.map(exp => {
          const Icon = exp.icon;
          return (
            <Button
              key={exp.key}
              variant="outline"
              className="w-full justify-start h-12 text-body-md"
              disabled={loading !== null}
              onClick={() => exportTable(exp.key, exp.file)}
            >
              <Icon size={16} className="me-2.5 text-muted-foreground" />
              {exp.label}
              <Download size={14} className="ms-auto text-muted-foreground" />
              {loading === exp.key && <span className="ms-2 text-body-sm text-muted-foreground">{language === 'ar' ? 'جاري...' : 'Exporting...'}</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
