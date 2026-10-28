// CU-06. Revisar una publicación de auto usado: lista (paso 1), detalle (paso 2), confirmación (paso 3)
// y aprobación o rechazo (pasos 4 y 5, FA-1). Después de cada acción se vuelve a la lista con un aviso.
const express = require('express');
const { requiereRol } = require('../middleware/autenticacion');
const { listarPorRevisar, buscarPublicacion, cambiarEstado } = require('../consultas/revision');
const { MENSAJES, validarMotivo } = require('../reglas/revision');
const { marcaDeTiempo } = require('../reloj');

const ACCIONES = ['aprobar', 'rechazar'];

function rutasRevision({ db, reloj }) {
  const router = express.Router();
  const soloAdministrador = requiereRol('administrador');

  function detalle(res, estado, publicacion, datos = {}) {
    res.status(estado).render('revision-detalle', {
      titulo: `Revisar ${publicacion.codigo}`,
      publicacion,
      accion: null,
      motivo: '',
      error: null,
      mensajeYaRevisada: MENSAJES.yaRevisada,
      ...datos,
    });
  }

  function revisar(req, res, { hacia, motivo = null }) {
    const { codigo } = req.params;
    const cambio = cambiarEstado(db, {
      codigo, hacia, motivo, administradorId: req.usuario.id, revisadoEn: marcaDeTiempo(reloj.ahora()),
    });
    const resultado = hacia === 'disponible' ? 'aprobada' : 'rechazada';
    req.session.avisoRevision = cambio ? `Publicación ${codigo} ${resultado}` : MENSAJES.yaRevisada;
    res.redirect(303, '/admin/publicaciones');
  }

  router.get('/admin/publicaciones', soloAdministrador, (req, res) => {
    const aviso = req.session.avisoRevision ?? null;
    delete req.session.avisoRevision;
    res.render('revision-lista', {
      titulo: 'Publicaciones por revisar',
      publicaciones: listarPorRevisar(db),
      aviso,
      mensajeVacio: MENSAJES.sinPendientes,
    });
  });

  router.get('/admin/publicaciones/:codigo', soloAdministrador, (req, res, next) => {
    const publicacion = buscarPublicacion(db, req.params.codigo);
    if (!publicacion) {
      return next();
    }
    // la confirmación (paso 3) y el motivo (FA-1) solo se ofrecen mientras está En revisión
    const accion = publicacion.estado === 'en_revision' && ACCIONES.includes(req.query.accion) ? req.query.accion : null;
    detalle(res, 200, publicacion, { accion });
  });

  router.post('/admin/publicaciones/:codigo/aprobar', soloAdministrador, (req, res, next) => {
    if (!buscarPublicacion(db, req.params.codigo)) {
      return next();
    }
    revisar(req, res, { hacia: 'disponible' });
  });

  router.post('/admin/publicaciones/:codigo/rechazar', soloAdministrador, (req, res, next) => {
    const publicacion = buscarPublicacion(db, req.params.codigo);
    if (!publicacion) {
      return next();
    }
    const resultado = validarMotivo(req.body.motivo);
    if (!resultado.valido) {
      const motivo = typeof req.body.motivo === 'string' ? req.body.motivo : '';
      return detalle(res, 422, publicacion, { accion: 'rechazar', motivo, error: resultado.error });
    }
    revisar(req, res, { hacia: 'rechazada', motivo: resultado.motivo });
  });

  return router;
}

module.exports = { rutasRevision };
