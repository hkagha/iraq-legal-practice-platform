import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BodySchema = z.object({
  document_id: z.string().uuid(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: 'Function is not configured correctly' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Not authenticated' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      return json({ error: 'Invalid token' }, 401);
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }

    const { document_id } = parsed.data;

    const { data: document, error: documentError } = await userClient
      .from('documents')
      .select('id, file_name, file_path')
      .eq('id', document_id)
      .eq('status', 'active')
      .maybeSingle();

    if (documentError) {
      return json({ error: documentError.message }, 400);
    }

    if (!document?.file_path) {
      return json({ error: 'Document not found or access denied' }, 404);
    }

    const { data: signed, error: signedError } = await adminClient.storage
      .from('documents')
      .createSignedUrl(document.file_path, 600);

    if (signedError || !signed?.signedUrl) {
      return json({ error: signedError?.message || 'Failed to create signed URL' }, 500);
    }

    return json({
      signedUrl: signed.signedUrl,
      fileName: document.file_name,
    });
  } catch (error) {
    console.error('document-signed-url failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});