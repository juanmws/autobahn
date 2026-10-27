// RF-04 y RN-05. Los valores esperados se calcularon aparte con la formula del sistema frances.
const {
  PARAMETROS, MENSAJES, leerMonto, abonoMinimo, calcularFinanciamiento,
} = require('../../src/reglas/financiamiento');

const USADO_30000 = { precioCentavos: 3000000, condicion: 'usado' };
const NUEVO_A3 = { precioCentavos: 4290000, condicion: 'nuevo' };

describe('parámetros de la RN-05', () => {
  test('nuevo: 6.5 % anual, abono mínimo de 10 % y plazos de 12 a 96 meses', () => {
    expect(PARAMETROS.nuevo).toEqual({
      tasaAnualPorcentaje: 6.5, abonoMinimoPorcentaje: 10, plazos: [12, 24, 36, 48, 60, 72, 84, 96],
    });
  });

  test('usado: 8.5 % anual, abono mínimo de 20 % y plazos de 12 a 72 meses', () => {
    expect(PARAMETROS.usado).toEqual({
      tasaAnualPorcentaje: 8.5, abonoMinimoPorcentaje: 20, plazos: [12, 24, 36, 48, 60, 72],
    });
  });
});

describe('leerMonto', () => {
  test.each([
    ['6000', 600000], ['6,000.50', 600050], ['B/. 6,000', 600000], [' 6000.5 ', 600050], ['0.01', 1],
  ])('"%s" son %i centavos', (texto, centavos) => {
    expect(leerMonto(texto)).toBe(centavos);
  });

  test.each(['', 'abc', '-5', '6000.555', '1e3', '6.000,50', undefined])('"%s" no es un monto válido', (texto) => {
    expect(leerMonto(texto)).toBeNull();
  });
});

describe('abonoMinimo', () => {
  test('es el 10 % del precio de un auto nuevo', () => {
    expect(abonoMinimo(4290000, 'nuevo')).toBe(429000);
  });

  test('es el 20 % del precio de un auto usado', () => {
    expect(abonoMinimo(2750000, 'usado')).toBe(550000);
  });

  test('se redondea hacia arriba al centavo, para no quedar por debajo del porcentaje', () => {
    expect(abonoMinimo(1999999, 'usado')).toBe(400000);
  });
});

describe('calcularFinanciamiento', () => {
  test('reproduce el ejemplo del E1: usado de B/. 30,000, abono de B/. 6,000 a 60 meses', () => {
    expect(calcularFinanciamiento({ ...USADO_30000, abonoCentavos: 600000, plazo: '60' })).toEqual({
      valido: true,
      resultado: {
        montoCentavos: 2400000, cuotaCentavos: 49240, interesesCentavos: 554400, totalCentavos: 3554400,
        tasaAnualPorcentaje: 8.5, plazo: 60,
      },
    });
  });

  test('un auto nuevo usa la tasa de 6.5 %', () => {
    const { resultado } = calcularFinanciamiento({ ...NUEVO_A3, abonoCentavos: 429000, plazo: 72 });
    expect(resultado.cuotaCentavos).toBe(64903);
    expect(resultado.interesesCentavos).toBe(812016);
    expect(resultado.totalCentavos).toBe(5102016);
  });

  test('acepta un abono exactamente igual al mínimo', () => {
    expect(calcularFinanciamiento({ ...NUEVO_A3, abonoCentavos: 429000, plazo: 12 }).valido).toBe(true);
  });

  test('rechaza un abono un centavo por debajo del mínimo (FA-1)', () => {
    expect(calcularFinanciamiento({ ...NUEVO_A3, abonoCentavos: 428999, plazo: 12 })).toEqual({
      valido: false,
      errores: { abono: 'El abono mínimo para este auto es de B/. 4,290.00 (10 % del precio)' },
    });
  });

  test('acepta un monto a financiar de exactamente B/. 1,000.00', () => {
    const { resultado } = calcularFinanciamiento({ ...NUEVO_A3, abonoCentavos: 4190000, plazo: 12 });
    expect(resultado.montoCentavos).toBe(100000);
    expect(resultado.cuotaCentavos).toBe(8630);
  });

  test.each([
    ['B/. 999.99', 4190001], ['cero', 4290000], ['negativo', 5000000],
  ])('rechaza un monto a financiar %s (FA-2)', (_, abonoCentavos) => {
    expect(calcularFinanciamiento({ ...NUEVO_A3, abonoCentavos, plazo: 12 }).errores)
      .toEqual({ abono: MENSAJES.montoMinimo });
  });

  test.each([96, '96'])('acepta 96 meses para un auto nuevo (%p)', (plazo) => {
    expect(calcularFinanciamiento({ ...NUEVO_A3, abonoCentavos: 429000, plazo }).valido).toBe(true);
  });

  test.each([84, 96])('rechaza %i meses para un auto usado', (plazo) => {
    expect(calcularFinanciamiento({ ...USADO_30000, abonoCentavos: 600000, plazo }).errores)
      .toEqual({ plazo: MENSAJES.plazo });
  });

  test.each([0, 13, 108, 'abc', '', undefined])('rechaza el plazo %p', (plazo) => {
    expect(calcularFinanciamiento({ ...NUEVO_A3, abonoCentavos: 429000, plazo }).errores)
      .toEqual({ plazo: MENSAJES.plazo });
  });

  test('un abono que no se pudo leer da el mensaje de formato', () => {
    expect(calcularFinanciamiento({ ...NUEVO_A3, abonoCentavos: null, plazo: 12 }).errores)
      .toEqual({ abono: MENSAJES.formatoAbono });
  });

  test('informa los dos errores a la vez', () => {
    const { errores } = calcularFinanciamiento({ ...USADO_30000, abonoCentavos: 1, plazo: 84 });
    expect(Object.keys(errores).sort()).toEqual(['abono', 'plazo']);
  });

  test('una condición desconocida es un error de programación', () => {
    expect(() => calcularFinanciamiento({ precioCentavos: 100, condicion: 'seminuevo', abonoCentavos: 1, plazo: 12 }))
      .toThrow('Condición desconocida');
  });
});
