const {
  formatearPrecio, formatearKm, formatearFecha, formatearPorcentaje, formatearDia, formatearBloque, ETIQUETAS,
} = require('../../src/formato');

describe('formatearPrecio (RNF-09)', () => {
  test('muestra balboas con separador de miles y dos decimales', () => {
    expect(formatearPrecio(2500000)).toBe('B/. 25,000.00');
  });

  test('conserva los centavos', () => {
    expect(formatearPrecio(49240)).toBe('B/. 492.40');
  });

  test('muestra montos de seis cifras', () => {
    expect(formatearPrecio(14800000)).toBe('B/. 148,000.00');
  });
});

describe('formatearKm', () => {
  test('agrega separador de miles y la unidad', () => {
    expect(formatearKm(35000)).toBe('35,000 km');
  });

  test('muestra el cero de los autos nuevos', () => {
    expect(formatearKm(0)).toBe('0 km');
  });
});

describe('formatearFecha (RNF-09)', () => {
  test('convierte una fecha AAAA-MM-DD a dd/mm/aaaa', () => {
    expect(formatearFecha('2026-10-20')).toBe('20/10/2026');
  });

  test('acepta un objeto Date y usa la fecha local', () => {
    expect(formatearFecha(new Date(2026, 0, 5, 23, 30))).toBe('05/01/2026');
  });
});

describe('formatearPorcentaje', () => {
  test.each([[10, '10 %'], [8.5, '8.5 %'], [20.004, '20 %'], [33.333, '33.3 %']])('%p se muestra como "%s"', (valor, texto) => {
    expect(formatearPorcentaje(valor)).toBe(texto);
  });
});

describe('formatearDia y formatearBloque (RNF-09)', () => {
  test.each([['2026-10-21', 'miércoles 21/10/2026'], ['2026-10-24', 'sábado 24/10/2026'], ['2026-10-26', 'lunes 26/10/2026']])(
    '%s es "%s"', (fecha, texto) => {
      expect(formatearDia(fecha)).toBe(texto);
    });

  test.each([[9, '9:00 a 10:00'], [16, '16:00 a 17:00']])('el bloque de las %i es "%s"', (hora, texto) => {
    expect(formatearBloque(hora)).toBe(texto);
  });
});

describe('ETIQUETAS', () => {
  test('traduce los valores guardados a texto con tildes', () => {
    expect(ETIQUETAS.estado.en_revision).toBe('En revisión');
    expect(ETIQUETAS.transmision.automatica).toBe('Automática');
    expect(ETIQUETAS.combustible.diesel).toBe('Diésel');
    expect(ETIQUETAS.condicion.usado).toBe('Usado');
  });
});
