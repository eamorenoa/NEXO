BEGIN;

-- =========================================================
-- 001 - ROLES Y PERMISOS
-- NEXO
-- =========================================================

-- ---------------------------------------------------------
-- ROLES
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- PERMISOS
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- RELACIÓN ROLES <-> PERMISOS
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (role_id, permission_id)
);

-- ---------------------------------------------------------
-- ROLES INICIALES
-- ---------------------------------------------------------

INSERT INTO roles (name, description)
VALUES
    ('citizen', 'Usuario ciudadano de NEXO'),
    ('communityAdmin', 'Administrador de la comunidad'),
    ('institution', 'Usuario perteneciente a una institución')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------
-- PERMISOS INICIALES
-- ---------------------------------------------------------

INSERT INTO permissions (code, description)
VALUES
    ('profile.read', 'Consultar el perfil propio'),
    ('profile.update', 'Actualizar el perfil propio'),

    ('needs.read', 'Consultar necesidades'),
    ('needs.create', 'Crear necesidades'),
    ('needs.update.own', 'Actualizar necesidades propias'),
    ('needs.delete.own', 'Eliminar necesidades propias'),

    ('community.read', 'Consultar publicaciones de la comunidad'),
    ('community.create', 'Crear publicaciones'),
    ('community.update.own', 'Actualizar publicaciones propias'),
    ('community.delete.own', 'Eliminar publicaciones propias'),
    ('community.moderate', 'Moderar publicaciones'),

    ('map.read', 'Consultar lugares del mapa'),
    ('map.create', 'Crear lugares del mapa'),
    ('map.update', 'Actualizar lugares del mapa'),
    ('map.delete', 'Eliminar lugares del mapa'),
    ('map.moderate', 'Moderar lugares del mapa'),

    ('reports.create', 'Crear reportes'),
    ('reports.read', 'Consultar reportes'),
    ('reports.manage', 'Gestionar reportes'),

    ('users.read', 'Consultar usuarios'),
    ('users.manage', 'Gestionar usuarios'),

    ('stats.read', 'Consultar estadísticas'),

    ('admin.access', 'Acceder a funciones administrativas')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------
-- PERMISOS DEL CIUDADANO
-- ---------------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'citizen'
AND p.code IN (
    'profile.read',
    'profile.update',

    'needs.read',
    'needs.create',
    'needs.update.own',
    'needs.delete.own',

    'community.read',
    'community.create',
    'community.update.own',
    'community.delete.own',

    'map.read',

    'reports.create'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------
-- PERMISOS DEL ADMINISTRADOR COMUNITARIO
-- ---------------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'communityAdmin'
AND p.code IN (
    'profile.read',
    'profile.update',

    'needs.read',
    'needs.create',
    'needs.update.own',
    'needs.delete.own',

    'community.read',
    'community.create',
    'community.update.own',
    'community.delete.own',
    'community.moderate',

    'map.read',
    'map.create',
    'map.update',
    'map.delete',
    'map.moderate',

    'reports.create',
    'reports.read',
    'reports.manage',

    'users.read',

    'stats.read',

    'admin.access'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------
-- PERMISOS DE INSTITUCIÓN
-- ---------------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'institution'
AND p.code IN (
    'profile.read',
    'profile.update',

    'needs.read',
    'needs.create',

    'community.read',
    'community.create',

    'map.read',

    'reports.create',

    'stats.read'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------
-- RELACIÓN users.role -> roles.name
-- ---------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_role'
    ) THEN

        ALTER TABLE users
        ADD CONSTRAINT fk_users_role
        FOREIGN KEY (role)
        REFERENCES roles(name)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;

    END IF;
END
$$;

-- ---------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role
ON role_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
ON role_permissions(permission_id);

COMMIT;