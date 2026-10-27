const express = require('express');
const { requiereRol } = require('../middleware/autenticacion');
const { listarPublicacionesDe, contarPorRevisar, LIMITE_ACTIVAS } = require('../consultas/autos');

function rutasCuenta({ db }) {
  const router = express.Router();

  // Mis publicaciones: los autos usados del cliente en cualquier estado
  router.get('/mi-cuenta', requiereRol('cliente'), (req, res) => {
    const publicaciones = listarPublicacionesDe(db, req.usuario.id);
    const activas = publicaciones.filter((p) => p.estado !== 'rechazada').length;
    res.render('mi-cuenta', { titulo: 'Mi cuenta', publicaciones, activas, limite: LIMITE_ACTIVAS });
  });

  router.get('/admin', requiereRol('administrador'), (req, res) => {
    res.render('admin', { titulo: 'Panel del administrador', porRevisar: contarPorRevisar(db) });
  });

  return router;
}

module.exports = { rutasCuenta };
