-- Migración: permite a recepcion y admin eliminar ítems de pedidos para ajuste de ticket
-- Ejecutar en el SQL Editor de Supabase

CREATE POLICY "Recepcion y admin eliminan items" ON public.pedido_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.rol IN ('admin', 'recepcion')
    )
  );
