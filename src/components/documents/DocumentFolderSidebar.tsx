import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Folder, FolderOpen, ChevronDown, ChevronRight, FileText } from 'lucide-react';

export interface FolderFilter {
  type: 'all' | 'cases' | 'errands' | 'clients' | 'templates' | 'general' | 'internal' | 'shared_library' | 'case_specific';
  entityId?: string;
  entityLabel?: string;
}

interface FolderNode {
  key: string;
  label: string;
  count: number;
  type: FolderFilter['type'];
  entityId?: string;
  children?: FolderNode[];
}

interface Props {
  activeFolder: FolderFilter;
  onFolderChange: (f: FolderFilter) => void;
}

export default function DocumentFolderSidebar({ activeFolder, onFolderChange }: Props) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ cases: false, errands: false, clients: false });
  const [totalCount, setTotalCount] = useState(0);
  const [scopeCounts, setScopeCounts] = useState({ internal: 0, shared_library: 0, case_specific: 0 });

  useEffect(() => {
    if (!profile?.organization_id) return;
    const orgId = profile.organization_id;

    const fetchFolders = async () => {
      const { data: docs } = await supabase
        .from('documents')
        .select('case_id, errand_id, client_id, document_category, visibility_scope, cases:cases(case_number), errands:errands(errand_number), clients:clients(first_name,last_name,company_name,client_type,first_name_ar,last_name_ar,company_name_ar)')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .eq('is_latest_version', true);

      if (!docs) return;

      setTotalCount(docs.length);

      const sc = { internal: 0, shared_library: 0, case_specific: 0 };
      docs.forEach((d: any) => {
        const s = (d.visibility_scope || 'case_specific') as keyof typeof sc;
        if (sc[s] !== undefined) sc[s]++;
      });
      setScopeCounts(sc);

      // Group by cases
      const caseMap = new Map<string, { label: string; count: number }>();
      const errandMap = new Map<string, { label: string; count: number }>();
      const clientMap = new Map<string, { label: string; count: number }>();
      let templateCount = 0;
      let generalCount = 0;

      docs.forEach((d: any) => {
        if (d.case_id && d.cases) {
          const existing = caseMap.get(d.case_id);
          if (existing) existing.count++;
          else caseMap.set(d.case_id, { label: d.cases.case_number, count: 1 });
        } else if (d.errand_id && d.errands) {
          const existing = errandMap.get(d.errand_id);
          if (existing) existing.count++;
          else errandMap.set(d.errand_id, { label: d.errands.errand_number, count: 1 });
        } else if (d.client_id && d.clients) {
          const existing = clientMap.get(d.client_id);
          if (existing) existing.count++;
          else {
            const c = d.clients;
            const name = c.client_type === 'company'
              ? (language === 'ar' && c.company_name_ar ? c.company_name_ar : c.company_name || '')
              : (language === 'ar' && c.first_name_ar ? `${c.first_name_ar} ${c.last_name_ar || ''}` : `${c.first_name || ''} ${c.last_name || ''}`).trim();
            clientMap.set(d.client_id, { label: name, count: 1 });
          }
        } else if (d.document_category === 'template') {
          templateCount++;
        } else {
          generalCount++;
        }
      });

      const tree: FolderNode[] = [];
      if (caseMap.size > 0) {
        tree.push({
          key: 'cases', label: language === 'ar' ? 'القضايا' : 'Cases', type: 'cases',
          count: Array.from(caseMap.values()).reduce((s, v) => s + v.count, 0),
          children: Array.from(caseMap.entries()).map(([id, v]) => ({
            key: `case-${id}`, label: v.label, count: v.count, type: 'cases' as const, entityId: id,
          })),
        });
      }
      if (errandMap.size > 0) {
        tree.push({
          key: 'errands', label: language === 'ar' ? 'المعاملات' : 'Errands', type: 'errands',
          count: Array.from(errandMap.values()).reduce((s, v) => s + v.count, 0),
          children: Array.from(errandMap.entries()).map(([id, v]) => ({
            key: `errand-${id}`, label: v.label, count: v.count, type: 'errands' as const, entityId: id,
          })),
        });
      }
      if (clientMap.size > 0) {
        tree.push({
          key: 'clients', label: language === 'ar' ? 'العملاء' : 'Clients', type: 'clients',
          count: Array.from(clientMap.values()).reduce((s, v) => s + v.count, 0),
          children: Array.from(clientMap.entries()).map(([id, v]) => ({
            key: `client-${id}`, label: v.label, count: v.count, type: 'clients' as const, entityId: id,
          })),
        });
      }
      if (templateCount > 0) {
        tree.push({ key: 'templates', label: language === 'ar' ? 'القوالب' : 'Templates', type: 'templates', count: templateCount });
      }
      if (generalCount > 0) {
        tree.push({ key: 'general', label: language === 'ar' ? 'عام' : 'General', type: 'general', count: generalCount });
      }

      setFolders(tree);
    };

    fetchFolders();
  }, [profile?.organization_id, language]);

  const toggleExpand = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const isActive = (type: FolderFilter['type'], entityId?: string) =>
    activeFolder.type === type && activeFolder.entityId === entityId;

  const renderNode = (node: FolderNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExp = expanded[node.key];
    const active = isActive(node.type, node.entityId);

    return (
      <div key={node.key}>
        <button
          onClick={() => {
            if (hasChildren) toggleExpand(node.key);
            onFolderChange({ type: node.type, entityId: node.entityId, entityLabel: node.label });
          }}
          className={cn(
            'w-full flex items-center gap-2 h-9 rounded-md text-body-sm transition-colors',
            active ? 'bg-accent/10 text-accent font-medium' : 'text-foreground hover:bg-muted',
          )}
          style={{ paddingInlineStart: `${8 + depth * 16}px`, paddingInlineEnd: '8px' }}
        >
          {hasChildren ? (
            isExp ? <ChevronDown size={14} className="shrink-0 text-muted-foreground" /> : <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
          ) : <span className="w-3.5" />}
          {active || isExp ? <FolderOpen size={16} className="shrink-0" /> : <Folder size={16} className="shrink-0" />}
          <span className="truncate flex-1 text-start">{node.label}</span>
          <span className="text-muted-foreground text-[11px] shrink-0">{node.count}</span>
        </button>
        {hasChildren && isExp && node.children!.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="w-[240px] shrink-0 border-e border-border p-4 hidden lg:block">
      <h3 className="text-heading-sm font-semibold text-foreground mb-3">
        {language === 'ar' ? 'المجلدات' : 'Folders'}
      </h3>
      <div className="space-y-0.5">
        {/* All Documents */}
        <button
          onClick={() => onFolderChange({ type: 'all' })}
          className={cn(
            'w-full flex items-center gap-2 h-9 px-2 rounded-md text-body-sm transition-colors',
            activeFolder.type === 'all' ? 'bg-accent/10 text-accent font-medium' : 'text-foreground hover:bg-muted',
          )}
        >
          <FileText size={16} className="shrink-0" />
          <span className="flex-1 text-start">{language === 'ar' ? 'جميع المستندات' : 'All Documents'}</span>
          <span className="text-muted-foreground text-[11px]">{totalCount}</span>
        </button>

        {/* Library section */}
        <div className="mt-3 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {language === 'ar' ? 'المكتبة' : 'Library'}
        </div>
        {([
          { type: 'internal' as const, en: 'Internal Use', ar: 'استخدام داخلي', count: scopeCounts.internal },
          { type: 'shared_library' as const, en: 'Shared with Clients', ar: 'مشترك مع العملاء', count: scopeCounts.shared_library },
          { type: 'case_specific' as const, en: 'Case Documents', ar: 'مستندات القضايا', count: scopeCounts.case_specific },
        ]).map(item => (
          <button
            key={item.type}
            onClick={() => onFolderChange({ type: item.type })}
            className={cn(
              'w-full flex items-center gap-2 h-9 px-2 rounded-md text-body-sm transition-colors',
              activeFolder.type === item.type ? 'bg-accent/10 text-accent font-medium' : 'text-foreground hover:bg-muted',
            )}
          >
            <Folder size={16} className="shrink-0" />
            <span className="flex-1 text-start">{language === 'ar' ? item.ar : item.en}</span>
            <span className="text-muted-foreground text-[11px]">{item.count}</span>
          </button>
        ))}

        {/* Folders section */}
        <div className="mt-3 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {language === 'ar' ? 'المجلدات' : 'Folders'}
        </div>
        {folders.map(node => renderNode(node))}
      </div>
    </div>
  );
}
