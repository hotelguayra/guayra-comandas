-- ============================================================
-- GUAYRÁ COMANDAS — Migración: rol recepción
-- Pegar en Supabase → SQL Editor → Run
-- ============================================================

-- 1. Actualizar constraint de rol en profiles para incluir 'recepcion'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rol_check
  CHECK (rol IN ('admin', 'cocina', 'mozo', 'recepcion'));

-- 2. Agregar columnas a pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS numero_ticket SERIAL;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS descuento_motivo TEXT;

-- ============================================================
-- 3. RLS — recepcion puede leer su propio perfil
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Recepcion ve su perfil' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Recepcion ve su perfil" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END;
$$;

-- ============================================================
-- 4. RLS — mesas: recepcion puede leer y actualizar
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Recepcion actualiza mesas' AND tablename = 'mesas'
  ) THEN
    CREATE POLICY "Recepcion actualiza mesas" ON public.mesas
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND rol = 'recepcion'
        )
      );
  END IF;
END;
$$;

-- ============================================================
-- 5. RLS — pedidos: recepcion puede leer todos y actualizar (descuento)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Recepcion lee todos los pedidos' AND tablename = 'pedidos'
  ) THEN
    CREATE POLICY "Recepcion lee todos los pedidos" ON public.pedidos
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND rol = 'recepcion'
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Recepcion actualiza pedidos' AND tablename = 'pedidos'
  ) THEN
    CREATE POLICY "Recepcion actualiza pedidos" ON public.pedidos
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND rol = 'recepcion'
        )
      );
  END IF;
END;
$$;

-- ============================================================
-- 6. RLS — pedido_items: recepcion puede leer todos
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Recepcion lee pedido_items' AND tablename = 'pedido_items'
  ) THEN
    CREATE POLICY "Recepcion lee pedido_items" ON public.pedido_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND rol = 'recepcion'
        )
      );
  END IF;
END;
$$;

-- ============================================================
-- 7. RLS — productos: recepcion puede leer todos (incluso no disponibles)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Recepcion lee productos' AND tablename = 'productos'
  ) THEN
    CREATE POLICY "Recepcion lee productos" ON public.productos
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND rol = 'recepcion'
        )
      );
  END IF;
END;
$$;

-- ============================================================
-- 8. Permisos sobre la secuencia de numero_ticket
--    Sin esto el rol authenticated no puede hacer INSERT en pedidos
-- ============================================================
GRANT USAGE, SELECT ON SEQUENCE public.pedidos_numero_ticket_seq TO authenticated;

-- ============================================================
-- Verificación final
-- ============================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pedidos'
  AND column_name IN ('numero_ticket', 'descuento_porcentaje', 'descuento_motivo');
