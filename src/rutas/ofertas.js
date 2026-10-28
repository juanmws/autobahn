// CU-08. Hacer una oferta por un auto usado: precio y rango permitido (paso 1), porcentaje mientras se
// escribe (paso 2, en el navegador) y validación y registro de la oferta (pasos 3 a 5).
const express = require('express');
const { requiereRol } = require('../middleware/autenticacion');
const { buscarDisponible } = require('../consultas/autos');
const { buscarPendiente, crearOferta } = require('../consultas/ofertas');
const { MENSAJES, rangoPermitido, precondicion, decidirOferta } = require('../reglas/ofertas');
const { marcaDeTiempo } = require('../reloj');

// Lo escrito vuelve al formulario si hay errores; solo se devuelve texto
function valoresDe(cuerpo) {
  const texto = (valor) => (typeof valor === 'string' ? valor : '');
  return { monto: texto(cuerpo.monto), mensaje: texto(cuerpo.mensaje) };
}

function rutasOfertas({ db, reloj }) {
  const router = express.Router();
  const soloClientes = requiereRol('cliente');

  // aviso: mensaje que reemplaza al formulario (auto propio o FE-1)
  function pantalla(res, estado, auto, datos = {}) {
    res.status(estado).render('oferta', {
      titulo: `Hacer una oferta por el ${auto.marca} ${auto.modelo}`,
      auto,
      rango: rangoPermitido(auto.precio_centavos),
      valores: { monto: '', mensaje: '' },
      errores: {},
      aviso: null,
      pendiente: false,
      ...datos,
    });
  }

  const avisoPendiente = (res, estado, auto, pendiente) =>
    pantalla(res, estado, auto, { aviso: MENSAJES.pendiente(pendiente.monto_centavos), pendiente: true });

  // Precondiciones del CU-08: un auto que no es usado o no está Disponible no tiene oferta (404);
  // el vendedor no puede ofertar por el suyo (403)
  function autoParaOfertar(req, res, next) {
    const auto = buscarDisponible(db, req.params.id);
    const motivo = auto && precondicion(auto, req.usuario.id);
    if (!auto || motivo === 'no_ofertable') {
      return next('route');
    }
    if (motivo === 'propio') {
      return pantalla(res, 403, auto, { aviso: MENSAJES.propio });
    }
    req.auto = auto;
    next();
  }

  router.get('/autos/:id/oferta', soloClientes, autoParaOfertar, (req, res) => {
    const pendiente = buscarPendiente(db, req.auto.id, req.usuario.id);
    if (pendiente) {
      return avisoPendiente(res, 200, req.auto, pendiente);
    }
    pantalla(res, 200, req.auto);
  });

  router.post('/autos/:id/oferta', soloClientes, autoParaOfertar, (req, res) => {
    const { auto } = req;
    const pendiente = buscarPendiente(db, auto.id, req.usuario.id);
    const decision = decidirOferta({
      auto, clienteId: req.usuario.id, pendiente, monto: req.body.monto, mensaje: req.body.mensaje,
    });
    if (decision.resultado === 'pendiente') {
      return avisoPendiente(res, 409, auto, pendiente);
    }
    if (decision.resultado === 'invalida') {
      return pantalla(res, 422, auto, { valores: valoresDe(req.body), errores: decision.errores });
    }

    const { montoCentavos, mensaje } = decision.oferta;
    try {
      crearOferta(db, {
        autoId: auto.id, clienteId: req.usuario.id, montoCentavos, mensaje, creadoEn: marcaDeTiempo(reloj.ahora()),
      });
    } catch (error) {
      // FE-1 por carrera: otra oferta del mismo cliente se guardó entre la consulta y el INSERT
      if (/UNIQUE constraint failed: ofertas\./.test(error.message)) {
        return avisoPendiente(res, 409, auto, buscarPendiente(db, auto.id, req.usuario.id));
      }
      throw error;
    }
    req.session.avisoOferta = MENSAJES.enviada(montoCentavos);
    res.redirect(303, '/mi-cuenta');
  });

  return router;
}

module.exports = { rutasOfertas };
