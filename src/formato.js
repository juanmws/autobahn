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

// Textos que se muestran para los valores que se guardan en la base de datos
const ETIQUETAS = {
  condicion: { nuevo: 'Nuevo', usado: 'Usado' },
  transmision: { automatica: 'Automática', manual: 'Manual' },
  combustible: { gasolina: 'Gasolina', diesel: 'Diésel', hibrido: 'Híbrido', electrico: 'Eléctrico' },
  estado: { en_revision: 'En revisión', disponible: 'Disponible', rechazada: 'Rechazada' },
};

module.exports = { formatearPrecio, formatearKm, formatearFecha, ETIQUETAS };
