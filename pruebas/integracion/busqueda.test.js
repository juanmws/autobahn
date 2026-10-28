// CU-02. Buscar autos con filtros (RF-02, RN-03). Los resultados se comparan con un oráculo que filtra en
// JavaScript todos los autos de la base: así la prueba no repite la consulta SQL que está probando.
const request = require('supertest');
const { crearContexto, idsDeTarjetas } = require('../ayudantes');

let ctx;

beforeEach(() => {
  ctx = crearContexto();
});

afterEach(() => ctx.db.close());

const centavos = (texto) => Math.round(Number(texto.replaceAll(',', '')) * 100);

// Oráculo: los autos Disponible que cumplen cada filtro de la consulta
function esperados(consulta) {
  const autos = ctx.db.prepare('SELECT * FROM autos').all();
  const cumple = {
    marca: (a, v) => a.marca === v,
    modelo: (a, v) => a.modelo === v,
    condicion: (a, v) => a.condicion === v,
    precioMin: (a, v) => a.precio_centavos >= centavos(v),
    precioMax: (a, v) => a.precio_centavos <= centavos(v),
    anioDesde: (a, v) => a.anio >= Number(v),
    anioHasta: (a, v) => a.anio <= Number(v),
    kmMaximo: (a, v) => a.kilometraje <= Number(v),
    transmision: (a, v) => a.transmision === v,
    combustible: (a, v) => a.combustible === v,
  };
  return autos
    .filter((a) => a.estado === 'disponible' && Object.entries(consulta).every(([k, v]) => cumple[k](a, v)))
    .map((a) => a.id)
    .sort((x, y) => x - y);
}

// Recorre todas las páginas de una búsqueda y devuelve los ids en el orden mostrado
async function idsDeTodasLasPaginas(consulta) {
  const ids = [];
  let pagina = 1;
  let total = 1;
  do {
    const res = await request(ctx.app).get('/catalogo').query({ ...consulta, pagina });
    expect(res.status).toBe(200);
    ids.push(...idsDeTarjetas(res.text));
    total = Number(res.text.match(/Página \d+ de (\d+)/)[1]);
    pagina += 1;
  } while (pagina <= total);
  return ids;
}

const ordenados = (ids) => [...ids].sort((x, y) => x - y);
const autoPorId = (id) => ctx.db.prepare('SELECT * FROM autos WHERE id = ?').get(id);

describe('filtros combinados (partición de equivalencia)', () => {
  test.each([
    [{}],
    [{ marca: 'BMW' }],
    [{ marca: 'BMW', modelo: '320i' }],
    [{ modelo: 'Tiguan' }],
    [{ condicion: 'usado' }],
    [{ condicion: 'nuevo', combustible: 'electrico' }],
    [{ transmision: 'manual' }],
    [{ combustible: 'diesel', condicion: 'usado' }],
    [{ precioMin: '20,000', precioMax: '30,000' }],
    [{ precioMin: '100,000' }],
    [{ anioDesde: '2019', anioHasta: '2021' }],
    [{ kmMaximo: '50000', condicion: 'usado' }],
    [{
      marca: 'Mercedes-Benz', condicion: 'usado', precioMin: '20,000', precioMax: '45,000', anioDesde: '2019',
      anioHasta: '2021', kmMaximo: '75000', transmision: 'automatica', combustible: 'gasolina',
    }],
  ])('%p muestra exactamente los autos Disponible que cumplen todos los filtros', async (consulta) => {
    expect(ordenados(await idsDeTodasLasPaginas(consulta))).toEqual(esperados(consulta));
  });

  test('el BMW 320i nuevo y el usado salen al filtrar por marca y modelo', async () => {
    expect(ordenados(await idsDeTodasLasPaginas({ marca: 'BMW', modelo: '320i' }))).toEqual([2, 11]);
  });

  test('nunca aparecen autos En revisión ni Rechazados', async () => {
    // AU-0006 (Golf GTI) está En revisión y AU-0028 (Audi A3 2014) está Rechazada
    expect(await idsDeTodasLasPaginas({ marca: 'Volkswagen', transmision: 'manual' })).toEqual([40]);
    expect(await idsDeTodasLasPaginas({ marca: 'Audi', anioHasta: '2016' })).toEqual([8]);
  });
});

