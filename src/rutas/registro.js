// CU-01. Registrar una cuenta de cliente: formulario (pasos 1 y 2), validación y alta (pasos 3 y 4) y
// bienvenida en la página de inicio (paso 5).
const express = require('express');
const { iniciarSesion } = require('../middleware/autenticacion');
const { existeCedulaOCorreo, crearCliente } = require('../consultas/usuarios');
const { EDAD_MINIMA, validarRegistro } = require('../reglas/registro');
const { cifrarContrasena } = require('../seguridad');
const { fechaIso } = require('../fechas');
const { marcaDeTiempo } = require('../reloj');

// Lo que se vuelve a mostrar si hay errores; las contrasenas nunca se devuelven
const CAMPOS_VISIBLES = ['nombre', 'apellido', 'cedula', 'fechaNacimiento', 'telefono', 'correo'];

function valoresDe(cuerpo = {}) {
  const valores = Object.fromEntries(
    CAMPOS_VISIBLES.map((campo) => [campo, typeof cuerpo[campo] === 'string' ? cuerpo[campo] : '']));
  valores.terminos = cuerpo.terminos === 'si';
  return valores;
}

function rutasRegistro({ db, reloj }) {
  const router = express.Router();

  function formulario(res, estado, datos = {}) {
    const hoy = reloj.ahora();
    const fechaMaxima = new Date(hoy.getFullYear() - EDAD_MINIMA, hoy.getMonth(), hoy.getDate());
    res.status(estado).render('crear-cuenta', {
      titulo: 'Crear cuenta',
      fechaMaxima: fechaIso(fechaMaxima),
      valores: valoresDe(),
      errores: {},
      duplicada: false,
      ...datos,
    });
  }

  router.get('/crear-cuenta', (req, res) => {
    if (req.usuario) {
      return res.redirect('/');
    }
    formulario(res, 200);
  });

  router.post('/crear-cuenta', async (req, res) => {
    if (req.usuario) {
      return res.redirect('/');
    }
    const valores = valoresDe(req.body);
    const resultado = validarRegistro(req.body, { hoy: reloj.ahora() });
    if (!resultado.valido) {
      return formulario(res, 422, { valores, errores: resultado.errores });
    }

    const { cuenta } = resultado;
    if (existeCedulaOCorreo(db, cuenta.cedula, cuenta.correo)) {
      return formulario(res, 409, { valores, duplicada: true });
    }
    const hash = await cifrarContrasena(cuenta.contrasena);
    let id;
    try {
      id = crearCliente(db, cuenta, hash, marcaDeTiempo(reloj.ahora()));
    } catch (error) {
      // otra persona registró la misma cédula o el mismo correo entre la revisión y el guardado
      if (/UNIQUE constraint failed: usuarios\./.test(error.message)) {
        return formulario(res, 409, { valores, duplicada: true });
      }
      throw error;
    }

    await iniciarSesion(req, id);
    req.session.bienvenida = cuenta.nombre;
    res.redirect(303, '/');
  });

  return router;
}

module.exports = { rutasRegistro };
