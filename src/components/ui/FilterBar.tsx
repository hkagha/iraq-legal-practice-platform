import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
  labelAr: string;
}

interface FilterDef {
  key: string;
  label: string;
  labelAr: string;
  options: FilterOption[];
  type?: 'select' | 'multi-select' | 'date-range';
}

interface ViewOption {
  key: string;
  icon: LucideIcon;
  label: string;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  searchPlaceholderAr?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterDef[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClearAll?: () => void;
  viewOptions?: ViewOption[];
  activeView?: string;
  onViewChange?: (key: string) => void;
}

export function FilterBar({
  searchPlaceholder = 'Search...',
  searchPlaceholderAr = 'بحث...',
  onSearchChange,
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearAll,
  viewOptions,
  activeView,
  onViewChange,
}: FilterBarProps) {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== 'all');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => onSearchChange?.(search), 300);
    return () => clearTimeout(timer);
  }, [search, onSearchChange]);

  return (
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search */}
        <div className="relative flex-grow max-w-full sm:max-w-[400px]">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={language === 'ar' ? searchPlaceholderAr : searchPlaceholder}
            className="ps-9 pe-9 h-10"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Desktop filters */}
        <div className="hidden sm:flex items-center gap-2">
          {filters.map(f => (
            <Select
              key={f.key}
              value={activeFilters[f.key] || 'all'}
              onValueChange={v => onFilterChange?.(f.key, v)}
            >
              <SelectTrigger className="h-10 w-auto min-w-[130px] relative">
                <SelectValue placeholder={language === 'ar' ? f.labelAr : f.label} />
                {activeFilters[f.key] && activeFilters[f.key] !== 'all' && (
                  <span className="absolute top-1 end-1 w-2 h-2 rounded-full bg-info" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                {f.options.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {language === 'ar' ? o.labelAr : o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        {/* Mobile filter button */}
        {filters.length > 0 && (
          <Button variant="outline" className="sm:hidden h-10 relative" onClick={() => setShowMobileFilters(!showMobileFilters)}>
            <SlidersHorizontal size={16} />
            {language === 'ar' ? 'تصفية' : 'Filters'}
            {hasActiveFilters && <span className="absolute top-1 end-1 w-2 h-2 rounded-full bg-info" />}
          </Button>
        )}

        {/* View toggles */}
        {viewOptions && viewOptions.length > 0 && (
          <div className="hidden sm:flex items-center border border-border rounded-button overflow-hidden">
            {viewOptions.map((v, i) => {
              const VIcon = v.icon;
              return (
                <button
                  key={v.key}
                  onClick={() => onViewChange?.(v.key)}
                  className={cn(
                    'h-10 w-10 flex items-center justify-center border-e border-border last:border-e-0 transition-colors',
                    activeView === v.key ? 'bg-muted text-foreground' : 'bg-card text-muted-foreground hover:bg-muted/50'
                  )}
                  title={v.label}
                >
                  <VIcon size={16} />
                </button>
              );
            })}
          </div>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
          <button onClick={onClearAll} className="text-body-sm text-accent hover:underline whitespace-nowrap">
            {language === 'ar' ? 'مسح الكل' : 'Clear all'}
          </button>
        )}
      </div>

      {/* Mobile filters expanded */}
      {showMobileFilters && (
        <div className="sm:hidden mt-2 flex flex-col gap-2 p-3 bg-card rounded-card border border-border">
          {filters.map(f => (
            <Select
              key={f.key}
              value={activeFilters[f.key] || 'all'}
              onValueChange={v => onFilterChange?.(f.key, v)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder={language === 'ar' ? f.labelAr : f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                {f.options.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {language === 'ar' ? o.labelAr : o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}
    </div>
  );
}
