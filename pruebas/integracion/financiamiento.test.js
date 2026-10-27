// CU-04. Calcular el financiamiento de un auto (RF-04, RN-05).
const request = require('supertest');
const { crearContexto } = require('../ayudantes');

let contexto;
let usado320i;
let nuevoA3;

beforeAll(() => {
  contexto = crearContexto();
  const id = (sql) => contexto.db.prepare(sql).get().id;
  usado320i = id("SELECT id FROM autos WHERE modelo = '320i' AND condicion = 'usado'");
  nuevoA3 = id("SELECT id FROM autos WHERE modelo = 'A3 Sedán'");
});

afterAll(() => contexto.db.close());

function calcular(id, consulta = '') {
  return request(contexto.app).get(`/autos/${id}/financiamiento${consulta}`);
}

function opcionesDePlazo(html) {
  return [...html.matchAll(/<option value="(\d+)"/g)].map((m) => Number(m[1]));
}

describe('acceso a la calculadora (paso 1)', () => {
  test('la ficha tiene el botón "Calcular financiamiento"', async () => {
    const res = await request(contexto.app).get(`/autos/${usado320i}`);
    expect(res.text).toMatch(new RegExp(`href="/autos/${usado320i}/financiamiento"[^>]*>Calcular financiamiento<`));
  });

  test('muestra el precio, la tasa, el abono mínimo y los plazos de un auto usado', async () => {
    const res = await calcular(usado320i);
    expect(res.status).toBe(200);
    expect(res.text).toContain('B/. 27,500.00');
    expect(res.text).toContain('Tasa de interés anual: 8.5 %');
    expect(res.text).toContain('Abono mínimo: B/. 5,500.00 (20 % del precio)');
    expect(opcionesDePlazo(res.text)).toEqual([12, 24, 36, 48, 60, 72]);
    expect(res.text).not.toContain('Cuota mensual');
  });

  test('un auto nuevo ofrece hasta 96 meses al 6.5 %', async () => {
    const res = await calcular(nuevoA3);
    expect(res.text).toContain('Tasa de interés anual: 6.5 %');
    expect(opcionesDePlazo(res.text)).toEqual([12, 24, 36, 48, 60, 72, 84, 96]);
  });
});

describe('cálculo (pasos 3 a 5)', () => {
  test('muestra el monto a financiar, la cuota, los intereses y el total, con la nota referencial', async () => {
    const res = await calcular(usado320i, '?abono=5500&plazo=60');
    expect(res.status).toBe(200);
    expect(res.text).toContain('B/. 22,000.00');
    expect(res.text).toContain('B/. 451.36');
    expect(res.text).toContain('B/. 5,081.60');
    expect(res.text).toContain('B/. 32,581.60');
    expect(res.text).toContain('Cálculo referencial; no constituye una aprobación de crédito');
  });

  test('conserva lo que escribió el usuario y dice qué porcentaje del precio es el abono', async () => {
    const res = await calcular(usado320i, '?abono=5500&plazo=60');
    expect(res.text).toContain('value="5500"');
    expect(res.text).toMatch(/<option value="60" selected>/);
    expect(res.text).toContain('20 % del precio');
  });

  test('acepta el abono con separador de miles', async () => {
    const res = await calcular(usado320i, `?abono=${encodeURIComponent('5,500.00')}&plazo=60`);
    expect(res.text).toContain('B/. 451.36');
  });
});

describe('flujos alternativos', () => {
  test('FA-1: con un abono menor que el mínimo avisa cuál es y no calcula', async () => {
    const res = await calcular(usado320i, '?abono=5499.99&plazo=60');
    expect(res.status).toBe(200);
    expect(res.text).toContain('El abono mínimo para este auto es de B/. 5,500.00 (20 % del precio)');
    expect(res.text).not.toContain('Cuota mensual');
  });

  test('FA-2: con un monto a financiar menor que B/. 1,000.00 no calcula', async () => {
    const res = await calcular(nuevoA3, '?abono=41900.01&plazo=12');
    expect(res.text).toContain('El monto a financiar debe ser de al menos B/. 1,000.00');
    expect(res.text).not.toContain('Cuota mensual');
  });

  test('el servidor rechaza un plazo que la lista no ofrece (84 meses en un usado)', async () => {
    const res = await calcular(usado320i, '?abono=5500&plazo=84');
    expect(res.text).toContain('Elige uno de los plazos permitidos');
    expect(res.text).not.toContain('Cuota mensual');
  });

  test('un abono que no es un monto pide el formato correcto', async () => {
    const res = await calcular(usado320i, '?abono=abc&plazo=60');
    expect(res.text).toContain('Escribe el abono en balboas, por ejemplo 6000 o 6000.50');
  });

  test('el mensaje de error queda junto al campo (RNF-02)', async () => {
    const res = await calcular(usado320i, '?abono=1&plazo=60');
    expect(res.text).toMatch(/id="abono"[^>]*aria-describedby="error-abono"/);
    expect(res.text).toContain('id="error-abono"');
  });
});

describe('autos que no se pueden financiar', () => {
  test('un auto en revisión responde 404', async () => {
    const { id } = contexto.db.prepare("SELECT id FROM autos WHERE estado = 'en_revision' LIMIT 1").get();
    expect((await calcular(id)).status).toBe(404);
  });

  test('un identificador que no es un número responde 404', async () => {
    expect((await calcular('abc')).status).toBe(404);
  });
});
