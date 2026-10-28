// CU-06. Revisar una publicación de auto usado (RF-06, RN-08). Fecha fija: 20/10/2026 a las 10:00.
// Datos de prueba En revisión: AU-0036 (Audi Q3 de cliente7), AU-0018 (Audi Q5 de cliente3) y
// AU-0006 (Golf GTI de cliente1); AU-0028 está Rechazada y AU-0002 Disponible.
const request = require('supertest');
const { crearContexto } = require('../ayudantes');

let ctx;

beforeEach(() => {
  ctx = crearContexto();
});

afterEach(() => ctx.db.close());

async function sesion(correo, contrasena) {
  const agente = request.agent(ctx.app);
  await agente.post('/iniciar-sesion').type('form').send({ correo, contrasena });
  return agente;
}

const administrador = () => sesion('admin@autobahn.pa', 'Autobahn#2026');
const cliente = (n) => sesion(`cliente${n}@prueba.pa`, 'Prueba#2026');
const autoDe = (codigo) => ctx.db.prepare('SELECT * FROM autos WHERE codigo = ?').get(codigo);
const codigosEn = (html) => [...html.matchAll(/href="\/admin\/publicaciones\/(AU-\d{4})"/g)].map((m) => m[1]);

describe('acceso', () => {
  test('sin sesión pide iniciar sesión', async () => {
    const res = await request(ctx.app).get('/admin/publicaciones');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/iniciar-sesion?volver=%2Fadmin%2Fpublicaciones');
  });

  test('un cliente recibe 403 y no puede aprobar', async () => {
    const agente = await cliente(2);
    expect((await agente.get('/admin/publicaciones')).status).toBe(403);
    expect((await agente.post('/admin/publicaciones/AU-0036/aprobar')).status).toBe(403);
    expect(autoDe('AU-0036').estado).toBe('en_revision');
  });

  test('el panel muestra cuántas hay y lleva a la lista', async () => {
    const res = await (await administrador()).get('/admin');
    expect(res.text).toContain('Publicaciones por revisar: 3');
    expect(res.text).toContain('href="/admin/publicaciones"');
  });
});

describe('pasos 1 a 3', () => {
  test('paso 1: lista las publicaciones En revisión de la más antigua a la más reciente', async () => {
    const res = await (await administrador()).get('/admin/publicaciones');
    expect(res.status).toBe(200);
    expect(codigosEn(res.text)).toEqual(['AU-0036', 'AU-0018', 'AU-0006']);
    expect(res.text).toContain('Diego Ríos');
  });

  test('paso 2: muestra los datos, las fotos y el contacto del vendedor', async () => {
    const res = await (await administrador()).get('/admin/publicaciones/AU-0036');
    expect(res.status).toBe(200);
    for (const texto of ['Audi Q3', '2022', 'B/. 31,800.00', '31,000 km', 'Diego Ríos', '6123-4507', 'cliente7@prueba.pa']) {
      expect(res.text).toContain(texto);
    }
    expect(res.text).toContain('src="/img/autos/usado-q3.jpg"');
    expect(res.text).toContain('href="/admin/publicaciones/AU-0036?accion=aprobar"');
    expect(res.text).toContain('href="/admin/publicaciones/AU-0036?accion=rechazar"');
  });

  test('paso 3: pide confirmar la aprobación', async () => {
    const res = await (await administrador()).get('/admin/publicaciones/AU-0036?accion=aprobar');
    expect(res.text).toContain('Confirma la aprobación');
    expect(res.text).toMatch(/<form[^>]*method="post"[^>]*action="\/admin\/publicaciones\/AU-0036\/aprobar"/);
    expect(autoDe('AU-0036').estado).toBe('en_revision');
  });

  test.each(['AU-9999', 'AU-0001'])('%s no es una publicación de un cliente: 404', async (codigo) => {
    expect((await (await administrador()).get(`/admin/publicaciones/${codigo}`)).status).toBe(404);
  });

  test.each(['aprobar', 'rechazar'])('%s una publicación que no existe: 404', async (accion) => {
    const res = await (await administrador()).post(`/admin/publicaciones/AU-9999/${accion}`)
      .type('form').send({ motivo: 'Motivo suficientemente largo.' });
    expect(res.status).toBe(404);
  });
});

