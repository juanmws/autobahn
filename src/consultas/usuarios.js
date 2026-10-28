// Cuentas de usuario (RF-01).

// La cedula y el correo no se repiten entre cuentas (RN-02); el correo se compara sin mayusculas
function existeCedulaOCorreo(db, cedula, correo) {
  return db.prepare('SELECT 1 FROM usuarios WHERE cedula = ? OR correo = ? LIMIT 1').get(cedula, correo) !== undefined;
}

function crearCliente(db, { nombre, apellido, cedula, fechaNacimiento, telefono, correo }, hashContrasena, creadoEn) {
  return db.prepare(`
    INSERT INTO usuarios (rol, nombre, apellido, cedula, fecha_nacimiento, telefono, correo, hash_contrasena, creado_en)
    VALUES ('cliente', ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(nombre, apellido, cedula, fechaNacimiento, telefono, correo, hashContrasena, creadoEn).lastInsertRowid;
}

module.exports = { existeCedulaOCorreo, crearCliente };
