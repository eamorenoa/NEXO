BEGIN;

-- =========================================================
-- 002 - AJUSTE DE PERMISOS
-- NEXO
-- =========================================================

-- Los ciudadanos no deben acceder a estadísticas
-- administrativas.
DELETE FROM role_permissions
WHERE role_id = (
    SELECT id
    FROM roles
    WHERE name = 'citizen'
)
AND permission_id = (
    SELECT id
    FROM permissions
    WHERE code = 'stats.read'
);

COMMIT;