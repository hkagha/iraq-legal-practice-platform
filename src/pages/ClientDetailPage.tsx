import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
  Pencil,
  Tag,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEntity, usePerson } from '@/hooks/useParties';
import { resolveEntityName, resolvePersonName } from '@/lib/parties';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import PersonFormSlideOver from '@/components/parties/PersonFormSlideOver';
import EntityFormSlideOver from '@/components/parties/EntityFormSlideOver';
import { EntityRepresentativesEditor } from '@/components/parties/EntityRepresentativesEditor';
import SkeletonLoader from '@/components/SkeletonLoader';
import { cn } from '@/lib/utils';

type PartyType = 'person' | 'entity';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { profile } = useAuth();
  const lang = language as 'en' | 'ar';

  // Detect type from query string, fallback to 'person'
  const initialType = (params.get('type') as PartyType) || 'person';
  const [partyType, setPartyType] = useState<PartyType>(initialType);
  const [editOpen, setEditOpen] = useState(false);

  const personQuery = usePerson(partyType === 'person' ? id : undefined);
  const entityQuery = useEntity(partyType === 'entity' ? id : undefined);

  // If we tried 'person' but got nothing, fall back to entity
  useEffect(() => {
    if (partyType === 'person' && !personQuery.isLoading && personQuery.data === null) {
      setPartyType('entity');
    }
  }, [partyType, personQuery.isLoading, personQuery.data]);

  const isLoading = personQuery.isLoading || entityQuery.isLoading;
  const person = personQuery.data;
  const entity = entityQuery.data;
  const exists = (partyType === 'person' && person) || (partyType === 'entity' && entity);

  const displayName = useMemo(
    () => (partyType === 'person' ? resolvePersonName(person, lang) : resolveEntityName(entity, lang)),
    [partyType, person, entity, lang],
  );

  // Cases the party is involved in (via case_parties)
  const casesQuery = useQuery({
    queryKey: ['party-cases', partyType, id],
    enabled: !!id && !!profile?.organization_id,
    queryFn: async () => {
      const filterCol = partyType === 'person' ? 'person_id' : 'entity_id';
      const { data, error } = await supabase
        .from('case_parties')
        .select('id, role, is_primary, cases(id, case_number, title, title_ar, status, priority, case_type)')
        .eq('organization_id', profile!.organization_id!)
        .eq(filterCol, id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="rect" height="48px" />
        <SkeletonLoader variant="card" height="160px" />
        <SkeletonLoader variant="card" height="320px" />
      </div>
    );
  }

  if (!exists) {
    return (
      <div className="rounded-card border border-border bg-card">
        <EmptyState
          icon={UserIcon}
          title="Client not found"
          titleAr="لم يتم العثور على العميل"
          subtitle="It may have been deleted or you may not have access."
          subtitleAr="قد يكون قد تم حذفه أو ليس لديك صلاحية الوصول."
          actionLabel="Back to clients"
          actionLabelAr="العودة إلى العملاء"
          onAction={() => navigate('/clients')}
        />
      </div>
    );
  }

  const Icon = partyType === 'entity' ? Building2 : UserIcon;
  const status = partyType === 'person' ? person!.status : entity!.status;
  const email = partyType === 'person' ? person!.email : entity!.email;
  const phone = partyType === 'person' ? person!.phone : entity!.phone;
  const city = partyType === 'person' ? person!.city : entity!.city;
  const country = partyType === 'person' ? person!.country : entity!.country;
  const address = partyType === 'person' ? person!.address : entity!.address;
  const tags = partyType === 'person' ? person!.tags : entity!.tags;
  const notes = partyType === 'person' ? person!.notes : entity!.notes;

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
          <ArrowLeft size={14} />
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil size={14} />
          {language === 'ar' ? 'تعديل' : 'Edit'}
        </Button>
      </div>

      {/* Header card */}
      <div className="rounded-card border border-border bg-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'h-16 w-16 rounded-full flex items-center justify-center text-heading-md font-semibold shrink-0',
              partyType === 'entity' ? 'bg-info-light text-info' : 'bg-accent/15 text-accent-dark',
            )}
          >
            <Icon size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-display-sm text-foreground truncate">{displayName || '—'}</h1>
              <Badge variant="outline" className="font-normal">
                {partyType === 'entity'
                  ? language === 'ar' ? 'شركة' : 'Company'
                  : language === 'ar' ? 'فرد' : 'Individual'}
              </Badge>
              <span
                className={cn(
                  'text-[11px] font-medium rounded-badge px-2 py-0.5',
                  status === 'active' ? 'bg-success-light text-success' : 'bg-muted text-muted-foreground',
                )}
              >
                {status === 'active'
                  ? language === 'ar' ? 'نشط' : 'Active'
                  : language === 'ar' ? 'غير نشط' : 'Inactive'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm text-muted-foreground">
              {email && (
                <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Mail size={13} /> {email}
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Phone size={13} /> {phone}
                </a>
              )}
              {(city || country) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} /> {[city, country].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            {tags && tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-[11px] rounded-badge bg-muted text-muted-foreground px-2 py-0.5">
                    <Tag size={10} /> {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{language === 'ar' ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="cases">
            {language === 'ar' ? 'القضايا' : 'Cases'}
            <span className="ms-1.5 text-[10px] opacity-70">({casesQuery.data?.length ?? 0})</span>
          </TabsTrigger>
          {partyType === 'entity' && (
            <TabsTrigger value="reps">{language === 'ar' ? 'الممثلون' : 'Representatives'}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailCard title={language === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}>
              <DetailRow icon={Mail} label={language === 'ar' ? 'البريد الإلكتروني' : 'Email'} value={email} />
              <DetailRow icon={Phone} label={language === 'ar' ? 'الهاتف' : 'Phone'} value={phone} />
              <DetailRow
                icon={MapPin}
                label={language === 'ar' ? 'العنوان' : 'Address'}
                value={[address, city, country].filter(Boolean).join(', ') || null}
              />
            </DetailCard>

            {partyType === 'entity' ? (
              <DetailCard title={language === 'ar' ? 'تفاصيل الشركة' : 'Company Details'}>
                <DetailRow label={language === 'ar' ? 'نوع الشركة' : 'Type'} value={entity!.company_type} />
                <DetailRow label={language === 'ar' ? 'القطاع' : 'Industry'} value={entity!.industry} />
                <DetailRow label={language === 'ar' ? 'رقم التسجيل' : 'Registration #'} value={entity!.company_registration_number} />
                <DetailRow label={language === 'ar' ? 'الرقم الضريبي' : 'Tax ID'} value={entity!.tax_id} />
              </DetailCard>
            ) : (
              <DetailCard title={language === 'ar' ? 'بيانات شخصية' : 'Personal Details'}>
                <DetailRow label={language === 'ar' ? 'الجنسية' : 'Nationality'} value={person!.nationality} />
                <DetailRow label={language === 'ar' ? 'الرقم الوطني' : 'National ID'} value={person!.national_id_number} />
                <DetailRow label={language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'} value={person!.date_of_birth} />
              </DetailCard>
            )}

            {notes && (
              <DetailCard title={language === 'ar' ? 'ملاحظات' : 'Notes'} className="md:col-span-2">
                <p className="text-body-md text-foreground whitespace-pre-wrap">{notes}</p>
              </DetailCard>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cases" className="mt-4">
          {casesQuery.isLoading ? (
            <SkeletonLoader variant="card" height="200px" />
          ) : (casesQuery.data?.length ?? 0) === 0 ? (
            <div className="rounded-card border border-border bg-card">
              <EmptyState
                icon={Briefcase}
                title="No cases yet"
                titleAr="لا توجد قضايا"
                subtitle="This client is not linked to any cases."
                subtitleAr="هذا العميل غير مرتبط بأي قضية."
                size="sm"
              />
            </div>
          ) : (
            <div className="rounded-card border border-border bg-card divide-y divide-border">
              {casesQuery.data!.map((cp: any) => {
                const c = cp.cases;
                if (!c) return null;
                return (
                  <Link
                    key={cp.id}
                    to={`/cases/${c.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors"
                  >
                    <Briefcase size={16} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-md text-foreground truncate">
                        {language === 'ar' && c.title_ar ? c.title_ar : c.title}
                      </p>
                      <p className="text-body-sm text-muted-foreground">
                        {c.case_number}
                        {cp.role && ` • ${cp.role.replace(/_/g, ' ')}`}
                      </p>
                    </div>
                    <StatusBadge status={c.status} type="case" size="sm" />
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        {partyType === 'entity' && (
          <TabsContent value="reps" className="mt-4">
            <EntityRepresentativesEditor entityId={id} />
          </TabsContent>
        )}
      </Tabs>

      {/* Edit slide-overs */}
      {partyType === 'person' && (
        <PersonFormSlideOver
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          person={person ?? undefined}
          onSaved={() => {
            setEditOpen(false);
            personQuery.refetch();
          }}
        />
      )}
      {partyType === 'entity' && (
        <EntityFormSlideOver
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          entity={entity ?? undefined}
          onSaved={() => {
            setEditOpen(false);
            entityQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

function DetailCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card border border-border bg-card p-5', className)}>
      <h3 className="text-heading-sm text-foreground mb-3">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 text-body-sm">
      {Icon && <Icon size={14} className="text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[11px] uppercase tracking-wide">{label}</p>
        <p className="text-foreground mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}