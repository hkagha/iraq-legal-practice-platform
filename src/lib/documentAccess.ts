import { supabase } from '@/integrations/supabase/client';

export async function getDocumentSignedUrl(documentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('document-signed-url', {
    body: { document_id: documentId },
  });

  if (error) {
    throw new Error(error.message || 'Failed to get document URL');
  }

  if (!data?.signedUrl) {
    throw new Error('Document URL was not returned');
  }

  return data.signedUrl as string;
}

export async function downloadDocumentById(documentId: string, fileName: string) {
  const signedUrl = await getDocumentSignedUrl(documentId);
  const anchor = document.createElement('a');
  anchor.href = signedUrl;
  anchor.download = fileName;
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}