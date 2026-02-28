
-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_name_ar TEXT,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  document_category TEXT NOT NULL DEFAULT 'general',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  errand_id UUID REFERENCES public.errands(id) ON DELETE SET NULL,
  folder_path TEXT DEFAULT '/',
  title TEXT,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  tags TEXT[] DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  is_latest_version BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  is_visible_to_client BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  last_accessed_at TIMESTAMPTZ,
  last_accessed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_org ON public.documents(organization_id);
CREATE INDEX idx_documents_client ON public.documents(client_id);
CREATE INDEX idx_documents_case ON public.documents(case_id);
CREATE INDEX idx_documents_errand ON public.documents(errand_id);
CREATE INDEX idx_documents_category ON public.documents(document_category);
CREATE INDEX idx_documents_folder ON public.documents(folder_path);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_created ON public.documents(created_at DESC);
CREATE INDEX idx_documents_parent ON public.documents(parent_document_id);

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Document templates table
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ar',
  content TEXT NOT NULL,
  placeholders JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_templates_org ON public.document_templates(organization_id);
CREATE INDEX idx_doc_templates_category ON public.document_templates(category);

CREATE TRIGGER update_doc_templates_updated_at BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Document activities table
CREATE TABLE public.document_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_activities_document ON public.document_activities(document_id);
CREATE INDEX idx_doc_activities_org ON public.document_activities(organization_id);
CREATE INDEX idx_doc_activities_created ON public.document_activities(created_at DESC);

-- RLS for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_documents" ON public.documents
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_create_documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

CREATE POLICY "staff_update_documents" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

CREATE POLICY "admin_delete_documents" ON public.documents
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) = 'firm_admin'
  );

CREATE POLICY "super_admin_all_documents" ON public.documents
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));

CREATE POLICY "client_view_visible_documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM client_user_links
      WHERE client_user_links.client_id = documents.client_id
        AND client_user_links.user_id = auth.uid()
    )
  );

-- RLS for document_templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_system_doc_templates" ON public.document_templates
  FOR SELECT TO authenticated
  USING (is_system = true);

CREATE POLICY "read_org_doc_templates" ON public.document_templates
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_manage_doc_templates" ON public.document_templates
  FOR ALL TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

CREATE POLICY "super_admin_all_doc_templates" ON public.document_templates
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));

-- RLS for document_activities
ALTER TABLE public.document_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_doc_activities" ON public.document_activities
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_create_doc_activities" ON public.document_activities
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "super_admin_all_doc_activities" ON public.document_activities
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false, 10485760,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/gif','image/webp','text/plain']
);

-- Storage RLS policies
CREATE POLICY "org_users_upload_documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

CREATE POLICY "org_users_read_documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

CREATE POLICY "org_users_delete_documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
    AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

-- Insert system templates
INSERT INTO public.document_templates (name, name_ar, category, language, is_system, content, placeholders) VALUES
('General Power of Attorney', 'توكيل عام', 'power_of_attorney', 'ar', true,
'<div dir="rtl" style="font-family: Noto Sans Arabic; line-height: 2;"><h2 style="text-align: center;">توكيل عام</h2><p>أنا الموقع أدناه {{client_name}} حامل هوية الأحوال المدنية رقم {{national_id}} الصادرة من {{id_issued_from}} بتاريخ {{id_issue_date}}</p><p>وكّلت السيد/السيدة {{attorney_name}} المحامي/المحامية المسجل لدى نقابة المحامين العراقيين بالرقم {{bar_number}}</p><p>لتمثيلي والنيابة عني في {{scope_of_authority}} أمام جميع المحاكم والدوائر الرسمية وشبه الرسمية في جمهورية العراق.</p><p>وقد منحته كافة الصلاحيات اللازمة للقيام بهذه المهمة بما فيها حق التوقيع والمراجعة والمطالبة والمرافعة والطعن.</p><p style="margin-top: 40px;">التاريخ: {{date}}</p><p>التوقيع: ____________________</p><p>{{client_name}}</p></div>',
'[{"key":"client_name","label":"Client Name","label_ar":"اسم الموكل","type":"text","required":true},{"key":"national_id","label":"National ID Number","label_ar":"رقم الهوية","type":"text","required":true},{"key":"id_issued_from","label":"ID Issued From","label_ar":"مكان الإصدار","type":"text","required":true},{"key":"id_issue_date","label":"ID Issue Date","label_ar":"تاريخ الإصدار","type":"date","required":true},{"key":"attorney_name","label":"Attorney Name","label_ar":"اسم المحامي","type":"text","required":true},{"key":"bar_number","label":"Bar Registration Number","label_ar":"رقم تسجيل النقابة","type":"text","required":true},{"key":"scope_of_authority","label":"Scope of Authority","label_ar":"نطاق التوكيل","type":"textarea","required":true},{"key":"date","label":"Date","label_ar":"التاريخ","type":"date","required":true}]'::jsonb),

