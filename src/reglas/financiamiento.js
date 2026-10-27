// RF-04 y RN-05: calculo referencial de la cuota mensual con el sistema frances.
// Todo el dinero va en centavos enteros; la cuota se redondea al centavo.
const { formatearPrecio, formatearPorcentaje } = require('../formato');

const PARAMETROS = {
  nuevo: { tasaAnualPorcentaje: 6.5, abonoMinimoPorcentaje: 10, plazos: [12, 24, 36, 48, 60, 72, 84, 96] },
  usado: { tasaAnualPorcentaje: 8.5, abonoMinimoPorcentaje: 20, plazos: [12, 24, 36, 48, 60, 72] },
};

const MONTO_MINIMO_CENTAVOS = 100000; // B/. 1,000.00

const MENSAJES = {
  formatoAbono: 'Escribe el abono en balboas, por ejemplo 6000 o 6000.50',
  montoMinimo: 'El monto a financiar debe ser de al menos B/. 1,000.00',
  plazo: 'Elige uno de los plazos permitidos',
};

function parametrosDe(condicion) {
  const parametros = PARAMETROS[condicion];
  if (!parametros) {
    throw new Error(`Condición desconocida: ${condicion}`);
  }
  return parametros;
}

// Convierte lo que escribe el usuario ("6000", "6,000.50", "B/. 6,000") a centavos; null si no es un monto.
function leerMonto(texto) {
  if (typeof texto !== 'string') {
    return null;
  }
  const limpio = texto.trim().replace(/^B\/\.\s*/, '').replace(/,(?=\d{3}(\D|$))/g, '');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(limpio)) {
    return null;
  }
  const [entero, decimales = ''] = limpio.split('.');
  return Number(entero) * 100 + Number(decimales.padEnd(2, '0'));
}

// Se redondea hacia arriba para que el abono minimo nunca quede por debajo del porcentaje.
function abonoMinimo(precioCentavos, condicion) {
  return Math.ceil((precioCentavos * parametrosDe(condicion).abonoMinimoPorcentaje) / 100);
}

// Cuota = M * i / (1 - (1 + i)^-n), con i la tasa mensual
function calcularCuota(montoCentavos, tasaAnualPorcentaje, plazo) {
  const i = tasaAnualPorcentaje / 100 / 12;
  return Math.round((montoCentavos * i) / (1 - (1 + i) ** -plazo));
}

function calcularFinanciamiento({ precioCentavos, condicion, abonoCentavos, plazo }) {
  const parametros = parametrosDe(condicion);
  const meses = Number(plazo);
  const errores = {};

  if (!parametros.plazos.includes(meses)) {
    errores.plazo = MENSAJES.plazo;
  }
  if (abonoCentavos === null || abonoCentavos === undefined) {
    errores.abono = MENSAJES.formatoAbono;
  } else {
    const minimo = abonoMinimo(precioCentavos, condicion);
    if (abonoCentavos < minimo) {
      errores.abono = `El abono mínimo para este auto es de ${formatearPrecio(minimo)} `
        + `(${formatearPorcentaje(parametros.abonoMinimoPorcentaje)} del precio)`;
    } else if (precioCentavos - abonoCentavos < MONTO_MINIMO_CENTAVOS) {
      errores.abono = MENSAJES.montoMinimo;
    }
  }
  if (Object.keys(errores).length > 0) {
    return { valido: false, errores };
  }

  const montoCentavos = precioCentavos - abonoCentavos;
  const cuotaCentavos = calcularCuota(montoCentavos, parametros.tasaAnualPorcentaje, meses);
  const pagadoEnCuotas = cuotaCentavos * meses;
  return {
    valido: true,
    resultado: {
      montoCentavos,
      cuotaCentavos,
      interesesCentavos: pagadoEnCuotas - montoCentavos,
      totalCentavos: abonoCentavos + pagadoEnCuotas,
      tasaAnualPorcentaje: parametros.tasaAnualPorcentaje,
      plazo: meses,
    },
  };
}

module.exports = {
  PARAMETROS, MONTO_MINIMO_CENTAVOS, MENSAJES, leerMonto, abonoMinimo, calcularFinanciamiento,
};
