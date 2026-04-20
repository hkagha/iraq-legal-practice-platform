const baseStub = (_args?: any) => ({
  data: null as any,
  loading: false,
  error: null,
  refresh: () => {},
  range: { start: new Date(), end: new Date() },
  members: [] as any[],
});

export const useReportData = baseStub;
export const useFirmPerformanceData = baseStub;
export const useCaseAnalyticsData = baseStub;
export const useErrandAnalyticsData = baseStub;
export const useClientAnalyticsData = baseStub;
export const useTimeUtilizationData = baseStub;

export const useSavedReports = (_args?: any) => ({
  data: [] as any[],
  reports: [] as any[],
  loading: false,
  error: null,
  refresh: () => {},
  save: async (_x: any) => {},
  saveReport: async (_x: any) => {},
  remove: async (_id: string) => {},
  deleteReport: async (_id: string) => {},
});

export type DateRangePreset =
  | 'today' | 'yesterday'
  | 'this_week' | 'last_week'
  | 'this_month' | 'last_month'
  | 'this_quarter' | 'last_quarter'
  | 'this_year' | 'last_year'
  | 'custom' | string;

export function getDateRange(_preset: DateRangePreset, _customStart?: Date, _customEnd?: Date): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start, end };
}
