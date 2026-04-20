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

  'settings': {
    title: { en: 'Settings', ar: 'الإعدادات' },
    intro: {
      en: 'Configure your organization, team, personal profile, and platform preferences.',
      ar: 'اضبط مؤسستك، فريقك، ملفك الشخصي، وتفضيلات المنصة.',
    },
    sections: [
      {
        heading: { en: 'Organization', ar: 'المؤسسة' },
        body: {
          en: '• General — firm name, contact, address.\n• Branding — logo, colors used in invoices and the client portal.\n• Billing config — default currency, hourly rate, tax, bank details.\n• Numbering — prefix and counters for cases, errands, invoices.',
          ar: '• عام — اسم المكتب، الاتصال، العنوان.\n• الهوية البصرية — الشعار والألوان المستخدمة في الفواتير وبوابة العميل.\n• إعدادات الفواتير — العملة الافتراضية، الأجر بالساعة، الضريبة، تفاصيل البنك.\n• الترقيم — البادئات والعدادات للقضايا والمعاملات والفواتير.',
        },
      },
      {
        heading: { en: 'Team', ar: 'الفريق' },
        body: {
          en: '• Team members — view all users, change roles, deactivate.\n• Roles & permissions — what each role can see and do.\n• Invitations — send invites to new lawyers and staff.',
          ar: '• أعضاء الفريق — اعرض جميع المستخدمين، غيِّر الأدوار، عطِّل الحسابات.\n• الأدوار والصلاحيات — ما يستطيع كل دور رؤيته والقيام به.\n• الدعوات — أرسل دعوات للمحامين والموظفين الجدد.',
        },
      },
      {
        heading: { en: 'Personal', ar: 'الشخصي' },
        body: {
          en: '• My profile — name, photo, contact info.\n• Security — password, 2FA, active sessions.\n• Notifications — choose what alerts you receive and how.\n• Language & appearance — EN/AR, theme.',
          ar: '• ملفي — الاسم، الصورة، معلومات الاتصال.\n• الأمان — كلمة المرور، التحقق بخطوتين، الجلسات النشطة.\n• الإشعارات — اختر ما يصلك من تنبيهات وكيفية وصولها.\n• اللغة والمظهر — إنجليزي/عربي، السمة.',
        },
      },
      {
        heading: { en: 'System (admins only)', ar: 'النظام (للمسؤولين فقط)' },
        body: {
          en: '• Subscription — plan and usage.\n• AI config — provider keys, models, usage cap.\n• Data export — download all firm data.\n• Danger zone — irreversible actions (delete org, etc.).',
          ar: '• الاشتراك — الخطة والاستخدام.\n• إعدادات الذكاء الاصطناعي — مفاتيح المزود، النماذج، حد الاستخدام.\n• تصدير البيانات — نزِّل كافة بيانات المكتب.\n• المنطقة الحرجة — إجراءات لا رجعة فيها (حذف المؤسسة...).',
        },
      },
    ],
  },

  'admin.dashboard': {
    title: { en: 'Platform overview', ar: 'نظرة عامة على المنصة' },
    intro: {
      en: 'Super-admin command center: tenants, users, revenue, and system health at a glance.',
      ar: 'مركز قيادة المسؤول الأعلى: المؤسسات والمستخدمون والإيرادات وصحة النظام بنظرة واحدة.',
    },
    sections: [
      {
        heading: { en: 'Key widgets', ar: 'الودجات الرئيسية' },
        body: {
          en: '• Total organizations / users — platform growth.\n• Recent signups — new firms in the last 30 days.\n• Revenue — MRR and trend.\n• System health — DB, storage, edge functions.',
          ar: '• إجمالي المؤسسات / المستخدمين — نمو المنصة.\n• التسجيلات الأخيرة — مكاتب جديدة آخر ٣٠ يوم.\n• الإيرادات — MRR والاتجاه.\n• صحة النظام — قاعدة البيانات، التخزين، الدوال.',
        },
      },
    ],
  },

  'admin.organizations': {
    title: { en: 'Organizations', ar: 'المؤسسات' },
    intro: {
      en: 'Every law firm tenant on the platform. Create, edit, suspend, or impersonate.',
      ar: 'كل مكتب محاماة على المنصة. أنشئ، عدِّل، علِّق، أو ادخل بالنيابة.',
    },
    sections: [
      {
        heading: { en: 'Common tasks', ar: 'مهام شائعة' },
        body: {
          en: '• Click a row to open the org detail.\n• Use "Impersonate" to view the platform exactly as that org\'s admin sees it. A gold banner stays visible until you exit.\n• Suspend an org to block all logins without deleting data.',
          ar: '• اضغط أي صف لفتح تفاصيل المؤسسة.\n• استخدم "دخول بالنيابة" لرؤية المنصة بعين مسؤول المؤسسة. يظهر شريط ذهبي حتى الخروج.\n• علِّق المؤسسة لمنع تسجيل الدخول دون حذف البيانات.',
        },
      },
    ],
    tips: [{
      en: 'All admin actions (impersonate, edit, delete) are recorded in the Audit Log.',
      ar: 'كل إجراءات المسؤول (دخول بالنيابة، تعديل، حذف) تُسجَّل في سجل التدقيق.',
    }],
  },

  'admin.users': {
    title: { en: 'All users', ar: 'جميع المستخدمين' },
    intro: {
      en: 'Cross-tenant view of every user on the platform.',
      ar: 'عرض شامل لكل مستخدم على المنصة عبر المؤسسات.',
    },
    sections: [
      {
        heading: { en: 'Actions', ar: 'الإجراءات' },
        body: {
          en: '• Create user — provision an account directly.\n• Reset password — generate a temporary password the user must change on first login.\n• Change role — promote/demote within an org.\n• Deactivate — block login while keeping history.',
          ar: '• إنشاء مستخدم — أنشئ حساباً مباشرة.\n• إعادة تعيين كلمة المرور — أنشئ كلمة مرور مؤقتة يجب تغييرها عند أول دخول.\n• تغيير الدور — رفع/خفض الدور داخل المؤسسة.\n• تعطيل — منع الدخول مع الإبقاء على السجل.',
        },
      },
    ],
  },

  'admin.analytics': {
    title: { en: 'Platform analytics', ar: 'تحليلات المنصة' },
    intro: {
      en: 'Aggregate usage metrics across all tenants.',
      ar: 'مقاييس الاستخدام المجمَّعة عبر كل المؤسسات.',
    },
    sections: [{
      heading: { en: 'What\'s tracked', ar: 'ما يتم تتبعه' },
      body: {
        en: 'Active users, cases created, AI calls, storage consumed, and feature adoption per tenant.',
        ar: 'المستخدمون النشطون، القضايا المُنشأة، استدعاءات الذكاء الاصطناعي، التخزين المستهلك، وتبني الميزات لكل مؤسسة.',
      },
    }],
  },

  'admin.revenue': {
    title: { en: 'Revenue', ar: 'الإيرادات' },
    intro: {
      en: 'Subscription revenue, MRR, churn, and per-plan breakdowns.',
      ar: 'إيرادات الاشتراك، MRR، معدل الإلغاء، والتفاصيل لكل خطة.',
    },
    sections: [{
      heading: { en: 'Reading the chart', ar: 'قراءة الرسم البياني' },
      body: {
        en: 'The line shows MRR over time. Hover any point for the exact figure and growth vs. previous month.',
        ar: 'الخط يُظهر MRR عبر الوقت. مرِّر فوق أي نقطة لرؤية الرقم الدقيق والنمو مقارنة بالشهر السابق.',
      },
    }],
  },

  'admin.audit': {
    title: { en: 'Audit log', ar: 'سجل التدقيق' },
    intro: {
      en: 'Every administrative action recorded with timestamp, actor, target, and details.',
      ar: 'كل إجراء إداري مسجَّل مع الوقت والمنفِّذ والهدف والتفاصيل.',
    },
    sections: [{
      heading: { en: 'Filtering', ar: 'التصفية' },
      body: {
        en: 'Filter by admin, action type (impersonate, create, delete...), or date range. Export to CSV for compliance reviews.',
        ar: 'صفِّ حسب المسؤول، نوع الإجراء (دخول بالنيابة، إنشاء، حذف...)، أو نطاق التاريخ. صدِّر إلى CSV لمراجعات الامتثال.',
      },
    }],
  },

  'admin.backups': {
    title: { en: 'Backups', ar: 'النسخ الاحتياطية' },
    intro: {
      en: 'Schedule and manage automated backups for the whole platform or specific tenants.',
      ar: 'جدوِل وأدر النسخ الاحتياطية التلقائية للمنصة بأكملها أو لمؤسسات محددة.',
    },
    sections: [
      {
        heading: { en: 'Create a schedule', ar: 'إنشاء جدول' },
        body: {
          en: '1. Click "Schedule Backup".\n2. Choose scope (full platform / one org), frequency (daily/weekly/monthly), and retention.\n3. Set preferred time and timezone.\n4. Save — runs happen automatically.',
          ar: '١. اضغط "جدولة نسخة".\n٢. اختر النطاق (كامل المنصة / مؤسسة واحدة)، التكرار (يومي/أسبوعي/شهري)، والاحتفاظ.\n٣. حدد الوقت المفضل والمنطقة الزمنية.\n٤. احفظ — التشغيل يحدث تلقائياً.',
        },
      },
    ],
  },

  'admin.announcements': {
    title: { en: 'System announcements', ar: 'إعلانات النظام' },
    intro: {
      en: 'Broadcast messages to all users or specific organizations.',
      ar: 'بثّ رسائل لكل المستخدمين أو لمؤسسات محددة.',
    },
    sections: [{
      heading: { en: 'Send an announcement', ar: 'إرسال إعلان' },
      body: {
        en: '1. Click "+ New Announcement".\n2. Write title and body in EN + AR.\n3. Pick audience (all / specific orgs).\n4. Set severity (info/warning/critical) and expiry.\n5. Publish — appears in users\' notification bell instantly.',
        ar: '١. اضغط "+ إعلان جديد".\n٢. اكتب العنوان والمحتوى بالإنجليزية والعربية.\n٣. اختر الجمهور (الكل / مؤسسات محددة).\n٤. حدد الأهمية (معلومة/تحذير/حرج) وتاريخ الانتهاء.\n٥. انشر — يظهر فوراً في جرس الإشعارات.',
      },
    }],
  },

  'admin.system-health': {
    title: { en: 'System health', ar: 'صحة النظام' },
    intro: {
      en: 'Real-time status of database, storage, edge functions, and key tables.',
      ar: 'الحالة الفورية لقاعدة البيانات والتخزين والدوال والجداول الأساسية.',
    },
    sections: [{
      heading: { en: 'Status indicators', ar: 'مؤشرات الحالة' },
      body: {
        en: '• Green — operational.\n• Amber — degraded performance.\n• Red — outage. Click any indicator for diagnostics.',
        ar: '• أخضر — يعمل بشكل طبيعي.\n• كهرماني — أداء متدهور.\n• أحمر — انقطاع. اضغط أي مؤشر للتشخيص.',
      },
    }],
  },

  'admin.settings': {
    title: { en: 'Platform settings', ar: 'إعدادات المنصة' },
    intro: {
      en: 'Global defaults applied to every tenant: signup policy, email config, AI keys, limits.',
      ar: 'القيم الافتراضية المطبَّقة على كل المؤسسات: سياسة التسجيل، إعدادات البريد، مفاتيح الذكاء الاصطناعي، الحدود.',
    },
    sections: [{
      heading: { en: 'Use with care', ar: 'استخدم بحذر' },
      body: {
        en: 'Changes here affect every tenant immediately. Review the audit log after any change.',
        ar: 'التغييرات هنا تؤثر على كل المؤسسات فوراً. راجع سجل التدقيق بعد أي تغيير.',
      },
    }],
  },

  'portal.dashboard': {
    title: { en: 'Your client portal', ar: 'بوابتك كعميل' },
    intro: {
      en: 'A secure window into the work your law firm is doing for you.',
      ar: 'نافذة آمنة على العمل الذي يقوم به مكتب المحاماة لصالحك.',
    },
    sections: [
      {
        heading: { en: 'What you can see', ar: 'ما يمكنك رؤيته' },
        body: {
          en: '• Active cases and their status.\n• Upcoming hearings and deadlines.\n• New documents shared with you.\n• Outstanding invoices.\n• Messages from your legal team.',
          ar: '• القضايا النشطة وحالتها.\n• الجلسات والمواعيد القادمة.\n• المستندات الجديدة المشاركة معك.\n• الفواتير المستحقة.\n• الرسائل من فريقك القانوني.',
        },
      },
      {
        heading: { en: 'Privacy', ar: 'الخصوصية' },
        body: {
          en: 'You only see items your firm has explicitly marked visible to you. Internal notes stay internal.',
          ar: 'ترى فقط البنود التي وسمها المكتب صراحة كظاهرة لك. الملاحظات الداخلية تبقى داخلية.',
        },
      },
    ],
  },

  'portal.cases': {
    title: { en: 'Your cases', ar: 'قضاياك' },
    intro: {
      en: 'All matters your firm is handling on your behalf.',
      ar: 'كل القضايا التي يديرها مكتبك بالنيابة عنك.',
    },
    sections: [{
      heading: { en: 'Open a case', ar: 'فتح قضية' },
      body: {
        en: 'Click any case to see status, upcoming hearings, shared documents, and a brief outcome summary if closed.',
        ar: 'اضغط أي قضية لرؤية الحالة، الجلسات القادمة، المستندات المشاركة، وملخصاً للنتيجة إن كانت مغلقة.',
      },
    }],
  },

  'portal.errands': {
    title: { en: 'Your errands', ar: 'معاملاتك' },
    intro: {
      en: 'Government and administrative processes your firm is handling for you.',
      ar: 'المعاملات الحكومية والإدارية التي يتولاها مكتبك لصالحك.',
    },
    sections: [{
      heading: { en: 'Track progress', ar: 'تتبع التقدم' },
      body: {
        en: 'Each errand shows a step-by-step tracker. Completed steps are checked; the current step is highlighted.',
        ar: 'كل معاملة تعرض متتبعاً للخطوات. الخطوات المكتملة معلَّمة؛ الخطوة الحالية مظلَّلة.',
      },
    }],
  },

  'portal.documents': {
    title: { en: 'Shared documents', ar: 'المستندات المشاركة' },
    intro: {
      en: 'Files your law firm has shared with you. Download anytime.',
      ar: 'الملفات التي شاركها مكتب المحاماة معك. حمِّلها في أي وقت.',
    },
    sections: [
      {
        heading: { en: 'Download a document', ar: 'تحميل مستند' },
        body: {
          en: 'Click any row to preview. Use the download icon to save a copy locally.',
          ar: 'اضغط أي صف للمعاينة. استخدم أيقونة التحميل لحفظ نسخة محلية.',
        },
      },
      {
        heading: { en: 'Privacy', ar: 'الخصوصية' },
        body: {
          en: 'You only see documents the firm has explicitly marked visible to you.',
          ar: 'ترى فقط المستندات التي وسمها المكتب صراحة كظاهرة لك.',
        },
      },
    ],
  },

  'portal.invoices': {
    title: { en: 'Your invoices', ar: 'فواتيرك' },
    intro: {
      en: 'View, download, and pay invoices from your law firm.',
      ar: 'اعرض وحمِّل وادفع فواتير مكتب المحاماة.',
    },
    sections: [
      {
        heading: { en: 'Status meanings', ar: 'معاني الحالات' },
        body: {
          en: '• Sent — awaiting payment.\n• Partially paid — some payment received.\n• Paid — fully settled (PAID watermark appears).\n• Overdue — past due date with balance.',
          ar: '• مرسلة — بانتظار الدفع.\n• مدفوعة جزئياً — تم استلام جزء من المبلغ.\n• مدفوعة — مسددة بالكامل (تظهر علامة "مدفوعة").\n• متأخرة — مضى تاريخ الاستحقاق مع رصيد.',
        },
      },
      {
        heading: { en: 'Pay an invoice', ar: 'دفع فاتورة' },
        body: {
          en: 'Open the invoice to see the firm\'s bank transfer details. Send the firm a message after payment so they can confirm receipt.',
          ar: 'افتح الفاتورة لرؤية تفاصيل التحويل المصرفي للمكتب. أرسل رسالة بعد الدفع ليتمكنوا من تأكيد الاستلام.',
        },
      },
    ],
  },

  'portal.messages': {
    title: { en: 'Messages', ar: 'الرسائل' },
    intro: {
      en: 'Direct chat with your legal team — case-by-case, in real time.',
      ar: 'محادثة مباشرة مع فريقك القانوني — قضية بقضية، في الوقت الفعلي.',
    },
    sections: [
      {
        heading: { en: 'Start a conversation', ar: 'بدء محادثة' },
        body: {
          en: '1. Pick a case from the left.\n2. Type your message and press Enter.\n3. Attach files with the paperclip icon.\n4. Replies appear instantly.',
          ar: '١. اختر قضية من اليسار.\n٢. اكتب رسالتك واضغط Enter.\n٣. أرفق ملفات بأيقونة المشبك.\n٤. الردود تظهر فوراً.',
        },
      },
    ],
  },

  'portal.profile': {
    title: { en: 'Your profile', ar: 'ملفك الشخصي' },
    intro: {
      en: 'Update your contact details, password, and notification preferences.',
      ar: 'حدِّث بيانات الاتصال وكلمة المرور وتفضيلات الإشعارات.',
    },
    sections: [{
      heading: { en: 'Keep info current', ar: 'حافظ على التحديث' },
      body: {
        en: 'Your firm uses your phone and email for important case alerts. Keep them up to date.',
        ar: 'يستخدم مكتبك هاتفك وبريدك للتنبيهات المهمة. حافظ على تحديثها.',
      },
    }],
  },

  'reports.hub': {
    title: { en: 'Reports', ar: 'التقارير' },
    intro: {
      en: 'Centralized analytics for your firm — financial, operational, and people-focused.',
      ar: 'تحليلات مركزية لمكتبك — مالية وتشغيلية ومتعلقة بالأفراد.',
    },
    sections: [
      {
        heading: { en: 'Categories', ar: 'الفئات' },
        body: {
          en: '• Financial — revenue, aged receivables, summary.\n• Operations — case analytics, errand analytics, firm performance.\n• People — Employee 360, time utilization.\n• Clients — client analytics.',
          ar: '• مالية — الإيرادات، الذمم المتقادمة، الملخص.\n• العمليات — تحليلات القضايا والمعاملات، أداء المكتب.\n• الأفراد — موظف ٣٦٠، استغلال الوقت.\n• العملاء — تحليلات العملاء.',
        },
      },
      {
        heading: { en: 'Common controls', ar: 'أدوات مشتركة' },
        body: {
          en: 'Each report supports a date-range filter, CSV/Excel export, and print-friendly view.',
          ar: 'كل تقرير يدعم تصفية نطاق التاريخ، تصدير CSV/Excel، وعرضاً قابلاً للطباعة.',
        },
      },
    ],
  },

  'reports.financial-summary': {
    title: { en: 'Financial summary', ar: 'الملخص المالي' },
    intro: { en: 'Top-line view of revenue, payments, and outstanding balances.', ar: 'عرض شامل للإيرادات والمدفوعات والأرصدة المستحقة.' },
    sections: [{ heading: { en: 'Tip', ar: 'نصيحة' }, body: { en: 'Compare quarter-over-quarter using the date selector. Export to Excel for board reports.', ar: 'قارن من ربع لربع باستخدام محدد التاريخ. صدِّر إلى Excel لتقارير المجلس.' } }],
  },

  'reports.billing-aging': {
    title: { en: 'Billing aging', ar: 'تقادم الفواتير' },
    intro: { en: 'Outstanding invoices grouped by how overdue they are: 0–30, 31–60, 61–90, 90+ days.', ar: 'الفواتير المستحقة مصنفة حسب مدى التأخر: ٠–٣٠، ٣١–٦٠، ٦١–٩٠، ٩٠+ يوماً.' },
    sections: [{ heading: { en: 'How to use', ar: 'كيفية الاستخدام' }, body: { en: 'Focus on the 60+ day buckets first — they\'re the highest collection risk. Use Write Off for invoices unlikely to be paid.', ar: 'ركِّز على فئات ٦٠+ يوماً أولاً — هي الأعلى خطراً. استخدم "شطب" للفواتير غير المرجح تحصيلها.' } }],
  },

  'reports.case-analytics': {
    title: { en: 'Case analytics', ar: 'تحليلات القضايا' },
    intro: { en: 'Win rate, average duration, case mix by type, and outcomes by lawyer.', ar: 'معدل النجاح، متوسط المدة، توزيع القضايا حسب النوع، والنتائج حسب المحامي.' },
    sections: [{ heading: { en: 'Win rate', ar: 'معدل النجاح' }, body: { en: 'Calculated as won cases ÷ (won + lost). Settled cases are excluded from the denominator.', ar: 'يُحسب كقضايا مكسوبة ÷ (مكسوبة + خاسرة). القضايا المسوَّاة مُستثناة من المقام.' } }],
  },

  'reports.client-analytics': {
    title: { en: 'Client analytics', ar: 'تحليلات العملاء' },
    intro: { en: 'Top clients by revenue, retention, and case volume.', ar: 'أعلى العملاء حسب الإيرادات، الاحتفاظ، وحجم القضايا.' },
    sections: [{ heading: { en: 'Use case', ar: 'حالة الاستخدام' }, body: { en: 'Identify which clients drive most revenue and which are at risk of churn (no new matters in 6+ months).', ar: 'حدد العملاء الذين يحققون معظم الإيرادات وأولئك المعرضين للإلغاء (لا قضايا جديدة منذ ٦+ أشهر).' } }],
  },

  'reports.errand-analytics': {
    title: { en: 'Errand analytics', ar: 'تحليلات المعاملات' },
    intro: { en: 'Throughput, average completion time, and overdue counts by errand type.', ar: 'الإنتاجية، متوسط وقت الإنجاز، وأعداد المتأخرات حسب نوع المعاملة.' },
    sections: [{ heading: { en: 'Reading the chart', ar: 'قراءة الرسم' }, body: { en: 'Bars show errand volume; the line overlays average days-to-complete. Spikes often signal a bottleneck step.', ar: 'الأعمدة تُظهر حجم المعاملات؛ الخط يُظهر متوسط أيام الإنجاز. الارتفاعات تشير غالباً إلى عنق زجاجة.' } }],
  },

  'reports.employee-360': {
    title: { en: 'Employee 360', ar: 'موظف ٣٦٠' },
    intro: { en: 'A complete view of one team member: hours, cases, tasks, billings, and outcomes.', ar: 'عرض شامل لعضو واحد من الفريق: الساعات، القضايا، المهام، الفواتير، والنتائج.' },
    sections: [{ heading: { en: 'Pick an employee', ar: 'اختر موظفاً' }, body: { en: 'Use the dropdown at the top to switch members. The date range filter applies to all metrics on the page.', ar: 'استخدم القائمة المنسدلة للتبديل بين الأعضاء. تصفية النطاق تُطبَّق على كل المقاييس.' } }],
  },

  'reports.time-utilization': {
    title: { en: 'Time utilization', ar: 'استغلال الوقت' },
    intro: { en: 'Billable vs. non-billable hours per person, with utilization rate against an 8-hour workday.', ar: 'الساعات القابلة للفوترة مقابل غير القابلة لكل شخص، مع معدل الاستغلال مقارنة بيوم عمل ٨ ساعات.' },
    sections: [{ heading: { en: 'Healthy targets', ar: 'الأهداف الصحية' }, body: { en: 'A typical target is 60–70%. Below 50% may indicate idle capacity; above 85% may indicate burnout risk.', ar: 'هدف نموذجي ٦٠–٧٠٪. أقل من ٥٠٪ قد يشير إلى طاقة عاطلة؛ أكثر من ٨٥٪ قد يشير لخطر الإرهاق.' } }],
  },

  'reports.firm-performance': {
    title: { en: 'Firm performance', ar: 'أداء المكتب' },
    intro: { en: 'KPIs across cases, errands, billing, and team productivity in one dashboard.', ar: 'مؤشرات الأداء عبر القضايا والمعاملات والفواتير وإنتاجية الفريق في لوحة واحدة.' },
    sections: [{ heading: { en: 'Best used', ar: 'الأفضل لـ' }, body: { en: 'For monthly partner reviews and end-of-year planning. Export the full report as a printable PDF.', ar: 'لمراجعات الشركاء الشهرية والتخطيط نهاية السنة. صدِّر التقرير كـ PDF قابل للطباعة.' } }],
  },

  'activity-feed': {
    title: { en: 'Activity feed', ar: 'سجل النشاط' },
    intro: { en: 'Real-time stream of everything happening in your firm: case updates, document uploads, payments, and more.', ar: 'تدفق فوري لكل ما يحدث في مكتبك: تحديثات القضايا، رفع المستندات، المدفوعات، والمزيد.' },
    sections: [{ heading: { en: 'Filter', ar: 'التصفية' }, body: { en: 'Filter by user, entity type, or action to focus on what matters to you.', ar: 'صفِّ حسب المستخدم، نوع الكيان، أو الإجراء للتركيز على ما يهمك.' } }],
  },

  'notifications': {
    title: { en: 'Notifications', ar: 'الإشعارات' },
    intro: { en: 'All alerts: hearing reminders, task assignments, mentions, invoice events, and announcements.', ar: 'كل التنبيهات: تذكيرات الجلسات، تعيين المهام، الإشارات، أحداث الفواتير، والإعلانات.' },
    sections: [{ heading: { en: 'Manage', ar: 'إدارة' }, body: { en: '• Click to mark read.\n• Use bulk actions to mark all read or delete.\n• Configure delivery channels in Settings → Notifications.', ar: '• اضغط للتعليم كمقروء.\n• استخدم الإجراءات الجماعية.\n• اضبط القنوات في الإعدادات → الإشعارات.' } }],
  },

  'ai.legal-research': {
    title: { en: 'AI legal research', ar: 'البحث القانوني الذكي' },
    intro: { en: 'Ask legal questions in natural language and get sourced answers grounded in Iraqi law.', ar: 'اطرح أسئلة قانونية بلغة طبيعية واحصل على إجابات موثَّقة مبنية على القانون العراقي.' },
    sections: [{ heading: { en: 'Ask well', ar: 'كيف تسأل' }, body: { en: '• Be specific (cite article numbers if known).\n• State the legal context (criminal, civil, commercial).\n• Always verify cited sources before relying on them in court.', ar: '• كن محدداً (اذكر أرقام المواد إن عرفتها).\n• حدد السياق القانوني.\n• تحقق من المصادر قبل الاعتماد عليها في المحكمة.' } }],
    tips: [{ en: 'AI is an assistant, not a substitute for professional legal judgment.', ar: 'الذكاء الاصطناعي مساعد، لا بديل عن الحكم القانوني المهني.' }],
  },

  'ai.document-draft': {
    title: { en: 'AI document drafting', ar: 'صياغة المستندات بالذكاء الاصطناعي' },
    intro: { en: 'Generate first drafts of contracts, motions, letters, and other legal documents.', ar: 'أنشئ مسودات أولى للعقود، اللوائح، الرسائل، وغيرها من المستندات القانونية.' },
    sections: [{ heading: { en: 'Workflow', ar: 'سير العمل' }, body: { en: '1. Pick a template or describe what you need.\n2. Provide key facts (parties, dates, amounts).\n3. Choose language.\n4. Generate, then edit and polish before use.', ar: '١. اختر قالباً أو صف ما تحتاج.\n٢. زوِّد الحقائق الأساسية.\n٣. اختر اللغة.\n٤. أنشئ، ثم عدِّل قبل الاستخدام.' } }],
  },

  'ai.translate': {
    title: { en: 'AI translation', ar: 'الترجمة الذكية' },
    intro: { en: 'Translate legal text between Arabic and English with terminology awareness.', ar: 'ترجم النصوص القانونية بين العربية والإنجليزية مع مراعاة المصطلحات.' },
    sections: [{ heading: { en: 'Best practices', ar: 'أفضل الممارسات' }, body: { en: 'Paste full clauses for context (not single words). Always have a bilingual lawyer review before filing.', ar: 'الصق فقرات كاملة للسياق. اعرض الترجمة على محامٍ ثنائي اللغة قبل الإيداع.' } }],
  },
};

export function getHelp(key: string): HelpEntry | null {
  return helpContent[key] ?? null;
}
