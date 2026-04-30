import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Briefcase,
  Users,
  ArrowRight,
  Scale,
  FileCheck,
  Receipt,
  Sparkles,
  FolderLock,
  BarChart3,
  ShieldCheck,
  Languages,
  CheckCircle2,
} from 'lucide-react';

type TabKey =
  | 'cases'
  | 'clients'
  | 'billing'
  | 'ai'
  | 'documents'
  | 'reports';

interface TabContent {
  key: TabKey;
  icon: React.ComponentType<{ className?: string }>;
  title: { en: string; ar: string };
  lede: { en: string; ar: string };
  bullets: { en: string; ar: string }[];
}

const TABS: TabContent[] = [
  {
    key: 'cases',
    icon: Scale,
    title: { en: 'Case & Hearing Management', ar: 'إدارة القضايا والجلسات' },
    lede: {
      en: 'A complete operating system for litigation — from intake through judgment — designed for the structure of Iraqi courts.',
      ar: 'نظام تشغيل متكامل للتقاضي — من فتح الملف حتى الحكم — مصمم خصيصاً لبنية المحاكم العراقية.',
    },
    bullets: [
      { en: 'Auto-numbered cases with bilingual titles and full party registry.', ar: 'ترقيم تلقائي للقضايا بعناوين ثنائية اللغة وسجل أطراف كامل.' },
      { en: 'Hearing workflow: scheduled, completed, adjourned, cancelled — with automatic next-hearing generation.', ar: 'سير عمل الجلسات: مجدولة، منعقدة، مؤجلة، ملغاة — مع إنشاء الجلسة التالية تلقائياً.' },
      { en: 'Court-type and category taxonomy aligned to Iraqi judicial practice.', ar: 'تصنيف المحاكم والقضايا متوافق مع الممارسة القضائية العراقية.' },
      { en: 'Lifecycle progress tracking with workflow statuses and percentages.', ar: 'تتبع دورة حياة القضية بحالات سير العمل ونسب الإنجاز.' },
    ],
  },
  {
    key: 'clients',
    icon: Users,
    title: { en: 'Clients & Secure Portal', ar: 'العملاء والبوابة الآمنة' },
    lede: {
      en: 'A dedicated, organisation-isolated portal where your clients see exactly what you choose to share — nothing more.',
      ar: 'بوابة مخصصة معزولة لكل مكتب، يرى العميل فيها فقط ما تختار مشاركته — لا أكثر.',
    },
    bullets: [
      { en: 'Individual and company clients with associated representatives.', ar: 'عملاء أفراد وشركات مع ممثلين مرتبطين بكل عميل.' },
      { en: 'Capacity-aware portal: personal, or representing a specific entity.', ar: 'بوابة تراعي الصفة: شخصية، أو ممثلاً عن جهة محددة.' },
      { en: 'Matter-scoped messaging with real-time delivery and read receipts.', ar: 'مراسلات مرتبطة بكل قضية أو معاملة مع تسليم فوري وإشعارات القراءة.' },
      { en: 'Documents, invoices, and updates filtered strictly by client visibility.', ar: 'المستندات والفواتير والتحديثات تُعرض حصراً وفق صلاحيات العميل.' },
    ],
  },
  {
    key: 'billing',
    icon: Receipt,
    title: { en: 'Billing & Time Tracking', ar: 'الفوترة وتتبع الوقت' },
    lede: {
      en: 'Multiple billing models, dual-currency invoices, and a global timer that never loses a billable minute.',
      ar: 'نماذج فوترة متعددة، فواتير بعملتين، ومؤقت عام لا يضيّع أي دقيقة قابلة للفوترة.',
    },
    bullets: [
      { en: 'Hourly, fixed fee, retainer, contingency, and pro bono engagements.', ar: 'بالساعة، رسم ثابت، أتعاب مقدمة، نسبة من النتيجة، وتطوعي.' },
      { en: 'IQD-primary, USD-secondary invoicing with bilingual previews.', ar: 'فوترة بالدينار العراقي أساساً والدولار الأمريكي ثانوياً مع معاينة ثنائية اللغة.' },
      { en: 'Persistent global timer, weekly grid, and un-invoiced time import.', ar: 'مؤقت عام دائم، شبكة أسبوعية، واستيراد للوقت غير المُفوتر.' },
      { en: 'Aged receivables, automatic overdue transitions, and 90+ day workflows.', ar: 'تقادم الذمم، تحويل تلقائي للفواتير المتأخرة، وإجراءات تجاوز 90 يوماً.' },
    ],
  },
  {
    key: 'ai',
    icon: Sparkles,
    title: { en: 'AI Legal Assistant', ar: 'المساعد القانوني الذكي' },
    lede: {
      en: 'Drafting, summarising, translation, and risk assessment — context-aware and grounded in your firm’s data.',
      ar: 'صياغة، تلخيص، ترجمة، وتقييم مخاطر — مدركة للسياق ومرتكزة على بيانات مكتبك.',
    },
    bullets: [
      { en: 'Document drafting and contract review with risk flagging.', ar: 'صياغة المستندات ومراجعة العقود مع تنبيهات المخاطر.' },
      { en: 'Bidirectional Arabic ↔ English legal translation.', ar: 'ترجمة قانونية ثنائية الاتجاه بين العربية والإنجليزية.' },
      { en: 'Case summarisation and Iraqi-law-aware legal research.', ar: 'تلخيص القضايا وبحث قانوني واعٍ بالقانون العراقي.' },
      { en: 'Floating, context-aware chat panel embedded across the workspace.', ar: 'لوحة محادثة عائمة مدركة للسياق متاحة في كل أنحاء النظام.' },
    ],
  },
  {
    key: 'documents',
    icon: FolderLock,
    title: { en: 'Documents & Templates', ar: 'المستندات والقوالب' },
    lede: {
      en: 'Versioned, categorised, searchable — with templates that turn boilerplate drafting into a single click.',
      ar: 'إصدارات وتصنيفات وبحث متقدم — مع قوالب تختصر الصياغة المتكررة بنقرة واحدة.',
    },
    bullets: [
      { en: 'Parent-child version control with latest-version tracking.', ar: 'إدارة إصدارات بهيكل أصل-فرع وتتبع للإصدار الأحدث.' },
      { en: 'HTML templates with placeholder schema and instant generation.', ar: 'قوالب HTML بمتغيرات قابلة للتعبئة وتوليد فوري.' },
      { en: 'AI auto-categorisation on upload and bulk action workflows.', ar: 'تصنيف ذكي تلقائي عند الرفع وإجراءات جماعية للملفات.' },
      { en: 'Virtual folder navigation derived from case and client relations.', ar: 'تصفح افتراضي للمجلدات مشتق من علاقات القضايا والعملاء.' },
    ],
  },
  {
    key: 'reports',
    icon: BarChart3,
    title: { en: 'Reports & Analytics', ar: 'التقارير والتحليلات' },
    lede: {
      en: 'Role-aware dashboards and exports that turn day-to-day operations into board-ready intelligence.',
      ar: 'لوحات تحكم وتقارير تراعي الصلاحيات وتحوّل العمليات اليومية إلى ذكاء جاهز لمجلس الإدارة.',
    },
    bullets: [
      { en: 'Firm performance, financial summaries, and employee 360°.', ar: 'أداء المكتب، الملخصات المالية، وتقييم 360° للموظف.' },
      { en: 'Win-rate, utilisation, and 7-day urgency analytics.', ar: 'تحليل نسب النجاح، الاستفادة من الوقت، ومؤشر الاستعجال خلال 7 أيام.' },
      { en: 'Multi-sheet Excel exports and print-ready PDF reports.', ar: 'تصدير Excel بأوراق متعددة وتقارير PDF جاهزة للطباعة.' },
      { en: 'AI-analysed dashboard insights tailored to your firm.', ar: 'رؤى لوحة التحكم المُحلَّلة بالذكاء الاصطناعي ومخصصة لمكتبك.' },
    ],
  },
];

