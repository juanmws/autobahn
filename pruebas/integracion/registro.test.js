// CU-01. Registrar una cuenta de cliente (RF-01, RN-02). Fecha fija: 20/10/2026.
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { crearContexto } = require('../ayudantes');

const DATOS = {
  nombre: 'Sofía', apellido: 'De León', cedula: '8-900-1001', fechaNacimiento: '1998-04-15', telefono: '6123-4567',
  correo: 'sofia.leon@prueba.pa', contrasena: 'Clave#2026', confirmacion: 'Clave#2026', terminos: 'si',
};

let ctx;

beforeEach(() => {
  ctx = crearContexto();
});

afterEach(() => ctx.db.close());

function registrar(agente, cambios = {}) {
  return agente.post('/crear-cuenta').type('form').send({ ...DATOS, ...cambios });
}

const contarClientes = () => ctx.db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'cliente'").get().n;

describe('paso 1', () => {
  test('el menú ofrece "Crear cuenta" a los visitantes', async () => {
    expect((await request(ctx.app).get('/')).text).toContain('href="/crear-cuenta"');
  });

  test('muestra el formulario con todos los campos y la casilla de los términos', async () => {
    const res = await request(ctx.app).get('/crear-cuenta');
    expect(res.status).toBe(200);
    for (const campo of ['nombre', 'apellido', 'cedula', 'fechaNacimiento', 'telefono', 'correo', 'contrasena', 'confirmacion']) {
      expect(res.text).toContain(`name="${campo}"`);
    }
    expect(res.text).toMatch(/type="checkbox"[^>]*name="terminos"/);
  });

  test('quien ya inició sesión no ve el formulario', async () => {
    const agente = request.agent(ctx.app);
    await agente.post('/iniciar-sesion').type('form').send({ correo: 'cliente2@prueba.pa', contrasena: 'Prueba#2026' });
    const res = await agente.get('/crear-cuenta');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
});

describe('flujo básico (pasos 3 a 5)', () => {
  test('crea la cuenta de cliente con la contraseña cifrada', async () => {
    const res = await registrar(request(ctx.app));
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/');

    const usuario = ctx.db.prepare("SELECT * FROM usuarios WHERE correo = 'sofia.leon@prueba.pa'").get();
    expect(usuario).toMatchObject({
      rol: 'cliente', nombre: 'Sofía', apellido: 'De León', cedula: '8-900-1001', fecha_nacimiento: '1998-04-15',
      telefono: '61234567', creado_en: '2026-10-20T10:00:00',
    });
    expect(usuario.hash_contrasena).not.toContain('Clave#2026');
    expect(usuario.hash_contrasena.split('$')[2]).toBe('10');
    expect(bcrypt.compareSync('Clave#2026', usuario.hash_contrasena)).toBe(true);
  });

  test('inicia la sesión y da la bienvenida una sola vez', async () => {
    const agente = request.agent(ctx.app);
    await registrar(agente);
    const inicio = await agente.get('/');
    expect(inicio.text).toContain('Bienvenido a Autobahn, Sofía');
    expect(inicio.text).toContain('Hola, Sofía');
    expect(inicio.text).toContain('href="/mi-cuenta"');
    expect((await agente.get('/')).text).not.toContain('Bienvenido a Autobahn');
  });

  test('con la cuenta nueva se puede iniciar sesión después', async () => {
    await registrar(request(ctx.app));
    const res = await request(ctx.app).post('/iniciar-sesion').type('form')
      .send({ correo: 'SOFIA.LEON@prueba.pa', contrasena: 'Clave#2026' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
});

describe('flujos alternativos y de excepción', () => {
  test('FA-1: marca el campo con el formato esperado y conserva los datos, pero nunca la contraseña', async () => {
    const res = await registrar(request(ctx.app), { contrasena: 'clave', confirmacion: 'clave' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('La contraseña debe tener de 8 a 64 caracteres, con al menos una mayúscula, una minúscula y un número');
    expect(res.text).toMatch(/id="contrasena"[^>]*aria-invalid="true"/);
    expect(res.text).toContain('value="De León"');
    expect(res.text).not.toContain('value="clave"');
    expect(contarClientes()).toBe(8);
  });

  test('FA-2: avisa que la confirmación no coincide', async () => {
    const res = await registrar(request(ctx.app), { confirmacion: 'Clave#2027' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Las contraseñas no coinciden');
    expect(contarClientes()).toBe(8);
  });

  test.each([
    ['la cédula', { cedula: '8-411-920' }],
    ['el correo, sin importar mayúsculas', { correo: 'CLIENTE1@prueba.pa' }],
  ])('FE-1: no crea la cuenta si %s ya está registrado', async (_, cambios) => {
    const res = await registrar(request(ctx.app), cambios);
    expect(res.status).toBe(409);
    expect(res.text).toContain('Ya existe una cuenta con esa cédula o ese correo');
    expect(res.text).toContain('href="/iniciar-sesion"');
    expect(contarClientes()).toBe(8);
  });

  test('FE-2: no crea la cuenta de quien cumple 18 años mañana', async () => {
    const res = await registrar(request(ctx.app), { fechaNacimiento: '2008-10-21' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Debes tener 18 años o más para crear una cuenta');
    expect(contarClientes()).toBe(8);
  });

  test('sin aceptar los términos no crea la cuenta', async () => {
    const res = await registrar(request(ctx.app), { terminos: '' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Debes aceptar los términos de uso');
  });

  test('FE-1 por carrera: si la base rechaza la cédula repetida al guardar, responde lo mismo', async () => {
    // el disparador inserta la misma cédula justo antes, como si otra persona se registrara a la vez
    ctx.db.exec(`CREATE TEMP TRIGGER carrera BEFORE INSERT ON usuarios WHEN NEW.correo <> 'otro@prueba.pa' BEGIN
      INSERT INTO usuarios (rol, nombre, apellido, cedula, fecha_nacimiento, telefono, correo, hash_contrasena, creado_en)
      VALUES ('cliente', 'Otra', 'Persona', NEW.cedula, '1990-01-01', '61111111', 'otro@prueba.pa', 'x', NEW.creado_en);
    END`);
    const res = await registrar(request(ctx.app));
    expect(res.status).toBe(409);
    expect(res.text).toContain('Ya existe una cuenta con esa cédula o ese correo');
  });
});
