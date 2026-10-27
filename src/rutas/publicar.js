// CU-05. Publicar un auto usado: formulario (pasos 1 a 4), envío a revisión (paso 5) y confirmación (paso 6).
const express = require('express');
const multer = require('multer');
const { requiereRol } = require('../middleware/autenticacion');
const { MARCAS, LIMITE_ACTIVAS } = require('../consultas/autos');
const { contarActivasDe, crearPublicacion, buscarPublicacionDe } = require('../consultas/publicaciones');
const { LIMITES, MENSAJES, TRANSMISIONES, COMBUSTIBLES, validarDatos, validarFotos } = require('../reglas/publicacion');
const { marcaDeTiempo } = require('../reloj');

const MENSAJE_LIMITE = 'Ya tienes 3 publicaciones activas, el máximo permitido';
const CAMPOS = ['marca', 'modelo', 'anio', 'kilometraje', 'precio', 'color', 'transmision', 'combustible', 'motor',
  'descripcion'];

// Las fotos llegan a memoria con limites: hasta 8 archivos de 5 MB y un byte, para que validarFotos
// responda con el nombre del archivo. Uno mas grande se corta al recibirlo, sin cargarlo entero.
const recibirFotos = multer({
  storage: multer.memoryStorage(),
  limits: { files: LIMITES.maximoFotos, fileSize: LIMITES.tamanoMaximo + 1, fields: 20, fieldSize: 16 * 1024 },
}).array('fotos', LIMITES.maximoFotos);

function mensajeDeSubida(error) {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return 'Una de las fotos pesa más de 5 MB';
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return MENSAJES.muchasFotos;
  }
  return 'No pudimos recibir las fotos; inténtalo de nuevo';
}

// Solo los campos del formulario y solo como texto, para volver a mostrarlos
function valoresDe(cuerpo = {}) {
  return Object.fromEntries(CAMPOS.map((campo) => [campo, typeof cuerpo[campo] === 'string' ? cuerpo[campo] : '']));
}

function rutasPublicar({ db, reloj, carpetaSubidas }) {
  const router = express.Router();
  const soloClientes = requiereRol('cliente');

  function formulario(res, estado, datos = {}) {
    res.status(estado).render('vender', {
      titulo: 'Vender mi auto',
      marcas: MARCAS,
      transmisiones: TRANSMISIONES,
      combustibles: COMBUSTIBLES,
      rangoAnio: LIMITES.anio({ anioActual: reloj.anioActual() }),
      limiteAlcanzado: false,
      mensajeLimite: MENSAJE_LIMITE,
      valores: valoresDe(),
      errores: {},
      ...datos,
    });
  }

  router.get('/vender', soloClientes, (req, res) => {
    formulario(res, 200, { limiteAlcanzado: contarActivasDe(db, req.usuario.id) >= LIMITE_ACTIVAS });
  });

  router.post('/vender', soloClientes, (req, res, next) => {
    recibirFotos(req, res, (errorSubida) => {
      if (errorSubida && !(errorSubida instanceof multer.MulterError)) {
        return next(errorSubida);
      }
      // FE-1: el limite se revisa otra vez, por si el formulario se abrio antes de llegar a 3
      if (contarActivasDe(db, req.usuario.id) >= LIMITE_ACTIVAS) {
        return formulario(res, 409, { limiteAlcanzado: true });
      }
      const valores = valoresDe(req.body);
      if (errorSubida) {
        return formulario(res, 422, { valores, errores: { fotos: mensajeDeSubida(errorSubida) } });
      }
      const datos = validarDatos(valores, { anioActual: reloj.anioActual() });
      const fotos = validarFotos(req.files ?? []);
      if (!datos.valido || !fotos.valido) {
        return formulario(res, 422, { valores, errores: { ...datos.errores, ...fotos.errores } });
      }

      try {
        const codigo = crearPublicacion(db, {
          vendedorId: req.usuario.id, auto: datos.auto, fotos: fotos.fotos,
          creadoEn: marcaDeTiempo(reloj.ahora()), carpetaSubidas,
        });
        res.redirect(303, `/publicaciones/${codigo}`);
      } catch (error) {
        next(error);
      }
    });
  });

  router.get('/publicaciones/:codigo', soloClientes, (req, res, next) => {
    const publicacion = buscarPublicacionDe(db, req.params.codigo, req.usuario.id);
    if (!publicacion) {
      return next();
    }
    res.render('publicacion', { titulo: `Publicación ${publicacion.codigo}`, publicacion });
  });

  return router;
}

module.exports = { rutasPublicar };
