const express = require('express');
const bcrypt = require('bcryptjs');

const MENSAJE_FALLIDO = 'Correo o contraseña incorrectos.';

// Solo se vuelve a una ruta de este mismo sitio; cualquier otra cosa lleva al inicio.
function destinoSeguro(volver) {
  if (typeof volver !== 'string' || !volver.startsWith('/') || volver.startsWith('//') || volver.includes('\\')) {
    return '/';
  }
  return volver;
}

function rutasSesion({ db }) {
  const router = express.Router();
  const buscarPorCorreo = db.prepare('SELECT id, hash_contrasena FROM usuarios WHERE correo = ?');

  router.get('/iniciar-sesion', (req, res) => {
    if (req.usuario) {
      return res.redirect('/');
    }
    res.render('iniciar-sesion', { titulo: 'Iniciar sesión', volver: req.query.volver ?? '', correo: '', error: null });
  });

  router.post('/iniciar-sesion', async (req, res) => {
    const correo = String(req.body.correo ?? '').trim().toLowerCase();
    const contrasena = String(req.body.contrasena ?? '');
    const volver = req.query.volver ?? '';
    const cuenta = buscarPorCorreo.get(correo);

    if (!cuenta || !(await bcrypt.compare(contrasena, cuenta.hash_contrasena))) {
      return res.status(401).render('iniciar-sesion', { titulo: 'Iniciar sesión', volver, correo, error: MENSAJE_FALLIDO });
    }

    // sesion nueva al iniciar, para que un identificador anterior no quede autenticado
    await new Promise((resolver, rechazar) => req.session.regenerate((e) => (e ? rechazar(e) : resolver())));
    req.session.usuarioId = cuenta.id;
    res.redirect(destinoSeguro(volver));
  });

  router.post('/cerrar-sesion', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) {
        return next(error);
      }
      res.clearCookie('autobahn.sid');
      res.redirect('/');
    });
  });

  return router;
}

module.exports = { rutasSesion, destinoSeguro };
