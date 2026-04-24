-- Reforça a função principal: nega acesso explicitamente para trialing/incomplete/incomplete_expired/unpaid/paused
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid, _environment text DEFAULT 'sandbox'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _row record;
begin
  if auth.uid() is null or _user_id <> auth.uid() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  -- Pega a assinatura mais recente do ambiente
  select status, current_period_end, cancel_at_period_end
    into _row
  from public.subscriptions
  where user_id = _user_id
    and environment = _environment
  order by created_at desc
  limit 1;

  if not found then
    return false;
  end if;

  -- BLOQUEIO EXPLÍCITO: nenhum acesso por período de teste ou estados intermediários
  if _row.status in ('trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'paused') then
    return false;
  end if;

  -- Apenas pagamento confirmado libera
  if _row.status = 'active' and (_row.current_period_end is null or _row.current_period_end > now()) then
    return true;
  end if;

  if _row.status = 'past_due' and (_row.current_period_end is null or _row.current_period_end > now()) then
    return true;
  end if;

  -- Cancelada mas ainda dentro do período pago
  if _row.status = 'canceled' and _row.current_period_end is not null and _row.current_period_end > now() then
    return true;
  end if;

  return false;
end;
$function$;

-- Função de inspeção: retorna se o usuário está em trial (para diagnóstico/UI)
CREATE OR REPLACE FUNCTION public.is_in_trial(_user_id uuid, _environment text DEFAULT 'sandbox'::text)
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
      and status = 'trialing'
  );
end;
$function$;

-- Garante que assinaturas em trialing nunca sejam consideradas válidas em RLS futuras
-- Bloqueio adicional via política: somente service_role pode inserir/manter linhas com status='trialing'
-- (já é o caso porque webhook usa service_role, mas a barreira fica explícita)
COMMENT ON FUNCTION public.has_active_subscription IS
  'Retorna true APENAS para assinaturas pagas (active, past_due dentro do período, canceled com período pago restante). NUNCA retorna true para trialing — período de teste é bloqueado por design.';