// Formatos de Panama para la interfaz (RNF-09): precios en balboas, kilometraje y fechas.

const MONEDA = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ENTERO = new Intl.NumberFormat('en-US');

function formatearPrecio(centavos) {
  return `B/. ${MONEDA.format(centavos / 100)}`;
}

function formatearKm(km) {
  return `${ENTERO.format(km)} km`;
}

function dosDigitos(n) {
  return String(n).padStart(2, '0');
}

function formatearFecha(valor) {
  if (valor instanceof Date) {
    return `${dosDigitos(valor.getDate())}/${dosDigitos(valor.getMonth() + 1)}/${valor.getFullYear()}`;
  }
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

// Un decimal como maximo: 10 %, 8.5 %
function formatearPorcentaje(valor) {
  const redondeado = Math.round(valor * 10) / 10;
  return `${Number.isInteger(redondeado) ? redondeado : redondeado.toFixed(1)} %`;
}

const DIAS_DE_LA_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// "2026-10-22" -> "jueves 22/10/2026"
function formatearDia(fechaIso) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  return `${DIAS_DE_LA_SEMANA[new Date(anio, mes - 1, dia).getDay()]} ${formatearFecha(fechaIso)}`;
}

// Bloque de una hora en formato de 24 horas: 11 -> "11:00 a 12:00"
function formatearBloque(hora) {
  return `${hora}:00 a ${hora + 1}:00`;
}

// Celular de 8 digitos como se escribe en Panama: "61234507" -> "6123-4507"
function formatearTelefono(telefono) {
  return `${telefono.slice(0, 4)}-${telefono.slice(4)}`;
}

// Textos que se muestran para los valores que se guardan en la base de datos
const ETIQUETAS = {
  condicion: { nuevo: 'Nuevo', usado: 'Usado' },
  transmision: { automatica: 'Automática', manual: 'Manual' },
  combustible: { gasolina: 'Gasolina', diesel: 'Diésel', hibrido: 'Híbrido', electrico: 'Eléctrico' },
  estado: { en_revision: 'En revisión', disponible: 'Disponible', rechazada: 'Rechazada' },
  oferta: { pendiente: 'Pendiente' },
};

module.exports = {
  formatearPrecio, formatearKm, formatearFecha, formatearPorcentaje, formatearDia, formatearBloque, formatearTelefono,
  ETIQUETAS,
};