describe('valores límite de los rangos', () => {
  test.each([
    [{ marca: 'BMW', precioMin: '27,500', precioMax: '27,500' }, [2]],
    [{ marca: 'BMW', precioMin: '27,499.99', precioMax: '27,500' }, [2]],
    [{ marca: 'BMW', precioMin: '27,500.01', precioMax: '30,000' }, []],
    [{ marca: 'BMW', precioMin: '20,000', precioMax: '27,499.99' }, [32]],
    [{ anioDesde: '2015', anioHasta: '2015' }, [10]],
    [{ anioHasta: '2014' }, []],
    [{ condicion: 'usado', kmMaximo: '18000' }, [40]],
  ])('%p da %p', async (consulta, ids) => {
    expect(ordenados(await idsDeTodasLasPaginas(consulta))).toEqual(ids);
  });
});

describe('paso 4: orden', () => {
  test.each([
    ['precio_asc', (a, b) => a.precio_centavos <= b.precio_centavos],
    ['precio_desc', (a, b) => a.precio_centavos >= b.precio_centavos],
    ['anio_desc', (a, b) => a.anio >= b.anio],
    ['km_asc', (a, b) => a.kilometraje <= b.kilometraje],
    ['recientes', (a, b) => a.creado_en >= b.creado_en],
  ])('%s ordena todas las páginas sin perder ni repetir autos', async (orden, enOrden) => {
    const ids = await idsDeTodasLasPaginas({ orden });
    expect(ordenados(ids)).toEqual(esperados({}));
    const autos = ids.map(autoPorId);
    autos.slice(1).forEach((auto, i) => expect(enOrden(autos[i], auto)).toBe(true));
  });

  test('el orden se aplica sin perder los filtros', async () => {
    const ids = await idsDeTodasLasPaginas({ condicion: 'usado', orden: 'precio_desc' });
    expect(ordenados(ids)).toEqual(esperados({ condicion: 'usado' }));
    expect(autoPorId(ids[0]).precio_centavos).toBe(7950000); // Porsche 911 Carrera usado
  });
});

