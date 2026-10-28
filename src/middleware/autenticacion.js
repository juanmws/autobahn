// Sesion y control de acceso por rol (RNF-04).

function cargarUsuario(db) {
  const buscar = db.prepare('SELECT id, rol, nombre, apellido, correo FROM usuarios WHERE id = ?');
  return (req, res, next) => {
    // primero en null: si la consulta falla, la pagina de error igual puede mostrarse
    req.usuario = null;
    res.locals.usuario = null;
    const id = req.session?.usuarioId;
    if (id) {
      req.usuario = buscar.get(id) ?? null;
      res.locals.usuario = req.usuario;
    }
    next();
  };
}

function requiereSesion(req, res, next) {
  if (!req.usuario) {
    return res.redirect(`/iniciar-sesion?volver=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
}

function requiereRol(rol) {
  return [requiereSesion, (req, res, next) => {
    if (req.usuario.rol !== rol) {
      return res.status(403).render('prohibido', { titulo: 'Sin permiso' });
    }
    next();
  }];
}

// Sesion nueva al iniciar (con su identificador nuevo), para que uno anterior no quede autenticado
async function iniciarSesion(req, usuarioId) {
  await new Promise((resolver, rechazar) => req.session.regenerate((e) => (e ? rechazar(e) : resolver())));
  req.session.usuarioId = usuarioId;
}

module.exports = { cargarUsuario, requiereSesion, requiereRol, iniciarSesion };
