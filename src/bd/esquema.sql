-- Modelo de datos de Autobahn. Los montos se guardan en centavos enteros y las fechas como
-- texto ISO (AAAA-MM-DD o AAAA-MM-DDTHH:MM:SS, hora de Panama).

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY,
  rol TEXT NOT NULL CHECK (rol IN ('cliente', 'administrador')),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  cedula TEXT NOT NULL UNIQUE,
  fecha_nacimiento TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE COLLATE NOCASE,
  hash_contrasena TEXT NOT NULL,
  creado_en TEXT NOT NULL
);

-- Un auto nuevo es del inventario de Autobahn (sin vendedor); uno usado lo publica un cliente.
CREATE TABLE IF NOT EXISTS autos (
  id INTEGER PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  condicion TEXT NOT NULL CHECK (condicion IN ('nuevo', 'usado')),
  marca TEXT NOT NULL CHECK (marca IN ('Audi', 'BMW', 'Mercedes-Benz', 'Porsche', 'Volkswagen')),
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  kilometraje INTEGER NOT NULL CHECK (kilometraje >= 0),
  precio_centavos INTEGER NOT NULL CHECK (precio_centavos > 0),
  transmision TEXT NOT NULL CHECK (transmision IN ('automatica', 'manual')),
  combustible TEXT NOT NULL CHECK (combustible IN ('gasolina', 'diesel', 'hibrido', 'electrico')),
  color TEXT NOT NULL,
  motor TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('en_revision', 'disponible', 'rechazada')),
  vendedor_id INTEGER REFERENCES usuarios (id),
  motivo_rechazo TEXT,
  revisado_por INTEGER REFERENCES usuarios (id),
  revisado_en TEXT,
  creado_en TEXT NOT NULL,
  CHECK ((condicion = 'nuevo') = (vendedor_id IS NULL))
);

CREATE INDEX IF NOT EXISTS autos_catalogo ON autos (estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS autos_vendedor ON autos (vendedor_id, estado);

CREATE TABLE IF NOT EXISTS fotos (
  id INTEGER PRIMARY KEY,
  auto_id INTEGER NOT NULL REFERENCES autos (id) ON DELETE CASCADE,
  ruta TEXT NOT NULL,
  orden INTEGER NOT NULL
);

-- Pruebas de manejo (RF-07). Un auto no puede tener dos citas en el mismo bloque (RN-09).
CREATE TABLE IF NOT EXISTS citas (
  id INTEGER PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  auto_id INTEGER NOT NULL REFERENCES autos (id),
  cliente_id INTEGER NOT NULL REFERENCES usuarios (id),
  fecha TEXT NOT NULL,
  hora INTEGER NOT NULL CHECK (hora BETWEEN 9 AND 16),
  vencimiento_licencia TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('programada')),
  creado_en TEXT NOT NULL,
  UNIQUE (auto_id, fecha, hora)
);

-- Ofertas por autos usados (RF-08).
CREATE TABLE IF NOT EXISTS ofertas (
  id INTEGER PRIMARY KEY,
  auto_id INTEGER NOT NULL REFERENCES autos (id),
  cliente_id INTEGER NOT NULL REFERENCES usuarios (id),
  monto_centavos INTEGER NOT NULL CHECK (monto_centavos > 0),
  mensaje TEXT,
  estado TEXT NOT NULL CHECK (estado IN ('pendiente')),
  creado_en TEXT NOT NULL
);
