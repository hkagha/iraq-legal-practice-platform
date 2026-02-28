import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

interface WeeklyViewProps {
  entries: any[];
  weekStart: Date;
  onWeekChange: (start: Date) => void;
  onCellClick: (date: string, caseId?: string, errandId?: string) => void;
  workingDays?: string[];
}

const DEFAULT_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

export default function WeeklyView({ entries, weekStart, onWeekChange, onCellClick, workingDays = DEFAULT_DAYS }: WeeklyViewProps) {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  // Get the visible day indices (0=Sunday)
  const dayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const visibleDayIndices = workingDays.map(d => dayMap[d] ?? 0);

  // Generate dates for the week
  const weekDates = useMemo(() =>
    visibleDayIndices.map(i => addDays(weekStart, i)),
  [weekStart, visibleDayIndices]);

  // Group entries by entity key + date
  const { rows, dailyTotals, grandTotal } = useMemo(() => {
    const entityMap = new Map<string, { label: string; caseId?: string; errandId?: string; cells: Record<string, number> }>();

    entries.forEach(entry => {
      const key = entry.case_id || entry.errand_id || '__none__';
      if (!entityMap.has(key)) {
        let label = t('No entity', 'بدون ربط');
        if (entry.cases) label = entry.cases.case_number;
        else if (entry.errands) label = entry.errands.errand_number;
        entityMap.set(key, { label, caseId: entry.case_id, errandId: entry.errand_id, cells: {} });
      }
      const dateStr = entry.date;
      const existing = entityMap.get(key)!;
      existing.cells[dateStr] = (existing.cells[dateStr] || 0) + (entry.duration_minutes || 0);
    });

    const rows = Array.from(entityMap.values());
    const dailyTotals: Record<string, number> = {};
    let grandTotal = 0;
    weekDates.forEach(d => {
      const ds = format(d, 'yyyy-MM-dd');
      const total = rows.reduce((s, r) => s + (r.cells[ds] || 0), 0);
      dailyTotals[ds] = total;
      grandTotal += total;
    });

    return { rows, dailyTotals, grandTotal };
  }, [entries, weekDates]);

  const fmtHours = (mins: number) => mins > 0 ? `${(mins / 60).toFixed(1)}h` : '—';

  const isThisWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 0 }));

  return (
    <div>
      {/* Week navigator */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onWeekChange(addDays(weekStart, -7))}>
          <ChevronLeft size={16} />
        </Button>
        <span className="text-body-md font-medium text-foreground">
          {format(weekDates[0], 'MMM d')} — {format(weekDates[weekDates.length - 1], 'MMM d, yyyy')}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onWeekChange(addDays(weekStart, 7))}>
          <ChevronRight size={16} />
        </Button>
        {!isThisWeek && (
          <Button variant="ghost" size="sm" onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
            {t('This Week', 'هذا الأسبوع')}
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-start p-2 text-body-sm font-semibold text-muted-foreground sticky start-0 bg-muted/50 min-w-[140px]">
                {t('Entity', 'الكيان')}
              </th>
              {weekDates.map(d => {
                const dayIndex = d.getDay();
                return (
                  <th key={d.toISOString()} className="text-center p-2 text-body-sm font-semibold text-muted-foreground min-w-[80px]">
                    {language === 'ar' ? DAY_NAMES_AR[dayIndex] : DAY_NAMES_EN[dayIndex]}
                    <br />
                    <span className="font-normal text-body-sm">{format(d, 'd')}</span>
                  </th>
                );
              })}
              <th className="text-center p-2 text-body-sm font-semibold text-muted-foreground min-w-[80px]">
                {t('Total', 'الإجمالي')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={weekDates.length + 2} className="text-center p-8 text-body-sm text-muted-foreground">
                  {t('No entries this week', 'لا توجد سجلات هذا الأسبوع')}
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const rowTotal = weekDates.reduce((s, d) => s + (row.cells[format(d, 'yyyy-MM-dd')] || 0), 0);
              return (
                <tr key={idx} className="border-t border-border hover:bg-muted/20">
                  <td className="p-2 text-body-sm font-medium text-foreground sticky start-0 bg-card">{row.label}</td>
                  {weekDates.map(d => {
                    const ds = format(d, 'yyyy-MM-dd');
                    const val = row.cells[ds] || 0;
                    return (
                      <td key={ds} className="text-center p-2 cursor-pointer hover:bg-accent/10 rounded transition-colors"
                        onClick={() => onCellClick(ds, row.caseId, row.errandId)}>
                        <span className={`text-body-md ${val > 0 ? 'text-accent font-medium' : 'text-muted-foreground/40'}`}>
                          {fmtHours(val)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="text-center p-2 text-body-md font-semibold text-foreground">{fmtHours(rowTotal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30">
              <td className="p-2 text-body-sm font-semibold text-muted-foreground sticky start-0 bg-muted/30">
                {t('Daily Total', 'إجمالي اليوم')}
              </td>
              {weekDates.map(d => {
                const ds = format(d, 'yyyy-MM-dd');
                return (
                  <td key={ds} className="text-center p-2 text-body-md font-semibold text-foreground">
                    {fmtHours(dailyTotals[ds] || 0)}
                  </td>
                );
              })}
              <td className="text-center p-2 text-heading-sm font-bold text-foreground">{fmtHours(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
