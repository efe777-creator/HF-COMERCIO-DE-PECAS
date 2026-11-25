-- HF: customers.assigned_price_list_id (espelho do delta dated migrations/).
-- Cascata app: assigned → public/default. RPC resolve_* completa = opcional se overrides existirem.
-- Aplicar no remoto só com autorização explícita (ou via MCP).

alter table public.customers
  add column if not exists assigned_price_list_id uuid
    references public.price_lists (id) on delete set null;

comment on column public.customers.assigned_price_list_id is
  'Lista scope=assigned do cliente B2B. App: assigned → public/default.';

create index if not exists customers_assigned_price_list_idx
  on public.customers (assigned_price_list_id)
  where assigned_price_list_id is not null;

create or replace function public.enforce_customer_assigned_price_list_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text;
begin
  if tg_op = 'UPDATE'
     and new.assigned_price_list_id is distinct from old.assigned_price_list_id
     and not public.is_staff()
  then
    raise exception 'apenas staff pode alterar assigned_price_list_id';
  end if;

  if new.assigned_price_list_id is null then
    return new;
  end if;
  select scope into v_scope from public.price_lists where id = new.assigned_price_list_id;
  if v_scope is distinct from 'assigned' then
    raise exception 'customers.assigned_price_list_id deve apontar para lista scope=assigned';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_customer_assigned_price_list_scope on public.customers;
create trigger trg_enforce_customer_assigned_price_list_scope
  before insert or update of assigned_price_list_id on public.customers
  for each row execute function public.enforce_customer_assigned_price_list_scope();
