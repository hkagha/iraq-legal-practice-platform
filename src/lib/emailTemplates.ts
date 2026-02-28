/**
 * Email template system for notification emails.
 * Generates branded HTML emails with RTL support for Arabic.
 */

const BASE_URL = window?.location?.origin || 'https://iraqlegalplatform.lovable.app';

function wrapInLayout(content: string, language: 'en' | 'ar', orgName?: string): string {
  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const fontFamily = isRTL
    ? "'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif"
    : "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

  return `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${isRTL ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">' : ''}
  <style>
    body { margin: 0; padding: 0; background-color: #f4f5f7; font-family: ${fontFamily}; direction: ${dir}; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #1B2A4A; padding: 24px 32px; text-align: center; }
    .header h1 { color: #C9A84C; font-size: 24px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.7); font-size: 13px; margin: 4px 0 0; }
    .body { padding: 32px; }
    .btn { display: inline-block; background: #C9A84C; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; }
    .footer { background: #f8f9fa; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer a { color: #C9A84C; text-decoration: none; font-size: 12px; }
    .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; }
  </style>
</head>
<body>
  <div style="padding: 24px 16px; background: #f4f5f7;">
    <div class="container">
      <div class="header">
        <h1>Qanuni</h1>
        ${orgName ? `<p>${orgName}</p>` : ''}
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <a href="${BASE_URL}/notifications">${isRTL ? 'إدارة تفضيلات الإشعارات' : 'Manage notification preferences'}</a>
        <p>${isRTL ? 'تم إرسال هذا البريد من قانوني' : 'This email was sent by Qanuni'}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function actionButton(label: string, url: string): string {
  return `<div style="text-align:center; margin: 24px 0;">
    <a href="${url}" class="btn">${label}</a>
  </div>`;
}

interface TemplateData {
  [key: string]: any;
}

const templates: Record<string, {
  subject: (d: TemplateData) => { en: string; ar: string };
  body: (d: TemplateData) => { en: string; ar: string };
  link?: (d: TemplateData) => string;
}> = {
  task_assigned: {
    subject: (d) => ({
      en: `New task assigned: ${d.title}`,
      ar: `مهمة جديدة: ${d.title}`,
    }),
    body: (d) => ({
      en: `<h2 style="color:#1B2A4A;margin:0 0 16px;">You've been assigned a new task</h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>${d.title}</strong></p>
        ${d.dueDate ? `<p style="color:#6b7280;font-size:14px;">Due: ${d.dueDate}</p>` : ''}`,
      ar: `<h2 style="color:#1B2A4A;margin:0 0 16px;">تم إسناد مهمة جديدة لك</h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>${d.title}</strong></p>
        ${d.dueDate ? `<p style="color:#6b7280;font-size:14px;">الاستحقاق: ${d.dueDate}</p>` : ''}`,
    }),
    link: () => `${BASE_URL}/tasks`,
  },
  case_hearing_tomorrow: {
    subject: (d) => ({
      en: `Reminder: Hearing tomorrow for ${d.caseTitle}`,
      ar: `تذكير: جلسة غداً لقضية ${d.caseTitle}`,
    }),
    body: (d) => ({
      en: `<h2 style="color:#1B2A4A;margin:0 0 16px;">Hearing Tomorrow</h2>
        <p style="color:#374151;font-size:15px;">Case: <strong>${d.caseTitle}</strong></p>
        ${d.time ? `<p style="color:#6b7280;font-size:14px;">Time: ${d.time}</p>` : ''}
        ${d.courtRoom ? `<p style="color:#6b7280;font-size:14px;">Court Room: ${d.courtRoom}</p>` : ''}`,
      ar: `<h2 style="color:#1B2A4A;margin:0 0 16px;">جلسة غداً</h2>
        <p style="color:#374151;font-size:15px;">القضية: <strong>${d.caseTitle}</strong></p>
        ${d.time ? `<p style="color:#6b7280;font-size:14px;">الوقت: ${d.time}</p>` : ''}
        ${d.courtRoom ? `<p style="color:#6b7280;font-size:14px;">قاعة المحكمة: ${d.courtRoom}</p>` : ''}`,
    }),
    link: (d) => `${BASE_URL}/cases/${d.caseId}`,
  },
  case_hearing_today: {
    subject: (d) => ({
      en: `Hearing today: ${d.caseTitle}${d.time ? ` at ${d.time}` : ''}`,
      ar: `جلسة اليوم: ${d.caseTitle}${d.time ? ` الساعة ${d.time}` : ''}`,
    }),
    body: (d) => ({
      en: `<h2 style="color:#1B2A4A;margin:0 0 16px;">Hearing Today</h2>
        <p style="color:#374151;font-size:15px;">Case: <strong>${d.caseTitle}</strong></p>
        ${d.time ? `<p style="color:#6b7280;font-size:14px;">Time: ${d.time}</p>` : ''}`,
      ar: `<h2 style="color:#1B2A4A;margin:0 0 16px;">جلسة اليوم</h2>
        <p style="color:#374151;font-size:15px;">القضية: <strong>${d.caseTitle}</strong></p>
        ${d.time ? `<p style="color:#6b7280;font-size:14px;">الوقت: ${d.time}</p>` : ''}`,
    }),
    link: (d) => `${BASE_URL}/cases/${d.caseId}`,
  },
  payment_received: {
    subject: (d) => ({
      en: `Payment of ${d.amount} received for Invoice ${d.invoiceNumber}`,
      ar: `تم استلام دفعة ${d.amount} للفاتورة ${d.invoiceNumber}`,
    }),
    body: (d) => ({
      en: `<h2 style="color:#1B2A4A;margin:0 0 16px;">Payment Received</h2>
        <p style="color:#374151;font-size:15px;">Amount: <strong>${d.amount}</strong></p>
        <p style="color:#6b7280;font-size:14px;">Invoice: ${d.invoiceNumber}</p>`,
      ar: `<h2 style="color:#1B2A4A;margin:0 0 16px;">تم استلام دفعة</h2>
        <p style="color:#374151;font-size:15px;">المبلغ: <strong>${d.amount}</strong></p>
        <p style="color:#6b7280;font-size:14px;">الفاتورة: ${d.invoiceNumber}</p>`,
    }),
    link: (d) => `${BASE_URL}/billing/${d.invoiceId}`,
  },
  invoice_overdue: {
    subject: (d) => ({
      en: `Invoice ${d.invoiceNumber} is overdue`,
      ar: `الفاتورة ${d.invoiceNumber} متأخرة`,
    }),
    body: (d) => ({
      en: `<h2 style="color:#EF4444;margin:0 0 16px;">Invoice Overdue</h2>
        <p style="color:#374151;font-size:15px;">Invoice <strong>${d.invoiceNumber}</strong> is past due.</p>
        <p style="color:#6b7280;font-size:14px;">Amount: ${d.amount}</p>`,
      ar: `<h2 style="color:#EF4444;margin:0 0 16px;">فاتورة متأخرة</h2>
        <p style="color:#374151;font-size:15px;">الفاتورة <strong>${d.invoiceNumber}</strong> تجاوزت موعد الاستحقاق.</p>
        <p style="color:#6b7280;font-size:14px;">المبلغ: ${d.amount}</p>`,
    }),
    link: (d) => `${BASE_URL}/billing/${d.invoiceId}`,
  },
  task_overdue: {
    subject: (d) => ({
      en: `Task overdue: ${d.title}`,
      ar: `مهمة متأخرة: ${d.title}`,
    }),
    body: (d) => ({
      en: `<h2 style="color:#EF4444;margin:0 0 16px;">Task Overdue</h2>
        <p style="color:#374151;font-size:15px;"><strong>${d.title}</strong> is past its due date.</p>`,
      ar: `<h2 style="color:#EF4444;margin:0 0 16px;">مهمة متأخرة</h2>
        <p style="color:#374151;font-size:15px;"><strong>${d.title}</strong> تجاوزت موعد الاستحقاق.</p>`,
    }),
    link: () => `${BASE_URL}/tasks`,
  },
  mention: {
    subject: (d) => ({
      en: `${d.actorName} mentioned you in ${d.entityType}`,
      ar: `${d.actorName} ذكرك في ${d.entityType}`,
    }),
    body: (d) => ({
      en: `<h2 style="color:#1B2A4A;margin:0 0 16px;">You were mentioned</h2>
        <p style="color:#374151;font-size:15px;"><strong>${d.actorName}</strong> mentioned you in a ${d.entityType}.</p>
        ${d.preview ? `<blockquote style="border-left:3px solid #C9A84C;padding:8px 16px;color:#6b7280;margin:16px 0;">${d.preview}</blockquote>` : ''}`,
      ar: `<h2 style="color:#1B2A4A;margin:0 0 16px;">تم ذكرك</h2>
        <p style="color:#374151;font-size:15px;"><strong>${d.actorName}</strong> ذكرك في ${d.entityType}.</p>
        ${d.preview ? `<blockquote style="border-right:3px solid #C9A84C;padding:8px 16px;color:#6b7280;margin:16px 0;">${d.preview}</blockquote>` : ''}`,
    }),
    link: (d) => d.entityUrl || BASE_URL,
  },
  event_invitation: {
    subject: (d) => ({
      en: `You're invited: ${d.eventTitle} on ${d.eventDate}`,
      ar: `دعوة لحدث: ${d.eventTitle} في ${d.eventDate}`,
    }),
    body: (d) => ({
      en: `<h2 style="color:#1B2A4A;margin:0 0 16px;">Event Invitation</h2>
        <p style="color:#374151;font-size:15px;"><strong>${d.eventTitle}</strong></p>
        <p style="color:#6b7280;font-size:14px;">Date: ${d.eventDate}</p>
        ${d.location ? `<p style="color:#6b7280;font-size:14px;">Location: ${d.location}</p>` : ''}`,
      ar: `<h2 style="color:#1B2A4A;margin:0 0 16px;">دعوة لحدث</h2>
        <p style="color:#374151;font-size:15px;"><strong>${d.eventTitle}</strong></p>
        <p style="color:#6b7280;font-size:14px;">التاريخ: ${d.eventDate}</p>
        ${d.location ? `<p style="color:#6b7280;font-size:14px;">الموقع: ${d.location}</p>` : ''}`,
    }),
    link: () => `${BASE_URL}/calendar`,
  },
};

export function getEmailTemplate(
  type: string,
  data: TemplateData,
  language: 'en' | 'ar',
  orgName?: string,
): { subject: string; html: string; text: string } {
  const template = templates[type];
  if (!template) {
    // Fallback generic template
    return {
      subject: data.title || 'Notification',
      html: wrapInLayout(
        `<p style="color:#374151;font-size:15px;">${data.title || 'You have a new notification'}</p>
         ${data.body ? `<p style="color:#6b7280;font-size:14px;">${data.body}</p>` : ''}
         ${actionButton(language === 'ar' ? 'عرض' : 'View', BASE_URL)}`,
        language,
        orgName,
      ),
      text: data.title || 'You have a new notification',
    };
  }

  const subjectText = template.subject(data);
  const bodyText = template.body(data);
  const linkUrl = template.link?.(data) || BASE_URL;
  const btnLabel = language === 'ar' ? 'عرض التفاصيل' : 'View Details';

  const htmlContent = bodyText[language] + actionButton(btnLabel, linkUrl);

  return {
    subject: subjectText[language],
    html: wrapInLayout(htmlContent, language, orgName),
    text: subjectText[language],
  };
}
