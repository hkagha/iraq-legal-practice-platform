import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormDatePicker } from '@/components/ui/FormDatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const EVENT_TYPES = ['meeting', 'appointment', 'deadline', 'reminder', 'court_date', 'consultation', 'conference', 'training', 'personal', 'other'];
const COLORS = ['#C9A84C', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#6B7280'];

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editEvent?: any;
  defaultDate?: string;
}

export default function EventFormModal({ isOpen, onClose, onSaved, editEvent, defaultDate }: EventFormModalProps) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [color, setColor] = useState('#C9A84C');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title || '');
      setDescription(editEvent.description || '');
      setEventType(editEvent.event_type || 'meeting');
      setColor(editEvent.color || '#C9A84C');
      setIsAllDay(editEvent.is_all_day || false);
      setStartDate(editEvent.start_date ? new Date(editEvent.start_date + 'T00:00:00') : undefined);
      setStartTime(editEvent.start_time || '09:00');
      setEndDate(editEvent.end_date ? new Date(editEvent.end_date + 'T00:00:00') : undefined);
      setEndTime(editEvent.end_time || '10:00');
      setLocation(editEvent.location || '');
      setIsVirtual(editEvent.is_virtual || false);
      setVirtualLink(editEvent.virtual_link || '');
    } else {
      setTitle('');
      setDescription('');
      setEventType('meeting');
      setColor('#C9A84C');
      setIsAllDay(false);
      setStartDate(defaultDate ? new Date(defaultDate + 'T00:00:00') : new Date());
      setStartTime('09:00');
      setEndDate(undefined);
      setEndTime('10:00');
      setLocation('');
      setIsVirtual(false);
      setVirtualLink('');
    }
  }, [editEvent, defaultDate, isOpen]);

  const handleSubmit = async () => {
    if (!title.trim() || !startDate || !profile?.organization_id || !user) return;
    setSaving(true);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const payload: any = {
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      color,
      is_all_day: isAllDay,
      start_date: fmt(startDate),
      start_time: isAllDay ? null : startTime || null,
      end_date: endDate ? fmt(endDate) : null,
      end_time: isAllDay ? null : endTime || null,
      location: location.trim() || null,
      is_virtual: isVirtual,
      virtual_link: isVirtual ? virtualLink.trim() || null : null,
      organization_id: profile.organization_id,
    };

    let error;
    if (editEvent) {
      ({ error } = await supabase.from('calendar_events').update(payload).eq('id', editEvent.id));
    } else {
      payload.created_by = user.id;
      ({ error } = await supabase.from('calendar_events').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t(editEvent ? 'calendar.messages.updated' : 'calendar.messages.created'));
      onSaved();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editEvent ? t('calendar.editEvent') : t('calendar.addEvent')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <Label className="text-label mb-1.5 block">{t('calendar.fields.title')} *</Label>
            <FormInput value={title} onChange={e => setTitle(e.target.value)} placeholder={t('calendar.fields.titlePlaceholder')} error={!title.trim() && saving} />
          </div>

          {/* Description */}
          <div>
            <Label className="text-label mb-1.5 block">{t('calendar.fields.description')}</Label>
            <FormTextarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>

          {/* Type + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-label mb-1.5 block">{t('calendar.fields.eventType')}</Label>
              <FormSelect value={eventType} onValueChange={setEventType} options={EVENT_TYPES.map(et => ({ value: et, label: t(`calendar.eventTypes.${et}`) }))} />
            </div>
            <div>
              <Label className="text-label mb-1.5 block">{t('calendar.fields.color')}</Label>
              <div className="flex gap-2 flex-wrap pt-1">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} className={cn('w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all', color === c ? 'border-foreground scale-110' : 'border-transparent')} style={{ backgroundColor: c }}>
                    {color === c && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* All day */}
          <div className="flex items-center gap-2">
            <Checkbox checked={isAllDay} onCheckedChange={(c) => setIsAllDay(!!c)} id="allday" />
            <Label htmlFor="allday" className="text-body-md cursor-pointer">{t('calendar.fields.allDay')}</Label>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-label mb-1.5 block">{t('calendar.fields.startDate')} *</Label>
              <FormDatePicker value={startDate} onChange={setStartDate} />
            </div>
            {!isAllDay && (
              <div>
                <Label className="text-label mb-1.5 block">{t('calendar.fields.startTime')}</Label>
                <FormInput type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-label mb-1.5 block">{t('calendar.fields.endDate')}</Label>
              <FormDatePicker value={endDate} onChange={setEndDate} />
            </div>
            {!isAllDay && (
              <div>
                <Label className="text-label mb-1.5 block">{t('calendar.fields.endTime')}</Label>
                <FormInput type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <Label className="text-label mb-1.5 block">{t('calendar.fields.location')}</Label>
            <FormInput value={location} onChange={e => setLocation(e.target.value)} placeholder={t('calendar.fields.locationPlaceholder')} />
          </div>

          {/* Virtual */}
          <div className="flex items-center gap-2">
            <Checkbox checked={isVirtual} onCheckedChange={(c) => setIsVirtual(!!c)} id="virtual" />
            <Label htmlFor="virtual" className="text-body-md cursor-pointer">{t('calendar.fields.virtual')}</Label>
          </div>
          {isVirtual && (
            <div>
              <Label className="text-label mb-1.5 block">{t('calendar.fields.meetingLink')}</Label>
              <FormInput type="url" value={virtualLink} onChange={e => setVirtualLink(e.target.value)} placeholder={t('calendar.fields.meetingLinkPlaceholder')} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim()} className="bg-accent text-accent-foreground hover:bg-accent-dark">
            {editEvent ? t('common.update') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
