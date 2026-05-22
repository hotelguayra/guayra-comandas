-- ============================================================
-- FIX: Mozos pueden ver todos los pedidos de su mesa activa
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1. Política de pedidos: mozo ve pedidos propios + pedidos de mesas que gestiona
DROP POLICY IF EXISTS "Mozos ven sus pedidos" ON public.pedidos;

CREATE POLICY "Mozos ven sus pedidos" ON public.pedidos
  FOR SELECT USING (
    mozo_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mesas m
      WHERE m.id = pedidos.mesa_id
        AND m.mozo_activo_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('admin', 'cocina', 'recepcion')
    )
  );

-- 2. Política de pedido_items: misma lógica extendida
DROP POLICY IF EXISTS "Usuarios ven items de sus pedidos" ON public.pedido_items;

CREATE POLICY "Usuarios ven items de sus pedidos" ON public.pedido_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pedidos pd
      WHERE pd.id = pedido_id AND (
        pd.mozo_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.mesas m
          WHERE m.id = pd.mesa_id
            AND m.mozo_activo_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.rol IN ('admin', 'cocina', 'recepcion')
        )
      )
    )
  );
