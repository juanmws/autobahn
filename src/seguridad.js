// RNF-04: las contrasenas se guardan con bcrypt de costo 10 o mayor, nunca en texto plano.
const bcrypt = require('bcryptjs');

const COSTO_BCRYPT = 10;

function cifrarContrasena(contrasena) {
  return bcrypt.hash(contrasena, COSTO_BCRYPT);
}

module.exports = { COSTO_BCRYPT, cifrarContrasena };
