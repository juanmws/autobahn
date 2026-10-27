const request = require('supertest');
const { crearContexto } = require('../ayudantes');

const CLIENTE = { correo: 'cliente1@prueba.pa', contrasena: 'Prueba#2026' };
const ADMINISTRADOR = { correo: 'admin@autobahn.pa', contrasena: 'Autobahn#2026' };

let contexto;

beforeAll(() => {
  contexto = crearContexto();
});

afterAll(() => contexto.db.close());

async function iniciarSesion({ correo, contrasena }, volver = '') {
  const agente = request.agent(contexto.app);
  const res = await agente.post(`/iniciar-sesion${volver}`).type('form').send({ correo, contrasena });
  return { agente, res };
}

describe('iniciar sesión', () => {
  test('muestra el formulario con correo y contraseña', async () => {
    const res = await request(contexto.app).get('/iniciar-sesion');
    expect(res.status).toBe(200);
    expect(res.text).toContain('name="correo"');
    expect(res.text).toContain('name="contrasena"');
  });

  test('con la contraseña incorrecta responde 401 y conserva el correo escrito', async () => {
    const { res } = await iniciarSesion({ correo: CLIENTE.correo, contrasena: 'Incorrecta#1' });
    expect(res.status).toBe(401);
    expect(res.text).toContain('Correo o contraseña incorrectos.');
    expect(res.text).toContain(`value="${CLIENTE.correo}"`);
  });

  test('con un correo que no existe da el mismo mensaje, sin revelar si la cuenta existe', async () => {
    const { res } = await iniciarSesion({ correo: 'nadie@prueba.pa', contrasena: 'Prueba#2026' });
    expect(res.status).toBe(401);
    expect(res.text).toContain('Correo o contraseña incorrectos.');
  });

  test('acepta el correo con mayúsculas y espacios alrededor', async () => {
    const { agente, res } = await iniciarSesion({ correo: '  CLIENTE1@Prueba.pa ', contrasena: CLIENTE.contrasena });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    const inicio = await agente.get('/');
    expect(inicio.text).toContain('Hola, Carlos');
  });

  test('la cookie de sesión es HttpOnly, SameSite=Lax y vence a los 30 minutos (RNF-04)', async () => {
    const { res } = await iniciarSesion(CLIENTE);
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('autobahn.sid='));
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const vence = new Date(cookie.match(/Expires=([^;]+)/)[1]).getTime();
    const segundos = (vence - new Date(res.headers.date).getTime()) / 1000;
    expect(segundos).toBeGreaterThan(1795);
    expect(segundos).toBeLessThanOrEqual(1801);
  });

  test('después de iniciar sesión vuelve a la página que pidió', async () => {
    const { res } = await iniciarSesion(ADMINISTRADOR, '?volver=%2Fadmin');
    expect(res.headers.location).toBe('/admin');
  });

  test.each(['https://otro-sitio.com', '//otro-sitio.com', '/\\otro-sitio.com'])(
    'no redirige a otro sitio con volver=%s', async (destino) => {
      const { res } = await iniciarSesion(CLIENTE, `?volver=${encodeURIComponent(destino)}`);
      expect(res.headers.location).toBe('/');
    });
});

describe('roles (RNF-04)', () => {
  test('el panel sin sesión redirige a iniciar sesión y recuerda la página', async () => {
    const res = await request(contexto.app).get('/admin');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/iniciar-sesion?volver=%2Fadmin');
  });

  test('un cliente recibe 403 en el panel del administrador', async () => {
    const { agente } = await iniciarSesion(CLIENTE);
    const res = await agente.get('/admin');
    expect(res.status).toBe(403);
    expect(res.text).toContain('No tienes permiso para ver esta página');
  });

  test('el administrador ve cuántas publicaciones hay por revisar', async () => {
    const { agente } = await iniciarSesion(ADMINISTRADOR);
    const res = await agente.get('/admin');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Publicaciones por revisar: 3');
  });

  test('el administrador recibe 403 en Mi cuenta, que es solo de clientes', async () => {
    const { agente } = await iniciarSesion(ADMINISTRADOR);
    expect((await agente.get('/mi-cuenta')).status).toBe(403);
  });
});

describe('Mi cuenta', () => {
  test('lista solo las publicaciones del cliente, con su estado', async () => {
    const { agente } = await iniciarSesion(CLIENTE);
    const res = await agente.get('/mi-cuenta');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Golf GTI');
    expect(res.text).toContain('En revisión');
    expect(res.text).toContain('Mercedes-Benz C 180');
    expect(res.text).toContain('Tienes 3 publicaciones activas de 3 permitidas.');
    expect(res.text).not.toContain('Cayenne Diesel');
  });

  test('muestra el motivo de una publicación rechazada', async () => {
    const { agente } = await iniciarSesion({ correo: 'cliente5@prueba.pa', contrasena: 'Prueba#2026' });
    const res = await agente.get('/mi-cuenta');
    expect(res.text).toContain('Rechazada');
    expect(res.text).toContain('no coincide con el del tablero');
  });

  test('sin sesión redirige a iniciar sesión', async () => {
    const res = await request(contexto.app).get('/mi-cuenta');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/iniciar-sesion?volver=%2Fmi-cuenta');
  });
});

describe('cerrar sesión', () => {
  test('cierra la sesión y vuelve al inicio', async () => {
    const { agente } = await iniciarSesion(CLIENTE);
    const res = await agente.post('/cerrar-sesion');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    expect((await agente.get('/mi-cuenta')).status).toBe(302);
  });
});
