import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function DangerZoneSection() {
  const { organization, signOut } = useAuth();
  const { language } = useLanguage();
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [processing, setProcessing] = useState(false);

  const orgName = organization?.name || '';

  const handleDeactivate = async () => {
    if (confirmText !== orgName) return;
    setProcessing(true);
    await supabase.from('organizations').update({ is_active: false } as any).eq('id', organization!.id);
    toast({ title: language === 'ar' ? 'تم تعطيل المؤسسة' : 'Organization deactivated' });
    setShowDeactivate(false);
    setConfirmText('');
    setProcessing(false);
    await signOut();
  };

  const handleDeleteClick = () => {
    setShowDelete(true);
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-destructive/40 rounded-lg p-6 space-y-6">
        <h2 className="text-heading-lg text-destructive flex items-center gap-2">
          <AlertTriangle size={22} />
          {language === 'ar' ? 'منطقة الخطر' : 'Danger Zone'}
        </h2>

        {/* Deactivate */}
        <div className="space-y-3">
          <h3 className="text-heading-md text-foreground">{language === 'ar' ? 'تعطيل المؤسسة' : 'Deactivate Organization'}</h3>
          <p className="text-body-md text-muted-foreground">
            {language === 'ar'
              ? 'تعطيل مؤسستك مؤقتاً. سيتم تسجيل خروج جميع الأعضاء مع الحفاظ على البيانات.'
              : 'Temporarily deactivate your organization. All members will be logged out and data will be preserved.'}
          </p>
          <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setShowDeactivate(true)}>
            {language === 'ar' ? 'تعطيل المؤسسة' : 'Deactivate Organization'}
          </Button>
        </div>

        <div className="border-t border-destructive/20" />

        {/* Delete */}
        <div className="space-y-3">
          <h3 className="text-heading-md text-foreground">{language === 'ar' ? 'حذف المؤسسة' : 'Delete Organization'}</h3>
          <p className="text-body-md text-muted-foreground">
            {language === 'ar'
              ? 'حذف مؤسستك وجميع البيانات نهائياً. لا يمكن التراجع عن هذا الإجراء.'
              : 'Permanently delete your organization and ALL data. This cannot be undone.'}
          </p>
          <Button variant="destructive" onClick={handleDeleteClick}>
            {language === 'ar' ? 'حذف المؤسسة' : 'Delete Organization'}
          </Button>
        </div>
      </div>

      {/* Deactivate dialog */}
      <Dialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تأكيد التعطيل' : 'Confirm Deactivation'}</DialogTitle>
          </DialogHeader>
          <p className="text-body-md text-muted-foreground">
            {language === 'ar' ? `اكتب '${orgName}' للتأكيد` : `Type '${orgName}' to confirm`}
          </p>
          <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={orgName} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeactivate(false); setConfirmText(''); }}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" disabled={confirmText !== orgName || processing} onClick={handleDeactivate}>
              {processing ? '...' : (language === 'ar' ? 'تعطيل' : 'Deactivate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'حذف المؤسسة' : 'Delete Organization'}</DialogTitle>
          </DialogHeader>
          <p className="text-body-md text-muted-foreground">
            {language === 'ar'
              ? 'يرجى التواصل مع الدعم لحذف مؤسستك: support@qanuni.app'
              : 'Please contact support to delete your organization: support@qanuni.app'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>{language === 'ar' ? 'إغلاق' : 'Close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