('Client Engagement Letter', 'خطاب تكليف', 'letter', 'ar', true,
'<div dir="rtl" style="font-family: Noto Sans Arabic; line-height: 2;"><p>التاريخ: {{date}}</p><p>السيد/السيدة {{client_name}} المحترم/ة</p><p>الموضوع: خطاب تكليف — {{case_subject}}</p><p>نشير إلى اجتماعنا بتاريخ {{meeting_date}} بخصوص الموضوع أعلاه، ونؤكد موافقتنا على تولي تمثيلكم القانوني وفقاً للشروط التالية:</p><p><strong>نطاق العمل:</strong> {{scope_of_work}}</p><p><strong>الأتعاب:</strong> {{fee_arrangement}}</p><p><strong>المدة المتوقعة:</strong> {{expected_duration}}</p><p>يرجى التوقيع على نسخة من هذا الخطاب للتأكيد.</p><p style="margin-top: 30px;">مع التقدير،</p><p>{{firm_name}}</p><p>{{attorney_name}}</p></div>',
'[{"key":"date","label":"Date","label_ar":"التاريخ","type":"date","required":true},{"key":"client_name","label":"Client Name","label_ar":"اسم العميل","type":"text","required":true},{"key":"case_subject","label":"Case Subject","label_ar":"موضوع القضية","type":"text","required":true},{"key":"meeting_date","label":"Meeting Date","label_ar":"تاريخ الاجتماع","type":"date","required":true},{"key":"scope_of_work","label":"Scope of Work","label_ar":"نطاق العمل","type":"textarea","required":true},{"key":"fee_arrangement","label":"Fee Arrangement","label_ar":"ترتيب الأتعاب","type":"textarea","required":true},{"key":"expected_duration","label":"Expected Duration","label_ar":"المدة المتوقعة","type":"text","required":false},{"key":"firm_name","label":"Firm Name","label_ar":"اسم المكتب","type":"text","required":true},{"key":"attorney_name","label":"Attorney Name","label_ar":"اسم المحامي","type":"text","required":true}]'::jsonb),

('Simple Contract', 'عقد بسيط', 'contract', 'ar', true,
'<div dir="rtl" style="font-family: Noto Sans Arabic; line-height: 2;"><h2 style="text-align: center;">عقد {{contract_type}}</h2><p>حُرر هذا العقد في {{city}} بتاريخ {{date}} بين كل من:</p><p><strong>الطرف الأول:</strong> {{party_one_name}}، {{party_one_details}}</p><p><strong>الطرف الثاني:</strong> {{party_two_name}}، {{party_two_details}}</p><h3>تمهيد:</h3><p>{{preamble}}</p><h3>البنود:</h3><p>{{terms}}</p><h3>التزامات الطرف الأول:</h3><p>{{party_one_obligations}}</p><h3>التزامات الطرف الثاني:</h3><p>{{party_two_obligations}}</p><h3>مدة العقد:</h3><p>{{contract_duration}}</p><h3>الشروط الجزائية:</h3><p>{{penalty_clause}}</p><h3>حل النزاعات:</h3><p>يتم حل أي نزاع ينشأ عن هذا العقد ودياً، وفي حالة عدم التوصل إلى حل يُحال النزاع إلى محاكم {{jurisdiction}} المختصة.</p><p style="margin-top: 40px;">الطرف الأول: ____________________</p><p>الطرف الثاني: ____________________</p></div>',
'[{"key":"contract_type","label":"Contract Type","label_ar":"نوع العقد","type":"text","required":true},{"key":"city","label":"City","label_ar":"المدينة","type":"text","required":true},{"key":"date","label":"Date","label_ar":"التاريخ","type":"date","required":true},{"key":"party_one_name","label":"Party One Name","label_ar":"اسم الطرف الأول","type":"text","required":true},{"key":"party_one_details","label":"Party One Details","label_ar":"بيانات الطرف الأول","type":"textarea","required":true},{"key":"party_two_name","label":"Party Two Name","label_ar":"اسم الطرف الثاني","type":"text","required":true},{"key":"party_two_details","label":"Party Two Details","label_ar":"بيانات الطرف الثاني","type":"textarea","required":true},{"key":"preamble","label":"Preamble","label_ar":"التمهيد","type":"textarea","required":false},{"key":"terms","label":"Terms","label_ar":"البنود","type":"textarea","required":true},{"key":"party_one_obligations","label":"Party One Obligations","label_ar":"التزامات الطرف الأول","type":"textarea","required":true},{"key":"party_two_obligations","label":"Party Two Obligations","label_ar":"التزامات الطرف الثاني","type":"textarea","required":true},{"key":"contract_duration","label":"Contract Duration","label_ar":"مدة العقد","type":"text","required":true},{"key":"penalty_clause","label":"Penalty Clause","label_ar":"الشروط الجزائية","type":"textarea","required":false},{"key":"jurisdiction","label":"Jurisdiction","label_ar":"الاختصاص القضائي","type":"text","required":true}]'::jsonb);
