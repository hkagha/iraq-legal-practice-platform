import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/button';
import { Building2, User } from 'lucide-react';
import PersonFormSlideOver from '@/components/parties/PersonFormSlideOver';
import EntityFormSlideOver from '@/components/parties/EntityFormSlideOver';
import type { PartyRef } from '@/types/parties';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: pre-select Person or Company. */
  initialType?: 'person' | 'entity';
  onSaved?: (ref: PartyRef) => void;
}

/**
 * Wrapper that asks "Individual or Company?" then opens the correct slide-over.
 * Powers the global "+ New Client" FAB.
 */
export default function ClientFormSlideOver({ isOpen, onClose, initialType, onSaved }: Props) {
  const { language } = useLanguage();
  const [pickedType, setPickedType] = useState<'person' | 'entity' | null>(initialType ?? null);

  const handleClose = () => {
    onClose();
    // Reset to picker for next open
    setTimeout(() => setPickedType(initialType ?? null), 300);
  };

  // If a sub-form is open, show it instead of the picker
  if (pickedType === 'person') {
    return (
      <PersonFormSlideOver
        isOpen={isOpen}
        onClose={handleClose}
        onSaved={(ref) => {
          onSaved?.(ref);
          handleClose();
        }}
      />
    );
  }
  if (pickedType === 'entity') {
    return (
      <EntityFormSlideOver
        isOpen={isOpen}
        onClose={handleClose}
        onSaved={(ref) => {
          onSaved?.(ref);
          handleClose();
        }}
      />
    );
  }

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={handleClose}
      title="New Client"
      titleAr="عميل جديد"
      subtitle="Choose the type of party"
      subtitleAr="اختر نوع الطرف"
      width="md"
    >
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={() => setPickedType('person')}
          className="w-full flex items-start gap-4 p-5 rounded-card border border-border hover:border-accent hover:bg-muted/30 transition-colors text-start"
        >
          <div className="h-12 w-12 rounded-full bg-accent/15 text-accent-dark flex items-center justify-center shrink-0">
            <User size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-heading-md text-foreground">{language === 'ar' ? 'فرد' : 'Individual'}</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              {language === 'ar'
                ? 'شخص طبيعي — اسم أول، اسم عائلة، رقم وطني، إلخ.'
                : 'A natural person — first name, last name, national ID, etc.'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setPickedType('entity')}
          className="w-full flex items-start gap-4 p-5 rounded-card border border-border hover:border-accent hover:bg-muted/30 transition-colors text-start"
        >
          <div className="h-12 w-12 rounded-full bg-info-light text-info flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-heading-md text-foreground">{language === 'ar' ? 'شركة' : 'Company'}</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              {language === 'ar'
                ? 'كيان قانوني — اسم الشركة، رقم التسجيل، الممثلون.'
                : 'A legal entity — company name, registration number, representatives.'}
            </p>
          </div>
        </button>

        <div className="pt-2 flex justify-end">
          <Button type="button" variant="outline" onClick={handleClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
