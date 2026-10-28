// Ofertas por autos usados (RF-08).

function buscarPendiente(db, autoId, clienteId) {
  return db.prepare(`SELECT id, monto_centavos FROM ofertas
                     WHERE auto_id = ? AND cliente_id = ? AND estado = 'pendiente'`).get(autoId, clienteId);
}

function crearOferta(db, { autoId, clienteId, montoCentavos, mensaje, creadoEn }) {
  return db.prepare(`INSERT INTO ofertas (auto_id, cliente_id, monto_centavos, mensaje, estado, creado_en)
                     VALUES (?, ?, ?, ?, 'pendiente', ?)`)
    .run(autoId, clienteId, montoCentavos, mensaje, creadoEn).lastInsertRowid;
}

// Mis ofertas: las del cliente, de la más reciente a la más antigua
function ofertasDe(db, clienteId) {
  return db.prepare(`
    SELECT o.monto_centavos, o.estado, o.creado_en, a.id AS auto_id, a.marca, a.modelo, a.anio, a.precio_centavos
    FROM ofertas o JOIN autos a ON a.id = o.auto_id
    WHERE o.cliente_id = ?
    ORDER BY o.creado_en DESC, o.id DESC`).all(clienteId);
}

// Ofertas recibidas por las publicaciones del vendedor. Del comprador solo va el nombre y la inicial del
// apellido: la respuesta y el cierre de la venta se coordinan en el local con un asesor.
function ofertasRecibidas(db, vendedorId) {
  return db.prepare(`
    SELECT o.monto_centavos, o.mensaje, o.estado, o.creado_en, a.codigo, a.marca, a.modelo, a.precio_centavos,
           u.nombre, substr(u.apellido, 1, 1) AS inicial
    FROM ofertas o JOIN autos a ON a.id = o.auto_id JOIN usuarios u ON u.id = o.cliente_id
    WHERE a.vendedor_id = ?
    ORDER BY o.creado_en DESC, o.id DESC`).all(vendedorId);
}

module.exports = { buscarPendiente, crearOferta, ofertasDe, ofertasRecibidas };
