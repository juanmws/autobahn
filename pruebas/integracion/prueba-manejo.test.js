// CU-07. Agendar una prueba de manejo (RF-07, RN-09). Fecha fija: martes 20/10/2026 a las 10:00.
const request = require('supertest');
const { crearContexto } = require('../ayudantes');

let ctx;
let bmw320i; // usado, Disponible, de cliente1
let audiA3; // nuevo, Disponible

beforeEach(() => {
  ctx = crearContexto();
  const id = (sql) => ctx.db.prepare(sql).get().id;
  bmw320i = id("SELECT id FROM autos WHERE modelo = '320i' AND condicion = 'usado'");
  audiA3 = id("SELECT id FROM autos WHERE modelo = 'A3 Sedán'");
});

afterEach(() => ctx.db.close());

const ruta = (autoId) => `/autos/${autoId}/prueba-de-manejo`;
const idCliente = (n) => ctx.db.prepare('SELECT id FROM usuarios WHERE correo = ?').get(`cliente${n}@prueba.pa`).id;

async function sesion(correo, contrasena = 'Prueba#2026') {
  const agente = request.agent(ctx.app);
  await agente.post('/iniciar-sesion').type('form').send({ correo, contrasena });
  return agente;
}

function insertarCita({ autoId, cliente, fecha, hora, codigo }) {
  ctx.db.prepare(`INSERT INTO citas (codigo, auto_id, cliente_id, fecha, hora, vencimiento_licencia, estado, creado_en)
                  VALUES (?, ?, ?, ?, ?, '2030-01-01', 'programada', '2026-10-19T09:00:00')`)
    .run(codigo, autoId, idCliente(cliente), fecha, hora);
}

function contarCitas() {
  return ctx.db.prepare('SELECT COUNT(*) AS n FROM citas').get().n;
}

const CONFIRMAR = { fecha: '2026-10-22', hora: '11', licencia: '2028-01-31' };

