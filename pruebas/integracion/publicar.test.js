// CU-05. Publicar un auto usado (RF-05, RN-06, RN-07 y RN-08). Fecha fija: 20/10/2026 a las 10:00.
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { crearContexto } = require('../ayudantes');

const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('foto-de-prueba-jpg')]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png')]);
const DATOS = {
  marca: 'BMW', modelo: '330i', anio: '2019', kilometraje: '61,500', precio: '27,500.00', color: 'Plata Glaciar',
  transmision: 'automatica', combustible: 'gasolina', motor: '2.0 turbo, 258 hp',
  descripcion: 'Un solo dueño, mantenimientos en agencia y llantas nuevas.',
};

let ctx;

beforeEach(() => {
  ctx = crearContexto();
});

afterEach(() => {
  ctx.db.close();
  fs.rmSync(ctx.carpetaSubidas, { recursive: true, force: true });
});

async function sesion(correo, contrasena = 'Prueba#2026') {
  const agente = request.agent(ctx.app);
  await agente.post('/iniciar-sesion').type('form').send({ correo, contrasena });
  return agente;
}

function publicar(agente, { datos = DATOS, fotos = [['frente.jpg', JPG], ['lado.png', PNG]] } = {}) {
  let pedido = agente.post('/vender');
  for (const [campo, valor] of Object.entries(datos)) {
    pedido = pedido.field(campo, valor);
  }
  for (const [nombre, contenido] of fotos) {
    pedido = pedido.attach('fotos', contenido, nombre);
  }
  return pedido;
}

const contarAutos = () => ctx.db.prepare('SELECT COUNT(*) AS n FROM autos').get().n;
const archivosSubidos = () => (fs.existsSync(ctx.carpetaSubidas) ? fs.readdirSync(ctx.carpetaSubidas) : []);

describe('acceso y paso 1', () => {
  test('sin sesión pide iniciar sesión y vuelve al formulario', async () => {
    const res = await request(ctx.app).get('/vender');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/iniciar-sesion?volver=%2Fvender');
  });

  test('el administrador no publica autos', async () => {
    const admin = await sesion('admin@autobahn.pa', 'Autobahn#2026');
    expect((await admin.get('/vender')).status).toBe(403);
  });

  test('el menú ofrece "Vender mi auto" a visitantes y clientes', async () => {
    expect((await request(ctx.app).get('/')).text).toContain('href="/vender"');
    const cliente = await sesion('cliente4@prueba.pa');
    expect((await cliente.get('/')).text).toContain('href="/vender"');
  });

  test('muestra el formulario con las cinco marcas y para subir fotos', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    const res = await cliente.get('/vender');
    expect(res.status).toBe(200);
    expect([...res.text.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]))
      .toEqual(expect.arrayContaining(['Audi', 'BMW', 'Mercedes-Benz', 'Porsche', 'Volkswagen']));
    expect(res.text).toContain('enctype="multipart/form-data"');
    expect(res.text).toMatch(/type="file"[^>]*name="fotos"[^>]*multiple/);
  });

  test('FE-1: con 3 publicaciones activas avisa y no muestra el formulario', async () => {
    const cliente = await sesion('cliente1@prueba.pa');
    const res = await cliente.get('/vender');
    expect(res.text).toContain('Ya tienes 3 publicaciones activas, el máximo permitido');
    expect(res.text).not.toContain('name="marca"');
  });
});

describe('flujo básico (pasos 2 a 6)', () => {
  test('guarda la publicación En revisión con sus fotos y muestra el código', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    const res = await publicar(cliente);
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/publicaciones/AU-0041');

    const auto = ctx.db.prepare("SELECT * FROM autos WHERE codigo = 'AU-0041'").get();
    const vendedor = ctx.db.prepare("SELECT id FROM usuarios WHERE correo = 'cliente4@prueba.pa'").get().id;
    expect(auto).toMatchObject({
      condicion: 'usado', estado: 'en_revision', vendedor_id: vendedor, marca: 'BMW', modelo: '330i', anio: 2019,
      kilometraje: 61500, precio_centavos: 2750000, creado_en: '2026-10-20T10:00:00',
    });

    const fotos = ctx.db.prepare('SELECT ruta, orden FROM fotos WHERE auto_id = ? ORDER BY orden').all(auto.id);
    expect(fotos).toEqual([
      { ruta: '/subidas/au-0041-1.jpg', orden: 1 }, { ruta: '/subidas/au-0041-2.png', orden: 2 },
    ]);
    expect(fs.readFileSync(path.join(ctx.carpetaSubidas, 'au-0041-1.jpg'))).toEqual(JPG);
  });

  test('la confirmación pide llevar el auto al local para la inspección', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    await publicar(cliente);
    const res = await cliente.get('/publicaciones/AU-0041');
    expect(res.text).toContain('Tu auto fue enviado a revisión. Llévalo al local de Autobahn en la Vía Ricardo J. Alfaro para su inspección');
    expect(res.text).toContain('AU-0041');
    expect(res.text).toContain('src="/subidas/au-0041-1.jpg"');
  });

  test('postcondición: aparece En revisión en Mis publicaciones y no en el catálogo (RN-08)', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    await publicar(cliente);
    const cuenta = await cliente.get('/mi-cuenta');
    expect(cuenta.text).toContain('AU-0041');
    expect(cuenta.text).toContain('Tienes 3 publicaciones activas de 3 permitidas.');
    expect((await request(ctx.app).get('/catalogo')).text).toContain('36 autos disponibles');
    const { id } = ctx.db.prepare("SELECT id FROM autos WHERE codigo = 'AU-0041'").get();
    expect((await request(ctx.app).get(`/autos/${id}`)).status).toBe(404);
  });

  test('las fotos subidas se pueden ver en el sitio', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    await publicar(cliente);
    const res = await request(ctx.app).get('/subidas/au-0041-1.jpg');
    expect(res.status).toBe(200);
  });

  test('la confirmación de una publicación ajena responde 404', async () => {
    const duenio = await sesion('cliente4@prueba.pa');
    await publicar(duenio);
    const otro = await sesion('cliente6@prueba.pa');
    expect((await otro.get('/publicaciones/AU-0041')).status).toBe(404);
  });
});

