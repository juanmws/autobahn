// CU-03. Comparar autos (RF-03, RN-04). La lista vive en la sesión, así que cada prueba usa un agente que
// guarda la cookie. Auto 2: BMW 320i usado (B/. 27,500.00, 2019, 58,000 km); auto 11: BMW 320i nuevo
// (B/. 54,900.00, 2026, 0 km); auto 32: BMW 118i usado; auto 1: Audi A3 Sedán; auto 6: Golf GTI En revisión.
const request = require('supertest');
const { crearContexto } = require('../ayudantes');

let ctx;

beforeEach(() => {
  ctx = crearContexto();
});

afterEach(() => ctx.db.close());

const agregarAuto = (agente, autoId, volver = '/catalogo') =>
  agente.post('/comparacion').type('form').send({ autoId: String(autoId), volver });
const quitarAuto = (agente, autoId) => agente.post('/comparacion/quitar').type('form').send({ autoId: String(autoId) });

async function conAutos(...ids) {
  const agente = request.agent(ctx.app);
  for (const id of ids) {
    await agregarAuto(agente, id);
  }
  return agente;
}

const barra = (html) => html.match(/<aside class="barra-comparacion"[\s\S]*?<\/aside>/)?.[0] ?? null;
const tarjeta = (html, id) => html.match(new RegExp(`<article class="tarjeta-auto" data-auto="${id}">[\\s\\S]*?</article>`))[0];

describe('pasos 1 y 2: agregar autos y barra de comparación', () => {
  test('sin autos no hay barra y cada tarjeta ofrece "Comparar"', async () => {
    const res = await request(ctx.app).get('/catalogo').query({ marca: 'BMW' });
    expect(barra(res.text)).toBeNull();
    expect(tarjeta(res.text, 2)).toContain('<form class="form-comparar" method="post" action="/comparacion">');
    expect(tarjeta(res.text, 2)).toContain('<input type="hidden" name="volver" value="/catalogo?marca=BMW">');
  });

  test('paso 1: agrega el auto, vuelve a la misma página y muestra "1 de 3"', async () => {
    const agente = request.agent(ctx.app);
    const res = await agregarAuto(agente, 2, '/catalogo?marca=BMW');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/catalogo?marca=BMW');

    const catalogo = await agente.get('/catalogo').query({ marca: 'BMW' });
    expect(barra(catalogo.text)).toContain('1 de 3');
    expect(barra(catalogo.text)).toContain('BMW 320i');
    expect(barra(catalogo.text)).toContain('Agrega otro auto para comparar');
    expect(barra(catalogo.text)).not.toContain('href="/comparacion"');
    expect(tarjeta(catalogo.text, 2)).toContain('En la comparación');
    expect(tarjeta(catalogo.text, 2)).not.toContain('form-comparar');
  });

  test('paso 2: desde el segundo auto se activa "Ver comparación"', async () => {
    const res = await (await conAutos(2, 11)).get('/catalogo');
    expect(barra(res.text)).toContain('2 de 3');
    expect(barra(res.text)).toContain('<a class="boton boton-acento" href="/comparacion">Ver comparación</a>');
  });

  test('desde la ficha se agrega y se vuelve a la ficha', async () => {
    const agente = request.agent(ctx.app);
    const ficha = await agente.get('/autos/2');
    expect(ficha.text).toContain('<input type="hidden" name="volver" value="/autos/2">');
    expect((await agregarAuto(agente, 2, '/autos/2')).headers.location).toBe('/autos/2');
  });

  test.each([[6, 'En revisión'], [9999, 'inexistente'], ['abc', 'sin número']])(
    'el auto %p (%s) no se puede agregar: 404', async (id) => {
      const agente = request.agent(ctx.app);
      expect((await agregarAuto(agente, id)).status).toBe(404);
      expect(barra((await agente.get('/catalogo')).text)).toBeNull();
    });

  test.each([
    ['https://ejemplo.com', '/'],
    ['//ejemplo.com', '/'],
    ['/catalogo?marca=BMW&pagina=1', '/catalogo?marca=BMW'],
  ])('volver=%s regresa a %s', async (volver, destino) => {
    expect((await agregarAuto(request.agent(ctx.app), 2, volver)).headers.location).toBe(destino);
  });
});

