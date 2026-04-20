import { Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { partyInitials } from '@/lib/parties';
import type { PartyType } from '@/types/parties';
import { Link } from 'react-router-dom';

interface PartyChipProps {
  partyType: PartyType;
  displayName: string;
  /** Optional id — if provided the chip becomes a link to /clients/:id */
  id?: string;
  size?: 'sm' | 'md';
  showTypeBadge?: boolean;
  className?: string;
}

/** Compact, clickable display of a Party (Person or Entity). RTL-safe. */
export function PartyChip({ partyType, displayName, id, size = 'md', showTypeBadge = true, className }: PartyChipProps) {
  const Icon = partyType === 'entity' ? Building2 : User;
  const avatarSize = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  const textSize = size === 'sm' ? 'text-body-sm' : 'text-body-md';

  const content = (
    <>
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-semibold shrink-0',
          avatarSize,
          partyType === 'entity' ? 'bg-info-light text-info' : 'bg-accent/15 text-accent-dark',
        )}
      >
        {partyInitials(displayName) || <Icon size={size === 'sm' ? 12 : 14} />}
      </div>
      <span className={cn('truncate text-foreground', textSize)}>{displayName || '—'}</span>
      {showTypeBadge && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-badge px-1.5 py-0.5 text-[10px] font-medium shrink-0',
            partyType === 'entity' ? 'bg-info-light text-info' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon size={10} />
          {partyType === 'entity' ? 'Co.' : 'Ind.'}
        </span>
      )}
    </>
  );

  const baseClasses = cn('inline-flex items-center gap-2 min-w-0 max-w-full', className);

  if (id) {
    return (
      <Link to={`/clients/${id}`} className={cn(baseClasses, 'hover:underline underline-offset-2')}>
        {content}
      </Link>
    );
  }
  return <span className={baseClasses}>{content}</span>;
}
