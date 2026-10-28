// RF-03 y RN-04: manejo de la lista de comparación (valores límite de 2 a 3 autos), valores resaltados y
// la página a la que se vuelve después de agregar un auto.
const {
  MENSAJES, leerLista, agregar, quitar, puedeComparar, mejores, rutaDeVuelta,
} = require('../../src/reglas/comparacion');

describe('leerLista', () => {
  test('una lista guardada en la sesión se conserva', () => {
    expect(leerLista([2, 11, 32])).toEqual([2, 11, 32]);
  });

  test.each([[undefined], ['2,11'], [{}], [[2, 'x']], [[0]], [[2, 2]], [[1, 2, 3, 4]]])(
    '%p no es una lista válida y empieza vacía', (valor) => {
      expect(leerLista(valor)).toEqual([]);
    });
});

describe('agregar (valores límite de RN-04)', () => {
  test.each([
    [[], 5, [5]],
    [[5], 7, [5, 7]],
    [[5, 7], 9, [5, 7, 9]],
  ])('con %p agrega el auto %i', (lista, autoId, esperada) => {
    expect(agregar(lista, autoId)).toEqual({ lista: esperada, motivo: null });
  });

  test('FA-2: un cuarto auto no entra', () => {
    expect(agregar([5, 7, 9], 11)).toEqual({ lista: [5, 7, 9], motivo: 'lleno' });
  });

  test('FA-3: un auto repetido no se agrega de nuevo', () => {
    expect(agregar([5], 5)).toEqual({ lista: [5], motivo: 'repetido' });
  });

  test('con la lista llena, un auto que ya está es repetido y no lleno', () => {
    expect(agregar([5, 7, 9], 7).motivo).toBe('repetido');
  });

  test('no cambia la lista original', () => {
    const lista = [5];
    agregar(lista, 7);
    expect(lista).toEqual([5]);
  });
});

describe('quitar (FA-1)', () => {
  test('quita el auto y deja los demás en su orden', () => {
    expect(quitar([5, 7, 9], 7)).toEqual([5, 9]);
  });

  test('quitar un auto que no está no cambia nada', () => {
    expect(quitar([5, 7], 9)).toEqual([5, 7]);
  });
});

describe('puedeComparar: de 2 a 3 autos', () => {
  test.each([[[], false], [[5], false], [[5, 7], true], [[5, 7, 9], true]])('%p da %p', (lista, puede) => {
    expect(puedeComparar(lista)).toBe(puede);
  });
});

describe('mejores (paso 4)', () => {
  const auto = (id, precio, anio, km) => ({ id, precio_centavos: precio, anio, kilometraje: km });

  test('resalta el menor precio, el año más reciente y el menor kilometraje', () => {
    // BMW 320i usado contra el nuevo
    const autos = [auto(2, 2750000, 2019, 58000), auto(11, 5490000, 2026, 0)];
    expect(mejores(autos)).toEqual({ precio: [2], anio: [11], kilometraje: [11] });
  });

  test('con un empate resalta a todos los empatados', () => {
    const autos = [auto(1, 4290000, 2026, 0), auto(3, 4650000, 2026, 0), auto(2, 2750000, 2019, 58000)];
    expect(mejores(autos)).toEqual({ precio: [2], anio: [1, 3], kilometraje: [1, 3] });
  });

  test('si todos tienen el mismo valor no resalta ninguno, porque ninguno destaca', () => {
    const autos = [auto(1, 4290000, 2026, 0), auto(3, 4650000, 2026, 0)];
    expect(mejores(autos)).toEqual({ precio: [1], anio: [], kilometraje: [] });
  });
});

describe('rutaDeVuelta', () => {
  test.each([
    ['/autos/12', '/autos/12'],
    ['/catalogo', '/catalogo'],
    ['/catalogo?marca=BMW&orden=precio_asc&pagina=2', '/catalogo?marca=BMW&orden=precio_asc&pagina=2'],
    ['/catalogo?marca=Toyota&otro=1', '/catalogo'],
    ['/', '/'],
  ])('%s vuelve a %s', (volver, ruta) => {
    expect(rutaDeVuelta(volver)).toBe(ruta);
  });

  test.each([
    ['https://ejemplo.com'], ['//ejemplo.com'], ['/\\ejemplo.com'], ['/autos/12/../../x'], ['/catalogo/../admin'],
    ['/admin'], [''], [undefined], [['/autos/1']],
  ])('%p no es una página conocida: vuelve al catálogo o al inicio', (volver) => {
    expect(['/', '/catalogo']).toContain(rutaDeVuelta(volver));
  });
});

describe('MENSAJES', () => {
  test('son los del CU-03', () => {
    expect(MENSAJES).toEqual({
      lleno: 'Puedes comparar como máximo 3 autos. Quita uno para agregar otro',
      repetido: 'Este auto ya está en la comparación',
      faltaOtro: 'Agrega al menos otro auto para comparar',
    });
  });
});
