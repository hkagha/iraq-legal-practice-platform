
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create notification preferences if the user has a valid organization_id
  IF NEW.organization_id IS NOT NULL THEN
    INSERT INTO public.notification_preferences (user_id, organization_id)
    VALUES (NEW.id, NEW.organization_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
