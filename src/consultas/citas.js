// Consultas de las pruebas de manejo (RF-07).

function horasOcupadas(db, autoId, fecha) {
  return db.prepare("SELECT hora FROM citas WHERE auto_id = ? AND fecha = ? AND estado = 'programada'")
    .all(autoId, fecha).map((cita) => cita.hora);
}

// Mis citas: las programadas del cliente, con los datos del auto, en orden de fecha y hora
function citasProgramadasDe(db, clienteId) {
  return db.prepare(`
    SELECT c.codigo, c.fecha, c.hora, a.id AS auto_id, a.marca, a.modelo, a.anio
    FROM citas c JOIN autos a ON a.id = c.auto_id
    WHERE c.cliente_id = ? AND c.estado = 'programada'
    ORDER BY c.fecha, c.hora`).all(clienteId);
}

function buscarCitaDe(db, codigo, clienteId) {
  return db.prepare(`
    SELECT c.codigo, c.fecha, c.hora, a.id AS auto_id, a.marca, a.modelo, a.anio
    FROM citas c JOIN autos a ON a.id = c.auto_id
    WHERE c.codigo = ? AND c.cliente_id = ?`).get(codigo, clienteId);
}

// Guarda la cita Programada y devuelve su codigo (PM-0001, PM-0002...). Si otro cliente tomo el
// bloque un instante antes, la restriccion UNIQUE de la tabla lanza un error que la ruta convierte en FA-1.
function crearCita(db, { autoId, clienteId, fecha, hora, vencimientoLicencia, creadoEn }) {
  const { siguiente } = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS siguiente FROM citas').get();
  const codigo = `PM-${String(siguiente).padStart(4, '0')}`;
  db.prepare(`
    INSERT INTO citas (codigo, auto_id, cliente_id, fecha, hora, vencimiento_licencia, estado, creado_en)
    VALUES (?, ?, ?, ?, ?, ?, 'programada', ?)`)
    .run(codigo, autoId, clienteId, fecha, hora, vencimientoLicencia, creadoEn);
  return codigo;
}

module.exports = { horasOcupadas, citasProgramadasDe, buscarCitaDe, crearCita };
