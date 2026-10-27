const express = require('express');
const { requiereRol } = require('../middleware/autenticacion');
const { listarPublicacionesDe, contarPorRevisar, LIMITE_ACTIVAS } = require('../consultas/autos');
const { citasProgramadasDe } = require('../consultas/citas');

function rutasCuenta({ db }) {
  const router = express.Router();

  // Mis citas (pruebas de manejo programadas) y Mis publicaciones (autos usados en cualquier estado)
  router.get('/mi-cuenta', requiereRol('cliente'), (req, res) => {
    const publicaciones = listarPublicacionesDe(db, req.usuario.id);
    const activas = publicaciones.filter((p) => p.estado !== 'rechazada').length;
    res.render('mi-cuenta', {
      titulo: 'Mi cuenta', citas: citasProgramadasDe(db, req.usuario.id), publicaciones, activas, limite: LIMITE_ACTIVAS,
    });
  });

  router.get('/admin', requiereRol('administrador'), (req, res) => {
    res.render('admin', { titulo: 'Panel del administrador', porRevisar: contarPorRevisar(db) });
  });

  return router;
}

module.exports = { rutasCuenta };
