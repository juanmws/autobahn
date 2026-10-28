const path = require('node:path');
const express = require('express');
const session = require('express-session');
const formato = require('./formato');
const { cargarUsuario } = require('./middleware/autenticacion');
const { rutasPublicas } = require('./rutas/publicas');
const { rutasSesion } = require('./rutas/sesion');
const { rutasCuenta } = require('./rutas/cuenta');
const { rutasCitas } = require('./rutas/citas');
const { rutasPublicar } = require('./rutas/publicar');
const { rutasRegistro } = require('./rutas/registro');
const { rutasRevision } = require('./rutas/revision');
const { rutasOfertas } = require('./rutas/ofertas');
const { cargarComparacion, rutasComparacion } = require('./rutas/comparacion');

const TREINTA_MINUTOS = 30 * 60 * 1000; // RNF-04: la sesion se cierra tras 30 minutos de inactividad

const SUBIDAS_POR_DEFECTO = path.join(__dirname, '..', 'datos', 'subidas');

// Crea la aplicacion con sus dependencias inyectadas: la base de datos, el reloj, el registro de
// errores y la carpeta de las fotos que suben los clientes. Asi las pruebas usan una base en memoria,
// una fecha fija, un registro silencioso y una carpeta temporal.
function crearApp({ db, reloj, secretoSesion, registrarError = console.error, carpetaSubidas = SUBIDAS_POR_DEFECTO }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('views', path.join(__dirname, 'vistas'));
  app.set('view engine', 'ejs');
  Object.assign(app.locals, formato);

  app.use(express.static(path.join(__dirname, '..', 'publico')));
  app.use('/subidas', express.static(carpetaSubidas));
  app.use('/fuentes', express.static(path.join(__dirname, '..', 'node_modules', '@fontsource')));
  app.use(express.urlencoded({ extended: false }));

  // rolling renueva el vencimiento en cada solicitud: vence tras 30 minutos sin actividad
  app.use(session({
    name: 'autobahn.sid',
    secret: secretoSesion,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: TREINTA_MINUTOS },
  }));

  app.use((req, res, next) => {
    res.locals.rutaActual = req.path;
    next();
  });
  app.use(cargarUsuario(db));
  app.use(cargarComparacion({ db }));

  app.use(rutasPublicas({ db, reloj }));
  app.use(rutasSesion({ db }));
  app.use(rutasRegistro({ db, reloj }));
  app.use(rutasCuenta({ db }));
  app.use(rutasCitas({ db, reloj }));
  app.use(rutasPublicar({ db, reloj, carpetaSubidas }));
  app.use(rutasRevision({ db, reloj }));
  app.use(rutasOfertas({ db, reloj }));
  app.use(rutasComparacion({ db }));

  app.use((req, res) => {
    res.status(404).render('no-encontrado', { titulo: 'Página no encontrada' });
  });

  // RNF-04: el detalle del error queda en el registro del servidor, nunca en la respuesta
  app.use((error, req, res, next) => {
    registrarError(error);
    res.status(500).render('error', { titulo: 'Error del servidor' });
  });

  return app;
}

module.exports = { crearApp };
