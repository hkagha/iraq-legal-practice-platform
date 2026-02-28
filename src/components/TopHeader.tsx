import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, Bell, Menu, User, Settings, LogOut, Scale, Users as UsersIcon, FileCheck, CheckSquare, Calendar } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface TopHeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

interface SearchResult {
  id: string;
  type: 'case' | 'client' | 'errand' | 'document' | 'task' | 'calendarEvent';
  title: string;
  subtitle: string;
  status?: string;
}

export default function TopHeader({ onMenuClick, showMenu }: TopHeaderProps) {
  const { t, language, setLanguage } = useLanguage();
  const { profile, getFullName, getInitials, signOut, isRole } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2 || !profile?.organization_id) {
      setResults([]);
      return;
    }
    setSearching(true);
    const pattern = `%${q}%`;

    const [casesRes, clientsRes, errandsRes, docsRes, tasksRes, calEventsRes] = await Promise.all([
      supabase
        .from('cases')
        .select('id, title, title_ar, case_number, status')
        .eq('organization_id', profile.organization_id!)
        .or(`title.ilike.${pattern},case_number.ilike.${pattern},title_ar.ilike.${pattern}`)
        .limit(5),
      supabase
        .from('clients')
        .select('id, first_name, last_name, company_name, client_type, email')
        .eq('organization_id', profile.organization_id!)
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},company_name.ilike.${pattern},email.ilike.${pattern}`)
        .limit(5),
      supabase
        .from('errands')
        .select('id, title, title_ar, errand_number, status, reference_number')
        .eq('organization_id', profile.organization_id!)
        .or(`title.ilike.${pattern},errand_number.ilike.${pattern},title_ar.ilike.${pattern},reference_number.ilike.${pattern}`)
        .limit(5),
      supabase
        .from('documents')
        .select('id, file_name, title, title_ar, document_category, created_at')
        .eq('organization_id', profile.organization_id!)
        .eq('status', 'active')
        .eq('is_latest_version', true)
        .or(`file_name.ilike.${pattern},title.ilike.${pattern},title_ar.ilike.${pattern}`)
        .limit(5),
      supabase
        .from('tasks')
        .select('id, title, title_ar, status, due_date, priority')
        .eq('organization_id', profile.organization_id!)
        .or(`title.ilike.${pattern},title_ar.ilike.${pattern}`)
        .limit(5),
      supabase
        .from('calendar_events')
        .select('id, title, title_ar, start_date, event_type')
        .eq('organization_id', profile.organization_id!)
        .or(`title.ilike.${pattern},title_ar.ilike.${pattern}`)
        .limit(3),
    ]);

    const caseResults: SearchResult[] = (casesRes.data || []).map(c => ({
      id: c.id, type: 'case', title: language === 'ar' && c.title_ar ? c.title_ar : c.title, subtitle: c.case_number, status: c.status,
    }));
    const clientResults: SearchResult[] = (clientsRes.data || []).map(c => ({
      id: c.id, type: 'client', title: c.client_type === 'company' ? (c.company_name || '') : `${c.first_name || ''} ${c.last_name || ''}`.trim(), subtitle: c.email || c.client_type,
    }));
    const errandResults: SearchResult[] = (errandsRes.data || []).map(e => ({
      id: e.id, type: 'errand', title: language === 'ar' && e.title_ar ? e.title_ar : e.title, subtitle: e.errand_number, status: e.status,
    }));
    const docResults: SearchResult[] = (docsRes.data || []).map(d => ({
      id: d.id, type: 'document', title: language === 'ar' && d.title_ar ? d.title_ar : (d.title || d.file_name), subtitle: d.document_category,
    }));
    const taskResults: SearchResult[] = (tasksRes.data || []).map(tk => ({
      id: tk.id, type: 'task', title: language === 'ar' && tk.title_ar ? tk.title_ar : tk.title, subtitle: tk.due_date || '', status: tk.status,
    }));
    const calEventResults: SearchResult[] = (calEventsRes.data || []).map(ev => ({
      id: ev.id, type: 'calendarEvent', title: language === 'ar' && ev.title_ar ? ev.title_ar : ev.title, subtitle: ev.start_date,
    }));

    setResults([...caseResults, ...errandResults, ...clientResults, ...docResults, ...taskResults, ...calEventResults]);
    setSearching(false);
  }, [profile?.organization_id, language]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, doSearch]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleResultClick = (r: SearchResult) => {
    setShowResults(false);
    setSearchQuery('');
    if (r.type === 'document') { navigate('/documents'); return; }
    if (r.type === 'task') { navigate('/tasks'); return; }
    if (r.type === 'calendarEvent') { navigate('/calendar'); return; }
    navigate(r.type === 'case' ? `/cases/${r.id}` : r.type === 'errand' ? `/errands/${r.id}` : `/clients/${r.id}`);
  };

  const caseResults = results.filter(r => r.type === 'case');
  const errandResults = results.filter(r => r.type === 'errand');
  const clientResultsFiltered = results.filter(r => r.type === 'client');
  const docResults = results.filter(r => r.type === 'document');
  const taskResultsFiltered = results.filter(r => r.type === 'task');
  const calEventResultsFiltered = results.filter(r => r.type === 'calendarEvent');

  return (
    <header className="h-16 bg-card shadow-xs flex items-center px-4 gap-3 shrink-0 z-10">
      {showMenu && (
        <button
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 rounded-button flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
      )}

      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-[400px]" ref={searchRef}>
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowResults(true); }}
            onFocus={() => { if (results.length > 0) setShowResults(true); }}
            onKeyDown={e => { if (e.key === 'Escape') setShowResults(false); }}
            placeholder={t('search.placeholder')}
            className="w-full h-10 bg-secondary border border-border rounded-card ps-9 pe-12 text-body-md text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-colors"
          />
          <kbd className="absolute end-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center rounded bg-slate-200 px-1.5 text-[11px] font-medium text-slate-500">
            ⌘K
          </kbd>

          {/* Search Results Dropdown */}
          {showResults && searchQuery.length >= 2 && (
            <div className="absolute top-full mt-1 inset-x-0 bg-card border border-border rounded-card shadow-lg z-50 max-h-[360px] overflow-y-auto">
              {results.length === 0 && !searching && (
                <div className="p-4 text-center text-body-sm text-muted-foreground">
                  {language === 'ar' ? `لم يتم العثور على نتائج لـ '${searchQuery}'` : `No results found for '${searchQuery}'`}
                </div>
              )}
              {searching && (
                <div className="p-4 text-center text-body-sm text-muted-foreground">{t('common.loading')}</div>
              )}
              {caseResults.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('sidebar.cases')}</div>
                  {caseResults.map(r => (
                    <button key={r.id} onClick={() => handleResultClick(r)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-start">
                      <Scale size={16} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md text-foreground truncate">{r.title}</p>
                        <p className="text-body-sm text-muted-foreground font-mono">{r.subtitle}</p>
                      </div>
                      {r.status && <StatusBadge status={r.status} type="case" size="sm" />}
                    </button>
                  ))}
                </>
              )}
              {errandResults.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border">{t('sidebar.errands')}</div>
                  {errandResults.map(r => (
                    <button key={r.id} onClick={() => handleResultClick(r)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-start">
                      <FileCheck size={16} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md text-foreground truncate">{r.title}</p>
                        <p className="text-body-sm text-muted-foreground font-mono">{r.subtitle}</p>
                      </div>
                      {r.status && <StatusBadge status={r.status} type="errand" size="sm" />}
                    </button>
                  ))}
                </>
              )}
              {clientResultsFiltered.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border">{t('sidebar.clients')}</div>
                  {clientResultsFiltered.map(r => (
                    <button key={r.id} onClick={() => handleResultClick(r)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-start">
                      <UsersIcon size={16} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md text-foreground truncate">{r.title}</p>
                        <p className="text-body-sm text-muted-foreground">{r.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {docResults.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border">{t('sidebar.documents')}</div>
                  {docResults.map(r => (
                    <button key={r.id} onClick={() => handleResultClick(r)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-start">
                      <FileCheck size={16} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md text-foreground truncate">{r.title}</p>
                        <p className="text-body-sm text-muted-foreground capitalize">{r.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {taskResultsFiltered.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border">{t('sidebar.tasks')}</div>
                  {taskResultsFiltered.map(r => (
                    <button key={r.id} onClick={() => handleResultClick(r)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-start">
                      <CheckSquare size={16} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md text-foreground truncate">{r.title}</p>
                        <p className="text-body-sm text-muted-foreground">{r.subtitle}</p>
                      </div>
                      {r.status && <StatusBadge status={r.status} type="task" size="sm" />}
                    </button>
                  ))}
                </>
              )}
              {calEventResultsFiltered.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border">{t('sidebar.calendar')}</div>
                  {calEventResultsFiltered.map(r => (
                    <button key={r.id} onClick={() => handleResultClick(r)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-start">
                      <Calendar size={16} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md text-foreground truncate">{r.title}</p>
                        <p className="text-body-sm text-muted-foreground">{r.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="h-9 w-9 rounded-button bg-secondary flex items-center justify-center text-[13px] font-semibold text-foreground hover:bg-slate-200 transition-colors"
        >
          {language === 'en' ? 'AR' : 'EN'}
        </button>

        <button className="h-9 w-9 rounded-button flex items-center justify-center hover:bg-secondary transition-colors relative">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-error" />
        </button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 w-9 rounded-avatar bg-accent text-accent-foreground flex items-center justify-center text-body-md font-semibold focus:outline-none">
              {getInitials() || 'U'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px] shadow-lg rounded-card p-1">
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-avatar bg-accent text-accent-foreground flex items-center justify-center text-body-sm font-semibold">
                  {getInitials() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-heading-sm text-foreground truncate">{getFullName()}</p>
                  <p className="text-body-sm text-muted-foreground truncate">{profile?.email}</p>
                  <span className="inline-block mt-1 text-body-sm bg-secondary rounded-badge px-2 py-0.5 capitalize">{profile?.role?.replace('_', ' ')}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              {language === 'en' ? 'My Profile' : 'ملفي الشخصي'}
            </DropdownMenuItem>
            {isRole('firm_admin') && (
              <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                {t('sidebar.settings')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-error focus:text-error">
              <LogOut className="h-4 w-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
