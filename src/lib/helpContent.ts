// Bilingual help content registry. Add new entries by helpKey.
// Tone: concise checklist style. Keep sections short and action-oriented.

export interface Bilingual { en: string; ar: string }
export interface HelpSection { heading: Bilingual; body: Bilingual }
export interface HelpEntry {
  title: Bilingual;
  intro: Bilingual;
  sections: HelpSection[];
  tips?: Bilingual[];
}

export const helpContent: Record<string, HelpEntry> = {
  'dashboard': {
    title: { en: 'Dashboard', ar: 'لوحة التحكم' },
    intro: {
      en: 'A real-time snapshot of your firm: cases, deadlines, billing, and AI insights.',
      ar: 'لمحة فورية عن مكتبك: القضايا، المواعيد، الفواتير، وتحليلات الذكاء الاصطناعي.',
    },
    sections: [
      {
        heading: { en: 'What you see here', ar: 'ما تراه هنا' },
        body: {
          en: '• Metric cards — totals for active cases, pending invoices, hours this week.\n• Today\'s schedule — hearings and meetings due today.\n• Tasks due soon — items needing your attention.\n• AI insights — automatic alerts on overdue invoices, upcoming hearings, and anomalies.',
          ar: '• بطاقات المؤشرات — إجمالي القضايا النشطة، الفواتير المعلقة، الساعات هذا الأسبوع.\n• جدول اليوم — الجلسات والاجتماعات المقررة.\n• المهام القادمة — البنود التي تحتاج انتباهك.\n• تحليلات الذكاء الاصطناعي — تنبيهات تلقائية للفواتير المتأخرة والجلسات القادمة.',
        },
      },
      {
        heading: { en: 'Quick actions', ar: 'إجراءات سريعة' },
        body: {
          en: '• Click any metric card to drill into that list.\n• Click an event in the schedule to open the case.\n• Use the sidebar shortcuts (T = tasks, E = events) for fast access.',
          ar: '• اضغط أي بطاقة مؤشر للانتقال إلى القائمة.\n• اضغط أي حدث في الجدول لفتح القضية.\n• استخدم اختصارات الشريط الجانبي (T للمهام، E للأحداث) للوصول السريع.',
        },
      },
    ],
    tips: [{
      en: 'New here? The Getting Started widget guides you through your first 3 setup steps.',
      ar: 'جديد هنا؟ ودجة "البدء" ترشدك خلال الخطوات الثلاث الأولى للإعداد.',
    }],
  },

  'cases.list': {
    title: { en: 'Cases', ar: 'القضايا' },
    intro: {
      en: 'All matters your firm handles. Filter, search, and open any case in one click.',
      ar: 'جميع القضايا التي يديرها مكتبك. صفِّ، ابحث، وافتح أي قضية بنقرة واحدة.',
    },
    sections: [
      {
        heading: { en: 'Create a case', ar: 'إنشاء قضية' },
        body: {
          en: '1. Click "+ New Case" top-right.\n2. Fill case number, title, type, and the client (Person or Entity).\n3. Add hearings, parties, and team members on the next steps.\n4. Save.',
          ar: '١. اضغط "+ قضية جديدة" أعلى اليمين.\n٢. أدخل رقم القضية، العنوان، النوع، والعميل (شخص أو شركة).\n٣. أضف الجلسات والأطراف وأعضاء الفريق في الخطوات التالية.\n٤. احفظ.',
        },
      },
      {
        heading: { en: 'Filter & search', ar: 'التصفية والبحث' },
        body: {
          en: '• Status filter — narrow to Active, On Hold, Won, etc.\n• Priority filter — show only urgent matters.\n• Search box — finds by case number or title in either language.',
          ar: '• تصفية الحالة — اعرض فقط النشطة، قيد الانتظار، مكسوبة...\n• تصفية الأولوية — اعرض القضايا العاجلة فقط.\n• مربع البحث — يبحث برقم القضية أو العنوان بأي لغة.',
        },
      },
      {
        heading: { en: 'Bulk actions', ar: 'إجراءات جماعية' },
        body: {
          en: 'Select multiple rows using the checkboxes to export or change status in bulk.',
          ar: 'حدد عدة صفوف باستخدام مربعات الاختيار لتصدير أو تغيير الحالة دفعة واحدة.',
        },
      },
    ],
  },

  'cases.detail': {
    title: { en: 'Case detail', ar: 'تفاصيل القضية' },
    intro: {
      en: 'The full picture of one case: parties, hearings, tasks, documents, billing, and notes.',
      ar: 'الصورة الكاملة لقضية واحدة: الأطراف، الجلسات، المهام، المستندات، الفواتير، والملاحظات.',
    },
    sections: [
      {
        heading: { en: 'Tabs explained', ar: 'شرح الألسنة' },
        body: {
          en: '• Overview — summary, court info, opposing party.\n• Parties — your client(s) and other parties on the case.\n• Hearings — schedule, outcomes, adjournments.\n• Documents — case files with version control.\n• Tasks — to-dos linked to this case.\n• Time & Billing — logged hours and invoices.\n• Notes — internal collaboration with @mentions.',
          ar: '• نظرة عامة — ملخص، معلومات المحكمة، الخصم.\n• الأطراف — عملاؤك والأطراف الأخرى.\n• الجلسات — الجدول، النتائج، التأجيلات.\n• المستندات — ملفات القضية مع تحكم بالإصدار.\n• المهام — البنود المرتبطة بالقضية.\n• الوقت والفواتير — الساعات المسجلة والفواتير.\n• الملاحظات — تعاون داخلي مع @الإشارات.',
        },
      },
      {
        heading: { en: 'Client visibility', ar: 'رؤية العميل' },
        body: {
          en: 'Toggle "Visible to client" on hearings, notes, and documents to control what appears in the client portal.',
          ar: 'فعِّل "ظاهر للعميل" على الجلسات والملاحظات والمستندات للتحكم بما يظهر في بوابة العميل.',
        },
      },
    ],
    tips: [{
      en: 'Use the AI Summary button at the top to generate a brief of this case automatically.',
      ar: 'استخدم زر "ملخص ذكي" أعلى الصفحة لإنشاء موجز للقضية تلقائياً.',
    }],
  },

  'errands.list': {
    title: { en: 'Errands', ar: 'المعاملات' },
    intro: {
      en: 'Government and administrative processes — track step-by-step until completion.',
      ar: 'المعاملات الحكومية والإدارية — تتبعها خطوة بخطوة حتى الإنجاز.',
    },
    sections: [
      {
        heading: { en: 'Start an errand', ar: 'بدء معاملة' },
        body: {
          en: '1. Click "+ New Errand".\n2. Pick a template (LLC registration, trademark, etc.) or start blank.\n3. Set the client, due date, and assignee.\n4. The step tracker is created automatically from the template.',
          ar: '١. اضغط "+ معاملة جديدة".\n٢. اختر قالباً (تأسيس شركة، علامة تجارية...) أو ابدأ من الصفر.\n٣. حدد العميل، تاريخ الاستحقاق، والمكلف.\n٤. يتم إنشاء متتبع الخطوات تلقائياً من القالب.',
        },
      },
      {
        heading: { en: 'Track progress', ar: 'تتبع التقدم' },
        body: {
          en: 'Check off each step as it completes. Overdue errands appear with a red counter in the sidebar.',
          ar: 'علِّم كل خطوة عند إنجازها. المعاملات المتأخرة تظهر بعداد أحمر في الشريط الجانبي.',
        },
      },
    ],
  },

  'errands.detail': {
    title: { en: 'Errand detail', ar: 'تفاصيل المعاملة' },
    intro: {
      en: 'Step tracker, documents, notes, and notifications for one errand.',
      ar: 'متتبع الخطوات، المستندات، الملاحظات، والإشعارات لمعاملة واحدة.',
    },
    sections: [
      {
        heading: { en: 'The step tracker', ar: 'متتبع الخطوات' },
        body: {
          en: 'Each step has a status. Mark complete, add notes, or attach documents directly to a step. Steps run in order.',
          ar: 'كل خطوة لها حالة. علِّم الإنجاز، أضف ملاحظات، أو أرفق مستندات مباشرة بالخطوة. الخطوات تنفَّذ بالترتيب.',
        },
      },
    ],
  },

  'tasks': {
    title: { en: 'Tasks', ar: 'المهام' },
    intro: {
      en: 'To-do items for you and your team — link them to cases, errands, or clients.',
      ar: 'بنود المهام لك ولفريقك — اربطها بالقضايا أو المعاملات أو العملاء.',
    },
    sections: [
      {
        heading: { en: 'Create a task', ar: 'إنشاء مهمة' },
        body: {
          en: '1. Click "+ New Task" or press T anywhere.\n2. Set title, assignee, due date, and priority.\n3. Optionally link to a case or errand.\n4. Save.',
          ar: '١. اضغط "+ مهمة جديدة" أو اضغط T من أي مكان.\n٢. حدد العنوان، المكلف، تاريخ الاستحقاق، والأولوية.\n٣. اختيارياً اربطها بقضية أو معاملة.\n٤. احفظ.',
        },
      },
      {
        heading: { en: 'Views', ar: 'العروض' },
        body: {
          en: '• List — sortable table.\n• Kanban — drag tasks across To Do / In Progress / Done.',
          ar: '• قائمة — جدول قابل للفرز.\n• كانبان — اسحب المهام بين "للقيام" / "قيد التنفيذ" / "منجز".',
        },
      },
      {
        heading: { en: 'Recurring tasks', ar: 'المهام المتكررة' },
        body: {
          en: 'Set a recurrence pattern (daily, weekly, monthly). Completing a recurring task auto-creates the next one.',
          ar: 'حدد نمط التكرار (يومي، أسبوعي، شهري). إنجاز المهمة المتكررة يُنشئ التالية تلقائياً.',
        },
      },
    ],
  },

  'calendar': {
    title: { en: 'Calendar', ar: 'التقويم' },
    intro: {
      en: 'A unified view of hearings, meetings, deadlines, and personal events.',
      ar: 'عرض موحد للجلسات، الاجتماعات، المواعيد النهائية، والأحداث الشخصية.',
    },
    sections: [
      {
        heading: { en: 'Sources', ar: 'المصادر' },
        body: {
          en: 'The calendar pulls automatically from: court hearings, errand deadlines, task due dates, custom events, and recurring patterns.',
          ar: 'التقويم يجمع تلقائياً من: جلسات المحكمة، مواعيد المعاملات، تواريخ المهام، الأحداث المخصصة، والأنماط المتكررة.',
        },
      },
      {
        heading: { en: 'Add an event', ar: 'إضافة حدث' },
        body: {
          en: 'Click any day or "+ New Event" (E). Choose type, set time, link to a case if relevant, and invite participants.',
          ar: 'اضغط أي يوم أو "+ حدث جديد" (E). اختر النوع، حدد الوقت، اربط بقضية عند الحاجة، وادعُ المشاركين.',
        },
      },
    ],
    tips: [{
      en: 'Iraqi work week (Sun–Thu) is highlighted by default. Switch in Settings if needed.',
      ar: 'أسبوع العمل العراقي (الأحد–الخميس) مظلَّل افتراضياً. غيِّره من الإعدادات عند الحاجة.',
    }],
  },

  'documents': {
    title: { en: 'Documents', ar: 'المستندات' },
    intro: {
      en: 'Central document library with virtual folders, version control, and AI indexing.',
      ar: 'مكتبة مستندات مركزية مع مجلدات افتراضية، تحكم بالإصدار، وفهرسة ذكية.',
    },
    sections: [
      {
        heading: { en: 'Upload', ar: 'الرفع' },
        body: {
          en: '1. Click "Upload" or drag files anywhere on the page.\n2. The system suggests a category from the filename.\n3. Optionally link to a case, errand, or client.\n4. Toggle "Visible to client" if it should appear in the portal.',
          ar: '١. اضغط "رفع" أو اسحب الملفات في أي مكان بالصفحة.\n٢. يقترح النظام تصنيفاً من اسم الملف.\n٣. اختيارياً اربط بقضية أو معاملة أو عميل.\n٤. فعِّل "ظاهر للعميل" إن كان يجب أن يظهر في البوابة.',
        },
      },
      {
        heading: { en: 'Folders', ar: 'المجلدات' },
        body: {
          en: 'Folders are derived automatically from the linked entity (Cases / Errands / Clients). No manual organizing needed.',
          ar: 'المجلدات تُشتق تلقائياً من الكيان المرتبط (قضايا / معاملات / عملاء). لا حاجة للتنظيم اليدوي.',
        },
      },
      {
        heading: { en: 'Version control', ar: 'التحكم بالإصدار' },
        body: {
          en: 'Re-uploading a document creates a new version under the same parent. Older versions stay accessible.',
          ar: 'إعادة رفع مستند تُنشئ إصداراً جديداً تحت نفس الأصل. الإصدارات القديمة تبقى متاحة.',
        },
      },
      {
        heading: { en: 'Bulk actions', ar: 'إجراءات جماعية' },
        body: {
          en: 'Select multiple documents to download, archive, or change visibility from the top action bar.',
          ar: 'حدد عدة مستندات للتنزيل أو الأرشفة أو تغيير الرؤية من شريط الإجراءات العلوي.',
        },
      },
    ],
  },

  'time-tracking': {
    title: { en: 'Time tracking', ar: 'تتبع الوقت' },
    intro: {
      en: 'Log billable hours against cases or errands — manually or with the live timer.',
      ar: 'سجِّل الساعات القابلة للفوترة على القضايا أو المعاملات — يدوياً أو بالمؤقت المباشر.',
    },
    sections: [
      {
        heading: { en: 'Live timer', ar: 'المؤقت المباشر' },
        body: {
          en: 'Click "Start Timer", pick a case/errand and activity. The timer bar stays visible across the app. Stop to save the entry.',
          ar: 'اضغط "ابدأ المؤقت"، اختر قضية/معاملة ونشاطاً. شريط المؤقت يبقى ظاهراً في التطبيق. أوقفه لحفظ الإدخال.',
        },
      },
      {
        heading: { en: 'Log time manually', ar: 'تسجيل الوقت يدوياً' },
        body: {
          en: 'Use "Log Time" for past work. Set date, duration, billable rate, and description.',
          ar: 'استخدم "تسجيل وقت" للأعمال السابقة. حدد التاريخ والمدة والمعدل القابل للفوترة والوصف.',
        },
      },
      {
        heading: { en: 'Weekly view', ar: 'العرض الأسبوعي' },
        body: {
          en: 'Switch to the weekly grid to see all entries by entity for the week. Useful for end-of-week timesheets.',
          ar: 'انتقل إلى العرض الأسبوعي لرؤية جميع الإدخالات حسب الكيان للأسبوع. مفيد لكشوف الساعات الأسبوعية.',
        },
      },
    ],
  },

  'billing': {
    title: { en: 'Billing & invoices', ar: 'الفواتير والمحاسبة' },
    intro: {
      en: 'Generate, send, and track invoices. Payments and balances update automatically.',
      ar: 'أنشئ وأرسل وتابع الفواتير. المدفوعات والأرصدة تتحدث تلقائياً.',
    },
    sections: [
      {
        heading: { en: 'Create an invoice', ar: 'إنشاء فاتورة' },
        body: {
          en: '1. Click "+ New Invoice".\n2. Pick the client (Person or Entity) and case.\n3. Pull unbilled time entries automatically, or add custom line items.\n4. Set due date and currency (IQD / USD).\n5. Save as draft, then send when ready.',
          ar: '١. اضغط "+ فاتورة جديدة".\n٢. اختر العميل (شخص أو شركة) والقضية.\n٣. اسحب إدخالات الوقت غير المفوترة تلقائياً، أو أضف بنوداً مخصصة.\n٤. حدد تاريخ الاستحقاق والعملة (دينار/دولار).\n٥. احفظ كمسودة، ثم أرسل عند الجاهزية.',
        },
      },
      {
        heading: { en: 'Status meanings', ar: 'معاني الحالات' },
        body: {
          en: '• Draft — not yet sent.\n• Sent — delivered to client.\n• Viewed — client opened it in the portal.\n• Partially paid / Paid — payment recorded.\n• Overdue — past due date with balance.',
          ar: '• مسودة — لم تُرسل بعد.\n• مرسلة — وصلت العميل.\n• مُطَّلع عليها — العميل فتحها في البوابة.\n• مدفوعة جزئياً / مدفوعة — تم تسجيل الدفع.\n• متأخرة — مضى تاريخ الاستحقاق مع رصيد متبقٍ.',
        },
      },
      {
        heading: { en: 'Record a payment', ar: 'تسجيل دفعة' },
        body: {
          en: 'Open the invoice and click "Record Payment". The status and balance update automatically.',
          ar: 'افتح الفاتورة واضغط "تسجيل دفعة". الحالة والرصيد يتحدثان تلقائياً.',
        },
      },
    ],
    tips: [{
      en: 'Run the Aged Receivables report monthly to catch slow-paying clients early.',
      ar: 'شغِّل تقرير "الذمم المتقادمة" شهرياً لرصد العملاء بطيئي السداد مبكراً.',
    }],
  },
};

export function getHelp(key: string): HelpEntry | null {
  return helpContent[key] ?? null;
}
