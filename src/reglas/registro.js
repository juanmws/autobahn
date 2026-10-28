// RF-01 y RN-02: validación de los datos de una cuenta de cliente nueva.
const { esFechaIso } = require('../fechas');

const EDAD_MINIMA = 18;
const EDAD_MAXIMA = 120; // una fecha más antigua es un error de digitación
const NOMBRE = /^\p{L}(?:[\p{L}' -]*\p{L})?$/u; // letras, con espacios, guiones o apóstrofos entre ellas
const CEDULA = /^(?:[1-9]|1[0-3]|E|N|PE)-\d{1,4}-\d{1,6}$/; // provincia (1 a 13) o E, N, PE; tomo; asiento
const CELULAR = /^6\d{7}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MENSAJES = {
  nombre: 'Escribe tu nombre: de 2 a 50 letras',
  apellido: 'Escribe tu apellido: de 2 a 50 letras',
  cedula: 'Escribe la cédula con el formato provincia-tomo-asiento, por ejemplo 8-1016-1882 (o con E, N o PE)',
  fechaNacimiento: 'Escribe tu fecha de nacimiento',
  menorDeEdad: 'Debes tener 18 años o más para crear una cuenta',
  telefono: 'Escribe un celular de 8 dígitos que empiece con 6, por ejemplo 6123-4567',
  correo: 'Escribe un correo válido, por ejemplo nombre@correo.com',
  contrasena: 'La contraseña debe tener de 8 a 64 caracteres, con al menos una mayúscula, una minúscula y un número',
  confirmacion: 'Las contraseñas no coinciden',
  terminos: 'Debes aceptar los términos de uso',
};

// Un campo del formulario; una lista (campo repetido a mano) cuenta como vacío
function texto(valor) {
  return typeof valor === 'string' ? valor : '';
}

// Años cumplidos a la fecha: quien cumple años hoy ya los tiene
function edadEn(fechaNacimiento, hoy) {
  const [anio, mes, dia] = fechaNacimiento.split('-').map(Number);
  const yaCumplio = hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
  return hoy.getFullYear() - anio - (yaCumplio ? 0 : 1);
}

function esNombre(valor) {
  return valor.length >= 2 && valor.length <= 50 && NOMBRE.test(valor);
}

function esContrasenaSegura(valor) {
  return valor.length >= 8 && valor.length <= 64 && /\p{Lu}/u.test(valor) && /\p{Ll}/u.test(valor) && /\d/.test(valor);
}

function validarRegistro(entrada, { hoy }) {
  const nombre = texto(entrada.nombre).trim();
  const apellido = texto(entrada.apellido).trim();
  const cedula = texto(entrada.cedula).trim().toUpperCase();
  const fechaNacimiento = texto(entrada.fechaNacimiento).trim();
  const telefono = texto(entrada.telefono).replace(/[\s-]/g, '');
  const correo = texto(entrada.correo).trim().toLowerCase();
  const contrasena = texto(entrada.contrasena);
  const confirmacion = texto(entrada.confirmacion);

  const fechaValida = esFechaIso(fechaNacimiento)
    && edadEn(fechaNacimiento, hoy) >= 0
    && edadEn(fechaNacimiento, hoy) <= EDAD_MAXIMA
    && new Date(`${fechaNacimiento}T00:00:00`) <= hoy;

  // cada regla con su campo; se informan todas las que fallen
  const reglas = [
    ['nombre', esNombre(nombre), MENSAJES.nombre],
    ['apellido', esNombre(apellido), MENSAJES.apellido],
    ['cedula', CEDULA.test(cedula), MENSAJES.cedula],
    ['fechaNacimiento', fechaValida, MENSAJES.fechaNacimiento],
    ['telefono', CELULAR.test(telefono), MENSAJES.telefono],
    ['correo', correo.length <= 254 && CORREO.test(correo), MENSAJES.correo],
    ['contrasena', esContrasenaSegura(contrasena), MENSAJES.contrasena],
    ['terminos', entrada.terminos === 'si', MENSAJES.terminos],
  ];
  const errores = {};
  for (const [campo, cumple, mensaje] of reglas) {
    if (!cumple) {
      errores[campo] = mensaje;
    }
  }
  // FA-2 y FE-2 solo tienen sentido si el dato de base es válido
  if (!errores.contrasena && confirmacion !== contrasena) {
    errores.confirmacion = MENSAJES.confirmacion;
  }
  if (fechaValida && edadEn(fechaNacimiento, hoy) < EDAD_MINIMA) {
    errores.fechaNacimiento = MENSAJES.menorDeEdad;
  }

  if (Object.keys(errores).length > 0) {
    return { valido: false, errores };
  }
  return { valido: true, cuenta: { nombre, apellido, cedula, fechaNacimiento, telefono, correo, contrasena } };
}

module.exports = { MENSAJES, EDAD_MINIMA, edadEn, validarRegistro };
