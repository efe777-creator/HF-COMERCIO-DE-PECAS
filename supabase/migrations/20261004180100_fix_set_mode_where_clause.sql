-- P0: UPDATE em store_settings exige WHERE (guard Supabase / 21000)

create or replace function public.set_store_inventory_mode(p_mode text)
returns text
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  if not public.is_administrador() then
    raise exception 'Somente administrador pode alterar o modo de estoque' using errcode = '42501';
  end if;
  if p_mode not in ('com_estoque', 'estoque_ficticio', 'sem_estoque') then
    raise exception 'Modo de estoque inválido' using errcode = 'P0001';
  end if;

  update public.store_settings
  set
    inventory_mode = p_mode,
    updated_at = now(),
    updated_by = auth.uid()
  where id is not null;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    insert into public.store_settings (inventory_mode, updated_by)
    values (p_mode, auth.uid());
  end if;

  return (select s.inventory_mode from public.store_settings s limit 1);
end;
$$;

revoke all on function public.set_store_inventory_mode(text) from public;
grant execute on function public.set_store_inventory_mode(text) to authenticated;
