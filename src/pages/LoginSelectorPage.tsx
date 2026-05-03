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
  Info,
  BookOpen,
} from 'lucide-react';

type TabKey =
  | 'about'
  | 'cases'
  | 'clients'
  | 'billing'
  | 'ai'
  | 'documents'
  | 'reports'
  | 'manual';

interface Section {
  heading: { en: string; ar: string };
  items: { en: string; ar: string }[];
}

interface TabContent {
  key: TabKey;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  title: { en: string; ar: string };
  lede: { en: string; ar: string };
  bullets?: { en: string; ar: string }[];
  sections?: Section[];
}

const TABS: TabContent[] = [
  {
    key: 'about',
    icon: Info,
    title: { en: 'About Qanuni', ar: 'عن قانوني' },
    lede: {
      en: 'Qanuni is a complete legal practice management platform for solo lawyers, small firms, and large law firms — designed first for the realities of legal practice in Iraq, while supporting other Arab jurisdictions through configurable settings.',
      ar: 'قانوني منصة متكاملة لإدارة الممارسة القانونية للمحامين المنفردين والمكاتب الصغيرة والكبيرة — مصممة أولاً لواقع الممارسة القانونية في العراق، مع دعم سائر الدول العربية عبر إعدادات قابلة للتخصيص.',
    },
    sections: [
      {
        heading: { en: 'What Qanuni does', ar: 'ماذا يقدم قانوني' },
        items: [
          { en: 'Case management — contentious court matters from intake through judgment, appeal, and enforcement.', ar: 'إدارة القضايا — القضايا المتنازع عليها من فتح الملف حتى الحكم والاستئناف والتنفيذ.' },
          { en: 'Errand management — non-contentious legal/administrative matters such as company registration, factory licenses, passports, and government filings.', ar: 'إدارة المعاملات — الأعمال غير المتنازع عليها كتسجيل الشركات وإجازات المصانع والجوازات والمعاملات الرسمية.' },
          { en: 'Clients & parties — persons and entities, with representatives, conflict checking, and merge of duplicates.', ar: 'العملاء والأطراف — أشخاص وجهات اعتبارية مع الممثلين، فحص تعارض المصالح، ودمج المكرر.' },
          { en: 'Documents, archive, OCR & AI indexing — versioned, searchable across Arabic and English.', ar: 'مستندات وأرشيف وOCR وفهرسة ذكية — بإصدارات وبحث متقدم بالعربية والإنجليزية.' },
          { en: 'Tasks, calendar, and time tracking linked to matters — with a persistent global timer.', ar: 'مهام وتقويم وتتبع وقت مرتبط بالقضايا — مع مؤقت عام دائم.' },
          { en: 'Billing, invoicing, and trust accounting — multi-currency with bilingual invoices.', ar: 'الفوترة والإصدار وإدارة حسابات الأمانة — بعملات متعددة وفواتير ثنائية اللغة.' },
          { en: 'Client portal — capacity-aware access for personal and corporate clients.', ar: 'بوابة العملاء — وصول يراعي صفة العميل (شخصي أو ممثلاً عن جهة).' },
          { en: 'AI legal assistant — drafting, summarising, translation, research, and risk assessment.', ar: 'مساعد قانوني ذكي — صياغة وتلخيص وترجمة وبحث وتقييم مخاطر.' },
          { en: 'Reports, dashboards, and exports — role-aware analytics for the firm and the individual.', ar: 'تقارير ولوحات تحكم وتصديرات — تحليلات تراعي الصلاحيات للمكتب والفرد.' },
        ],
      },
      {
        heading: { en: 'Who it serves', ar: 'لمن يخدم' },
        items: [
          { en: 'Staff — firm admins, lawyers, paralegals, secretaries, and accountants working inside a law firm.', ar: 'الموظفون — مدراء المكاتب والمحامون والمساعدون والسكرتارية والمحاسبون داخل المكتب.' },
          { en: 'Portal clients — natural persons accessing their own matters, or acting as representatives of one or more entities.', ar: 'عملاء البوابة — أشخاص طبيعيون يصلون إلى قضاياهم، أو يعملون ممثلين عن جهة أو أكثر.' },
          { en: '\n', ar: '\n' },
        ],
      },
      {
        heading: { en: 'Core principles', ar: 'المبادئ الأساسية' },
        items: [
          { en: 'Case-centred staff workflow with errands as full parallel matters.', ar: 'سير عمل يتمحور حول القضايا، والمعاملات كأعمال موازية كاملة.' },
          { en: 'Formal bilingual English/Arabic interface in formal Iraqi legal Arabic.', ar: 'واجهة رسمية ثنائية اللغة بعربية قانونية عراقية فصيحة.' },
          { en: 'Matter-assignment-based permissions and a complete audit trail.', ar: 'صلاحيات مبنية على إسناد القضايا وسجل تدقيق كامل.' },
          { en: 'No permanent deletion of legal documents — preserved in archive.', ar: 'لا حذف نهائي للمستندات القانونية — تُحفظ في الأرشيف.' },
          { en: 'Mobile-friendly daily workflows; PWA-installable.', ar: 'تجربة يومية ممتازة على الجوال؛ قابلة للتثبيت كتطبيق PWA.' },
          { en: 'All modules enabled by default — free in the first year.', ar: 'جميع الوحدات مُفعّلة افتراضياً — مجانية في السنة الأولى.' },
        ],
      },
    ],
  },
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
  {
    key: 'manual',
    icon: BookOpen,
    title: { en: 'User Manual', ar: 'دليل الاستخدام' },
    lede: {
      en: 'A practical, role-by-role guide to working in Qanuni — how to log in, manage matters, collaborate, bill clients, and use the AI assistant safely.',
      ar: 'دليل عملي لكل دور في قانوني — كيفية تسجيل الدخول، وإدارة القضايا والمعاملات، والتعاون، وفوترة العملاء، واستخدام المساعد الذكي بأمان.',
    },
    sections: [
      {
        heading: { en: '1. Signing in', ar: '١. تسجيل الدخول' },
        items: [
          { en: 'Staff sign in at "Law Firm Staff" using the credentials issued by your firm administrator. Forgotten passwords are reset by the firm admin or via "Forgot password".', ar: 'يدخل الموظفون من بوابة "موظفو المكتب" باستخدام بيانات الاعتماد الصادرة من مدير المكتب. تُعاد كلمة السر بطلب من المدير أو عبر "نسيت كلمة السر".' },
          { en: 'Clients sign in at "Client Portal". After login, choose your access capacity: as yourself, or as a representative of a specific company.', ar: 'يدخل العملاء من "بوابة العملاء". بعد الدخول، اختر صفة الوصول: شخصياً، أو ممثلاً عن جهة محددة.' },
          { en: 'Platform administrators sign in via the discreet link at the bottom of the page; the area is fully isolated from tenant data.', ar: 'يدخل مدراء المنصة عبر الرابط المخصص في أسفل الصفحة؛ هذه البيئة معزولة كلياً عن بيانات المكاتب.' },
        ],
      },
      {
        heading: { en: '2. Managing cases & errands', ar: '٢. إدارة القضايا والمعاملات' },
        items: [
          { en: 'Create a case from "Cases → New". Fill the bilingual title, court, parties, lead attorney, and team. The case is auto-numbered (CASE-YYYY-NNNN).', ar: 'أنشئ قضية من "القضايا ← جديدة". املأ العنوان الثنائي، المحكمة، الأطراف، المحامي المسؤول، والفريق. تُرقّم القضية تلقائياً (CASE-YYYY-NNNN).' },
          { en: 'Add hearings from the case detail page. When you complete a hearing, Qanuni prompts you for the outcome and can auto-generate the next hearing.', ar: 'أضف الجلسات من صفحة تفاصيل القضية. عند إكمال الجلسة يطلب قانوني نتيجتها ويمكنه إنشاء الجلسة التالية تلقائياً.' },
          { en: 'For non-litigation work (registrations, licences, passports), use "Errands". Pick a system template or build steps manually; mark sub-steps as completed to track bottlenecks.', ar: 'لغير المنازعات (تسجيلات، إجازات، جوازات) استخدم "المعاملات". اختر قالباً جاهزاً أو ابنِ الخطوات يدوياً، وأكمل الخطوات الفرعية لتحديد الاختناقات.' },
          { en: 'Statuses are confirmed via dialogs (Closed, Won, Lost, etc.). Closing a matter requires an outcome summary.', ar: 'تُؤكَّد الحالات عبر نوافذ تأكيد (مُغلقة، مكسوبة، مخسورة...). إغلاق الملف يتطلب ملخص نتيجة.' },
        ],
      },
      {
        heading: { en: '3. Clients, parties & conflicts', ar: '٣. العملاء والأطراف وتعارض المصالح' },
        items: [
          { en: 'Create clients as Individual or Company. Companies can have one or more contact persons / representatives.', ar: 'أنشئ العملاء كأفراد أو شركات. يمكن للشركة أن تضم شخصاً أو أكثر من جهات الاتصال أو الممثلين.' },
          { en: 'Run the Conflict Checker before opening a matter; it scans existing parties and flags potential conflicts.', ar: 'شغّل "فاحص التعارض" قبل فتح أي ملف؛ يفحص الأطراف القائمة وينبّه على التعارض المحتمل.' },
          { en: 'Phone numbers default to +964; addresses use the 18 Iraqi governorates list.', ar: 'تستخدم الأرقام مفتاح +964 افتراضياً، وتستخدم العناوين قائمة المحافظات العراقية الثماني عشرة.' },
        ],
      },
      {
        heading: { en: '4. Documents & templates', ar: '٤. المستندات والقوالب' },
        items: [
          { en: 'Upload from any matter, client, or the Documents page. Use AI auto-categorisation to suggest a category on upload.', ar: 'الرفع متاح من أي قضية أو عميل أو صفحة المستندات. استخدم التصنيف الذكي لاقتراح التصنيف عند الرفع.' },
          { en: 'New uploads with the same name create a new version automatically; only the latest is shown by default, older versions remain accessible.', ar: 'إعادة الرفع بنفس الاسم تنشئ إصداراً جديداً تلقائياً؛ يُعرض الأحدث افتراضياً وتبقى الإصدارات السابقة متاحة.' },
          { en: 'Documents are never permanently deleted — "delete" archives them. Recover archived items from "Documents → Archived".', ar: 'لا تُحذف المستندات نهائياً — يقوم الحذف بأرشفتها. يمكن استرجاعها من "المستندات ← المؤرشفة".' },
          { en: 'Use HTML templates with {{placeholders}} to generate documents in one click. Mark items as "visible to client" to publish them to the portal.', ar: 'استخدم القوالب بصيغة HTML مع متغيرات {{}} لتوليد المستندات بنقرة. علّم العنصر "مرئي للعميل" لنشره في البوابة.' },
        ],
      },
      {
        heading: { en: '5. Tasks, calendar & time tracking', ar: '٥. المهام والتقويم وتتبع الوقت' },
        items: [
          { en: 'Tasks live on a Kanban board (To Do, In Progress, In Review, Completed) and can be linked to a case, errand, or client.', ar: 'تظهر المهام على لوحة كانبان (للقيام، قيد التنفيذ، قيد المراجعة، مكتملة) ويمكن ربطها بقضية أو معاملة أو عميل.' },
          { en: 'The unified calendar aggregates hearings, errand deadlines, tasks, internal events, and invoice due dates.', ar: 'يجمع التقويم الموحد الجلسات ومواعيد المعاملات والمهام والفعاليات الداخلية ومواعيد الفواتير.' },
          { en: 'Start the global timer from any matter — it persists across pages and reloads. You can also log time on the weekly grid.', ar: 'شغّل المؤقت العام من أي ملف — يستمر عبر الصفحات وإعادة التحميل. يمكنك أيضاً تسجيل الوقت من الشبكة الأسبوعية.' },
        ],
      },
      {
        heading: { en: '6. Billing & trust accounting', ar: '٦. الفوترة وحسابات الأمانة' },
        items: [
          { en: 'Choose the engagement model on the case (hourly, fixed fee, retainer, contingency, pro bono). Rates use a hierarchy: User-on-case → Case → User → Organisation default.', ar: 'اختر نموذج الارتباط على مستوى القضية (بالساعة، رسم ثابت، أتعاب مقدمة، نسبة من النتيجة، تطوعي). تتبع الأسعار التسلسل: المستخدم على القضية ← القضية ← المستخدم ← الافتراضي للمؤسسة.' },
          { en: 'Generate invoices from un-invoiced time or expenses; previews are bilingual and show "PAID" watermark when settled.', ar: 'أصدر الفواتير من الوقت أو المصاريف غير المُفوترة؛ المعاينات ثنائية اللغة وتظهر علامة "مدفوعة" عند السداد.' },
          { en: 'Overdue invoices transition automatically; receivables aged 90+ days enter a write-off workflow.', ar: 'تتحول الفواتير المتأخرة تلقائياً؛ تدخل الذمم التي تجاوزت 90 يوماً مسار الشطب.' },
          { en: 'Trust accounting separates client funds from operating funds and tracks every movement.', ar: 'تفصل حسابات الأمانة أموال العملاء عن أموال التشغيل وتُسجَّل كل حركة فيها.' },
        ],
      },
      {
        heading: { en: '7. Client portal — what your clients see', ar: '٧. بوابة العميل — ما يراه عملاؤك' },
        items: [
          { en: 'Clients only see items explicitly marked "visible to client". Nothing else is exposed.', ar: 'لا يرى العميل سوى ما تم تحديده صراحة "مرئي للعميل". لا تُعرض أي بيانات أخرى.' },
          { en: 'Messaging is matter-scoped: each conversation is tied to a case or errand the client has access to.', ar: 'المراسلات مرتبطة بالملف: كل محادثة مرتبطة بقضية أو معاملة يصل إليها العميل.' },
          { en: 'Invoices are viewable in the portal; Qanuni records the timestamp when the client opens them.', ar: 'الفواتير متاحة للعرض في البوابة، ويسجّل قانوني وقت اطلاع العميل عليها.' },
        ],
      },
      {
        heading: { en: '8. AI assistant — safe usage', ar: '٨. المساعد الذكي — الاستخدام الآمن' },
        items: [
          { en: 'The floating chat panel is context-aware: it knows which case, client, or document you have open.', ar: 'لوحة المحادثة العائمة مدركة للسياق: تعرف القضية أو العميل أو المستند المفتوح لديك.' },
          { en: 'Use AI for drafting, summarising, translation (AR ↔ EN), risk flagging, and Iraqi-law-aware research.', ar: 'استخدم الذكاء الاصطناعي للصياغة، التلخيص، الترجمة (عربي ↔ إنجليزي)، تنبيه المخاطر، والبحث المُدرك للقانون العراقي.' },
          { en: 'AI output is a draft — review it. Final responsibility for legal advice always rests with the lawyer.', ar: 'مخرجات الذكاء الاصطناعي مسوّدة — راجعها. تبقى المسؤولية النهائية عن الرأي القانوني على عاتق المحامي.' },
        ],
      },
      {
        heading: { en: '9. Settings & administration', ar: '٩. الإعدادات والإدارة' },
        items: [
          { en: 'Firm admins manage members and roles (Admin, Lawyer, Paralegal, Secretary, Accountant) from "Settings → Team".', ar: 'يدير مدراء المكتب الأعضاء والأدوار (مدير، محامٍ، مساعد، سكرتير، محاسب) من "الإعدادات ← الفريق".' },
          { en: 'Invitations are token-based and expire after 7 days. Roles control what each user can see and do.', ar: 'الدعوات قائمة على رمز وتنتهي خلال 7 أيام. تتحكم الأدوار بما يراه كل مستخدم وما يستطيع فعله.' },
          { en: 'Configure language, branding, default currency, work week, taxes, and AI provider from Settings.', ar: 'تُضبط اللغة والهوية البصرية والعملة الافتراضية وأسبوع العمل والضرائب ومزود الذكاء الاصطناعي من الإعدادات.' },
        ],
      },
      {
        heading: { en: '10. Help & support', ar: '١٠. المساعدة والدعم' },
        items: [
          { en: 'Most pages include contextual help. Use the command palette (Ctrl/⌘+K) to jump anywhere quickly.', ar: 'تتضمن معظم الصفحات مساعدة سياقية. استخدم لوحة الأوامر (Ctrl/⌘+K) للتنقل السريع.' },
          { en: 'For account or billing questions, contact your firm administrator. For platform-wide issues, the platform administrator can be reached through the same support channel.', ar: 'للأسئلة المتعلقة بالحساب أو الفوترة، تواصل مع مدير المكتب. وللمشكلات على مستوى المنصة يتواصل مدير المنصة عبر القناة نفسها.' },
        ],
      },
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

          {/* Tab strip — About and Manual are visually separated as "Information" tabs */}
          <div className="border-b border-border overflow-x-auto">
            <div className="flex min-w-max items-stretch gap-1">
              {(() => {
                const aboutTab = TABS.find((t) => t.key === 'about')!;
                const manualTab = TABS.find((t) => t.key === 'manual')!;
                const featureTabs = TABS.filter(
                  (t) => t.key !== 'about' && t.key !== 'manual',
                );
                const renderTab = (tab: TabContent, variant: 'info' | 'feature') => {
                  const Icon = tab.icon;
                  const active = tab.key === activeTab;
                  const isInfo = variant === 'info';
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`relative flex items-center gap-2 px-4 py-3.5 text-[13px] tracking-tight transition-colors whitespace-nowrap ${
                        active
                          ? isInfo
                            ? 'text-accent-dark font-semibold'
                            : 'text-primary font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      <span
                        className={isInfo ? 'uppercase tracking-[0.18em] text-[11px]' : ''}
                      >
                        {isEN ? tab.title.en : tab.title.ar}
                      </span>
                      {active && (
                        <span
                          className={`absolute inset-x-0 -bottom-px h-[2px] ${
                            isInfo ? 'bg-accent-dark' : 'bg-accent'
                          }`}
                        />
                      )}
                    </button>
                  );
                };
                return (
                  <>
                    {renderTab(aboutTab, 'info')}
                    <span aria-hidden className="self-center mx-2 h-5 w-px bg-border" />
                    {featureTabs.map((t) => renderTab(t, 'feature'))}
                    <span aria-hidden className="self-center mx-2 h-5 w-px bg-border" />
                    {renderTab(manualTab, 'info')}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Tab body */}
          {(() => {
            const CurrentIcon = current.icon;
            const isInfoTab = current.key === 'about' || current.key === 'manual';
            return (
              <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mt-12">
                <div className="lg:col-span-5">
                  <div
                    className={`inline-flex items-center justify-center h-12 w-12 mb-6 ${
                      isInfoTab
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <CurrentIcon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  {isInfoTab && (
                    <p className="eyebrow text-[10px] tracking-[0.3em] uppercase text-accent-dark font-semibold mb-3">
                      {current.key === 'about'
                        ? isEN
                          ? 'Information'
                          : 'معلومات'
                        : isEN
                          ? 'User Manual'
                          : 'دليل الاستخدام'}
                    </p>
                  )}
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
                  {current.bullets && (
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
                  )}

                  {current.sections && (
                    <div className="space-y-10">
                      {current.sections.map((s, si) => (
                        <div key={si}>
                          <h4
                            className="text-[15px] font-semibold text-primary mb-4 pb-2 border-b border-border"
                            style={{ fontFamily: isEN ? 'var(--font-display)' : 'var(--font-display-ar)' }}
                          >
                            {isEN ? s.heading.en : s.heading.ar}
                          </h4>
                          <ul className="space-y-3">
                            {s.items.map((it, ii) => (
                              <li key={ii} className="flex gap-3">
                                <span className="flex-shrink-0 mt-1">
                                  <span className="block h-1.5 w-1.5 rounded-full bg-accent-dark" />
                                </span>
                                <p className="text-[14px] leading-relaxed text-foreground/85">
                                  {isEN ? it.en : it.ar}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
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