describe('pasos 4 y 5: aprobar', () => {
  test('la publicación pasa a Disponible con la fecha y el administrador', async () => {
    const admin = await administrador();
    const res = await admin.post('/admin/publicaciones/AU-0036/aprobar');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/admin/publicaciones');

    const idAdmin = ctx.db.prepare("SELECT id FROM usuarios WHERE rol = 'administrador'").get().id;
    expect(autoDe('AU-0036')).toMatchObject({
      estado: 'disponible', revisado_por: idAdmin, revisado_en: '2026-10-20T10:00:00', motivo_rechazo: null,
    });

    const lista = await admin.get('/admin/publicaciones');
    expect(lista.text).toContain('Publicación AU-0036 aprobada');
    expect(codigosEn(lista.text)).toEqual(['AU-0018', 'AU-0006']);
    expect((await admin.get('/admin/publicaciones')).text).not.toContain('aprobada');
  });

  test('postcondición: el auto sale en el catálogo y el vendedor lo ve Disponible', async () => {
    await (await administrador()).post('/admin/publicaciones/AU-0036/aprobar');
    expect((await request(ctx.app).get('/catalogo')).text).toContain('37 autos disponibles');
    expect((await request(ctx.app).get(`/autos/${autoDe('AU-0036').id}`)).status).toBe(200);
    const cuenta = await (await cliente(7)).get('/mi-cuenta');
    expect(cuenta.text).toMatch(/AU-0036[\s\S]*?Disponible/);
  });
});

describe('flujos alternativos y de excepción', () => {
  test('FA-1: pide el motivo del rechazo', async () => {
    const res = await (await administrador()).get('/admin/publicaciones/AU-0018?accion=rechazar');
    expect(res.text).toMatch(/<form[^>]*action="\/admin\/publicaciones\/AU-0018\/rechazar"/);
    expect(res.text).toContain('name="motivo"');
  });

  test('FA-1: rechaza con el motivo y el vendedor lo ve', async () => {
    const admin = await administrador();
    const motivo = 'Las fotos no muestran el tablero ni el kilometraje.';
    const res = await admin.post('/admin/publicaciones/AU-0018/rechazar').type('form').send({ motivo });
    expect(res.status).toBe(303);
    expect(autoDe('AU-0018')).toMatchObject({ estado: 'rechazada', motivo_rechazo: motivo, revisado_en: '2026-10-20T10:00:00' });
    expect((await admin.get('/admin/publicaciones')).text).toContain('Publicación AU-0018 rechazada');
    const cuenta = await (await cliente(3)).get('/mi-cuenta');
    expect(cuenta.text).toContain(motivo);
  });

  test.each([['9 caracteres', 'x'.repeat(9)], ['301 caracteres', 'x'.repeat(301)]])(
    'FA-2: un motivo de %s no rechaza la publicación', async (_, motivo) => {
      const res = await (await administrador()).post('/admin/publicaciones/AU-0018/rechazar').type('form').send({ motivo });
      expect(res.status).toBe(422);
      expect(res.text).toContain('El motivo debe tener de 10 a 300 caracteres');
      expect(res.text).toContain(`>${motivo}</textarea>`);
      expect(autoDe('AU-0018').estado).toBe('en_revision');
    });

  test('FE-1: aprobar una publicación ya revisada no cambia su estado', async () => {
    const admin = await administrador();
    const res = await admin.post('/admin/publicaciones/AU-0028/aprobar');
    expect(res.status).toBe(303);
    expect((await admin.get('/admin/publicaciones')).text).toContain('Esta publicación ya fue revisada');
    expect(autoDe('AU-0028').estado).toBe('rechazada');
  });

  test('FE-1: si otro administrador la aprobó primero, el rechazo no se aplica', async () => {
    const admin = await administrador();
    const otroAdmin = await administrador();
    await otroAdmin.post('/admin/publicaciones/AU-0006/aprobar');
    await admin.post('/admin/publicaciones/AU-0006/rechazar').type('form').send({ motivo: 'Motivo suficientemente largo.' });
    expect((await admin.get('/admin/publicaciones')).text).toContain('Esta publicación ya fue revisada');
    expect(autoDe('AU-0006')).toMatchObject({ estado: 'disponible', motivo_rechazo: null });
  });

  test('una publicación ya revisada se ve sin los botones de aprobar o rechazar', async () => {
    const res = await (await administrador()).get('/admin/publicaciones/AU-0028?accion=aprobar');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Esta publicación ya fue revisada');
    expect(res.text).not.toContain('?accion=aprobar"');
    expect(res.text).not.toContain('Confirma la aprobación');
  });

  test('FE-2: sin pendientes avisa que no hay publicaciones por revisar', async () => {
    const admin = await administrador();
    for (const codigo of ['AU-0036', 'AU-0018', 'AU-0006']) {
      await admin.post(`/admin/publicaciones/${codigo}/aprobar`);
    }
    const res = await admin.get('/admin/publicaciones');
    expect(res.text).toContain('No hay publicaciones por revisar');
    expect(codigosEn(res.text)).toEqual([]);
  });
});
