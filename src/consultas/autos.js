// Consultas de solo lectura del catalogo. Solo los autos Disponible son publicos (RN-08).

const POR_PAGINA = 12; // RN-03
const MARCAS = ['Audi', 'BMW', 'Mercedes-Benz', 'Porsche', 'Volkswagen']; // RN-01

const COLUMNAS = `id, codigo, condicion, marca, modelo, anio, kilometraje, precio_centavos, transmision,
                  combustible, color, motor, descripcion, estado, creado_en`;
const MAS_RECIENTES = 'ORDER BY creado_en DESC, id DESC';

// Una pagina invalida (texto, decimal, cero o negativa) es la primera; una mayor que el total, la ultima.
function normalizarPagina(valor, totalPaginas) {
  const texto = String(valor ?? '');
  const numero = /^\d+$/.test(texto) ? Number(texto) : 1;
  return Math.min(Math.max(numero, 1), totalPaginas);
}

function listarDisponibles(db, { pagina } = {}) {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM autos WHERE estado = 'disponible'").get();
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const actual = normalizarPagina(pagina, totalPaginas);
  const autos = db.prepare(`SELECT ${COLUMNAS} FROM autos WHERE estado = 'disponible' ${MAS_RECIENTES}
                            LIMIT ? OFFSET ?`).all(POR_PAGINA, (actual - 1) * POR_PAGINA);
  return { autos, pagina: actual, totalPaginas, total };
}

function listarRecientes(db, cantidad) {
  return db.prepare(`SELECT ${COLUMNAS} FROM autos WHERE estado = 'disponible' ${MAS_RECIENTES} LIMIT ?`)
    .all(cantidad);
}

// Autos disponibles por marca, con las cinco marcas aunque alguna tenga cero
function contarPorMarca(db) {
  const filas = db.prepare(`SELECT marca, COUNT(*) AS cantidad FROM autos WHERE estado = 'disponible'
                            GROUP BY marca`).all();
  return MARCAS.map((marca) => ({ marca, cantidad: filas.find((f) => f.marca === marca)?.cantidad ?? 0 }));
}

function buscarDisponible(db, id) {
  if (!/^\d+$/.test(String(id))) {
    return undefined;
  }
  return db.prepare(`SELECT ${COLUMNAS} FROM autos WHERE id = ? AND estado = 'disponible'`).get(Number(id));
}

const LIMITE_ACTIVAS = 3; // RN-07: publicaciones En revision o Disponible por cliente

function listarPublicacionesDe(db, vendedorId) {
  return db.prepare(`SELECT ${COLUMNAS}, motivo_rechazo FROM autos WHERE vendedor_id = ? ${MAS_RECIENTES}`)
    .all(vendedorId);
}

function contarPorRevisar(db) {
  return db.prepare("SELECT COUNT(*) AS n FROM autos WHERE estado = 'en_revision'").get().n;
}

module.exports = {
  POR_PAGINA, MARCAS, LIMITE_ACTIVAS, listarDisponibles, listarRecientes, contarPorMarca, buscarDisponible,
  listarPublicacionesDe, contarPorRevisar,
};
