const express = require('express');
const { requiereRol } = require('../middleware/autenticacion');
const { listarPublicacionesDe, contarPorRevisar, LIMITE_ACTIVAS } = require('../consultas/autos');
const { citasProgramadasDe } = require('../consultas/citas');
const { ofertasDe, ofertasRecibidas } = require('../consultas/ofertas');

function rutasCuenta({ db }) {
  const router = express.Router();

  // Mis citas, Mis ofertas y Mis publicaciones (autos usados en cualquier estado, con sus ofertas recibidas).
  // avisoOferta llega una sola vez, después de enviar una oferta (CU-08, paso 4).
  router.get('/mi-cuenta', requiereRol('cliente'), (req, res) => {
    const aviso = req.session.avisoOferta ?? null;
    delete req.session.avisoOferta;
    const publicaciones = listarPublicacionesDe(db, req.usuario.id);
    const activas = publicaciones.filter((p) => p.estado !== 'rechazada').length;
    res.render('mi-cuenta', {
      titulo: 'Mi cuenta',
      aviso,
      citas: citasProgramadasDe(db, req.usuario.id),
      ofertas: ofertasDe(db, req.usuario.id),
      publicaciones,
      recibidas: ofertasRecibidas(db, req.usuario.id),
      activas,
      limite: LIMITE_ACTIVAS,
    });
  });

  router.get('/admin', requiereRol('administrador'), (req, res) => {
    res.render('admin', { titulo: 'Panel del administrador', porRevisar: contarPorRevisar(db) });
  });

  return router;
}

module.exports = { rutasCuenta };
