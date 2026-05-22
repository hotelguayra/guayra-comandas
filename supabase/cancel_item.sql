-- Migración: cancelación de ítems desde cocina
-- Ejecutar en el SQL Editor de Supabase

-- 1. Añadir columna cancelado a pedido_items
ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS cancelado boolean NOT NULL DEFAULT false;

-- 2. Política para que cocina y admin puedan marcar ítems como cancelados
CREATE POLICY "Cocina y admin actualizan items" ON public.pedido_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.rol IN ('admin', 'cocina')
    )
  );
