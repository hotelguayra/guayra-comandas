-- Panel Estados: estado independiente por panel en cada pedido
-- Ejecutar completo en Supabase SQL Editor

DROP TABLE IF EXISTS public.pedido_panel_estados CASCADE;
DROP FUNCTION IF EXISTS public.sync_pedido_desde_paneles() CASCADE;
DROP FUNCTION IF EXISTS public.update_panel_estado_updated_at() CASCADE;

CREATE TABLE public.pedido_panel_estados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  panel text NOT NULL CHECK (panel IN ('cocina', 'postres')),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pedido_id, panel)
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.pedido_panel_estados TO anon;
GRANT ALL PRIVILEGES ON public.pedido_panel_estados TO authenticated;
GRANT ALL PRIVILEGES ON public.pedido_panel_estados TO service_role;

ALTER TABLE public.pedido_panel_estados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_all" ON public.pedido_panel_estados AS PERMISSIVE FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_panel_estado_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER panel_estados_updated_at
  BEFORE UPDATE ON public.pedido_panel_estados
  FOR EACH ROW EXECUTE FUNCTION public.update_panel_estado_updated_at();

CREATE OR REPLACE FUNCTION public.sync_pedido_desde_paneles()
RETURNS TRIGGER AS $$
DECLARE
  nuevo_estado text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.pedido_panel_estados
    WHERE pedido_id = NEW.pedido_id AND estado NOT IN ('entregado', 'cancelado')
  ) THEN
    nuevo_estado := 'entregado';
  ELSIF EXISTS (
    SELECT 1 FROM public.pedido_panel_estados
    WHERE pedido_id = NEW.pedido_id AND estado = 'listo'
  ) THEN
    nuevo_estado := 'listo';
  ELSIF EXISTS (
    SELECT 1 FROM public.pedido_panel_estados
    WHERE pedido_id = NEW.pedido_id AND estado = 'en_preparacion'
  ) THEN
    nuevo_estado := 'en_preparacion';
  ELSE
    nuevo_estado := 'pendiente';
  END IF;

  UPDATE public.pedidos SET estado = nuevo_estado, updated_at = now() WHERE id = NEW.pedido_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER pedido_panel_estados_sync
  AFTER INSERT OR UPDATE ON public.pedido_panel_estados
  FOR EACH ROW EXECUTE FUNCTION public.sync_pedido_desde_paneles();

ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_panel_estados;

INSERT INTO public.pedido_panel_estados (pedido_id, panel, estado)
SELECT DISTINCT pi.pedido_id, pr.panel, p.estado
FROM public.pedido_items pi
JOIN public.productos pr ON pr.id = pi.producto_id
JOIN public.pedidos p ON p.id = pi.pedido_id
WHERE pr.panel IS NOT NULL AND p.estado NOT IN ('entregado', 'cancelado')
ON CONFLICT (pedido_id, panel) DO NOTHING;
