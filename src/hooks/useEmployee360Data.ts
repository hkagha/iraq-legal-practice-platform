export function useEmployee360Data(_employeeId?: string, _range?: any) {
  return {
    data: null as any,
    loading: false,
    error: null as any,
    refresh: () => {},
    members: [] as any[],
  };
}
