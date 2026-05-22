-- Migración: tabla de auditoría para ítems eliminados desde recepción
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.items_eliminados (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_nombre      text NOT NULL,
  cantidad             integer NOT NULL,
  precio_unitario      decimal(10,2) NOT NULL,
  valor_total          decimal(10,2) NOT NULL,
  mesa_nombre          text,
  cliente              text,
  eliminado_por        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  eliminado_por_nombre text,
  eliminado_at         timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.items_eliminados ENABLE ROW LEVEL SECURITY;

-- Permisos de tabla al rol authenticated (requerido además de RLS)
GRANT SELECT, INSERT ON public.items_eliminados TO authenticated;

-- Solo admin puede leer el registro de eliminaciones
CREATE POLICY "Admin lee items eliminados" ON public.items_eliminados
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'admin')
  );

-- Recepcion y admin pueden insertar (para que el log se grabe al eliminar)
CREATE POLICY "Recepcion y admin insertan items eliminados" ON public.items_eliminados
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol IN ('admin', 'recepcion'))
  );

-- Política DELETE en pedido_items (incluida aquí para ejecutar todo junto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pedido_items' AND policyname = 'Recepcion y admin eliminan items'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Recepcion y admin eliminan items" ON public.pedido_items
        FOR DELETE USING (
          EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol IN ('admin', 'recepcion'))
        )
    $policy$;
  END IF;
END $$;
