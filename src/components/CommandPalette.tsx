import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Scale, FileCheck, Users, Calendar, CheckSquare, FileText,
  Clock, Receipt, BarChart3, Settings, Plus, Search,
} from 'lucide-react';

interface SearchHit {
  id: string;
  type: 'case' | 'errand' | 'client' | 'invoice';
  title: string;
  subtitle?: string;
}

/**
 * Global command palette. Opens with ⌘K / Ctrl+K from anywhere.
 * Provides quick navigation, quick actions, and live entity search.
 */
export default function CommandPalette() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEN = language === 'en';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // Toggle with ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setHits([]);
    }
  }, [open]);

  // Debounced live search
  useEffect(() => {
    if (!open || query.length < 2 || !profile?.organization_id) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const orgId = profile.organization_id!;
      const pattern = `%${query}%`;
      const [cases, errands, persons, entities, invoices] = await Promise.all([
        supabase.from('cases').select('id,title,title_ar,case_number')
          .eq('organization_id', orgId)
          .or(`title.ilike.${pattern},title_ar.ilike.${pattern},case_number.ilike.${pattern}`)
          .limit(5),
        supabase.from('errands').select('id,title,title_ar,errand_number')
          .eq('organization_id', orgId)
          .or(`title.ilike.${pattern},title_ar.ilike.${pattern},errand_number.ilike.${pattern}`)
          .limit(5),
        supabase.from('persons').select('id,first_name,last_name,first_name_ar,last_name_ar')
          .eq('organization_id', orgId)
          .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},first_name_ar.ilike.${pattern},last_name_ar.ilike.${pattern}`)
          .limit(5),
        supabase.from('entities').select('id,company_name,company_name_ar')
          .eq('organization_id', orgId)
          .or(`company_name.ilike.${pattern},company_name_ar.ilike.${pattern}`)
          .limit(5),
        supabase.from('invoices').select('id,invoice_number')
          .eq('organization_id', orgId)
          .ilike('invoice_number', pattern)
          .limit(5),
      ]);

      const all: SearchHit[] = [
        ...((cases.data || []).map((c: any) => ({
          id: c.id, type: 'case' as const,
          title: (isEN ? c.title : c.title_ar || c.title) || c.case_number,
          subtitle: c.case_number,
        }))),
        ...((errands.data || []).map((e: any) => ({
          id: e.id, type: 'errand' as const,
          title: (isEN ? e.title : e.title_ar || e.title) || e.errand_number,
          subtitle: e.errand_number,
        }))),
        ...((persons.data || []).map((p: any) => ({
          id: p.id, type: 'client' as const,
          title: isEN
            ? `${p.first_name || ''} ${p.last_name || ''}`.trim()
            : `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim(),
          subtitle: isEN ? 'Person' : 'شخص',
        }))),
        ...((entities.data || []).map((en: any) => ({
          id: en.id, type: 'client' as const,
          title: isEN ? en.company_name : (en.company_name_ar || en.company_name),
          subtitle: isEN ? 'Company' : 'شركة',
        }))),
        ...((invoices.data || []).map((iv: any) => ({
          id: iv.id, type: 'invoice' as const,
          title: iv.invoice_number,
        }))),
      ];
      setHits(all);
      setSearching(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open, profile?.organization_id, isEN]);

  const go = useCallback((path: string) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  const navItems = useMemo(() => [
    { icon: LayoutDashboard, label: isEN ? 'Dashboard' : 'لوحة المعلومات', path: '/dashboard' },
    { icon: Scale, label: isEN ? 'Cases' : 'القضايا', path: '/cases' },
    { icon: FileCheck, label: isEN ? 'Errands' : 'المعاملات', path: '/errands' },
    { icon: Users, label: isEN ? 'Clients' : 'العملاء', path: '/clients' },
    { icon: Calendar, label: isEN ? 'Calendar' : 'التقويم', path: '/calendar' },
    { icon: CheckSquare, label: isEN ? 'Tasks' : 'المهام', path: '/tasks' },
    { icon: FileText, label: isEN ? 'Documents' : 'المستندات', path: '/documents' },
    { icon: Clock, label: isEN ? 'Time Tracking' : 'تتبع الوقت', path: '/time-tracking' },
    { icon: Receipt, label: isEN ? 'Billing' : 'الفواتير', path: '/billing' },
    { icon: BarChart3, label: isEN ? 'Reports' : 'التقارير', path: '/reports' },
    { icon: Settings, label: isEN ? 'Settings' : 'الإعدادات', path: '/settings' },
  ], [isEN]);

  const actions = useMemo(() => [
    { icon: Plus, label: isEN ? 'New Case' : 'قضية جديدة', path: '/cases/new' },
    { icon: Plus, label: isEN ? 'New Errand' : 'معاملة جديدة', path: '/errands/new' },
    { icon: Plus, label: isEN ? 'New Invoice' : 'فاتورة جديدة', path: '/billing/new' },
  ], [isEN]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={isEN ? 'Search cases, clients, errands, invoices…' : 'ابحث في القضايا والعملاء والمعاملات والفواتير…'}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? (isEN ? 'Searching…' : 'جارٍ البحث…') : (isEN ? 'No results found.' : 'لا توجد نتائج.')}
        </CommandEmpty>

        {hits.length > 0 && (
          <>
            <CommandGroup heading={isEN ? 'Results' : 'النتائج'}>
              {hits.map((h) => (
                <CommandItem
                  key={`${h.type}-${h.id}`}
                  value={`${h.type}-${h.id}-${h.title}`}
                  onSelect={() => {
                    const map = { case: '/cases/', errand: '/errands/', client: '/clients/', invoice: '/billing/' };
                    go(`${map[h.type]}${h.id}`);
                  }}
                >
                  <Search className="me-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{h.title}</span>
                  {h.subtitle && <span className="text-[11px] text-muted-foreground ms-2">{h.subtitle}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading={isEN ? 'Quick Actions' : 'إجراءات سريعة'}>
          {actions.map((a) => (
            <CommandItem key={a.path} onSelect={() => go(a.path)}>
              <a.icon className="me-2 h-4 w-4" />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={isEN ? 'Navigate' : 'انتقل إلى'}>
          {navItems.map((n) => (
            <CommandItem key={n.path} onSelect={() => go(n.path)}>
              <n.icon className="me-2 h-4 w-4" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
