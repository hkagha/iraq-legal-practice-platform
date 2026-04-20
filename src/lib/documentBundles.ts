import { supabase } from '@/integrations/supabase/client';

export interface DocumentBundle {
  id: string;
  organization_id: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  case_id?: string | null;
  errand_id?: string | null;
  status: 'draft' | 'finalized' | 'shared';
  is_visible_to_client: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function listBundles(filters?: { case_id?: string }): Promise<DocumentBundle[]> {
  let q = supabase.from('document_bundles' as any).select('*').order('created_at', { ascending: false });
  if (filters?.case_id) q = q.eq('case_id', filters.case_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as DocumentBundle[];
}

export async function createBundle(input: {
  organization_id: string;
  created_by: string;
  name: string;
  description?: string;
  case_id?: string;
  errand_id?: string;
  documentIds: string[];
}): Promise<DocumentBundle> {
  const { data: bundle, error } = await supabase
    .from('document_bundles' as any)
    .insert({
      organization_id: input.organization_id,
      created_by: input.created_by,
      name: input.name,
      description: input.description,
      case_id: input.case_id,
      errand_id: input.errand_id,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.documentIds.length) {
    const items = input.documentIds.map((doc_id, i) => ({
      bundle_id: (bundle as any).id,
      document_id: doc_id,
      organization_id: input.organization_id,
      sort_order: i,
    }));
    const { error: itemErr } = await supabase.from('document_bundle_items' as any).insert(items);
    if (itemErr) throw itemErr;
  }
  return bundle as unknown as DocumentBundle;
}

export async function getBundleItems(bundleId: string) {
  const { data, error } = await supabase
    .from('document_bundle_items' as any)
    .select('*, document:documents(*)')
    .eq('bundle_id', bundleId)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function deleteBundle(id: string) {
  const { error } = await supabase.from('document_bundles' as any).delete().eq('id', id);
  if (error) throw error;
}
