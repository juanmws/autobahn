// RF-08 y RN-10: rango de la oferta, mensaje y tabla de decisión del CU-08.
// Precio de referencia: el BMW 320i usado de los datos de prueba, B/. 27,500.00.
const { MENSAJES, rangoPermitido, validarOferta, decidirOferta } = require('../../src/reglas/ofertas');

const PRECIO = 2750000;
const RANGO = 'La oferta debe estar entre B/. 22,000.00 y B/. 27,500.00';

describe('rangoPermitido (RN-10)', () => {
  test('va del 80 % al 100 % del precio publicado', () => {
    expect(rangoPermitido(PRECIO)).toEqual({ minimoCentavos: 2200000, maximoCentavos: 2750000 });
  });

  test('el mínimo se redondea hacia arriba para no quedar por debajo del 80 %', () => {
    // 80 % de B/. 19,800.01 son B/. 15,840.008
    expect(rangoPermitido(1980001).minimoCentavos).toBe(1584001);
  });
});

describe('validarOferta: monto (valores límite y FA-1)', () => {
  test.each([
    ['22,000.00', 2200000, '80 % exacto'],
    ['22000', 2200000, 'sin comas ni decimales'],
    ['B/. 24,750.50', 2475050, 'con el símbolo del balboa'],
    ['27,500.00', 2750000, '100 % exacto'],
  ])('acepta %s (%s centavos, %s)', (monto, centavos) => {
    expect(validarOferta({ monto, precioCentavos: PRECIO })).toEqual({
      valido: true, oferta: { montoCentavos: centavos, mensaje: null },
    });
  });

  test.each([
    ['21,999.99', 'un centavo por debajo del 80 %'],
    ['27,500.01', 'un centavo por encima del precio'],
    ['0', 'cero'],
    ['', 'vacío'],
    ['veinte mil', 'texto'],
    ['-22000', 'negativo'],
    ['22000.123', 'tres decimales'],
  ])('rechaza "%s" (%s)', (monto) => {
    expect(validarOferta({ monto, precioCentavos: PRECIO })).toEqual({ valido: false, errores: { monto: RANGO } });
  });

  test('un monto que llega como lista (formulario manipulado) es inválido', () => {
    expect(validarOferta({ monto: ['22000', '23000'], precioCentavos: PRECIO }).errores.monto).toBe(RANGO);
  });
});

describe('validarOferta: mensaje (FA-2)', () => {
  test.each([[undefined], [''], ['   ']])('el mensaje es opcional (%p queda en null)', (mensaje) => {
    expect(validarOferta({ monto: '23000', mensaje, precioCentavos: PRECIO }).oferta.mensaje).toBeNull();
  });

  test('acepta 300 caracteres y quita los espacios de los extremos', () => {
    const mensaje = 'x'.repeat(300);
    expect(validarOferta({ monto: '23000', mensaje: `  ${mensaje}  `, precioCentavos: PRECIO }).oferta.mensaje).toBe(mensaje);
  });

  test('rechaza 301 caracteres', () => {
    expect(validarOferta({ monto: '23000', mensaje: 'x'.repeat(301), precioCentavos: PRECIO })).toEqual({
      valido: false, errores: { mensaje: 'El mensaje puede tener como máximo 300 caracteres' },
    });
  });

  test('un mensaje que llega como lista es inválido', () => {
    expect(validarOferta({ monto: '23000', mensaje: ['a', 'b'], precioCentavos: PRECIO }).errores.mensaje)
      .toBe(MENSAJES.mensaje);
  });

  test('con el monto y el mensaje inválidos devuelve los dos errores', () => {
    expect(validarOferta({ monto: '1', mensaje: 'x'.repeat(301), precioCentavos: PRECIO }).errores)
      .toEqual({ monto: RANGO, mensaje: MENSAJES.mensaje });
  });
});

describe('decidirOferta: tabla de decisión del CU-08', () => {
  const CLIENTE = 2;
  const usado = { condicion: 'usado', estado: 'disponible', vendedor_id: 1, precio_centavos: PRECIO };
  const pendiente = { monto_centavos: 2300000 };

  // C1 usado y Disponible, C2 de otro cliente, C3 sin oferta pendiente, C4 monto en rango, C5 mensaje de 300 o menos
  test.each([
    ['R1', usado, null, '23000', 'Hola', 'guardar'],
    ['R2 (auto nuevo)', { ...usado, condicion: 'nuevo', vendedor_id: null }, null, '23000', '', 'no_ofertable'],
    ['R2 (en revisión)', { ...usado, estado: 'en_revision' }, null, '23000', '', 'no_ofertable'],
    ['R3', { ...usado, vendedor_id: CLIENTE }, null, '23000', '', 'propio'],
    ['R4', usado, pendiente, '23000', '', 'pendiente'],
    ['R4 (aunque el monto sea inválido)', usado, pendiente, '1', '', 'pendiente'],
    ['R5', usado, null, '1', '', 'invalida'],
    ['R6', usado, null, '23000', 'x'.repeat(301), 'invalida'],
    ['R7', usado, null, '1', 'x'.repeat(301), 'invalida'],
  ])('%s', (_, auto, ofertaPendiente, monto, mensaje, resultado) => {
    const decision = decidirOferta({ auto, clienteId: CLIENTE, pendiente: ofertaPendiente, monto, mensaje });
    expect(decision.resultado).toBe(resultado);
  });

  test('R1 devuelve la oferta lista para guardar', () => {
    expect(decidirOferta({ auto: usado, clienteId: CLIENTE, pendiente: null, monto: '23,000', mensaje: ' Hola ' }))
      .toEqual({ resultado: 'guardar', oferta: { montoCentavos: 2300000, mensaje: 'Hola' } });
  });

  test('R7 devuelve los errores de los dos campos', () => {
    const decision = decidirOferta({ auto: usado, clienteId: CLIENTE, pendiente: null, monto: '1', mensaje: 'x'.repeat(301) });
    expect(Object.keys(decision.errores)).toEqual(['monto', 'mensaje']);
  });
});

describe('MENSAJES', () => {
  test('FE-1 y la confirmación llevan el monto con formato de balboas', () => {
    expect(MENSAJES.pendiente(2300000)).toBe('Ya tienes una oferta pendiente por este auto, de B/. 23,000.00');
    expect(MENSAJES.enviada(2475050)).toBe('Tu oferta de B/. 24,750.50 fue enviada al vendedor');
  });
});
