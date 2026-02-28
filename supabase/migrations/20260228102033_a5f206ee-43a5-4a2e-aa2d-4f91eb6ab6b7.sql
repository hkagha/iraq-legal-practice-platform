
-- Create storage bucket for errand documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('errand-documents', 'errand-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their org's folder
CREATE POLICY "staff_upload_errand_docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'errand-documents'
  AND (storage.foldername(name))[1] = 'organizations'
);

-- Allow authenticated users to read from their org's folder
CREATE POLICY "staff_read_errand_docs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'errand-documents'
);

-- Allow authenticated users to delete their org's files
CREATE POLICY "staff_delete_errand_docs" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'errand-documents'
);
