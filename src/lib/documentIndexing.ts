import { supabase } from '@/integrations/supabase/client';

/**
 * Triggers AI indexing for a single document. Fires-and-forgets — never throws.
 * Safe to call right after upload; runs in the background on the edge function.
 */
export function triggerDocumentIndexing(documentId: string) {
  if (!documentId) return;
  // Don't await — let it run in the background
  supabase.functions
    .invoke('index-document', { body: { document_id: documentId } })
    .catch((err) => {
      // Quietly log; the row stays as 'pending' and can be retried later
      console.warn('[index-document] background invocation failed:', err?.message || err);
    });
}

/**
 * Re-runs indexing for a document. Awaited so callers can show toasts.
 */
export async function reindexDocument(documentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('index-document', {
      body: { document_id: documentId },
    });
    if (error) return { ok: false, error: error.message };
    if (data && (data as any).error) return { ok: false, error: (data as any).error };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Indexing failed' };
  }
}
