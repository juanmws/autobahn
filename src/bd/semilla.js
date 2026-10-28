const bcrypt = require('bcryptjs');
const datos = require('./datos-semilla');
const { FOTOS } = require('./fotos-semilla');
const { COSTO_BCRYPT } = require('../seguridad');

const ANIO_NUEVOS = 2026;
const USUARIOS_CREADOS_EN = '2026-08-01T09:00:00';

function aCentavos(balboas) {
  return Math.round(balboas * 100);
}

// Fecha de publicacion de cada auto: un dia antes que el anterior, desde el 15/10/2026, para que
// el orden "mas recientes primero" del catalogo sea siempre el mismo.
function publicadoEn(indice) {
  const fecha = new Date(2026, 9, 15, 9, 0, 0);
  fecha.setDate(fecha.getDate() - indice);
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T09:00:00`;
}

// Llena una base de datos vacia con los datos de prueba.
function sembrar(db) {
  const hashCliente = bcrypt.hashSync(datos.CONTRASENA_CLIENTES, COSTO_BCRYPT);
  const hashAdministrador = bcrypt.hashSync(datos.CONTRASENA_ADMINISTRADOR, COSTO_BCRYPT);

  const insertarUsuario = db.prepare(`
    INSERT INTO usuarios (rol, nombre, apellido, cedula, fecha_nacimiento, telefono, correo, hash_contrasena, creado_en)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertarAuto = db.prepare(`
    INSERT INTO autos (codigo, condicion, marca, modelo, anio, kilometraje, precio_centavos, transmision,
                       combustible, color, motor, descripcion, estado, vendedor_id, motivo_rechazo,
                       revisado_por, revisado_en, creado_en)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertarFoto = db.prepare(`
    INSERT INTO fotos (auto_id, ruta, orden, autor, licencia, fuente) VALUES (?, ?, 1, ?, ?, ?)`);

  db.exec('BEGIN');
  try {
    const a = datos.ADMINISTRADOR;
    const idAdministrador = insertarUsuario.run('administrador', a.nombre, a.apellido, a.cedula,
      a.fecha_nacimiento, a.telefono, a.correo, hashAdministrador, USUARIOS_CREADOS_EN).lastInsertRowid;

    const idClientes = datos.CLIENTES.map((c) => insertarUsuario.run('cliente', c.nombre, c.apellido, c.cedula,
      c.fecha_nacimiento, c.telefono, c.correo, hashCliente, USUARIOS_CREADOS_EN).lastInsertRowid);

    // nuevos y usados intercalados, para que el catalogo mezcle ambos desde la primera pagina
    const autos = [];
    for (let i = 0; i < datos.NUEVOS.length; i++) {
      const [marca, modelo, precio, transmision, combustible, color, motor] = datos.NUEVOS[i];
      autos.push({ condicion: 'nuevo', marca, modelo, anio: ANIO_NUEVOS, km: 0, precio, transmision,
        combustible, color, motor, vendedor: null, estado: 'disponible', descripcion: datos.NUEVO });

      const [m, mod, anio, km, p, tr, comb, col, mot, vendedor, estado, descripcion] = datos.USADOS[i];
      autos.push({ condicion: 'usado', marca: m, modelo: mod, anio, km, precio: p, transmision: tr,
        combustible: comb, color: col, motor: mot, vendedor, estado, descripcion });
    }

    autos.forEach((auto, i) => {
      const fecha = publicadoEn(i);
      const revisado = auto.condicion === 'usado' && auto.estado !== 'en_revision';
      const idAuto = insertarAuto.run(
        `AU-${String(i + 1).padStart(4, '0')}`, auto.condicion, auto.marca, auto.modelo, auto.anio, auto.km,
        aCentavos(auto.precio), auto.transmision, auto.combustible, auto.color, auto.motor, auto.descripcion,
        auto.estado, auto.vendedor ? idClientes[auto.vendedor - 1] : null,
        auto.estado === 'rechazada' ? datos.MOTIVO_RECHAZO : null,
        revisado ? idAdministrador : null, revisado ? fecha : null, fecha).lastInsertRowid;

      const foto = FOTOS[`${auto.condicion}:${auto.modelo}`];
      if (!foto) {
        throw new Error(`Falta la foto de ${auto.condicion}:${auto.modelo} en fotos-semilla.js`);
      }
      insertarFoto.run(idAuto, foto.ruta, foto.autor, foto.licencia, foto.fuente);
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = { sembrar };
