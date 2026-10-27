// RF-05, RN-01 y RN-06: validación de un auto usado y de sus fotos. Año de referencia: 2026.
const { LIMITES, MENSAJES, validarDatos, validarFotos, tipoDeImagen } = require('../../src/reglas/publicacion');

const ANIO = { anioActual: 2026 };
const VALIDO = {
  marca: 'BMW', modelo: '320i', anio: '2019', kilometraje: '58,000', precio: '27,500.00', color: 'Plata Glaciar',
  transmision: 'automatica', combustible: 'gasolina', motor: '2.0 turbo, 184 hp',
  descripcion: 'Un solo dueño y mantenimientos en agencia.',
};

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GIF = Buffer.from('GIF89a', 'ascii');
const foto = (nombre, buffer = JPG, size = buffer.length) => ({ originalname: nombre, buffer, size });

function errores(cambios) {
  return validarDatos({ ...VALIDO, ...cambios }, ANIO).errores;
}

describe('validarDatos', () => {
  test('acepta un auto válido y normaliza sus datos', () => {
    expect(validarDatos(VALIDO, ANIO)).toEqual({
      valido: true,
      auto: {
        marca: 'BMW', modelo: '320i', anio: 2019, kilometraje: 58000, precioCentavos: 2750000, color: 'Plata Glaciar',
        transmision: 'automatica', combustible: 'gasolina', motor: '2.0 turbo, 184 hp',
        descripcion: 'Un solo dueño y mantenimientos en agencia.',
      },
    });
  });

  test('el rango de años depende del año actual (RN-06)', () => {
    expect(LIMITES.anio({ anioActual: 2026 })).toEqual({ minimo: 2011, maximo: 2026 });
    expect(LIMITES.anio({ anioActual: 2031 })).toEqual({ minimo: 2016, maximo: 2031 });
  });

  test.each([['2011'], ['2026']])('acepta el año límite %s', (anio) => {
    expect(validarDatos({ ...VALIDO, anio }, ANIO).valido).toBe(true);
  });

  test.each([['2010'], ['2027'], ['19'], ['dos mil']])('rechaza el año %s con el rango permitido (FA-1)', (anio) => {
    expect(errores({ anio })).toEqual({ anio: 'El año debe estar entre 2011 y 2026' });
  });

  test.each([['1'], ['300000'], ['300,000']])('acepta el kilometraje límite %s', (kilometraje) => {
    expect(validarDatos({ ...VALIDO, kilometraje }, ANIO).valido).toBe(true);
  });

  test.each([['0'], ['300001'], ['-5'], ['30,00']])('rechaza el kilometraje %s', (kilometraje) => {
    expect(errores({ kilometraje })).toEqual({ kilometraje: MENSAJES.kilometraje });
  });

  test.each([['2000'], ['300,000.00']])('acepta el precio límite %s', (precio) => {
    expect(validarDatos({ ...VALIDO, precio }, ANIO).valido).toBe(true);
  });

  test.each([['1999.99'], ['300000.01'], ['gratis']])('rechaza el precio %s', (precio) => {
    expect(errores({ precio })).toEqual({ precio: 'El precio debe estar entre B/. 2,000.00 y B/. 300,000.00' });
  });

  test('acepta descripciones de 20 y de 1,000 caracteres', () => {
    expect(validarDatos({ ...VALIDO, descripcion: 'x'.repeat(20) }, ANIO).valido).toBe(true);
    expect(validarDatos({ ...VALIDO, descripcion: 'x'.repeat(1000) }, ANIO).valido).toBe(true);
  });

  test.each([[19], [1001]])('rechaza una descripción de %i caracteres', (largo) => {
    expect(errores({ descripcion: 'x'.repeat(largo) })).toEqual({ descripcion: MENSAJES.descripcion });
  });

  test('los espacios alrededor no cuentan para la descripción', () => {
    expect(errores({ descripcion: `  ${'x'.repeat(19)}  ` })).toEqual({ descripcion: MENSAJES.descripcion });
  });

  test('solo acepta las cinco marcas alemanas (RN-01)', () => {
    expect(errores({ marca: 'Toyota' })).toEqual({ marca: MENSAJES.marca });
  });

  test.each([
    ['modelo', ''], ['modelo', 'x'.repeat(61)], ['color', ''], ['transmision', 'cvt'], ['combustible', 'gas'],
    ['motor', 'x'.repeat(61)],
  ])('rechaza %s = "%s"', (campo, valor) => {
    expect(errores({ [campo]: valor })).toEqual({ [campo]: MENSAJES[campo] });
  });

  test('el motor es opcional', () => {
    expect(validarDatos({ ...VALIDO, motor: '' }, ANIO).auto.motor).toBe('');
  });

  test('informa todos los errores a la vez', () => {
    expect(Object.keys(errores({ anio: '2000', precio: '1', color: '' })).sort()).toEqual(['anio', 'color', 'precio']);
  });

  test('un campo que llega como lista (formulario manipulado) es inválido', () => {
    expect(errores({ marca: ['BMW', 'Audi'] })).toEqual({ marca: MENSAJES.marca });
  });
});

describe('tipoDeImagen: se mira el contenido, no la extensión', () => {
  test('reconoce un JPG y un PNG por sus primeros bytes', () => {
    expect(tipoDeImagen(JPG)).toBe('jpg');
    expect(tipoDeImagen(PNG)).toBe('png');
  });

  test.each([['un GIF', GIF], ['un texto', Buffer.from('hola')], ['un archivo vacío', Buffer.alloc(0)]])('no acepta %s', (_, buffer) => {
    expect(tipoDeImagen(buffer)).toBeNull();
  });
});

describe('validarFotos (RN-06)', () => {
  test('acepta de 1 a 8 fotos JPG o PNG', () => {
    expect(validarFotos([foto('a.jpg')]).valido).toBe(true);
    expect(validarFotos(Array.from({ length: 8 }, (_, i) => foto(`f${i}.png`, PNG))).valido).toBe(true);
  });

  test('pide al menos una foto', () => {
    expect(validarFotos([]).errores).toEqual({ fotos: 'Adjunta al menos una foto del auto' });
  });

  test('rechaza una novena foto (FA-3)', () => {
    expect(validarFotos(Array.from({ length: 9 }, (_, i) => foto(`f${i}.jpg`))).errores)
      .toEqual({ fotos: 'Puedes subir como máximo 8 fotos' });
  });

  test('acepta una foto de exactamente 5 MB y rechaza una con un byte más (FA-2)', () => {
    expect(validarFotos([foto('justa.jpg', JPG, 5 * 1024 * 1024)]).valido).toBe(true);
    expect(validarFotos([foto('grande.jpg', JPG, 5 * 1024 * 1024 + 1)]).errores)
      .toEqual({ fotos: 'La foto grande.jpg pesa más de 5 MB' });
  });

  test('rechaza un archivo que se llama .jpg pero no es una imagen (FA-2)', () => {
    expect(validarFotos([foto('trampa.jpg', Buffer.from('<script>'))]).errores)
      .toEqual({ fotos: 'La foto trampa.jpg no es JPG ni PNG' });
  });
});
