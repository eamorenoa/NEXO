CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'citizen',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS needs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'help',
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  ai_category VARCHAR(40),
  ai_confidence NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS community_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS map_places (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(40) NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  description TEXT
);
INSERT INTO map_places(name,type,latitude,longitude,description) VALUES
('Punto de ayuda vecinal','help',4.7114,-74.0724,'Apoyo comunitario y orientación'),
('Servicio comunitario','service',4.7131,-74.0698,'Información y servicios cercanos'),
('Oportunidad de empleo','job',4.7088,-74.0752,'Oferta de empleo local'),
('Punto de donaciones','donation',4.7097,-74.0689,'Intercambio y donaciones'),
('Reporte comunitario','report',4.7140,-74.0738,'Situación reportada por la comunidad')
ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_needs_created_at ON needs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON community_posts(created_at DESC);
