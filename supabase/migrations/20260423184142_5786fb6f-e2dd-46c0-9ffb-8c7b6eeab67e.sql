CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or _user_id <> auth.uid() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  return exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid, _environment text DEFAULT 'sandbox'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or _user_id <> auth.uid() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  return exists (
    select 1 from public.subscriptions
    where user_id = _user_id
      and environment = _environment
      and (
        (status in ('active', 'trialing') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end is not null and current_period_end > now())
      )
  );
end;
$function$;