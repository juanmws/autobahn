// CU-08. Hacer una oferta por un auto usado (RF-08, RN-10). Fecha fija: 20/10/2026 a las 10:00.
// Auto 2: BMW 320i usado de cliente1 (Carlos Pinto), B/. 27,500.00; se oferta de B/. 22,000.00 a B/. 27,500.00.
// Auto 1: Audi A3 Sedán nuevo. Auto 6: Golf GTI En revisión. cliente2 es Ana Méndez.
const request = require('supertest');
const { crearContexto } = require('../ayudantes');

const RANGO = 'La oferta debe estar entre B/. 22,000.00 y B/. 27,500.00';

let ctx;

beforeEach(() => {
  ctx = crearContexto();
});

afterEach(() => ctx.db.close());

async function cliente(n) {
  const agente = request.agent(ctx.app);
  await agente.post('/iniciar-sesion').type('form').send({ correo: `cliente${n}@prueba.pa`, contrasena: 'Prueba#2026' });
  return agente;
}

const ofertar = (agente, datos, autoId = 2) => agente.post(`/autos/${autoId}/oferta`).type('form').send(datos);
const ofertasGuardadas = () => ctx.db.prepare('SELECT * FROM ofertas ORDER BY id').all();
const idDe = (correo) => ctx.db.prepare('SELECT id FROM usuarios WHERE correo = ?').get(correo).id;

describe('acceso y precondiciones', () => {
  test('sin sesión pide iniciar sesión y vuelve a la oferta', async () => {
    const res = await request(ctx.app).get('/autos/2/oferta');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/iniciar-sesion?volver=%2Fautos%2F2%2Foferta');
  });

  test('un administrador recibe 403', async () => {
    const admin = request.agent(ctx.app);
    await admin.post('/iniciar-sesion').type('form').send({ correo: 'admin@autobahn.pa', contrasena: 'Autobahn#2026' });
    expect((await admin.get('/autos/2/oferta')).status).toBe(403);
  });

  test.each([[1, 'nuevo'], [6, 'En revisión'], [9999, 'inexistente']])('auto %i (%s): 404', async (id) => {
    const agente = await cliente(2);
    expect((await agente.get(`/autos/${id}/oferta`)).status).toBe(404);
    expect((await ofertar(agente, { monto: '23000' }, id)).status).toBe(404);
    expect(ofertasGuardadas()).toEqual([]);
  });

  test('el vendedor no puede ofertar por su propio auto', async () => {
    const agente = await cliente(1);
    const res = await agente.get('/autos/2/oferta');
    expect(res.status).toBe(403);
    expect(res.text).toContain('No puedes hacer una oferta por tu propio auto');
    expect(res.text).not.toContain('name="monto"');
    expect((await ofertar(agente, { monto: '23000' })).status).toBe(403);
    expect(ofertasGuardadas()).toEqual([]);
  });
});

describe('"Hacer oferta" en la ficha', () => {
  test('aparece en un auto usado para visitantes y otros clientes', async () => {
    expect((await request(ctx.app).get('/autos/2')).text).toContain('href="/autos/2/oferta"');
    expect((await (await cliente(2)).get('/autos/2')).text).toContain('href="/autos/2/oferta"');
  });

  test('no aparece en un auto nuevo ni para el dueño', async () => {
    expect((await request(ctx.app).get('/autos/1')).text).not.toContain('/oferta"');
    expect((await (await cliente(1)).get('/autos/2')).text).not.toContain('/oferta"');
  });
});

