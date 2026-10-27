const { crearReloj, marcaDeTiempo } = require('../../src/reloj');

describe('crearReloj', () => {
  test('con una fecha fija devuelve siempre esa fecha', () => {
    const reloj = crearReloj('2026-10-20T10:00:00');
    expect(reloj.ahora().getFullYear()).toBe(2026);
    expect(reloj.ahora().getMonth()).toBe(9);
    expect(reloj.ahora().getDate()).toBe(20);
    expect(reloj.ahora().getHours()).toBe(10);
  });

  test('anioActual sale de la fecha fija, no del reloj de la computadora', () => {
    expect(crearReloj('2031-03-01T08:00:00').anioActual()).toBe(2031);
  });

  test('sin fecha fija usa la hora real', () => {
    const antes = Date.now();
    const ahora = crearReloj().ahora().getTime();
    expect(ahora).toBeGreaterThanOrEqual(antes);
    expect(ahora - antes).toBeLessThan(1000);
  });

  test('cada llamada devuelve una copia que no altera el reloj', () => {
    const reloj = crearReloj('2026-10-20T10:00:00');
    reloj.ahora().setFullYear(1999);
    expect(reloj.anioActual()).toBe(2026);
  });

  test('rechaza una fecha fija inválida', () => {
    expect(() => crearReloj('20/10/2026')).toThrow('Fecha fija inválida');
  });
});

describe('marcaDeTiempo', () => {
  test('da la fecha y la hora local en el formato que guarda la base de datos', () => {
    expect(marcaDeTiempo(new Date(2026, 9, 20, 9, 5, 7))).toBe('2026-10-20T09:05:07');
  });
});
