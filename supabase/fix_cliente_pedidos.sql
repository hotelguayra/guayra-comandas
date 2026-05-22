-- ============================================================
-- FIX: Guardar el cliente directamente en cada pedido
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- Agrega la columna cliente a pedidos para historial permanente
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS cliente text;
