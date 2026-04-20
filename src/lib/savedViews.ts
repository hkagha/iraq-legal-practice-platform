import { supabase } from '@/integrations/supabase/client';

export type SavedViewEntity = 'cases' | 'errands' | 'clients' | 'tasks' | 'invoices' | 'documents';

export interface SavedView {
  id: string;
  organization_id: string;
  user_id: string;
  entity_type: SavedViewEntity;
  name: string;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  columns: string[];
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export async function listSavedViews(entityType: SavedViewEntity): Promise<SavedView[]> {
  const { data, error } = await supabase
    .from('saved_views' as any)
    .select('*')
    .eq('entity_type', entityType)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as SavedView[];
}

export async function createSavedView(input: {
  organization_id: string;
  user_id: string;
  entity_type: SavedViewEntity;
  name: string;
  filters?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  columns?: string[];
  is_default?: boolean;
  is_shared?: boolean;
}): Promise<SavedView> {
  const { data, error } = await supabase
    .from('saved_views' as any)
    .insert({
      organization_id: input.organization_id,
      user_id: input.user_id,
      entity_type: input.entity_type,
      name: input.name,
      filters: input.filters ?? {},
      sort: input.sort ?? {},
      columns: input.columns ?? [],
      is_default: input.is_default ?? false,
      is_shared: input.is_shared ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as SavedView;
}

export async function deleteSavedView(id: string): Promise<void> {
  const { error } = await supabase.from('saved_views' as any).delete().eq('id', id);
  if (error) throw error;
}
