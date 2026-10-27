const request = require('supertest');
const { crearContexto, idsDeTarjetas } = require('../ayudantes');

let contexto;

beforeAll(() => {
  contexto = crearContexto();
});

afterAll(() => contexto.db.close());

function idDe(sql) {
  return contexto.db.prepare(sql).get().id;
}

describe('página de inicio', () => {
  test('responde con la marca, la ubicación y seis autos recientes', async () => {
    const res = await request(contexto.app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Autobahn');
    expect(res.text).toContain('Vía Ricardo J. Alfaro');
    expect(idsDeTarjetas(res.text)).toHaveLength(6);
  });

  test('el letrero de marcas cuenta los autos disponibles de cada marca', async () => {
    const res = await request(contexto.app).get('/');
    const { n } = contexto.db.prepare(
      "SELECT COUNT(*) AS n FROM autos WHERE marca = 'Porsche' AND estado = 'disponible'").get();
    expect(res.text).toMatch(new RegExp(`Porsche</span>\\s*<span class="letrero-cuenta">${n} autos`));
  });

  test('la página está en español y carga la hoja de estilos', async () => {
    const res = await request(contexto.app).get('/');
    expect(res.text).toContain('<html lang="es">');
    expect(res.text).toContain('/css/estilos.css');
  });
});

describe('catálogo (RN-03 y RN-08)', () => {
  test('muestra 12 autos por página y el total de disponibles', async () => {
    const res = await request(contexto.app).get('/catalogo');
    expect(res.status).toBe(200);
    expect(idsDeTarjetas(res.text)).toHaveLength(12);
    expect(res.text).toContain('36 autos disponibles');
    expect(res.text).toContain('Página 1 de 3');
  });

  test('cada tarjeta muestra la foto de su auto', async () => {
    const res = await request(contexto.app).get('/catalogo');
    const fotos = [...res.text.matchAll(/<img src="(\/img\/autos\/[^"]+\.jpg)" alt="Foto de referencia de un ([^"]+)"/g)];
    expect(fotos).toHaveLength(12);
  });

  test('un auto sin fotos muestra la silueta de respaldo', async () => {
    const otro = crearContexto();
    const id = otro.db.prepare("SELECT id FROM autos WHERE estado = 'disponible' ORDER BY creado_en DESC LIMIT 1").get().id;
    otro.db.prepare('DELETE FROM fotos WHERE auto_id = ?').run(id);
    const catalogo = await request(otro.app).get('/catalogo');
    expect(catalogo.text).toMatch(new RegExp(`data-auto="${id}">\\s*<div class="tarjeta-imagen tarjeta-imagen-silueta"><img src="/img/silueta-auto.svg"`));
    const ficha = await request(otro.app).get(`/autos/${id}`);
    expect(ficha.text).toContain('src="/img/silueta-auto.svg"');
    expect(ficha.text).not.toContain('Foto de referencia de un');
    otro.db.close();
  });

  test('ordena del más reciente al más antiguo', async () => {
    const res = await request(contexto.app).get('/catalogo');
    const masReciente = idDe("SELECT id FROM autos WHERE estado = 'disponible' ORDER BY creado_en DESC LIMIT 1");
    expect(idsDeTarjetas(res.text)[0]).toBe(masReciente);
  });

  test('las tres páginas juntas muestran exactamente los autos Disponible', async () => {
    const vistos = [];
    for (const pagina of [1, 2, 3]) {
      const res = await request(contexto.app).get(`/catalogo?pagina=${pagina}`);
      vistos.push(...idsDeTarjetas(res.text));
    }
    const disponibles = contexto.db.prepare("SELECT id FROM autos WHERE estado = 'disponible'").all().map((a) => a.id);
    expect(vistos.sort((a, b) => a - b)).toEqual(disponibles.sort((a, b) => a - b));
  });

  test.each([
    ['abc', 1], ['0', 1], ['-1', 1], ['2.5', 1], ['99', 3],
  ])('con ?pagina=%s muestra la página %i sin error', async (valor, esperada) => {
    const res = await request(contexto.app).get(`/catalogo?pagina=${valor}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(`Página ${esperada} de 3`);
    expect(idsDeTarjetas(res.text)).toHaveLength(12);
  });
});

describe('ficha de un auto', () => {
  test('muestra los datos de un auto nuevo con los formatos de Panamá', async () => {
    const id = idDe("SELECT id FROM autos WHERE modelo = 'A3 Sedán'");
    const res = await request(contexto.app).get(`/autos/${id}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Audi A3 Sedán');
    expect(res.text).toContain('B/. 42,900.00');
    expect(res.text).toContain('0 km');
    expect(res.text).toContain('Nuevo');
    expect(res.text).toContain('Automática');
  });

  test('muestra el kilometraje y el precio de un auto usado', async () => {
    const id = idDe("SELECT id FROM autos WHERE modelo = '320i' AND condicion = 'usado'");
    const res = await request(contexto.app).get(`/autos/${id}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('58,000 km');
    expect(res.text).toContain('B/. 27,500.00');
    expect(res.text).toContain('Usado');
  });

  test('muestra la foto de referencia con su autor, su licencia y el enlace a la fuente', async () => {
    const auto = contexto.db.prepare(`
      SELECT a.id, f.ruta, f.autor, f.licencia, f.fuente FROM autos a JOIN fotos f ON f.auto_id = a.id
      WHERE a.modelo = 'A3 Sedán'`).get();
    const res = await request(contexto.app).get(`/autos/${auto.id}`);
    expect(res.text).toContain(`src="${auto.ruta}"`);
    expect(res.text).toContain('alt="Foto de referencia de un Audi A3 Sedán"');
    expect(res.text).toContain(auto.autor);
    expect(res.text).toContain(auto.licencia);
    expect(res.text).toContain(`href="${auto.fuente}"`);
  });

  test.each([
    ['en revisión', "SELECT id FROM autos WHERE estado = 'en_revision' LIMIT 1"],
    ['rechazado', "SELECT id FROM autos WHERE estado = 'rechazada' LIMIT 1"],
  ])('un auto %s responde 404 sin revelar sus datos', async (_, sql) => {
    const id = idDe(sql);
    const { modelo } = contexto.db.prepare('SELECT modelo FROM autos WHERE id = ?').get(id);
    const res = await request(contexto.app).get(`/autos/${id}`);
    expect(res.status).toBe(404);
    expect(res.text).not.toContain(modelo);
  });

  test.each(['abc', '99999', '1.5'])('/autos/%s responde 404', async (valor) => {
    const res = await request(contexto.app).get(`/autos/${valor}`);
    expect(res.status).toBe(404);
    expect(res.text).toContain('No encontramos esta página');
  });
});

describe('errores', () => {
  test('una ruta que no existe responde 404 con una página propia', async () => {
    const res = await request(contexto.app).get('/no-existe');
    expect(res.status).toBe(404);
    expect(res.text).toContain('No encontramos esta página');
  });

  test('si la base de datos falla responde 500 sin detalles técnicos (RNF-04)', async () => {
    const errores = [];
    const roto = crearContexto({ registrarError: (e) => errores.push(e) });
    roto.db.close();
    const res = await request(roto.app).get('/catalogo');
    expect(res.status).toBe(500);
    expect(res.text).toContain('No pudimos cargar esta página');
    expect(res.text).not.toMatch(/Error:|at .*\.js|node_modules|database is not open/);
    expect(errores).toHaveLength(1);
  });
});
