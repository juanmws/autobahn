const express = require('express');
const {
  MARCAS, listarDisponibles, modelosPorMarca, listarRecientes, contarPorMarca, buscarDisponible,
} = require('../consultas/autos');
const { PARAMETROS, leerMonto, abonoMinimo, calcularFinanciamiento } = require('../reglas/financiamiento');
const {
  CONDICIONES, KILOMETRAJES, ORDENES, leerBusqueda, enlaceDeBusqueda, aniosDelFiltro,
} = require('../reglas/busqueda');
const { TRANSMISIONES, COMBUSTIBLES } = require('../reglas/publicacion');

const RECIENTES_EN_INICIO = 6;

function rutasPublicas({ db, reloj }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    // CU-01, paso 5: la bienvenida de una cuenta recién creada se muestra una sola vez
    const bienvenida = req.session?.bienvenida ?? null;
    if (bienvenida) {
      delete req.session.bienvenida;
    }
    res.render('inicio', {
      titulo: 'Autos alemanes nuevos y usados en Panamá',
      recientes: listarRecientes(db, RECIENTES_EN_INICIO),
      marcas: contarPorMarca(db),
      bienvenida,
    });
  });

  // CU-02. Los filtros van por GET: una búsqueda se puede recargar, compartir y paginar (FA-2).
  // Con un rango al revés (FA-1) se responde 422 y se muestra el catálogo sin filtrar.
  router.get('/catalogo', (req, res) => {
    const busqueda = leerBusqueda(req.query);
    const resultado = listarDisponibles(db, { pagina: req.query.pagina, filtros: busqueda.filtros, orden: busqueda.orden });
    res.status(busqueda.valido ? 200 : 422).render('catalogo', {
      titulo: 'Catálogo',
      ...resultado,
      busqueda,
      enlacePagina: (pagina) => enlaceDeBusqueda(busqueda, pagina),
      opciones: {
        marcas: MARCAS,
        modelos: modelosPorMarca(db),
        condiciones: CONDICIONES,
        anios: aniosDelFiltro(reloj.ahora().getFullYear()),
        kilometrajes: KILOMETRAJES,
        transmisiones: TRANSMISIONES,
        combustibles: COMBUSTIBLES,
        ordenes: ORDENES,
      },
    });
  });

  router.get('/autos/:id', (req, res, next) => {
    const auto = buscarDisponible(db, req.params.id);
    if (!auto) {
      return next(); // sigue hasta la pagina 404, sin decir si el auto existe en otro estado
    }
    res.render('auto', { titulo: `${auto.marca} ${auto.modelo} ${auto.anio}`, auto });
  });

  // CU-04. El calculo no cambia datos, por eso va por GET: el resultado se puede recargar o compartir.
  router.get('/autos/:id/financiamiento', (req, res, next) => {
    const auto = buscarDisponible(db, req.params.id);
    if (!auto) {
      return next();
    }
    // un parametro repetido llega como lista; se trata como vacio
    const abonoTexto = typeof req.query.abono === 'string' ? req.query.abono : '';
    const plazoTexto = typeof req.query.plazo === 'string' ? req.query.plazo : '';
    const abonoCentavos = leerMonto(abonoTexto);
    const enviado = 'abono' in req.query || 'plazo' in req.query;
    const calculo = enviado
      ? calcularFinanciamiento({
        precioCentavos: auto.precio_centavos, condicion: auto.condicion, abonoCentavos, plazo: plazoTexto,
      })
      : null;

    res.render('financiamiento', {
      titulo: `Financiamiento del ${auto.marca} ${auto.modelo}`,
      auto,
      parametros: PARAMETROS[auto.condicion],
      minimo: abonoMinimo(auto.precio_centavos, auto.condicion),
      abonoTexto,
      plazoTexto,
      porcentajeAbono: abonoCentavos === null ? null : (abonoCentavos * 100) / auto.precio_centavos,
      resultado: calculo?.valido ? calculo.resultado : null,
      errores: calculo && !calculo.valido ? calculo.errores : {},
    });
  });

  return router;
}

module.exports = { rutasPublicas };