describe('flujo básico', () => {
  test('paso 1: muestra el precio publicado y el rango permitido', async () => {
    const res = await (await cliente(2)).get('/autos/2/oferta');
    expect(res.status).toBe(200);
    expect(res.text).toContain('BMW 320i');
    expect(res.text).toContain('B/. 27,500.00');
    expect(res.text).toContain('de B/. 22,000.00 a B/. 27,500.00');
    expect(res.text).toMatch(/<form[^>]*method="post"[^>]*action="\/autos\/2\/oferta"[^>]*data-precio-centavos="2750000"/);
    expect(res.text).toContain('data-porcentaje="porcentaje-oferta"');
    expect(res.text).toContain('<script src="/js/porcentaje.js" defer></script>');
  });

  test('pasos 3 a 5: guarda la oferta Pendiente y la muestra en Mis ofertas', async () => {
    const agente = await cliente(2);
    const res = await ofertar(agente, { monto: '22,000.00', mensaje: '  ¿Lo puedo ver el sábado?  ' });
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/mi-cuenta');

    expect(ofertasGuardadas()).toEqual([expect.objectContaining({
      auto_id: 2, cliente_id: idDe('cliente2@prueba.pa'), monto_centavos: 2200000,
      mensaje: '¿Lo puedo ver el sábado?', estado: 'pendiente', creado_en: '2026-10-20T10:00:00',
    })]);

    const cuenta = await agente.get('/mi-cuenta');
    expect(cuenta.text).toContain('Tu oferta de B/. 22,000.00 fue enviada al vendedor');
    expect(cuenta.text).toMatch(/Mis ofertas[\s\S]*BMW 320i 2019[\s\S]*B\/\. 22,000\.00[\s\S]*80 %[\s\S]*Pendiente/);
    expect((await agente.get('/mi-cuenta')).text).not.toContain('fue enviada al vendedor');
  });

  test('una oferta del 100 % sin mensaje se guarda con el mensaje vacío', async () => {
    expect((await ofertar(await cliente(2), { monto: '27500' })).status).toBe(303);
    expect(ofertasGuardadas()[0]).toMatchObject({ monto_centavos: 2750000, mensaje: null });
  });

  test('postcondición: el vendedor la ve en las ofertas recibidas de su publicación', async () => {
    await ofertar(await cliente(2), { monto: '24,750', mensaje: 'Pago de contado.' });
    const cuenta = await (await cliente(1)).get('/mi-cuenta');
    expect(cuenta.text).toMatch(/Ofertas recibidas[\s\S]*AU-0002[\s\S]*BMW 320i[\s\S]*Ana M\.[\s\S]*B\/\. 24,750\.00[\s\S]*90 %[\s\S]*Pago de contado\./);
    expect(cuenta.text).not.toContain('Méndez');
  });

  test('sin ofertas, Mi cuenta lo dice en las dos secciones', async () => {
    const cuenta = await (await cliente(1)).get('/mi-cuenta');
    expect(cuenta.text).toContain('Todavía no has hecho ofertas');
    expect(cuenta.text).toContain('Tus publicaciones todavía no tienen ofertas');
  });

  test('dos clientes pueden tener cada uno una oferta pendiente por el mismo auto', async () => {
    expect((await ofertar(await cliente(2), { monto: '23000' })).status).toBe(303);
    expect((await ofertar(await cliente(3), { monto: '24000' })).status).toBe(303);
    expect(ofertasGuardadas()).toHaveLength(2);
  });
});

describe('flujos alternativos y de excepción', () => {
  test.each(['21,999.99', '27,500.01', 'veinte mil'])('FA-1: %s queda fuera del rango y no se envía', async (monto) => {
    const res = await ofertar(await cliente(2), { monto, mensaje: 'Hola' });
    expect(res.status).toBe(422);
    expect(res.text).toContain(RANGO);
    expect(res.text).toMatch(new RegExp(`id="monto"[^>]*value="${monto.replace(/[.]/g, '\\.')}"`));
    expect(res.text).toContain('aria-describedby="error-monto"');
    expect(res.text).toContain('>Hola</textarea>');
    expect(ofertasGuardadas()).toEqual([]);
  });

  test('FA-2: un mensaje de 301 caracteres no se envía', async () => {
    const res = await ofertar(await cliente(2), { monto: '23000', mensaje: 'x'.repeat(301) });
    expect(res.status).toBe(422);
    expect(res.text).toContain('El mensaje puede tener como máximo 300 caracteres');
    expect(ofertasGuardadas()).toEqual([]);
  });

  test('FE-1: una segunda oferta pendiente por el mismo auto no se guarda', async () => {
    const agente = await cliente(2);
    await ofertar(agente, { monto: '23000' });
    const res = await ofertar(agente, { monto: '25000' });
    expect(res.status).toBe(409);
    expect(res.text).toContain('Ya tienes una oferta pendiente por este auto, de B/. 23,000.00');
    expect(ofertasGuardadas()).toHaveLength(1);
  });

  test('FE-1: con una oferta pendiente, el formulario ya no se muestra', async () => {
    const agente = await cliente(2);
    await ofertar(agente, { monto: '23000' });
    const res = await agente.get('/autos/2/oferta');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Ya tienes una oferta pendiente por este auto, de B/. 23,000.00');
    expect(res.text).not.toContain('name="monto"');
  });

  test('FE-1 por carrera: si la base rechaza la segunda oferta al guardar, responde lo mismo', async () => {
    // Otro envío del mismo cliente se guarda entre la consulta de la oferta pendiente y el INSERT. Un
    // disparador no sirve aquí: SQLite deshace lo que hizo el disparador cuando falla el INSERT que lo lanzó.
    const agente = await cliente(2);
    const prepararOriginal = ctx.db.prepare.bind(ctx.db);
    jest.spyOn(ctx.db, 'prepare').mockImplementation((sql) => {
      if (sql.trim().startsWith('INSERT INTO ofertas')) {
        prepararOriginal(`INSERT INTO ofertas (auto_id, cliente_id, monto_centavos, estado, creado_en)
                          VALUES (2, ?, 2300000, 'pendiente', '2026-10-20T09:59:59')`).run(idDe('cliente2@prueba.pa'));
      }
      return prepararOriginal(sql);
    });
    const res = await ofertar(agente, { monto: '25000' });
    ctx.db.prepare.mockRestore();
    expect(res.status).toBe(409);
    expect(res.text).toContain('Ya tienes una oferta pendiente por este auto, de B/. 23,000.00');
    expect(ofertasGuardadas()).toHaveLength(1);
  });
});
