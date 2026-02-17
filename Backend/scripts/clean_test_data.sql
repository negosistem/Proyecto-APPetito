-- Script SQL para limpieza manual si prefieres ejecutarlo directo en PostgreSQL
-- IMPORTANTE: Ejecuta línea por línea y verifica antes de confirmar

-- Ver datos actuales
SELECT 'Órdenes:' as tipo, COUNT(*) as cantidad FROM orders
UNION ALL
SELECT 'Pagos:', COUNT(*) FROM payments
UNION ALL
SELECT 'Mesas ocupadas:', COUNT(*) FROM tables WHERE status != 'available';

-- DESCOMENTAR LAS SIGUIENTES LÍNEAS SOLO SI ESTÁS SEGURO:

-- BEGIN; -- Iniciar transacción

-- -- 1. Eliminar pagos primero (FK constraint)
-- DELETE FROM payments;
-- 
-- -- 2. Eliminar items de órdenes
-- DELETE FROM order_items;
-- 
-- -- 3. Eliminar órdenes
-- DELETE FROM orders;
-- 
-- -- 4. Resetear mesas
-- UPDATE tables SET status = 'available', current_order_id = NULL;
-- 
-- -- 5. Resetear secuencias
-- ALTER SEQUENCE orders_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
-- 
-- COMMIT; -- Confirmar cambios

-- Si algo sale mal, ejecuta:
-- ROLLBACK;
