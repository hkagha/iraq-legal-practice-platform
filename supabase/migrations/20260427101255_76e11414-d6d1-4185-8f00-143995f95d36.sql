-- Phase 1: auth users + organizations + staff profiles
CREATE TEMP TABLE _staff(idx int, role text, fn text, ln text, fn_ar text, ln_ar text, email text, auth_id uuid) ON COMMIT DROP;
INSERT INTO _staff(idx,role,fn,ln,fn_ar,ln_ar,email) VALUES
  (1,'firm_admin','Yousif','Al-Najjar','يوسف','النجار','yousif.alnajjar@baghdadtest.qanuni'),
  (2,'lawyer','Ahmed','Al-Tamimi','أحمد','التميمي','ahmed.altamimi@baghdadtest.qanuni'),
  (3,'lawyer','Hassan','Al-Obeidi','حسن','العبيدي','hassan.alobeidi@baghdadtest.qanuni'),
  (4,'lawyer','Layla','Al-Karbalai','ليلى','الكربلائي','layla.alkarbalai@baghdadtest.qanuni'),
  (5,'lawyer','Noor','Al-Hashimi','نور','الهاشمي','noor.alhashimi@baghdadtest.qanuni'),
  (6,'paralegal','Omar','Al-Saadi','عمر','الساعدي','omar.alsaadi@baghdadtest.qanuni'),
  (7,'paralegal','Zainab','Al-Rubaie','زينب','الربيعي','zainab.alrubaie@baghdadtest.qanuni'),
  (8,'paralegal','Mariam','Al-Janabi','مريم','الجنابي','mariam.aljanabi@baghdadtest.qanuni'),
  (9,'secretary','Hiba','Al-Dulaimi','هبة','الدليمي','hiba.aldulaimi@baghdadtest.qanuni'),
  (10,'secretary','Sara','Al-Mosawi','سارة','الموسوي','sara.almosawi@baghdadtest.qanuni'),
  (11,'accountant','Karim','Al-Azzawi','كريم','العزاوي','karim.alazzawi@baghdadtest.qanuni');

