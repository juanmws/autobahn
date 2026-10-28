// Consultas de solo lectura del catalogo. Solo los autos Disponible son publicos (RN-08).

const POR_PAGINA = 12; // RN-03
const MARCAS = ['Audi', 'BMW', 'Mercedes-Benz', 'Porsche', 'Volkswagen']; // RN-01

const COLUMNAS = `id, codigo, condicion, marca, modelo, anio, kilometraje, precio_centavos, transmision,
                  combustible, color, motor, descripcion, estado, creado_en`;
const MAS_RECIENTES = 'ORDER BY creado_en DESC, id DESC';

// Auto con su foto principal (orden 1); las columnas foto_* quedan en null si no tiene fotos
const AUTO_CON_FOTO = `
  SELECT a.id, a.codigo, a.condicion, a.marca, a.modelo, a.anio, a.kilometraje, a.precio_centavos,
         a.transmision, a.combustible, a.color, a.motor, a.descripcion, a.estado, a.creado_en, a.vendedor_id,
         f.ruta AS foto_ruta, f.autor AS foto_autor, f.licencia AS foto_licencia, f.fuente AS foto_fuente
  FROM autos a LEFT JOIN fotos f ON f.auto_id = a.id AND f.orden = 1`;
const DISPONIBLES_MAS_RECIENTES = "WHERE a.estado = 'disponible' ORDER BY a.creado_en DESC, a.id DESC";

// Una pagina invalida (texto, decimal, cero o negativa) es la primera; una mayor que el total, la ultima.
function normalizarPagina(valor, totalPaginas) {
  const texto = String(valor ?? '');
  const numero = /^\d+$/.test(texto) ? Number(texto) : 1;
  return Math.min(Math.max(numero, 1), totalPaginas);
}

// RF-02. Cada filtro presente agrega su condición, en este orden; todas se combinan con AND (RN-03).
// Los valores van como parámetros, nunca dentro del texto SQL.
const CONDICIONES_DE_FILTRO = [
  ['marca', 'a.marca = ?'],
  ['modelo', 'a.modelo = ?'],
  ['condicion', 'a.condicion = ?'],
  ['precioMin', 'a.precio_centavos >= ?'],
  ['precioMax', 'a.precio_centavos <= ?'],
  ['anioDesde', 'a.anio >= ?'],
  ['anioHasta', 'a.anio <= ?'],
  ['kmMaximo', 'a.kilometraje <= ?'],
  ['transmision', 'a.transmision = ?'],
  ['combustible', 'a.combustible = ?'],
];

// Cada orden desempata por fecha e id, para que un auto no salte de una página a otra
const ORDEN_SQL = {
  recientes: 'a.creado_en DESC, a.id DESC',
  precio_asc: 'a.precio_centavos ASC, a.creado_en DESC, a.id DESC',
  precio_desc: 'a.precio_centavos DESC, a.creado_en DESC, a.id DESC',
  anio_desc: 'a.anio DESC, a.creado_en DESC, a.id DESC',
  km_asc: 'a.kilometraje ASC, a.creado_en DESC, a.id DESC',
};

function construirConsulta(filtros, orden) {
  const presentes = CONDICIONES_DE_FILTRO.filter(([clave]) => filtros[clave] !== undefined);
  return {
    where: ["a.estado = 'disponible'", ...presentes.map(([, condicion]) => condicion)].join(' AND '),
    parametros: presentes.map(([clave]) => filtros[clave]),
    ordenSql: ORDEN_SQL[orden] ?? ORDEN_SQL.recientes,
  };
}

function listarDisponibles(db, { pagina, filtros, orden }) {
  const { where, parametros, ordenSql } = construirConsulta(filtros, orden);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM autos a WHERE ${where}`).get(...parametros);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const actual = normalizarPagina(pagina, totalPaginas);
  const autos = db.prepare(`${AUTO_CON_FOTO} WHERE ${where} ORDER BY ${ordenSql} LIMIT ? OFFSET ?`)
    .all(...parametros, POR_PAGINA, (actual - 1) * POR_PAGINA);
  return { autos, pagina: actual, totalPaginas, total };
}

// CU-02, paso 2: los modelos disponibles de cada marca, para la lista de modelos del filtro
function modelosPorMarca(db) {
  const filas = db.prepare(`SELECT DISTINCT marca, modelo FROM autos WHERE estado = 'disponible'
                            ORDER BY marca, modelo`).all();
  return Object.fromEntries(MARCAS.map((marca) => [marca, filas.filter((f) => f.marca === marca).map((f) => f.modelo)]));
}

function listarRecientes(db, cantidad) {
  return db.prepare(`${AUTO_CON_FOTO} ${DISPONIBLES_MAS_RECIENTES} LIMIT ?`).all(cantidad);
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
  return db.prepare(`${AUTO_CON_FOTO} WHERE a.id = ? AND a.estado = 'disponible'`).get(Number(id));
}

// RF-03: los autos Disponible de la lista de comparación, en el orden en que se agregaron
function buscarDisponiblesPorIds(db, ids) {
  const autos = db.prepare(`${AUTO_CON_FOTO} WHERE a.estado = 'disponible' AND a.id IN (${ids.map(() => '?').join(', ')})`)
    .all(...ids);
  return ids.map((id) => autos.find((a) => a.id === id)).filter(Boolean);
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
  POR_PAGINA, MARCAS, LIMITE_ACTIVAS, construirConsulta, listarDisponibles, modelosPorMarca, listarRecientes,
  contarPorMarca, buscarDisponible, buscarDisponiblesPorIds, listarPublicacionesDe, contarPorRevisar,
};
