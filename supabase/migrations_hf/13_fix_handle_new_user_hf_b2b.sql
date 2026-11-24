-- Gate 01: handle_new_user alinhado ao B2B HF (customers sem profile_id/cpf).
-- Profile customer; vínculo B2B via customer_users (admin).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  insert into public.profiles (
    id,
    username,
    full_name,
    phone,
    role,
    verification_grace_ends_at,
    account_verified_at
  )
  values (
    new.id,
    nullif(lower(trim(coalesce(new.raw_user_meta_data ->> 'username', ''))), ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'customer',
    now() + interval '48 hours',
    case when new.email_confirmed_at is not null then new.email_confirmed_at else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

comment on function public.handle_new_user() is
  'HF Gate 01: cria profile customer; B2B via customer_users (sem customers.profile_id).';
