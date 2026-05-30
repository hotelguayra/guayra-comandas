-- Reposición automática de stock a las 3:00 AM (hora Argentina, UTC-3 = 06:00 UTC)
-- Solo resetea disponibilidad. Los faltantes (nota_stock, nota_stock_fecha) son manuales.

-- Eliminar jobs duplicados si existen
SELECT cron.unschedule('reset-stock-diario') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'reset-stock-diario'
);
SELECT cron.unschedule('reponer-stock-diario') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'reponer-stock-diario'
);

-- Job único: repone solo disponibilidad
SELECT cron.schedule(
  'reponer-stock-diario',
  '0 6 * * *',
  'UPDATE public.productos SET disponible = true WHERE disponible = false'
);
