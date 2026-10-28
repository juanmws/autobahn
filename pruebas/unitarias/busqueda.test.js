// RF-02 y RN-03: lectura de los filtros del catálogo (partición de equivalencia y valores límite de los
// rangos) y construcción de la consulta (caja blanca, Tabla 3 del E1).
const { MENSAJES, ORDENES, leerBusqueda, enlaceDeBusqueda } = require('../../src/reglas/busqueda');
const { construirConsulta } = require('../../src/consultas/autos');

const VACIOS = {
  marca: '', modelo: '', condicion: '', precioMin: '', precioMax: '', anioDesde: '', anioHasta: '',
  kmMaximo: '', transmision: '', combustible: '',
};

describe('leerBusqueda: sin filtros', () => {
  test('una consulta vacía no filtra y ordena de los más recientes a los más antiguos', () => {
    expect(leerBusqueda({})).toEqual({
      valido: true, filtros: {}, errores: {}, valores: VACIOS, orden: 'recientes', hayFiltros: false,
    });
  });

  test('la página no es un filtro', () => {
    expect(leerBusqueda({ pagina: '2' }).hayFiltros).toBe(false);
  });
});

describe('leerBusqueda: filtros de lista (partición de equivalencia)', () => {
  test.each([
    ['marca', 'BMW', 'BMW'],
    ['condicion', 'usado', 'usado'],
    ['condicion', 'nuevo', 'nuevo'],
    ['transmision', 'manual', 'manual'],
    ['combustible', 'diesel', 'diesel'],
    ['modelo', ' 320i ', '320i'],
    ['kmMaximo', '60000', 60000],
    ['kmMaximo', '60,000', 60000],
  ])('%s=%p filtra por %p', (clave, valor, filtro) => {
    const busqueda = leerBusqueda({ [clave]: valor });
    expect(busqueda.filtros).toEqual({ [clave]: filtro });
    expect(busqueda.hayFiltros).toBe(true);
  });

  test.each([
    ['marca', 'Toyota'],
    ['condicion', 'ambos'],
    ['condicion', 'seminuevo'],
    ['transmision', 'cvt'],
    ['combustible', 'gas'],
    ['modelo', '   '],
    ['kmMaximo', 'mucho'],
    ['marca', ['BMW', 'Audi']],
  ])('%s=%p se ignora y no se devuelve al formulario', (clave, valor) => {
    const busqueda = leerBusqueda({ [clave]: valor });
    expect(busqueda).toMatchObject({ valido: true, filtros: {}, hayFiltros: false });
    expect(busqueda.valores[clave]).toBe('');
  });

  test('los filtros se combinan entre sí (RN-03)', () => {
    expect(leerBusqueda({ marca: 'Volkswagen', condicion: 'usado', transmision: 'manual' }).filtros)
      .toEqual({ marca: 'Volkswagen', condicion: 'usado', transmision: 'manual' });
  });
});

describe('leerBusqueda: rango de precio (valores límite y FA-1)', () => {
  test.each([
    [{ precioMin: '20,000' }, { precioMin: 2000000 }],
    [{ precioMax: 'B/. 30,000.50' }, { precioMax: 3000050 }],
    [{ precioMin: '27,500', precioMax: '27,500' }, { precioMin: 2750000, precioMax: 2750000 }],
    [{ precioMin: '27,499.99', precioMax: '27,500' }, { precioMin: 2749999, precioMax: 2750000 }],
  ])('%p es válido', (consulta, filtros) => {
    expect(leerBusqueda(consulta)).toMatchObject({ valido: true, filtros, errores: {} });
  });

  test('un mínimo un centavo mayor que el máximo no aplica ningún filtro', () => {
    expect(leerBusqueda({ marca: 'BMW', precioMin: '27,500.01', precioMax: '27,500' })).toMatchObject({
      valido: false, filtros: {}, hayFiltros: false,
      errores: { precio: 'El valor mínimo no puede ser mayor que el máximo' },
      valores: { marca: 'BMW', precioMin: '27,500.01', precioMax: '27,500' },
    });
  });

  test.each(['veinte mil', '-5000', '1.234'])('un precio "%s" no es un monto válido', (precioMin) => {
    expect(leerBusqueda({ precioMin })).toMatchObject({ valido: false, errores: { precio: MENSAJES.precio } });
  });
});