describe('pasos 3 a 5: tabla de comparación', () => {
  test('una columna por auto con sus datos, en el orden en que se agregaron', async () => {
    const res = await (await conAutos(2, 11)).get('/comparacion');
    expect(res.status).toBe(200);
    expect(res.text.indexOf('B/. 27,500.00')).toBeLessThan(res.text.indexOf('B/. 54,900.00'));
    for (const fila of ['Año', 'Condición', 'Precio', 'Kilometraje', 'Transmisión', 'Combustible', 'Motor']) {
      expect(res.text).toContain(`<th scope="row">${fila}</th>`);
    }
    for (const dato of ['2019', '2026', 'Usado', 'Nuevo', '58,000 km', '0 km', 'Automática', 'Gasolina', '2.0 turbo, 184 hp']) {
      expect(res.text).toContain(dato);
    }
    expect(res.text).toContain('src="/img/autos/');
    expect(res.text).toContain('href="/autos/2"');
    expect(res.text).toContain('href="/autos/11"');
    expect(barra(res.text)).toBeNull();
  });

  test('paso 4: resalta el menor precio, el año más reciente y el menor kilometraje', async () => {
    const res = await (await conAutos(2, 11)).get('/comparacion');
    // el valor resaltado lleva además una etiqueta con texto, para no depender solo del color
    const resaltadas = [...res.text.matchAll(/<td class="mejor">([\s\S]*?)<\/td>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    expect(resaltadas).toEqual(['2026 Año más reciente', 'B/. 27,500.00 Menor precio', '0 km Menor kilometraje']);
  });

  test('paso 5: la lista se conserva al abrir la ficha de un auto', async () => {
    const agente = await conAutos(2, 11);
    await agente.get('/comparacion');
    expect(barra((await agente.get('/autos/2')).text)).toContain('2 de 3');
  });

  test('postcondición: comparar no cambia ningún dato', async () => {
    const antes = ctx.db.prepare('SELECT * FROM autos ORDER BY id').all();
    const agente = await conAutos(2, 11, 32);
    await agente.get('/comparacion');
    await quitarAuto(agente, 32);
    expect(ctx.db.prepare('SELECT * FROM autos ORDER BY id').all()).toEqual(antes);
  });

  test.each([[[]], [[2]]])('con %p autos no hay tabla: vuelve al catálogo con el aviso', async (ids) => {
    const agente = await conAutos(...ids);
    const res = await agente.get('/comparacion');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/catalogo');
    expect((await agente.get('/catalogo')).text).toContain('Agrega al menos otro auto para comparar');
  });
});

describe('flujos alternativos', () => {
  test('FA-1: con tres autos, quitar uno deja la tabla con dos', async () => {
    const agente = await conAutos(2, 11, 32);
    const res = await quitarAuto(agente, 32);
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/comparacion');
    const tabla = await agente.get('/comparacion');
    expect(tabla.text).not.toContain('href="/autos/32"');
    expect(tabla.text).toContain('href="/autos/11"');
  });

  test('FA-1: si queda uno, avisa y vuelve al catálogo', async () => {
    const agente = await conAutos(2, 11);
    const res = await quitarAuto(agente, 11);
    expect(res.headers.location).toBe('/catalogo');
    const catalogo = await agente.get('/catalogo');
    expect(barra(catalogo.text)).toContain('Agrega al menos otro auto para comparar');
    expect(barra(catalogo.text)).toContain('1 de 3');
  });

  test('FA-2: un cuarto auto no entra y el aviso se muestra una sola vez', async () => {
    const agente = await conAutos(2, 11, 32);
    await agregarAuto(agente, 1);
    const catalogo = await agente.get('/catalogo');
    expect(barra(catalogo.text)).toContain('Puedes comparar como máximo 3 autos. Quita uno para agregar otro');
    expect(barra(catalogo.text)).toContain('3 de 3');
    expect(barra((await agente.get('/catalogo')).text)).not.toContain('como máximo');
  });

  test('FA-3: un auto repetido no se agrega de nuevo', async () => {
    const agente = await conAutos(2);
    await agregarAuto(agente, 2);
    const catalogo = await agente.get('/catalogo');
    expect(barra(catalogo.text)).toContain('Este auto ya está en la comparación');
    expect(barra(catalogo.text)).toContain('1 de 3');
  });

  test('un auto que deja de estar Disponible sale de la comparación', async () => {
    const agente = await conAutos(2, 11);
    ctx.db.prepare("UPDATE autos SET estado = 'rechazada' WHERE id = 11").run();
    expect(barra((await agente.get('/catalogo')).text)).toContain('1 de 3');
    expect((await agente.get('/comparacion')).status).toBe(303);
  });
});
