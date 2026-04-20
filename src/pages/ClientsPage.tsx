import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, Search, User, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParties } from '@/hooks/useParties';
import { resolveEntityName, resolvePersonName } from '@/lib/parties';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PartyChip } from '@/components/parties/PartyChip';
import ClientFormSlideOver from '@/components/clients/ClientFormSlideOver';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { cn } from '@/lib/utils';

type TypeFilter = 'all' | 'person' | 'entity';
type StatusFilter = 'all' | 'active' | 'inactive';

export default function ClientsPage() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useParties({
    search,
    type: typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 200,
  });

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.length,
      person: all.filter((r) => r.partyType === 'person').length,
      entity: all.filter((r) => r.partyType === 'entity').length,
    };
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Clients & Parties"
        titleAr="الموكلون والأطراف"
        subtitle="Individuals and companies your firm works with."
        subtitleAr="الأفراد والشركات التي يعمل معها مكتبك."
        actionLabel="New Client"
        actionLabelAr="عميل جديد"
        onAction={() => setCreateOpen(true)}
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ar' ? 'ابحث بالاسم أو الهاتف أو البريد…' : 'Search by name, phone, or email…'}
            className="ps-9 h-10"
          />
        </div>
        <div className="flex items-center gap-1 rounded-input border border-border bg-card p-0.5">
          {(['all', 'person', 'entity'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'h-9 px-3 rounded-[6px] text-body-sm font-medium transition-colors flex items-center gap-1.5',
                typeFilter === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'person' && <User size={13} />}
              {t === 'entity' && <Building2 size={13} />}
              {t === 'all' && <Users size={13} />}
              {t === 'all'
                ? language === 'ar' ? 'الكل' : 'All'
                : t === 'person'
                  ? language === 'ar' ? 'أفراد' : 'Individuals'
                  : language === 'ar' ? 'شركات' : 'Companies'}
              <span className="text-[10px] opacity-70">({counts[t]})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-input border border-border bg-card p-0.5">
          {(['active', 'inactive', 'all'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'h-9 px-3 rounded-[6px] text-body-sm font-medium transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s === 'active' && (language === 'ar' ? 'نشط' : 'Active')}
              {s === 'inactive' && (language === 'ar' ? 'غير نشط' : 'Inactive')}
              {s === 'all' && (language === 'ar' ? 'الكل' : 'All')}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            icon={Users}
            title="No clients yet"
            titleAr="لا يوجد عملاء بعد"
            subtitle="Add your first individual or company to get started."
            subtitleAr="أضف أول فرد أو شركة للبدء."
            actionLabel="New Client"
            actionLabelAr="عميل جديد"
            onAction={() => setCreateOpen(true)}
          />
        </div>
      ) : (
        <div className="rounded-card border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {data!.map((row) => {
              const name =
                row.partyType === 'person'
                  ? resolvePersonName(row.person!, language as 'en' | 'ar')
                  : resolveEntityName(row.entity!, language as 'en' | 'ar');
              const email = row.partyType === 'person' ? row.person?.email : row.entity?.email;
              const phone = row.partyType === 'person' ? row.person?.phone : row.entity?.phone;
              const subtitle =
                row.partyType === 'entity'
                  ? row.entity?.industry || row.entity?.company_type || ''
                  : row.person?.nationality || '';
              return (
                <Link
                  key={`${row.partyType}-${row.id}`}
                  to={`/clients/${row.id}?type=${row.partyType}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <PartyChip partyType={row.partyType} displayName={name} size="md" showTypeBadge />
                    {subtitle && <p className="text-body-sm text-muted-foreground mt-1 ms-10 truncate">{subtitle}</p>}
                  </div>
                  <div className="hidden md:flex items-center gap-4 text-body-sm text-muted-foreground shrink-0">
                    {email && (
                      <span className="inline-flex items-center gap-1.5 max-w-[200px] truncate">
                        <Mail size={13} /> <span className="truncate">{email}</span>
                      </span>
                    )}
                    {phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone size={13} /> {phone}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-medium rounded-badge px-2 py-0.5 shrink-0',
                      row.status === 'active' ? 'bg-success-light text-success' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {row.status === 'active'
                      ? language === 'ar' ? 'نشط' : 'Active'
                      : language === 'ar' ? 'غير نشط' : 'Inactive'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <ClientFormSlideOver
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
