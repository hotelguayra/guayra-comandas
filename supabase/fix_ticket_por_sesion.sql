-- ============================================================
-- FIX: Un número de ticket por sesión de mesa (no por pedido)
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1. Crea la secuencia si no existe y la posiciona después del máximo actual
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'public' AND sequencename = 'ticket_numero_seq'
  ) THEN
    CREATE SEQUENCE public.ticket_numero_seq START WITH 1;
  END IF;

  -- Avanza la secuencia al máximo existente para no colisionar con tickets ya emitidos
  PERFORM setval(
    'public.ticket_numero_seq',
    COALESCE((SELECT MAX(numero_ticket) FROM public.pedidos), 0) + 1,
    false
  );
END
$$;

-- 2. Función que asigna o comparte el ticket dentro de la sesión activa de una mesa
CREATE OR REPLACE FUNCTION public.assign_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  existing_ticket integer;
  mesa_abierta    timestamptz;
BEGIN
  -- Obtiene el timestamp de apertura de esta sesión de mesa
  SELECT abierta_at INTO mesa_abierta
  FROM public.mesas
  WHERE id = NEW.mesa_id;

  -- Busca si esta sesión ya tiene un ticket asignado
  SELECT numero_ticket INTO existing_ticket
  FROM public.pedidos
  WHERE mesa_id = NEW.mesa_id
    AND numero_ticket IS NOT NULL
    AND (mesa_abierta IS NULL OR created_at >= mesa_abierta)
  ORDER BY created_at ASC
  LIMIT 1;

  IF existing_ticket IS NOT NULL THEN
    -- Reutiliza el ticket de esta sesión
    NEW.numero_ticket := existing_ticket;
  ELSE
    -- Primera pedido de la sesión: genera ticket nuevo
    NEW.numero_ticket := nextval('public.ticket_numero_seq');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recrea el trigger (reemplaza cualquier versión anterior)
DROP TRIGGER IF EXISTS pedidos_assign_ticket ON public.pedidos;

CREATE TRIGGER pedidos_assign_ticket
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW
  WHEN (NEW.numero_ticket IS NULL)
  EXECUTE FUNCTION public.assign_ticket_number();
