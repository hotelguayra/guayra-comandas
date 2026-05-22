-- Migración: columna fila en categorias para controlar en qué fila aparece en el menú del mozo
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS fila integer NOT NULL DEFAULT 1
  CHECK (fila IN (1, 2));

-- Permisos completos en subcategorias para usuarios autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategorias TO authenticated;

-- Si RLS está habilitado en subcategorias, agregar política permisiva para admin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'subcategorias' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    EXECUTE $p$
      CREATE POLICY IF NOT EXISTS "Todos leen subcategorias" ON public.subcategorias
        FOR SELECT USING (true);
      CREATE POLICY IF NOT EXISTS "Admin gestiona subcategorias" ON public.subcategorias
        FOR ALL USING (
          EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'admin')
        )
    $p$;
  END IF;
END $$;
