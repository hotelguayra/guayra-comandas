-- Resetea disponibilidad y faltantes de todos los productos a las 3:00 AM (hora Argentina, UTC-3)
-- Equivale a las 06:00 UTC en horario de verano / 06:00 UTC todo el año (Argentina no usa DST)

-- Eliminar si ya existe (para poder re-ejecutar la migración sin error)
SELECT cron.unschedule('reset-stock-diario') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'reset-stock-diario'
);

SELECT cron.schedule(
  'reset-stock-diario',
  '0 6 * * *',
  $$
    UPDATE public.productos
    SET
      disponible        = true,
      nota_stock        = null,
      nota_stock_fecha  = null
    WHERE
      disponible = false
      OR nota_stock IS NOT NULL
      OR nota_stock_fecha IS NOT NULL;
  $$
);
