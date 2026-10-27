// CU-07. Agendar una prueba de manejo: paso 1 (dia), paso 2 (bloque y licencia), paso 3 (resumen)
// y pasos 4 y 5 (confirmar y guardar). Los pasos 1 a 3 son GET porque no cambian datos.
const express = require('express');
const { requiereRol } = require('../middleware/autenticacion');
const { buscarDisponible } = require('../consultas/autos');
const { horasOcupadas, citasProgramadasDe, buscarCitaDe, crearCita } = require('../consultas/citas');
const { BLOQUES, MENSAJES, diasHabilitados, validarSeleccion, validarCita } = require('../reglas/citas');
const { marcaDeTiempo } = require('../reloj');

const UBICACION = 'Local de Autobahn, Vía Ricardo J. Alfaro, al lado de la Universidad Tecnológica de Panamá';

// FA-1 y FA-2 piden otro bloque; FE-1 y FE-2 terminan el caso de uso sin guardar
const ESTADO_POR_MOTIVO = { ocupado: 409, mismo_bloque: 409, limite: 409, licencia: 422 };

function rutasCitas({ db, reloj }) {
  const router = express.Router();
  const soloClientes = requiereRol('cliente');

  function pantalla(res, estado, auto, datos = {}) {
    const fecha = datos.fecha ?? null;
    const ocupadas = fecha ? horasOcupadas(db, auto.id, fecha) : [];
    res.status(estado).render('prueba-manejo', {
      titulo: `Prueba de manejo del ${auto.marca} ${auto.modelo}`,
      auto,
      ubicacion: UBICACION,
      dias: diasHabilitados(reloj.ahora()),
      bloques: fecha ? BLOQUES.map((hora) => ({ hora, ocupado: ocupadas.includes(hora) })) : null,
      fecha,
      hora: '',
      licencia: '',
      seleccion: null,
      errores: {},
      mensaje: null,
      ...datos,
    });
  }

  // El auto debe estar Disponible (si no, 404) y no ser del cliente (precondicion del CU-07)
  function autoParaAgendar(req, res, next) {
    const auto = buscarDisponible(db, req.params.id);
    if (!auto) {
      return next('route');
    }
    if (auto.vendedor_id === req.usuario.id) {
      return pantalla(res, 403, auto, { dias: [], mensaje: MENSAJES.propio });
    }
    req.auto = auto;
    next();
  }

  router.get('/autos/:id/prueba-de-manejo', soloClientes, autoParaAgendar, (req, res) => {
    const { auto } = req;
    const fecha = typeof req.query.fecha === 'string' ? req.query.fecha : undefined;
    const hora = typeof req.query.hora === 'string' ? req.query.hora : undefined;
    const licencia = typeof req.query.licencia === 'string' ? req.query.licencia : undefined;

    if (fecha === undefined) {
      return pantalla(res, 200, auto);
    }
    if (!diasHabilitados(reloj.ahora()).includes(fecha)) {
      return pantalla(res, 422, auto, { errores: { fecha: MENSAJES.fecha } });
    }
    if (hora === undefined && licencia === undefined) {
      return pantalla(res, 200, auto, { fecha });
    }
    const seleccion = validarSeleccion({ hoy: reloj.ahora(), fecha, hora, vencimientoLicencia: licencia });
    if (!seleccion.valido) {
      return pantalla(res, 422, auto, { fecha, hora: hora ?? '', licencia: licencia ?? '', errores: seleccion.errores });
    }
    pantalla(res, 200, auto, { fecha, seleccion: seleccion.datos, licencia: seleccion.datos.vencimientoLicencia });
  });

  router.post('/autos/:id/prueba-de-manejo', soloClientes, autoParaAgendar, (req, res) => {
    const { auto } = req;
    const hoy = reloj.ahora();
    const { fecha, hora, licencia } = req.body;
    const seleccion = validarSeleccion({ hoy, fecha, hora, vencimientoLicencia: licencia });
    if (!seleccion.valido) {
      const fechaValida = seleccion.errores.fecha ? null : fecha;
      return pantalla(res, 422, auto, { fecha: fechaValida, hora: hora ?? '', licencia: licencia ?? '', errores: seleccion.errores });
    }

    const datos = seleccion.datos;
    const rechazar = (motivo) => pantalla(res, ESTADO_POR_MOTIVO[motivo], auto, {
      fecha: datos.fecha, licencia: datos.vencimientoLicencia, mensaje: MENSAJES[motivo],
    });

    const resultado = validarCita({
      hoy, ...datos,
      horasOcupadasDelAuto: horasOcupadas(db, auto.id, datos.fecha),
      citasDelCliente: citasProgramadasDe(db, req.usuario.id),
      esPropio: false,
    });
    if (!resultado.valido) {
      return rechazar(resultado.motivo);
    }

    let codigo;
    try {
      codigo = crearCita(db, {
        autoId: auto.id, clienteId: req.usuario.id, ...datos, creadoEn: marcaDeTiempo(hoy),
      });
    } catch (error) {
      if (/UNIQUE constraint failed: citas\.auto_id/.test(error.message)) {
        return rechazar('ocupado');
      }
      throw error;
    }
    res.redirect(303, `/citas/${codigo}`);
  });

  router.get('/citas/:codigo', soloClientes, (req, res, next) => {
    const cita = buscarCitaDe(db, req.params.codigo, req.usuario.id);
    if (!cita) {
      return next();
    }
    res.render('cita', { titulo: `Cita ${cita.codigo}`, cita, ubicacion: UBICACION });
  });

  return router;
}

module.exports = { rutasCitas };
