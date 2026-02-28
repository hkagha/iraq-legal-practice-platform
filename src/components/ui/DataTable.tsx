import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface ColumnDef<T = any> {
  key: string;
  label: string;
  labelAr: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface EmptyStateDef {
  icon: LucideIcon;
  title: string;
  titleAr: string;
  subtitle?: string;
  subtitleAr?: string;
  actionLabel?: string;
  actionLabelAr?: string;
  onAction?: () => void;
}

interface DataTableProps<T = any> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: EmptyStateDef;
  onRowClick?: (row: T) => void;
  pagination?: PaginationConfig;
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showCheckboxes?: boolean;
  rowKey?: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  columns, data, isLoading, emptyState, onRowClick, pagination, sortConfig, onSort,
  selectedRows = [], onSelectionChange, showCheckboxes = false, rowKey = (r) => r.id,
}: DataTableProps<T>) {
  const { language, t } = useLanguage();

  const allSelected = data.length > 0 && data.every(r => selectedRows.includes(rowKey(r)));

  const toggleAll = () => {
    if (allSelected) onSelectionChange?.([]);
    else onSelectionChange?.(data.map(r => rowKey(r)));
  };

  const toggleRow = (id: string) => {
    onSelectionChange?.(
      selectedRows.includes(id) ? selectedRows.filter(x => x !== id) : [...selectedRows, id]
    );
  };

  // Pagination helpers
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;
  const pageNumbers = React.useMemo(() => {
    if (!pagination) return [];
    const pages: (number | 'ellipsis')[] = [];
    const { page } = pagination;
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [pagination, totalPages]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-card border border-border overflow-hidden">
        <div className="bg-muted/50 h-11 border-b border-border" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/50">
            {columns.map((_, j) => <Skeleton key={j} className="h-4 flex-1" />)}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className="bg-card rounded-card border border-border overflow-hidden">
        <EmptyState {...emptyState} />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-card border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {showCheckboxes && (
                <th className="w-11 px-3 py-2.5">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-2.5 text-start text-label text-muted-foreground font-medium',
                    col.sortable && 'cursor-pointer select-none hover:text-foreground',
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {language === 'ar' ? col.labelAr : col.label}
                    {col.sortable && (
                      <span className="flex flex-col">
                        <ChevronUp size={12} className={cn(sortConfig?.key === col.key && sortConfig.direction === 'asc' ? 'text-foreground' : 'text-slate-300')} />
                        <ChevronDown size={12} className={cn('-mt-1', sortConfig?.key === col.key && sortConfig.direction === 'desc' ? 'text-foreground' : 'text-slate-300')} />
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const id = rowKey(row);
              const isSelected = selectedRows.includes(id);
              return (
                <tr
                  key={id || i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-border/50 transition-colors',
                    onRowClick && 'cursor-pointer',
                    isSelected ? 'bg-info-light' : 'hover:bg-muted/30',
                  )}
                >
                  {showCheckboxes && (
                    <td className="w-11 px-3 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(id)} />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-body-md text-foreground">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2 border-t border-border">
          <span className="text-body-sm text-muted-foreground">
            {language === 'ar'
              ? `عرض ${(pagination.page - 1) * pagination.pageSize + 1} إلى ${Math.min(pagination.page * pagination.pageSize, pagination.total)} من ${pagination.total} سجل`
              : `Showing ${(pagination.page - 1) * pagination.pageSize + 1} to ${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} entries`}
          </span>
          <div className="flex items-center gap-2">
            <Select value={String(pagination.pageSize)} onValueChange={v => pagination.onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-8 w-auto text-body-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                className="h-8 w-8 flex items-center justify-center rounded-button border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50"
              >
                <ChevronLeft size={14} className="rtl:rotate-180" />
              </button>
              {pageNumbers.map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => pagination.onPageChange(p as number)}
                    className={cn(
                      'h-8 w-8 rounded-button text-body-sm font-medium transition-colors',
                      pagination.page === p
                        ? 'bg-accent text-accent-foreground'
                        : 'border border-border hover:bg-muted/50'
                    )}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={pagination.page >= totalPages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                className="h-8 w-8 flex items-center justify-center rounded-button border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50"
              >
                <ChevronRight size={14} className="rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
