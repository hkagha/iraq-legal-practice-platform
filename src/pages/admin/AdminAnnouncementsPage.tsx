import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
  target: string;
  recipientCount: number;
  created_at: string;
}

export default function AdminAnnouncementsPage() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const isEN = language === 'en';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [message, setMessage] = useState('');
  const [messageAr, setMessageAr] = useState('');
  const [priority, setPriority] = useState('normal');
  const [sending, setSending] = useState(false);

  async function sendAnnouncement() {
    if (!title || !message || !profile) return;
    setSending(true);

    // Get all active users
    const { data: users } = await supabase.from('profiles').select('id, organization_id').eq('is_active', true).neq('role', 'super_admin');
    const targets = users || [];

    // Create notifications for each user
    for (const user of targets) {
      if (!user.organization_id) continue;
      await supabase.from('notifications').insert({
        organization_id: user.organization_id,
        user_id: user.id,
        notification_type: 'system_announcement',
        title: title,
        title_ar: titleAr || null,
        body: message,
        body_ar: messageAr || null,
        priority: priority === 'urgent' ? 'high' : 'normal',
      } as any);
    }

    // Log audit
    await supabase.from('admin_audit_log').insert({
      admin_id: profile.id,
      action: 'announcement_sent',
      target_type: 'system',
      target_name: title,
      details: { recipients: targets.length, priority },
    } as any);

    toast.success(isEN ? `Announcement sent to ${targets.length} users` : `تم إرسال الإعلان إلى ${targets.length} مستخدم`);
    setAnnouncements(prev => [{
      id: crypto.randomUUID(),
      title,
      message,
      priority,
      target: 'all',
      recipientCount: targets.length,
      created_at: new Date().toISOString(),
    }, ...prev]);

    setShowModal(false);
    setTitle(''); setTitleAr(''); setMessage(''); setMessageAr(''); setPriority('normal');
    setSending(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm text-foreground">{isEN ? 'Announcements' : 'الإعلانات'}</h1>
          <p className="text-body-md text-muted-foreground">{isEN ? 'Send platform-wide notifications' : 'إرسال إشعارات على مستوى المنصة'}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="h-10 px-4 rounded-lg bg-accent text-accent-foreground font-medium text-body-md flex items-center gap-2 hover:bg-accent-dark transition-colors">
          <Megaphone className="h-4 w-4" /> {isEN ? 'New Announcement' : 'إعلان جديد'}
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="py-16 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{isEN ? 'No announcements sent yet' : 'لم يتم إرسال إعلانات بعد'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="bg-card border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-heading-sm text-foreground">{a.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-body-sm ${a.priority === 'urgent' ? 'bg-destructive/10 text-destructive' : a.priority === 'important' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{a.priority}</span>
                  </div>
                  <p className="text-body-md text-muted-foreground mt-1">{a.message}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-body-sm text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                  <p className="text-body-sm text-muted-foreground">{a.recipientCount} {isEN ? 'recipients' : 'مستلم'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEN ? 'New Announcement' : 'إعلان جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-label text-foreground block mb-1">{isEN ? 'Title' : 'العنوان'} *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-card px-3 text-body-md" />
            </div>
            <div>
              <label className="text-label text-foreground block mb-1">{isEN ? 'Title (Arabic)' : 'العنوان (عربي)'}</label>
              <input value={titleAr} onChange={e => setTitleAr(e.target.value)} dir="rtl" className="w-full h-10 rounded-lg border border-border bg-card px-3 text-body-md" />
            </div>
            <div>
              <label className="text-label text-foreground block mb-1">{isEN ? 'Message' : 'الرسالة'} *</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-body-md" />
            </div>
            <div>
              <label className="text-label text-foreground block mb-1">{isEN ? 'Message (Arabic)' : 'الرسالة (عربي)'}</label>
              <textarea value={messageAr} onChange={e => setMessageAr(e.target.value)} rows={3} dir="rtl" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-body-md" />
            </div>
            <div>
              <label className="text-label text-foreground block mb-1">{isEN ? 'Priority' : 'الأولوية'}</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-card px-3 text-body-md">
                <option value="normal">{isEN ? 'Normal' : 'عادي'}</option>
                <option value="important">{isEN ? 'Important' : 'مهم'}</option>
                <option value="urgent">{isEN ? 'Urgent' : 'عاجل'}</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowModal(false)} className="h-10 px-4 rounded-lg border border-border text-body-md hover:bg-muted">{isEN ? 'Cancel' : 'إلغاء'}</button>
            <button onClick={sendAnnouncement} disabled={!title || !message || sending} className="h-10 px-4 rounded-lg bg-accent text-accent-foreground font-medium text-body-md hover:bg-accent-dark disabled:opacity-50">
              {sending ? (isEN ? 'Sending...' : 'جاري الإرسال...') : (isEN ? 'Send Announcement' : 'إرسال الإعلان')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