describe('leerBusqueda: rango de año (valores límite y FA-1)', () => {
  test.each([
    [{ anioDesde: '2019' }, { anioDesde: 2019 }],
    [{ anioHasta: '2021' }, { anioHasta: 2021 }],
    [{ anioDesde: '2019', anioHasta: '2019' }, { anioDesde: 2019, anioHasta: 2019 }],
  ])('%p es válido', (consulta, filtros) => {
    expect(leerBusqueda(consulta)).toMatchObject({ valido: true, filtros });
  });

  test('un año desde mayor que el año hasta no aplica ningún filtro', () => {
    expect(leerBusqueda({ anioDesde: '2020', anioHasta: '2019' })).toMatchObject({
      valido: false, filtros: {}, errores: { anio: 'El valor mínimo no puede ser mayor que el máximo' },
    });
  });

  test('un año que no son cuatro dígitos se ignora', () => {
    expect(leerBusqueda({ anioDesde: '20x9' }).filtros).toEqual({});
  });

  test('con los dos rangos al revés devuelve los dos errores', () => {
    const busqueda = leerBusqueda({ precioMin: '30000', precioMax: '20000', anioDesde: '2022', anioHasta: '2018' });
    expect(Object.keys(busqueda.errores)).toEqual(['precio', 'anio']);
  });
});

describe('leerBusqueda: orden', () => {
  test.each(Object.keys(ORDENES))('acepta el orden %s', (orden) => {
    expect(leerBusqueda({ orden }).orden).toBe(orden);
  });

  test.each(['precio', '', ['precio_asc']])('un orden %p desconocido es el de los más recientes', (orden) => {
    expect(leerBusqueda({ orden }).orden).toBe('recientes');
  });

  test('el orden no cuenta como filtro', () => {
    expect(leerBusqueda({ orden: 'precio_asc' }).hayFiltros).toBe(false);
  });
});

describe('enlaceDeBusqueda (FA-2)', () => {
  test('sin filtros ni orden es el catálogo', () => {
    expect(enlaceDeBusqueda(leerBusqueda({}), 1)).toBe('/catalogo');
  });

  test('otra página conserva los filtros y el orden, sin los campos vacíos', () => {
    const busqueda = leerBusqueda({ condicion: 'nuevo', precioMax: '50,000', orden: 'precio_asc', marca: '' });
    expect(enlaceDeBusqueda(busqueda, 2)).toBe('/catalogo?condicion=nuevo&precioMax=50%2C000&orden=precio_asc&pagina=2');
  });
});

describe('construirConsulta (caja blanca)', () => {
  test('sin filtros solo pide autos Disponible, de los más recientes a los más antiguos', () => {
    expect(construirConsulta({}, 'recientes')).toEqual({
      where: "a.estado = 'disponible'", parametros: [], ordenSql: 'a.creado_en DESC, a.id DESC',
    });
  });

  test('con todos los filtros agrega una condición por filtro y Disponible sigue primero', () => {
    const filtros = {
      marca: 'BMW', modelo: '320i', condicion: 'usado', precioMin: 1, precioMax: 2, anioDesde: 2015,
      anioHasta: 2020, kmMaximo: 60000, transmision: 'automatica', combustible: 'gasolina',
    };
    const { where, parametros } = construirConsulta(filtros, 'recientes');
    expect(where).toBe("a.estado = 'disponible' AND a.marca = ? AND a.modelo = ? AND a.condicion = ? "
      + 'AND a.precio_centavos >= ? AND a.precio_centavos <= ? AND a.anio >= ? AND a.anio <= ? '
      + 'AND a.kilometraje <= ? AND a.transmision = ? AND a.combustible = ?');
    expect(parametros).toEqual(['BMW', '320i', 'usado', 1, 2, 2015, 2020, 60000, 'automatica', 'gasolina']);
  });

  test('los parámetros siguen el orden de las condiciones aunque los filtros lleguen en otro', () => {
    expect(construirConsulta({ combustible: 'diesel', marca: 'Porsche' }, 'recientes').parametros)
      .toEqual(['Porsche', 'diesel']);
  });

  test.each([
    ['precio_asc', 'a.precio_centavos ASC, a.creado_en DESC, a.id DESC'],
    ['precio_desc', 'a.precio_centavos DESC, a.creado_en DESC, a.id DESC'],
    ['anio_desc', 'a.anio DESC, a.creado_en DESC, a.id DESC'],
    ['km_asc', 'a.kilometraje ASC, a.creado_en DESC, a.id DESC'],
    ['otro', 'a.creado_en DESC, a.id DESC'],
  ])('el orden %s desempata por fecha e id para que las páginas no se mezclen', (orden, ordenSql) => {
    expect(construirConsulta({}, orden).ordenSql).toBe(ordenSql);
  });
});
