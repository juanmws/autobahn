const express = require('express');
const { listarDisponibles, listarRecientes, contarPorMarca, buscarDisponible } = require('../consultas/autos');

const RECIENTES_EN_INICIO = 6;

function rutasPublicas({ db }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.render('inicio', {
      titulo: 'Autos alemanes nuevos y usados en Panamá',
      recientes: listarRecientes(db, RECIENTES_EN_INICIO),
      marcas: contarPorMarca(db),
    });
  });

  router.get('/catalogo', (req, res) => {
    res.render('catalogo', { titulo: 'Catálogo', ...listarDisponibles(db, { pagina: req.query.pagina }) });
  });

  router.get('/autos/:id', (req, res, next) => {
    const auto = buscarDisponible(db, req.params.id);
    if (!auto) {
      return next(); // sigue hasta la pagina 404, sin decir si el auto existe en otro estado
    }
    res.render('auto', { titulo: `${auto.marca} ${auto.modelo} ${auto.anio}`, auto });
  });

  return router;
}

module.exports = { rutasPublicas };
