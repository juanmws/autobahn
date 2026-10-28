// RF-08 y RN-10: ofertas por autos usados. Solo se oferta por un auto usado, Disponible y de otro
// cliente; el monto va del 80 % al 100 % del precio publicado y el mensaje es opcional.
const { leerMonto } = require('./financiamiento');
const { formatearPrecio } = require('../formato');

const PORCENTAJE = { minimo: 80, maximo: 100 };
const MENSAJE_MAXIMO = 300;

const MENSAJES = {
  rango: ({ minimoCentavos, maximoCentavos }) =>
    `La oferta debe estar entre ${formatearPrecio(minimoCentavos)} y ${formatearPrecio(maximoCentavos)}`,
  mensaje: 'El mensaje puede tener como máximo 300 caracteres',
  propio: 'No puedes hacer una oferta por tu propio auto',
  pendiente: (montoCentavos) => `Ya tienes una oferta pendiente por este auto, de ${formatearPrecio(montoCentavos)}`,
  enviada: (montoCentavos) => `Tu oferta de ${formatearPrecio(montoCentavos)} fue enviada al vendedor`,
};

// El mínimo se redondea hacia arriba para que nunca quede por debajo del 80 %
function rangoPermitido(precioCentavos) {
  return {
    minimoCentavos: Math.ceil((precioCentavos * PORCENTAJE.minimo) / 100),
    maximoCentavos: (precioCentavos * PORCENTAJE.maximo) / 100,
  };
}

// Precondiciones del CU-08: null si el cliente puede ofertar por el auto
function precondicion(auto, clienteId) {
  if (auto.condicion !== 'usado' || auto.estado !== 'disponible') {
    return 'no_ofertable';
  }
  return auto.vendedor_id === clienteId ? 'propio' : null;
}

function validarOferta({ monto, mensaje, precioCentavos }) {
  const errores = {};
  const rango = rangoPermitido(precioCentavos);
  const montoCentavos = leerMonto(monto);
  if (montoCentavos === null || montoCentavos < rango.minimoCentavos || montoCentavos > rango.maximoCentavos) {
    errores.monto = MENSAJES.rango(rango);
  }

  const texto = mensaje === undefined ? '' : mensaje;
  if (typeof texto !== 'string' || texto.trim().length > MENSAJE_MAXIMO) {
    errores.mensaje = MENSAJES.mensaje;
  }

  if (Object.keys(errores).length > 0) {
    return { valido: false, errores };
  }
  return { valido: true, oferta: { montoCentavos, mensaje: texto.trim() || null } };
}

// Tabla de decisión del CU-08. Las precondiciones y la oferta pendiente (FE-1) terminan el caso de uso,
// así que se revisan antes que los campos.
function decidirOferta({ auto, clienteId, pendiente, monto, mensaje }) {
  const motivo = precondicion(auto, clienteId);
  if (motivo) {
    return { resultado: motivo };
  }
  if (pendiente) {
    return { resultado: 'pendiente' };
  }
  const validacion = validarOferta({ monto, mensaje, precioCentavos: auto.precio_centavos });
  if (!validacion.valido) {
    return { resultado: 'invalida', errores: validacion.errores };
  }
  return { resultado: 'guardar', oferta: validacion.oferta };
}

module.exports = {
  PORCENTAJE, MENSAJE_MAXIMO, MENSAJES, rangoPermitido, precondicion, validarOferta, decidirOferta,
};
