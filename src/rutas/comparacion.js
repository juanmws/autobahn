// CU-03. Comparar autos: agregar desde la tarjeta o la ficha (pasos 1 y 2), ver la tabla (pasos 3 y 4) y
// quitar (FA-1). La lista vive en la sesión, así que sirve a visitantes y clientes y no cambia ningún dato.
const express = require('express');
const { buscarDisponible, buscarDisponiblesPorIds } = require('../consultas/autos');
const {
  MAXIMO, MENSAJES, leerLista, agregar, quitar, puedeComparar, mejores, rutaDeVuelta,
} = require('../reglas/comparacion');

// Deja en res.locals los autos de la comparación, para la barra y las tarjetas de cualquier página. Un
// auto que dejó de estar Disponible sale de la lista. El aviso (FA-1, FA-2 o FA-3) se muestra una vez.
function cargarComparacion({ db }) {
  return (req, res, next) => {
    const lista = leerLista(req.session.comparacion);
    const autos = lista.length > 0 ? buscarDisponiblesPorIds(db, lista) : [];
    if (autos.length !== lista.length) {
      req.session.comparacion = autos.map((auto) => auto.id);
    }
    res.locals.comparacion = autos;
    res.locals.maximoComparacion = MAXIMO;
    res.locals.urlActual = req.originalUrl;
    if (req.method === 'GET' && req.session.avisoComparacion) {
      res.locals.avisoComparacion = req.session.avisoComparacion;
      delete req.session.avisoComparacion;
    }
    next();
  };
}

function rutasComparacion({ db }) {
  const router = express.Router();

  router.post('/comparacion', (req, res, next) => {
    const auto = buscarDisponible(db, req.body.autoId);
    if (!auto) {
      return next();
    }
    const { lista, motivo } = agregar(leerLista(req.session.comparacion), auto.id);
    req.session.comparacion = lista;
    if (motivo) {
      req.session.avisoComparacion = MENSAJES[motivo];
    }
    res.redirect(303, rutaDeVuelta(req.body.volver));
  });

  router.post('/comparacion/quitar', (req, res) => {
    const lista = quitar(leerLista(req.session.comparacion), Number(req.body.autoId));
    req.session.comparacion = lista;
    if (puedeComparar(lista)) {
      return res.redirect(303, '/comparacion');
    }
    req.session.avisoComparacion = MENSAJES.faltaOtro;
    res.redirect(303, '/catalogo');
  });

  router.get('/comparacion', (req, res) => {
    const autos = res.locals.comparacion;
    if (!puedeComparar(autos.map((auto) => auto.id))) {
      req.session.avisoComparacion = MENSAJES.faltaOtro;
      return res.redirect(303, '/catalogo');
    }
    res.render('comparacion', { titulo: 'Comparar autos', autos, mejores: mejores(autos), ocultarBarra: true });
  });

  return router;
}

module.exports = { cargarComparacion, rutasComparacion };
