// RF-06 y RN-08: transiciones de estado de una publicación y motivo de rechazo.
const { ESTADOS, MENSAJES, puedeCambiar, estadosOrigen, validarMotivo } = require('../../src/reglas/revision');

describe('transición de estados (RN-08)', () => {
  // tabla completa de estados: de cada estado a cada estado
  const validas = new Set(['en_revision>disponible', 'en_revision>rechazada']);
  const pares = ESTADOS.flatMap((desde) => ESTADOS.map((hacia) => [desde, hacia]));

  test('los estados son En revisión, Disponible y Rechazada', () => {
    expect(ESTADOS).toEqual(['en_revision', 'disponible', 'rechazada']);
  });

  test.each(pares)('de %s a %s', (desde, hacia) => {
    expect(puedeCambiar(desde, hacia)).toBe(validas.has(`${desde}>${hacia}`));
  });

  test('un estado desconocido no puede cambiar', () => {
    expect(puedeCambiar('vendido', 'disponible')).toBe(false);
  });

  test('a Disponible y a Rechazada solo se llega desde En revisión', () => {
    expect(estadosOrigen('disponible')).toEqual(['en_revision']);
    expect(estadosOrigen('rechazada')).toEqual(['en_revision']);
    expect(estadosOrigen('en_revision')).toEqual([]);
  });
});

describe('validarMotivo (FA-2)', () => {
  test.each([[10], [300]])('acepta un motivo de %i caracteres', (largo) => {
    expect(validarMotivo('x'.repeat(largo))).toEqual({ valido: true, motivo: 'x'.repeat(largo) });
  });

  test.each([[9], [301], [0]])('rechaza un motivo de %i caracteres', (largo) => {
    expect(validarMotivo('x'.repeat(largo))).toEqual({ valido: false, error: 'El motivo debe tener de 10 a 300 caracteres' });
  });

  test('los espacios alrededor no cuentan y se quitan', () => {
    expect(validarMotivo(`   ${'x'.repeat(9)}   `).valido).toBe(false);
    expect(validarMotivo('  Fotos borrosas.  ')).toEqual({ valido: true, motivo: 'Fotos borrosas.' });
  });

  test('un motivo que llega como lista (formulario manipulado) es inválido', () => {
    expect(validarMotivo(['Motivo largo uno', 'Motivo largo dos'])).toEqual({ valido: false, error: MENSAJES.motivo });
  });
});
