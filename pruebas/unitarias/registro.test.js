// RF-01 y RN-02: validación del registro. Fecha de referencia del plan de pruebas: 20/10/2026.
const { MENSAJES, edadEn, validarRegistro } = require('../../src/reglas/registro');

const HOY = new Date(2026, 9, 20, 10, 0, 0);
const VALIDO = {
  nombre: 'Sofía', apellido: 'De León', cedula: '8-900-1001', fechaNacimiento: '1998-04-15',
  telefono: '6123-4567', correo: ' Sofia.Leon@Prueba.PA ', contrasena: 'Prueba#2026', confirmacion: 'Prueba#2026',
  terminos: 'si',
};

function errores(cambios) {
  return validarRegistro({ ...VALIDO, ...cambios }, { hoy: HOY }).errores;
}

describe('edadEn', () => {
  test('cuenta los años cumplidos a la fecha', () => {
    expect(edadEn('1998-04-15', HOY)).toBe(28);
  });

  test('quien cumple años hoy ya los tiene', () => {
    expect(edadEn('2008-10-20', HOY)).toBe(18);
  });

  test('quien los cumple mañana todavía no', () => {
    expect(edadEn('2008-10-21', HOY)).toBe(17);
  });
});

describe('validarRegistro', () => {
  test('acepta datos válidos y los normaliza', () => {
    expect(validarRegistro(VALIDO, { hoy: HOY })).toEqual({
      valido: true,
      cuenta: {
        nombre: 'Sofía', apellido: 'De León', cedula: '8-900-1001', fechaNacimiento: '1998-04-15',
        telefono: '61234567', correo: 'sofia.leon@prueba.pa', contrasena: 'Prueba#2026',
      },
    });
  });

  describe('nombre y apellido: de 2 a 50 letras', () => {
    test.each(['Al', 'María José', "D'Angelo", 'Núñez-Ríos', 'a'.repeat(50)])('acepta "%s"', (nombre) => {
      expect(validarRegistro({ ...VALIDO, nombre }, { hoy: HOY }).valido).toBe(true);
    });

    test.each(['A', 'a'.repeat(51), 'Ana2', '', '  '])('rechaza "%s"', (nombre) => {
      expect(errores({ nombre })).toEqual({ nombre: MENSAJES.nombre });
    });

    test('valida el apellido con la misma regla', () => {
      expect(errores({ apellido: 'B' })).toEqual({ apellido: MENSAJES.apellido });
    });
  });

  describe('cédula panameña', () => {
    test.each(['8-1016-1882', '13-123-1234', 'PE-12-345', 'E-8-123456', 'N-19-1234', 'pe-12-345'])('acepta "%s"', (cedula) => {
      expect(validarRegistro({ ...VALIDO, cedula }, { hoy: HOY }).valido).toBe(true);
    });

    test('la guarda en mayúsculas', () => {
      expect(validarRegistro({ ...VALIDO, cedula: 'pe-12-345' }, { hoy: HOY }).cuenta.cedula).toBe('PE-12-345');
    });

    test.each(['14-1-1', '0-12-34', '8-1016', 'X-1-1', '8 1016 1882', '8-12345-1'])('rechaza "%s"', (cedula) => {
      expect(errores({ cedula })).toEqual({ cedula: MENSAJES.cedula });
    });
  });

  describe('teléfono celular', () => {
    test.each(['61234567', '6123-4567', '6123 4567'])('acepta "%s"', (telefono) => {
      expect(validarRegistro({ ...VALIDO, telefono }, { hoy: HOY }).valido).toBe(true);
    });

    test.each(['71234567', '6123456', '612345678', '2123-4567'])('rechaza "%s"', (telefono) => {
      expect(errores({ telefono })).toEqual({ telefono: MENSAJES.telefono });
    });
  });

  describe('correo', () => {
    test.each(['ana@prueba', 'ana prueba@x.pa', '@prueba.pa', ''])('rechaza "%s"', (correo) => {
      expect(errores({ correo })).toEqual({ correo: MENSAJES.correo });
    });
  });

  describe('contraseña (FA-1) y confirmación (FA-2)', () => {
    test.each([['8 caracteres', 'Prueba12'], ['64 caracteres', `Aa1${'x'.repeat(61)}`]])('acepta %s', (_, contrasena) => {
      expect(validarRegistro({ ...VALIDO, contrasena, confirmacion: contrasena }, { hoy: HOY }).valido).toBe(true);
    });

    test.each([
      ['7 caracteres', 'Prueb12'], ['65 caracteres', `Aa1${'x'.repeat(62)}`], ['sin mayúscula', 'prueba#2026'],
      ['sin minúscula', 'PRUEBA#2026'], ['sin número', 'Prueba#dos'],
    ])('rechaza una contraseña de %s', (_, contrasena) => {
      expect(errores({ contrasena, confirmacion: contrasena })).toEqual({
        contrasena: 'La contraseña debe tener de 8 a 64 caracteres, con al menos una mayúscula, una minúscula y un número',
      });
    });

    test('rechaza una confirmación distinta', () => {
      expect(errores({ confirmacion: 'Prueba#2027' })).toEqual({ confirmacion: 'Las contraseñas no coinciden' });
    });
  });

  describe('fecha de nacimiento y edad (FE-2)', () => {
    test('acepta a quien cumple 18 años hoy', () => {
      expect(validarRegistro({ ...VALIDO, fechaNacimiento: '2008-10-20' }, { hoy: HOY }).valido).toBe(true);
    });

    test('rechaza a quien cumple 18 años mañana', () => {
      expect(errores({ fechaNacimiento: '2008-10-21' })).toEqual({
        fechaNacimiento: 'Debes tener 18 años o más para crear una cuenta',
      });
    });

    test.each(['15/04/1998', '1998-02-30', '2027-01-01', '1890-01-01', ''])('rechaza la fecha "%s"', (fechaNacimiento) => {
      expect(errores({ fechaNacimiento })).toEqual({ fechaNacimiento: MENSAJES.fechaNacimiento });
    });
  });

  test('exige aceptar los términos de uso', () => {
    expect(errores({ terminos: undefined })).toEqual({ terminos: 'Debes aceptar los términos de uso' });
  });

  test('informa todos los errores a la vez', () => {
    expect(Object.keys(errores({ nombre: 'A', telefono: '1', terminos: '' })).sort()).toEqual(['nombre', 'telefono', 'terminos']);
  });

  test('un campo que llega como lista (formulario manipulado) es inválido', () => {
    expect(errores({ correo: ['a@b.pa', 'c@d.pa'] })).toEqual({ correo: MENSAJES.correo });
  });
});