describe('acceso', () => {
  test('sin sesión pide iniciar sesión y vuelve a la misma página', async () => {
    const res = await request(ctx.app).get(ruta(bmw320i));
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/iniciar-sesion?volver=${encodeURIComponent(ruta(bmw320i))}`);
  });

  test('el administrador no agenda pruebas de manejo', async () => {
    const admin = await sesion('admin@autobahn.pa', 'Autobahn#2026');
    expect((await admin.get(ruta(bmw320i))).status).toBe(403);
  });

  test('la ficha ofrece agendar a un visitante', async () => {
    const res = await request(ctx.app).get(`/autos/${bmw320i}`);
    expect(res.text).toContain(`href="${ruta(bmw320i)}"`);
  });

  test('la ficha no ofrece agendar al dueño del auto', async () => {
    const duenio = await sesion('cliente1@prueba.pa');
    const res = await duenio.get(`/autos/${bmw320i}`);
    expect(res.text).not.toContain(`href="${ruta(bmw320i)}"`);
  });

  test('el dueño que entra directo recibe 403 y no puede agendar', async () => {
    const duenio = await sesion('cliente1@prueba.pa');
    const res = await duenio.get(ruta(bmw320i));
    expect(res.status).toBe(403);
    expect(res.text).toContain('No puedes agendar una prueba de manejo de tu propio auto');
    expect((await duenio.post(ruta(bmw320i)).type('form').send(CONFIRMAR)).status).toBe(403);
    expect(contarCitas()).toBe(0);
  });

  test('un auto que no está disponible responde 404', async () => {
    const { id } = ctx.db.prepare("SELECT id FROM autos WHERE estado = 'en_revision' LIMIT 1").get();
    const cliente = await sesion('cliente2@prueba.pa');
    expect((await cliente.get(ruta(id))).status).toBe(404);
  });
});

describe('flujo básico', () => {
  test('paso 1: muestra los 12 días habilitados, de lunes a sábado', async () => {
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.get(ruta(bmw320i));
    expect(res.status).toBe(200);
    const dias = [...res.text.matchAll(/href="[^"]*\?fecha=(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
    expect(dias).toHaveLength(12);
    expect(dias[0]).toBe('2026-10-21');
    expect(res.text).toContain('miércoles 21/10/2026');
  });

  test('paso 2: muestra los ocho bloques y marca los ocupados de ese auto', async () => {
    insertarCita({ autoId: bmw320i, cliente: 3, fecha: '2026-10-22', hora: 10, codigo: 'PM-0900' });
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.get(`${ruta(bmw320i)}?fecha=2026-10-22`);
    expect([...res.text.matchAll(/name="hora" value="(\d+)"/g)].map((m) => Number(m[1])))
      .toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    expect(res.text).toMatch(/name="hora" value="10" disabled/);
    expect(res.text).toMatch(/10:00 a 11:00\s*<span class="bloque-ocupado">Ocupado<\/span>/);
    expect(res.text).not.toMatch(/name="hora" value="11" disabled/);
  });

  test('paso 3: muestra el resumen con el auto, el día, la hora y el local', async () => {
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.get(`${ruta(bmw320i)}?fecha=2026-10-22&hora=11&licencia=2028-01-31`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('BMW 320i 2019');
    expect(res.text).toContain('jueves 22/10/2026');
    expect(res.text).toContain('11:00 a 12:00');
    expect(res.text).toContain('Vía Ricardo J. Alfaro');
    expect(res.text).toMatch(/<form[^>]*method="post"[\s\S]*Confirmar cita/);
    expect(contarCitas()).toBe(0);
  });

  test('pasos 4 y 5: guarda la cita Programada y muestra su código', async () => {
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.post(ruta(bmw320i)).type('form').send(CONFIRMAR);
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/citas/PM-0001');

    const cita = ctx.db.prepare('SELECT * FROM citas').get();
    expect(cita).toMatchObject({
      codigo: 'PM-0001', auto_id: bmw320i, cliente_id: idCliente(2), fecha: '2026-10-22', hora: 11,
      vencimiento_licencia: '2028-01-31', estado: 'programada', creado_en: '2026-10-20T10:00:00',
    });

    const confirmacion = await cliente.get('/citas/PM-0001');
    expect(confirmacion.text).toContain('PM-0001');
    expect(confirmacion.text).toContain('jueves 22/10/2026');
  });

  test('postcondición: la cita aparece en Mis citas y el bloque queda ocupado para los demás', async () => {
    const cliente = await sesion('cliente2@prueba.pa');
    await cliente.post(ruta(bmw320i)).type('form').send(CONFIRMAR);
    const cuenta = await cliente.get('/mi-cuenta');
    expect(cuenta.text).toContain('Mis citas');
    expect(cuenta.text).toContain('PM-0001');

    const otro = await sesion('cliente3@prueba.pa');
    const bloques = await otro.get(`${ruta(bmw320i)}?fecha=2026-10-22`);
    expect(bloques.text).toMatch(/name="hora" value="11" disabled/);
  });

  test('la confirmación de una cita ajena responde 404', async () => {
    insertarCita({ autoId: bmw320i, cliente: 3, fecha: '2026-10-22', hora: 10, codigo: 'PM-0900' });
    const cliente = await sesion('cliente2@prueba.pa');
    expect((await cliente.get('/citas/PM-0900')).status).toBe(404);
  });
});

describe('flujos alternativos y de excepción', () => {
  test('un bloque fuera de la lista no llega al resumen', async () => {
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.get(`${ruta(bmw320i)}?fecha=2026-10-22&hora=8&licencia=2028-01-31`);
    expect(res.status).toBe(422);
    expect(res.text).toContain('Elige uno de los bloques libres');
    expect(res.text).not.toContain('Confirmar cita');
  });

  test('FA-1: si el bloque se ocupó antes de confirmar, avisa y actualiza los bloques', async () => {
    const cliente = await sesion('cliente2@prueba.pa');
    insertarCita({ autoId: bmw320i, cliente: 3, fecha: '2026-10-22', hora: 11, codigo: 'PM-0900' });
    const res = await cliente.post(ruta(bmw320i)).type('form').send(CONFIRMAR);
    expect(res.status).toBe(409);
    expect(res.text).toContain('Ese horario acaba de ocuparse; elige otro');
    expect(res.text).toMatch(/name="hora" value="11" disabled/);
    expect(contarCitas()).toBe(1);
  });

  test('FA-2: si el cliente ya tiene otra cita a esa hora, pide otro bloque', async () => {
    insertarCita({ autoId: audiA3, cliente: 2, fecha: '2026-10-22', hora: 11, codigo: 'PM-0900' });
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.post(ruta(bmw320i)).type('form').send(CONFIRMAR);
    expect(res.status).toBe(409);
    expect(res.text).toContain('Ya tienes una cita a esa hora; elige otro bloque');
    expect(contarCitas()).toBe(1);
  });

  test('FE-1: con la licencia vencida el día de la cita no guarda nada', async () => {
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.post(ruta(bmw320i)).type('form').send({ ...CONFIRMAR, licencia: '2026-10-21' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Tu licencia de conducir debe estar vigente el día de la prueba');
    expect(contarCitas()).toBe(0);
  });

  test('un domingo no se puede elegir', async () => {
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.get(`${ruta(bmw320i)}?fecha=2026-10-25`);
    expect(res.status).toBe(422);
    expect(res.text).toContain('Elige uno de los días habilitados');
    expect(res.text).not.toContain('name="hora"');
  });

  test('una confirmación con un día no habilitado vuelve a la lista de días', async () => {
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.post(ruta(bmw320i)).type('form').send({ ...CONFIRMAR, fecha: '2026-11-04' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Elige uno de los días habilitados');
    expect(contarCitas()).toBe(0);
  });

  test('FA-1 por carrera: otro cliente toma el bloque entre la validación y el guardado', async () => {
    // el disparador inserta la cita del otro cliente justo antes de la nuestra
    ctx.db.exec(`CREATE TEMP TRIGGER carrera BEFORE INSERT ON citas WHEN NEW.codigo <> 'PM-9999' BEGIN
      INSERT INTO citas (codigo, auto_id, cliente_id, fecha, hora, vencimiento_licencia, estado, creado_en)
      VALUES ('PM-9999', NEW.auto_id, ${idCliente(3)}, NEW.fecha, NEW.hora, '2030-01-01', 'programada', NEW.creado_en);
    END`);
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.post(ruta(bmw320i)).type('form').send(CONFIRMAR);
    expect(res.status).toBe(409);
    expect(res.text).toContain('Ese horario acaba de ocuparse; elige otro');
  });

  test('cualquier otro error al guardar responde 500 sin detalles técnicos', async () => {
    ctx.db.exec("CREATE TEMP TRIGGER falla BEFORE INSERT ON citas BEGIN SELECT RAISE(ABORT, 'disco lleno'); END");
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.post(ruta(bmw320i)).type('form').send(CONFIRMAR);
    expect(res.status).toBe(500);
    expect(res.text).not.toContain('disco lleno');
  });

  test('FE-2: con 2 citas programadas no puede agendar una tercera', async () => {
    insertarCita({ autoId: audiA3, cliente: 2, fecha: '2026-10-23', hora: 9, codigo: 'PM-0900' });
    insertarCita({ autoId: audiA3, cliente: 2, fecha: '2026-10-24', hora: 9, codigo: 'PM-0901' });
    const cliente = await sesion('cliente2@prueba.pa');
    const res = await cliente.post(ruta(bmw320i)).type('form').send(CONFIRMAR);
    expect(res.status).toBe(409);
    expect(res.text).toContain('Ya tienes 2 pruebas de manejo programadas, el máximo permitido');
    expect(contarCitas()).toBe(2);
  });
});