export default function LoginSelectorPage() {
  const { language, setLanguage } = useLanguage();
  const isEN = language === 'en';
  const [activeTab, setActiveTab] = useState<TabKey>('cases');
  const current = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* === TOP NAV === */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span
              className="text-[22px] font-semibold tracking-tight text-primary"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Qanuni
            </span>
            <span className="hidden sm:inline text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {isEN ? 'Legal Practice, Refined.' : 'الممارسة القانونية بأرقى صورها'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setLanguage('en')}
              className={`h-8 px-2 text-[12px] tracking-wider transition-colors ${
                language === 'en'
                  ? 'text-accent-dark font-semibold border-b border-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
            <span className="text-muted-foreground/40 text-xs">/</span>
            <button
              onClick={() => setLanguage('ar')}
              className={`h-8 px-2 text-[12px] tracking-wider transition-colors ${
                language === 'ar'
                  ? 'text-accent-dark font-semibold border-b border-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              AR
            </button>
          </div>
        </div>
      </header>

      {/* === HERO: SPLIT === */}
      <section className="relative overflow-hidden">
        {/* Decorative gold geometric hairline pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* LEFT — Editorial copy */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-10 bg-accent" />
                <span className="eyebrow text-[10px] tracking-[0.3em] uppercase text-accent-dark font-semibold">
                  {isEN ? 'For Iraqi Law Firms' : 'لمكاتب المحاماة العراقية'}
                </span>
              </div>

              <h1
                className="text-[44px] lg:text-[64px] leading-[1.05] tracking-tight text-primary font-semibold"
                style={{
                  fontFamily: isEN ? 'var(--font-display)' : 'var(--font-display-ar)',
                }}
              >
                {isEN ? (
                  <>
                    The practice management
                    <br />
                    platform built for the
                    <br />
                    <span className="italic text-accent-dark">Iraqi bar</span>.
                  </>
                ) : (
                  <>
                    منصة إدارة الممارسة القانونية
                    <br />
                    المصممة <span className="italic text-accent-dark">للمحامي العراقي</span>.
                  </>
                )}
              </h1>

              <p className="mt-8 max-w-[58ch] text-[16px] lg:text-[17px] leading-relaxed text-muted-foreground">
                {isEN
                  ? 'Cases, hearings, clients, billing, documents, and AI-assisted drafting — unified in a single, secure workspace. Bilingual by design. Tailored to Iraqi courts, currencies, and the Sunday–Thursday work week.'
                  : 'القضايا، الجلسات، العملاء، الفوترة، المستندات، والصياغة بمساعدة الذكاء الاصطناعي — مجتمعة في مساحة عمل واحدة آمنة. ثنائية اللغة بتصميمها. مفصّلة على المحاكم العراقية والعملات وأسبوع العمل من الأحد إلى الخميس.'}
              </p>

              {/* Trust strip */}
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4">
                {[
                  { icon: ShieldCheck, en: 'Multi-tenant security', ar: 'أمان متعدد المستأجرين' },
                  { icon: Languages, en: 'Arabic & English', ar: 'العربية والإنجليزية' },
                  { icon: Scale, en: 'Iraqi court taxonomy', ar: 'تصنيف المحاكم العراقية' },
                  { icon: Sparkles, en: 'AI legal assistant', ar: 'مساعد قانوني ذكي' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <item.icon className="h-4 w-4 text-accent-dark mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                    <span className="text-[12px] leading-snug text-foreground/80">
                      {isEN ? item.en : item.ar}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Login cards */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <div className="bg-card border border-border shadow-[0_1px_0_0_hsl(var(--border)),0_24px_48px_-24px_hsl(var(--primary)/0.18)]">
                <div className="px-7 pt-7 pb-4 border-b border-border">
                  <p className="eyebrow text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-semibold">
                    {isEN ? 'Sign in' : 'تسجيل الدخول'}
                  </p>
                  <h2
                    className="mt-2 text-[22px] font-semibold text-primary"
                    style={{ fontFamily: isEN ? 'var(--font-display)' : 'var(--font-display-ar)' }}
                  >
                    {isEN ? 'Choose your access' : 'اختر طريقة الدخول'}
                  </h2>
                </div>

                <div className="p-3">
                  <Link
                    to="/login/staff"
                    className="group flex items-center gap-4 px-4 py-4 hover:bg-secondary/60 transition-colors border-b border-border"
                  >
                    <div className="h-11 w-11 bg-primary/5 border border-primary/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground">
                        {isEN ? 'Law Firm Staff' : 'موظفو المكتب'}
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                        {isEN
                          ? 'Lawyers, paralegals, secretaries, accountants, admins.'
                          : 'محامون، مساعدون، سكرتارية، محاسبون، إداريون.'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent-dark group-hover:translate-x-0.5 transition-all rtl:rotate-180 rtl:group-hover:-translate-x-0.5 flex-shrink-0" />
                  </Link>

                  <Link
                    to="/portal/login"
                    className="group flex items-center gap-4 px-4 py-4 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="h-11 w-11 bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-accent-dark" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground">
                        {isEN ? 'Client Portal' : 'بوابة العملاء'}
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                        {isEN
                          ? 'Access your cases, documents, and invoices.'
                          : 'الوصول إلى قضاياك، مستنداتك، وفواتيرك.'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent-dark group-hover:translate-x-0.5 transition-all rtl:rotate-180 rtl:group-hover:-translate-x-0.5 flex-shrink-0" />
                  </Link>
                </div>

                <div className="px-7 py-4 border-t border-border bg-secondary/40">
                  <Link
                    to="/admin/login"
                    className="text-[11px] tracking-wider text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isEN ? 'Platform administrator → ' : 'مدير المنصة ← '}
                    <span className="underline underline-offset-4">
                      {isEN ? 'sign in here' : 'سجّل الدخول'}
                    </span>
                  </Link>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed text-center">
                {isEN
                  ? 'Protected by organisation-level isolation, role-based access, and full audit trails.'
                  : 'محمي بعزل على مستوى المؤسسة، صلاحيات حسب الدور، وسجلات تدقيق كاملة.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === FEATURE TABS === */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-24">
          <div className="max-w-[720px] mb-12">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-10 bg-accent" />
              <span className="eyebrow text-[10px] tracking-[0.3em] uppercase text-accent-dark font-semibold">
                {isEN ? 'The Platform' : 'المنصة'}
              </span>
            </div>
            <h2
              className="text-[32px] lg:text-[40px] leading-tight tracking-tight text-primary font-semibold"
              style={{ fontFamily: isEN ? 'var(--font-display)' : 'var(--font-display-ar)' }}
            >
              {isEN
                ? 'Every discipline of legal practice — under one roof.'
                : 'كل تخصصات الممارسة القانونية — تحت سقف واحد.'}
            </h2>
          </div>

          {/* Tab strip */}
          <div className="border-b border-border overflow-x-auto">
            <div className="flex min-w-max gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center gap-2 px-4 py-3.5 text-[13px] tracking-tight transition-colors whitespace-nowrap ${
                      active
                        ? 'text-primary font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                    <span>{isEN ? tab.title.en : tab.title.ar}</span>
                    {active && (
                      <span className="absolute inset-x-0 -bottom-px h-[2px] bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab body */}
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mt-12">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center justify-center h-12 w-12 bg-primary text-primary-foreground mb-6">
                <current.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3
                className="text-[26px] lg:text-[30px] leading-tight tracking-tight text-primary font-semibold"
                style={{ fontFamily: isEN ? 'var(--font-display)' : 'var(--font-display-ar)' }}
              >
                {isEN ? current.title.en : current.title.ar}
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                {isEN ? current.lede.en : current.lede.ar}
              </p>
            </div>

            <div className="lg:col-span-7">
              <ul className="space-y-5">
                {current.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex gap-4 pb-5 border-b border-border last:border-b-0 last:pb-0"
                  >
                    <span className="flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-accent-dark" strokeWidth={1.75} />
                    </span>
                    <p className="text-[14px] leading-relaxed text-foreground/85">
                      {isEN ? b.en : b.ar}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* === PRINCIPLES STRIP === */}
      <section className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-24">
          <div className="max-w-[720px] mb-14">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-10 bg-accent" />
              <span className="eyebrow text-[10px] tracking-[0.3em] uppercase text-accent-dark font-semibold">
                {isEN ? 'Principles' : 'مبادئنا'}
              </span>
            </div>
            <h2
              className="text-[28px] lg:text-[36px] leading-tight tracking-tight text-primary font-semibold"
              style={{ fontFamily: isEN ? 'var(--font-display)' : 'var(--font-display-ar)' }}
            >
              {isEN
                ? 'Built with the rigour of the profession it serves.'
                : 'مبنية بصرامة المهنة التي تخدمها.'}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border">
            {[
              {
                n: '01',
                en: { t: 'Bilingual, RTL-First', d: 'Arabic and English are equal citizens — every field, every report, every notification.' },
                ar: { t: 'ثنائية اللغة، تبدأ من اليمين', d: 'العربية والإنجليزية متساويتان — في كل حقل وتقرير وإشعار.' },
              },
              {
                n: '02',
                en: { t: 'Iraq-Native', d: '+964 numbering, IQD primary currency, DD/MM/YYYY dates, Sunday–Thursday work week.' },
                ar: { t: 'مفصّلة للعراق', d: 'مفتاح +964، الدينار العراقي عملة أساسية، تواريخ يوم/شهر/سنة، أسبوع عمل الأحد–الخميس.' },
              },
              {
                n: '03',
                en: { t: 'Confidential by Design', d: 'Per-organisation data isolation, role-based access, and full audit trails on every action.' },
                ar: { t: 'سرية بالتصميم', d: 'عزل بيانات لكل مؤسسة، صلاحيات حسب الدور، وسجلات تدقيق كاملة لكل إجراء.' },
              },
            ].map((p) => (
              <div key={p.n} className="bg-background p-8 lg:p-10">
                <p
                  className="text-[40px] leading-none text-accent-dark/70 font-light"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {p.n}
                </p>
                <h3 className="mt-6 text-[16px] font-semibold text-primary">
                  {isEN ? p.en.t : p.ar.t}
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                  {isEN ? p.en.d : p.ar.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA BAND === */}
      <section className="bg-primary text-primary-foreground relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-24">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8">
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px w-10 bg-accent" />
                <span className="eyebrow text-[10px] tracking-[0.3em] uppercase text-accent font-semibold">
                  {isEN ? 'Begin' : 'ابدأ'}
                </span>
              </div>
              <h2
                className="text-[32px] lg:text-[44px] leading-tight tracking-tight font-semibold"
                style={{ fontFamily: isEN ? 'var(--font-display)' : 'var(--font-display-ar)' }}
              >
                {isEN
                  ? 'Sign in to your firm — or open the client portal.'
                  : 'سجّل الدخول إلى مكتبك — أو افتح بوابة العميل.'}
              </h2>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3">
              <Link
                to="/login/staff"
                className="group inline-flex items-center justify-between gap-3 bg-accent text-accent-foreground px-6 py-4 hover:bg-accent-light transition-colors"
              >
                <span className="text-[14px] font-semibold tracking-wide">
                  {isEN ? 'Staff Sign In' : 'دخول الموظفين'}
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </Link>
              <Link
                to="/portal/login"
                className="group inline-flex items-center justify-between gap-3 border border-primary-foreground/30 text-primary-foreground px-6 py-4 hover:bg-primary-foreground/5 transition-colors"
              >
                <span className="text-[14px] font-semibold tracking-wide">
                  {isEN ? 'Client Portal' : 'بوابة العملاء'}
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span
              className="text-[18px] font-semibold tracking-tight text-primary"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Qanuni
            </span>
            <span className="text-[11px] tracking-wider uppercase text-muted-foreground">
              {isEN ? '© ' : '© '}
              {new Date().getFullYear()}
              {isEN ? ' · Legal Practice Platform' : ' · منصة الممارسة القانونية'}
            </span>
          </div>
          <Link
            to="/admin/login"
            className="text-[11px] tracking-wider text-muted-foreground/70 hover:text-foreground underline-offset-4 hover:underline transition-colors"
          >
            {isEN ? 'Platform administrator' : 'مدير المنصة'}
          </Link>
        </div>
      </footer>
    </div>
  );
}
