-- ============================================
-- GUAYRÁ COMANDAS — Funciones RPC
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Transferir todas las mesas y pedidos activos de un mozo a otro (cambio de turno).
-- SECURITY DEFINER permite actualizar mozo_id en pedidos sin violar RLS.
create or replace function transferir_mesas_a_mozo(
  from_mozo_id uuid,
  to_mozo_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Transferir pedidos activos al nuevo mozo
  update pedidos
  set mozo_id = to_mozo_id
  where mesa_id in (
    select id from mesas where mozo_activo_id = from_mozo_id
  )
  and estado in ('pendiente', 'en_preparacion', 'listo');

  -- Transferir las mesas al nuevo mozo
  update mesas
  set mozo_activo_id = to_mozo_id
  where mozo_activo_id = from_mozo_id;
end;
$$;
