const stub = (_args?: any) => ({ data: null, loading: false, error: null, refresh: () => {}, range: { start: new Date(), end: new Date() } });
export const useReportData = stub;
export const useFirmPerformanceData = stub;
export const useCaseAnalyticsData = stub;
export const useErrandAnalyticsData = stub;
export const useClientAnalyticsData = stub;
export const useTimeUtilizationData = stub;
export const useSavedReports = (_args?: any) => ({ data: [], loading: false, error: null, refresh: () => {}, save: async (_x: any) => {}, remove: async (_id: string) => {} });

export type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom' | string;

export function getDateRange(_preset: DateRangePreset, _customStart?: Date, _customEnd?: Date): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start, end };
}