describe('pasos 1 a 3: panel de filtros y total', () => {
  test('el catálogo muestra el panel, las cinco marcas y el total de disponibles', async () => {
    const res = await request(ctx.app).get('/catalogo');
    expect(res.text).toMatch(/<form[^>]*id="filtros"[^>]*method="get"[^>]*action="\/catalogo"/);
    for (const marca of ['Audi', 'BMW', 'Mercedes-Benz', 'Porsche', 'Volkswagen']) {
      expect(res.text).toContain(`<option value="${marca}">${marca}</option>`);
    }
    expect(res.text).toContain('36 autos disponibles');
    expect(res.text).toContain('<script src="/js/catalogo.js" defer></script>');
  });

  test('paso 2: sin marca la lista de modelos agrupa los de cada marca', async () => {
    const res = await request(ctx.app).get('/catalogo');
    expect(res.text).toContain('<optgroup label="Audi">');
    expect(res.text).toContain('<optgroup label="Volkswagen">');
    expect(res.text).toMatch(/id="modelo"[^>]*data-modelos="[^"]*BMW[^"]*320i/);
  });

  test('paso 2: con una marca elegida, la lista solo tiene sus modelos', async () => {
    const res = await request(ctx.app).get('/catalogo').query({ marca: 'BMW' });
    const lista = res.text.match(/<select id="modelo"[\s\S]*?<\/select>/)[0];
    expect(lista).toContain('<option value="X5 xDrive40i">X5 xDrive40i</option>');
    expect(lista).not.toContain('<option value="A4">');
    expect(lista).not.toContain('<optgroup label="Audi">');
  });

  test('paso 3: los filtros aplicados quedan marcados y el total dice cuántos se encontraron', async () => {
    const res = await request(ctx.app).get('/catalogo')
      .query({ marca: 'BMW', modelo: '320i', condicion: 'usado', precioMax: '30,000', orden: 'precio_asc' });
    expect(res.text).toContain('<option value="BMW" selected>BMW</option>');
    expect(res.text).toContain('<option value="320i" selected>320i</option>');
    expect(res.text).toMatch(/value="usado"[^>]*checked/);
    expect(res.text).toMatch(/id="precioMax"[^>]*value="30,000"/);
    expect(res.text).toContain('<option value="precio_asc" selected>');
    expect(res.text).toContain('1 auto encontrado');
  });

  test('varios resultados se cuentan en plural', async () => {
    expect((await request(ctx.app).get('/catalogo').query({ marca: 'BMW' })).text).toContain('9 autos encontrados');
  });
});

describe('flujos alternativos y de excepción', () => {
  test.each([
    ['precio', { marca: 'BMW', precioMin: '30,000', precioMax: '20,000' }],
    ['anio', { marca: 'BMW', anioDesde: '2022', anioHasta: '2018' }],
  ])('FA-1: el rango de %s al revés muestra el error junto al rango y no aplica los filtros', async (rango, consulta) => {
    const res = await request(ctx.app).get('/catalogo').query(consulta);
    expect(res.status).toBe(422);
    expect(res.text).toContain(`<p class="campo-error" id="error-${rango}">El valor mínimo no puede ser mayor que el máximo</p>`);
    expect(res.text).toContain(`aria-describedby="error-${rango}"`);
    expect(res.text).toContain('36 autos disponibles');
    expect(res.text).toContain('<option value="BMW" selected>BMW</option>');
  });

  test('FA-1: un precio que no es un monto también se señala', async () => {
    const res = await request(ctx.app).get('/catalogo').query({ precioMin: 'veinte mil' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Escribe el precio en balboas, por ejemplo 25,000');
    expect(res.text).toMatch(/id="precioMin"[^>]*value="veinte mil"/);
  });

  test('FA-2: la página siguiente conserva los filtros y el orden', async () => {
    const primera = await request(ctx.app).get('/catalogo').query({ condicion: 'nuevo', orden: 'precio_asc' });
    expect(primera.text).toContain('href="/catalogo?condicion=nuevo&amp;orden=precio_asc&amp;pagina=2"');
    const segunda = await request(ctx.app).get('/catalogo').query({ condicion: 'nuevo', orden: 'precio_asc', pagina: 2 });
    expect(segunda.text).toContain('Página 2 de 2');
    expect(segunda.text).toContain('href="/catalogo?condicion=nuevo&amp;orden=precio_asc"');
    const ultimoDeLaPrimera = autoPorId(idsDeTarjetas(primera.text).at(-1));
    const primeroDeLaSegunda = autoPorId(idsDeTarjetas(segunda.text)[0]);
    expect(primeroDeLaSegunda.precio_centavos).toBeGreaterThanOrEqual(ultimoDeLaPrimera.precio_centavos);
  });

  test('FA-3: "Limpiar filtros" lleva al catálogo completo', async () => {
    const res = await request(ctx.app).get('/catalogo').query({ marca: 'Porsche' });
    expect(res.text).toMatch(/<a class="enlace" href="\/catalogo">Limpiar filtros<\/a>/);
  });

  test('FE-1: sin resultados lo dice y sugiere ampliar los rangos o limpiar los filtros', async () => {
    const res = await request(ctx.app).get('/catalogo').query({ marca: 'Porsche', transmision: 'manual' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('No encontramos autos con esos filtros');
    expect(res.text).toContain('Prueba ampliar los rangos de precio o de año');
    expect(idsDeTarjetas(res.text)).toEqual([]);
  });

  test('un valor que no es de la lista se ignora', async () => {
    const res = await request(ctx.app).get('/catalogo').query({ marca: 'Toyota', orden: 'barato' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('36 autos disponibles');
  });
});

describe('seguridad', () => {
  test('el modelo va como parámetro: un texto con comillas no altera la consulta', async () => {
    const res = await request(ctx.app).get('/catalogo').query({ modelo: "' OR 1=1 --" });
    expect(res.status).toBe(200);
    expect(res.text).toContain('No encontramos autos con esos filtros');
  });

  test('un modelo publicado con HTML se muestra escapado en la lista de modelos', async () => {
    ctx.db.prepare('UPDATE autos SET modelo = ? WHERE id = 2').run('"><script>alert(1)</script>');
    const res = await request(ctx.app).get('/catalogo');
    expect(res.text).not.toContain('<script>alert(1)</script>');
  });
});