describe('flujos alternativos y de excepción', () => {
  test('FA-1: con un dato fuera de rango marca el campo, conserva lo escrito y no guarda nada', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    const res = await publicar(cliente, { datos: { ...DATOS, anio: '2010' } });
    expect(res.status).toBe(422);
    expect(res.text).toContain('El año debe estar entre 2011 y 2026');
    expect(res.text).toMatch(/id="anio"[^>]*aria-invalid="true"/);
    expect(res.text).toContain('value="330i"');
    expect(contarAutos()).toBe(40);
    expect(archivosSubidos()).toEqual([]);
  });

  test('al volver con un error pide adjuntar otra vez las fotos, que el navegador no conserva', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    const res = await publicar(cliente, { datos: { ...DATOS, anio: '2010' } });
    expect(res.text).toContain('Vuelve a adjuntar las fotos antes de enviar');
    const primeraVez = await cliente.get('/vender');
    expect(primeraVez.text).not.toContain('Vuelve a adjuntar las fotos antes de enviar');
  });

  test('una marca que no es alemana se rechaza aunque se envíe a mano (RN-01)', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    const res = await publicar(cliente, { datos: { ...DATOS, marca: 'Toyota' } });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Elige una de las cinco marcas de la lista');
  });

  test('FA-2: un archivo que no es JPG ni PNG se rechaza con su nombre', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    const res = await publicar(cliente, { fotos: [['trampa.gif', Buffer.from('GIF89a')]] });
    expect(res.status).toBe(422);
    expect(res.text).toContain('La foto trampa.gif no es JPG ni PNG');
    expect(contarAutos()).toBe(40);
  });

  test('FA-2: una foto de 5 MB más un byte se rechaza', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    const grande = Buffer.concat([JPG, Buffer.alloc(5 * 1024 * 1024 + 1 - JPG.length)]);
    const res = await publicar(cliente, { fotos: [['grande.jpg', grande]] });
    expect(res.status).toBe(422);
    expect(res.text).toContain('La foto grande.jpg pesa más de 5 MB');
  });

  test('FA-2: una foto mucho más grande se corta al recibirla, sin cargarla entera', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    const enorme = Buffer.concat([JPG, Buffer.alloc(7 * 1024 * 1024)]);
    const res = await publicar(cliente, { fotos: [['enorme.jpg', enorme]] });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Una de las fotos pesa más de 5 MB');
    expect(contarAutos()).toBe(40);
  });

  test('FA-3: una novena foto se rechaza', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    const fotos = Array.from({ length: 9 }, (_, i) => [`f${i}.jpg`, JPG]);
    const res = await publicar(cliente, { fotos });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Puedes subir como máximo 8 fotos');
    expect(contarAutos()).toBe(40);
  });

  test('sin fotos pide al menos una', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    const res = await publicar(cliente, { fotos: [] });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Adjunta al menos una foto del auto');
  });

  test('si la base de datos falla a mitad del guardado, no queda el auto ni ninguna foto en disco', async () => {
    ctx.db.exec("CREATE TEMP TRIGGER falla BEFORE INSERT ON fotos WHEN NEW.orden = 2 BEGIN SELECT RAISE(ABORT, 'disco lleno'); END");
    const cliente = await sesion('cliente4@prueba.pa');
    const res = await publicar(cliente);
    expect(res.status).toBe(500);
    expect(res.text).not.toContain('disco lleno');
    expect(contarAutos()).toBe(40);
    expect(archivosSubidos()).toEqual([]);
  });

  test('un archivo enviado en otro campo se rechaza sin guardar nada', async () => {
    const cliente = await sesion('cliente4@prueba.pa');
    let pedido = cliente.post('/vender');
    for (const [campo, valor] of Object.entries(DATOS)) {
      pedido = pedido.field(campo, valor);
    }
    const res = await pedido.attach('otro', JPG, 'frente.jpg');
    expect(res.status).toBe(422);
    expect(res.text).toContain('No pudimos recibir las fotos; inténtalo de nuevo');
    expect(contarAutos()).toBe(40);
  });

  test('FE-1: el servidor vuelve a revisar el límite al enviar (RN-07)', async () => {
    const cliente = await sesion('cliente1@prueba.pa');
    const res = await publicar(cliente);
    expect(res.status).toBe(409);
    expect(res.text).toContain('Ya tienes 3 publicaciones activas, el máximo permitido');
    expect(contarAutos()).toBe(40);
    expect(archivosSubidos()).toEqual([]);
  });
});
