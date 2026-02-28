import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type StatusType = 'case' | 'errand' | 'task' | 'invoice' | 'priority' | 'custom';

interface StatusBadgeProps {
  status: string;
  type: StatusType;
  size?: 'sm' | 'md';
  customColor?: string;
  className?: string;
}

const COLOR_MAP: Record<string, Record<string, { bg: string; text: string }>> = {
  case: {
    intake: { bg: '#EFF6FF', text: '#3B82F6' },
    active: { bg: '#F0FDF4', text: '#22C55E' },
    pending_hearing: { bg: '#FFFBEB', text: '#F59E0B' },
    pending_judgment: { bg: '#F5F3FF', text: '#8B5CF6' },
    on_hold: { bg: '#F1F5F9', text: '#64748B' },
    won: { bg: '#FFF8E1', text: '#C9A84C' },
    lost: { bg: '#FEF2F2', text: '#EF4444' },
    settled: { bg: '#ECFEFF', text: '#06B6D4' },
    closed: { bg: '#F3F4F6', text: '#6B7280' },
    archived: { bg: '#F3F4F6', text: '#9CA3AF' },
  },
  errand: {
    new: { bg: '#EFF6FF', text: '#3B82F6' },
    in_progress: { bg: '#FFF8E1', text: '#C9A84C' },
    awaiting_documents: { bg: '#FFFBEB', text: '#F59E0B' },
    submitted_to_government: { bg: '#F5F3FF', text: '#8B5CF6' },
    under_review_by_government: { bg: '#F5F3FF', text: '#7C3AED' },
    additional_requirements: { bg: '#FEF2F2', text: '#EF4444' },
    approved: { bg: '#F0FDF4', text: '#22C55E' },
    rejected: { bg: '#FEF2F2', text: '#DC2626' },
    completed: { bg: '#F0FDF4', text: '#16A34A' },
    cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  },
  task: {
    todo: { bg: '#F1F5F9', text: '#64748B' },
    in_progress: { bg: '#EFF6FF', text: '#3B82F6' },
    in_review: { bg: '#FFFBEB', text: '#F59E0B' },
    completed: { bg: '#F0FDF4', text: '#22C55E' },
    cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  },
  invoice: {
    draft: { bg: '#F1F5F9', text: '#64748B' },
    sent: { bg: '#EFF6FF', text: '#3B82F6' },
    viewed: { bg: '#F5F3FF', text: '#8B5CF6' },
    partially_paid: { bg: '#FFFBEB', text: '#F59E0B' },
    paid: { bg: '#F0FDF4', text: '#22C55E' },
    overdue: { bg: '#FEF2F2', text: '#EF4444' },
    cancelled: { bg: '#F3F4F6', text: '#6B7280' },
    written_off: { bg: '#F3F4F6', text: '#9CA3AF' },
  },
  priority: {
    low: { bg: '#F1F5F9', text: '#64748B' },
    medium: { bg: '#EFF6FF', text: '#3B82F6' },
    high: { bg: '#FFFBEB', text: '#F59E0B' },
    urgent: { bg: '#FEF2F2', text: '#EF4444' },
  },
};

export function StatusBadge({ status, type, size = 'md', customColor, className }: StatusBadgeProps) {
  const { t } = useLanguage();

  const colors = type === 'custom'
    ? { bg: `${customColor}20`, text: customColor || '#64748B' }
    : COLOR_MAP[type]?.[status] || { bg: '#F3F4F6', text: '#6B7280' };

  const label = type === 'custom' ? status : t(`statuses.${type}.${status}`);

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-badge capitalize whitespace-nowrap',
        size === 'sm' ? 'text-[11px] px-1.5 py-0.5 leading-4' : 'text-xs px-2.5 py-[3px] leading-4',
        className,
      )}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}
