// Publicaciones de autos usados (RF-05).
const fs = require('node:fs');
const path = require('node:path');

// RN-07: cuentan las publicaciones En revision y las Disponible
function contarActivasDe(db, vendedorId) {
  return db.prepare(`SELECT COUNT(*) AS n FROM autos
                     WHERE vendedor_id = ? AND estado IN ('en_revision', 'disponible')`).get(vendedorId).n;
}

// Guarda el auto En revision y sus fotos en una sola transaccion. Las fotos se escriben con un nombre
// propio (au-0041-1.jpg), nunca con el que trae el archivo; si algo falla, se borran las ya escritas.
function crearPublicacion(db, { vendedorId, auto, fotos, creadoEn, carpetaSubidas }) {
  const { siguiente } = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS siguiente FROM autos').get();
  const codigo = `AU-${String(siguiente).padStart(4, '0')}`;
  const escritas = [];

  db.exec('BEGIN');
  try {
    const { lastInsertRowid: autoId } = db.prepare(`
      INSERT INTO autos (codigo, condicion, marca, modelo, anio, kilometraje, precio_centavos, transmision,
                         combustible, color, motor, descripcion, estado, vendedor_id, creado_en)
      VALUES (?, 'usado', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_revision', ?, ?)`)
      .run(codigo, auto.marca, auto.modelo, auto.anio, auto.kilometraje, auto.precioCentavos, auto.transmision,
        auto.combustible, auto.color, auto.motor, auto.descripcion, vendedorId, creadoEn);

    fs.mkdirSync(carpetaSubidas, { recursive: true });
    const insertarFoto = db.prepare('INSERT INTO fotos (auto_id, ruta, orden) VALUES (?, ?, ?)');
    fotos.forEach((foto, i) => {
      const archivo = `${codigo.toLowerCase()}-${i + 1}.${foto.extension}`;
      fs.writeFileSync(path.join(carpetaSubidas, archivo), foto.buffer);
      escritas.push(archivo);
      insertarFoto.run(autoId, `/subidas/${archivo}`, i + 1);
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    for (const archivo of escritas) {
      fs.rmSync(path.join(carpetaSubidas, archivo), { force: true });
    }
    throw error;
  }
  return codigo;
}

function buscarPublicacionDe(db, codigo, vendedorId) {
  const auto = db.prepare(`SELECT id, codigo, marca, modelo, anio, precio_centavos, estado FROM autos
                           WHERE codigo = ? AND vendedor_id = ?`).get(codigo, vendedorId);
  if (!auto) {
    return undefined;
  }
  const fotos = db.prepare('SELECT ruta FROM fotos WHERE auto_id = ? ORDER BY orden').all(auto.id).map((f) => f.ruta);
  return { ...auto, fotos };
}

module.exports = { contarActivasDe, crearPublicacion, buscarPublicacionDe };
