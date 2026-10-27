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

module.exports = { cargarUsuario, requiereSesion, requiereRol };
