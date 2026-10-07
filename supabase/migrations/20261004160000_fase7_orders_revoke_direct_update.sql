-- F7 P1: impedir UPDATE direto em orders via PostgREST/JWT.
-- Mutações de status e campos operacionais devem passar pelas RPCs SECURITY DEFINER
-- (transition_order_status, finalize_order_confirmation, ship_order, deliver_order, etc.).

drop policy if exists orders_update_staff on public.orders;

revoke update on public.orders from authenticated;
revoke update on public.orders from anon;
