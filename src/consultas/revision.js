// Revisión de publicaciones de autos usados (RF-06).
const { estadosOrigen } = require('../reglas/revision');

// Paso 1 del CU-06: las publicaciones En revisión, de la más antigua a la más reciente
function listarPorRevisar(db) {
  return db.prepare(`
    SELECT a.codigo, a.marca, a.modelo, a.anio, a.precio_centavos, a.creado_en, u.nombre, u.apellido
    FROM autos a JOIN usuarios u ON u.id = a.vendedor_id
    WHERE a.estado = 'en_revision'
    ORDER BY a.creado_en ASC, a.id ASC`).all();
}

// Paso 2: todos los datos, las fotos y el contacto del vendedor. Solo autos publicados por clientes.
function buscarPublicacion(db, codigo) {
  const publicacion = db.prepare(`
    SELECT a.id, a.codigo, a.marca, a.modelo, a.anio, a.kilometraje, a.precio_centavos, a.transmision,
           a.combustible, a.color, a.motor, a.descripcion, a.estado, a.motivo_rechazo, a.creado_en,
           u.nombre, u.apellido, u.cedula, u.telefono, u.correo
    FROM autos a JOIN usuarios u ON u.id = a.vendedor_id
    WHERE a.codigo = ?`).get(codigo);
  if (!publicacion) {
    return undefined;
  }
  const fotos = db.prepare('SELECT ruta FROM fotos WHERE auto_id = ? ORDER BY orden').all(publicacion.id);
  return { ...publicacion, fotos: fotos.map((f) => f.ruta) };
}

// Cambia el estado solo si la transición es válida (RN-08). Si otro administrador ya la revisó, no
// cambia nada y devuelve false (FE-1): la condición va en la misma consulta, sin ventana entre leer y escribir.
// Si no hay estados de origen, SQLite acepta "IN ()" y no cambia ninguna fila.
function cambiarEstado(db, { codigo, hacia, administradorId, revisadoEn, motivo = null }) {
  const origenes = estadosOrigen(hacia);
  const { changes } = db.prepare(`
    UPDATE autos SET estado = ?, motivo_rechazo = ?, revisado_por = ?, revisado_en = ?
    WHERE codigo = ? AND estado IN (${origenes.map(() => '?').join(', ')})`)
    .run(hacia, motivo, administradorId, revisadoEn, codigo, ...origenes);
  return changes === 1;
}

module.exports = { listarPorRevisar, buscarPublicacion, cambiarEstado };