DO $$
DECLARE r record; uid uuid;
BEGIN
  FOR r IN SELECT * FROM _staff ORDER BY idx LOOP
    uid := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    VALUES('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',r.email,
      extensions.crypt('TestPass2026!',extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name',r.fn,'last_name',r.ln,'role',r.role),
      now(),now(),'','','','');
    INSERT INTO auth.identities(id,user_id,identity_data,provider,provider_id,last_sign_in_at,created_at,updated_at)
    VALUES(gen_random_uuid(),uid,jsonb_build_object('sub',uid::text,'email',r.email),'email',uid::text,now(),now(),now());
    UPDATE _staff SET auth_id=uid WHERE idx=r.idx;
  END LOOP;
END $$;

-- Erbil admin
CREATE TEMP TABLE _erbil_admin(auth_id uuid) ON COMMIT DROP;
DO $$
DECLARE uid uuid;
BEGIN
  uid := gen_random_uuid();
  INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
  VALUES('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated','admin@erbiltest.qanuni',
    extensions.crypt('TestPass2026!',extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Bahar","last_name":"Barzani","role":"firm_admin"}'::jsonb,
    now(),now(),'','','','');
  INSERT INTO auth.identities(id,user_id,identity_data,provider,provider_id,last_sign_in_at,created_at,updated_at)
  VALUES(gen_random_uuid(),uid,jsonb_build_object('sub',uid::text,'email','admin@erbiltest.qanuni'),'email',uid::text,now(),now(),now());
  INSERT INTO _erbil_admin VALUES(uid);
END $$;

-- Portal users
CREATE TEMP TABLE _portal_auth(idx int, email text, full_name text, full_name_ar text, auth_id uuid) ON COMMIT DROP;
INSERT INTO _portal_auth(idx,email,full_name,full_name_ar) VALUES
 (1,'client1@portaltest.qanuni','Hussein Al-Tamimi','حسين التميمي'),
 (2,'client2@portaltest.qanuni','Yousif Al-Hashimi','يوسف الهاشمي'),
 (3,'client3@portaltest.qanuni','Hassan Al-Rubaie','حسن الربيعي'),
 (4,'client4@portaltest.qanuni','Hussein Al-Janabi','حسين الجنابي'),
 (5,'client5@portaltest.qanuni','Rana Al-Maliki','رنا المالكي'),
 (6,'client6@portaltest.qanuni','Mohammed Al-Tamimi','محمد التميمي'),
 (7,'client7@portaltest.qanuni','Ahmed Al-Mosawi','أحمد الموسوي'),
 (8,'client8@portaltest.qanuni','Hassan Al-Tamimi','حسن التميمي'),
 (9,'client9@portaltest.qanuni','Sara Al-Mosawi','سارة الموسوي'),
 (10,'client10@portaltest.qanuni','Sara Al-Maliki','سارة المالكي'),
 (11,'client11@portaltest.qanuni','Hassan Al-Khafaji','حسن الخفاجي'),
 (12,'client12@portaltest.qanuni','Rana Al-Dulaimi','رنا الدليمي'),
 (13,'client13@portaltest.qanuni','Ali Al-Karbalai','علي الكربلائي'),
 (14,'client14@portaltest.qanuni','Layla Al-Najjar','ليلى النجار'),
 (15,'client15@portaltest.qanuni','Yousif Al-Rubaie','يوسف الربيعي');

DO $$
DECLARE r record; uid uuid;
BEGIN
  FOR r IN SELECT * FROM _portal_auth ORDER BY idx LOOP
    uid := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    VALUES('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',r.email,
      extensions.crypt('ClientPass2026!',extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name',r.full_name,'portal_user',true),
      now(),now(),'','','','');
    INSERT INTO auth.identities(id,user_id,identity_data,provider,provider_id,last_sign_in_at,created_at,updated_at)
    VALUES(gen_random_uuid(),uid,jsonb_build_object('sub',uid::text,'email',r.email),'email',uid::text,now(),now(),now());
    UPDATE _portal_auth SET auth_id=uid WHERE idx=r.idx;
  END LOOP;
END $$;

-- Organizations
CREATE TEMP TABLE _orgs(label text, id uuid) ON COMMIT DROP;
WITH ins AS (
  INSERT INTO public.organizations
    (name,name_ar,slug,governorate,city,city_ar,subscription_tier,subscription_status,
     max_users,max_storage_mb,default_language,default_currency,
     ai_enabled,ai_provider,ai_platform_disabled_by_admin,ai_fallback_to_platform,is_active,
     case_prefix,errand_prefix,invoice_prefix)
  VALUES('Baghdad Test Legal','بغداد للمحاماة القانونية','baghdad-test-legal-'||substr(gen_random_uuid()::text,1,8),
    'Baghdad','Baghdad','بغداد','professional','active',20,10240,'en','IQD',
    true,'lovable',false,true,true,'BTL','BTE','BTI')
  RETURNING id)
INSERT INTO _orgs SELECT 'baghdad', id FROM ins;

WITH ins AS (
  INSERT INTO public.organizations
    (name,name_ar,slug,governorate,city,city_ar,subscription_tier,subscription_status,
     max_users,max_storage_mb,default_language,default_currency,
     ai_enabled,ai_provider,ai_platform_disabled_by_admin,ai_fallback_to_platform,is_active,
     case_prefix,errand_prefix,invoice_prefix)
  VALUES('Erbil Test Legal','أربيل للمحاماة القانونية','erbil-test-legal-'||substr(gen_random_uuid()::text,1,8),
    'Erbil','Erbil','أربيل','starter','active',5,5120,'en','IQD',
    true,'lovable',false,true,true,'ETL','ETE','ETI')
  RETURNING id)
INSERT INTO _orgs SELECT 'erbil', id FROM ins;

-- Update auto-created staff profiles with organization + Arabic names
UPDATE public.profiles p
SET organization_id = (SELECT id FROM _orgs WHERE label='baghdad'),
    first_name_ar = s.fn_ar,
    last_name_ar  = s.ln_ar,
    language_preference = 'en',
    is_active = true,
    onboarding_completed = true
FROM _staff s
WHERE p.id = s.auth_id;

UPDATE public.profiles p
SET organization_id = (SELECT id FROM _orgs WHERE label='erbil'),
    first_name_ar = 'بهار',
    last_name_ar  = 'بارزاني',
    language_preference = 'en',
    is_active = true,
    onboarding_completed = true
WHERE p.id = (SELECT auth_id FROM _erbil_admin);

-- Portal users (NOT in profiles — they're in portal_users table; the trigger created profiles for them too, which is harmless but let's deactivate those rogue profiles since portal users shouldn't have firm-staff profiles)
UPDATE public.profiles SET is_active = false, role = 'lawyer'
WHERE id IN (SELECT auth_id FROM _portal_auth);

INSERT INTO public.portal_users(auth_user_id,email,full_name,full_name_ar,preferred_language)
SELECT auth_id, email, full_name, full_name_ar, 'en' FROM _portal_auth;

-- Capture IDs for phase 2 in a permanent staging table (we'll drop it at end of phase 3)
CREATE TABLE IF NOT EXISTS public._seed_staging_baghdad (
  kind text, idx int, ref_id uuid
);
INSERT INTO public._seed_staging_baghdad
  SELECT 'org', 1, id FROM _orgs WHERE label='baghdad'
  UNION ALL SELECT 'org', 2, id FROM _orgs WHERE label='erbil'
  UNION ALL SELECT 'staff', idx, auth_id FROM _staff
  UNION ALL SELECT 'erbil_admin', 1, auth_id FROM _erbil_admin
  UNION ALL SELECT 'portal', idx, auth_id FROM _portal_auth;

SELECT 'Phase 1 complete' AS status,
  (SELECT count(*) FROM public.profiles WHERE organization_id IN (SELECT ref_id FROM public._seed_staging_baghdad WHERE kind='org')) AS profile_count,
  (SELECT count(*) FROM public.portal_users WHERE email LIKE '%@portaltest.qanuni') AS portal_count;