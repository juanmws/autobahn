// RF-07 y RN-09. Fecha de referencia del plan de pruebas: martes 20/10/2026 a las 10:00.
const {
  BLOQUES, MENSAJES, fechaIso, diasHabilitados, validarSeleccion, validarCita,
} = require('../../src/reglas/citas');

const MARTES = new Date(2026, 9, 20, 10, 0, 0);
const SABADO = new Date(2026, 9, 24, 10, 0, 0);

describe('bloques y días (RN-09)', () => {
  test('hay ocho bloques de una hora, de las 9:00 a las 16:00', () => {
    expect(BLOQUES).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
  });

  test('fechaIso usa la fecha local', () => {
    expect(fechaIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  test('habilita de lunes a sábado desde mañana hasta 14 días después', () => {
    const dias = diasHabilitados(MARTES);
    expect(dias).toHaveLength(12);
    expect(dias[0]).toBe('2026-10-21');
    expect(dias[dias.length - 1]).toBe('2026-11-03');
  });

  test.each([
    ['hoy', '2026-10-20'], ['un domingo', '2026-10-25'], ['otro domingo', '2026-11-01'], ['15 días después', '2026-11-04'],
  ])('no habilita %s', (_, fecha) => {
    expect(diasHabilitados(MARTES)).not.toContain(fecha);
  });

  test('si hoy es sábado, el primer día habilitado es el lunes', () => {
    expect(diasHabilitados(SABADO)[0]).toBe('2026-10-26');
  });
});

describe('validarSeleccion: formato y rangos', () => {
  const valida = { hoy: MARTES, fecha: '2026-10-22', hora: '10', vencimientoLicencia: '2028-01-31' };

  test('acepta un día habilitado, un bloque y una fecha de licencia', () => {
    expect(validarSeleccion(valida)).toEqual({
      valido: true, datos: { fecha: '2026-10-22', hora: 10, vencimientoLicencia: '2028-01-31' },
    });
  });

  test.each(['9', '16'])('acepta el bloque límite de las %s:00', (hora) => {
    expect(validarSeleccion({ ...valida, hora }).valido).toBe(true);
  });

  test.each(['8', '17', '10.5', 'abc', ''])('rechaza el bloque "%s"', (hora) => {
    expect(validarSeleccion({ ...valida, hora }).errores).toEqual({ hora: MENSAJES.hora });
  });

  test.each(['2026-10-20', '2026-10-25', '2026-11-04', '22/10/2026', ''])('rechaza el día "%s"', (fecha) => {
    expect(validarSeleccion({ ...valida, fecha }).errores).toEqual({ fecha: MENSAJES.fecha });
  });

  test.each(['', '31/01/2028', '2028-02-30', 'mañana'])('rechaza el vencimiento de licencia "%s"', (vencimientoLicencia) => {
    expect(validarSeleccion({ ...valida, vencimientoLicencia }).errores).toEqual({ licencia: MENSAJES.licenciaFormato });
  });
});

// Tabla de decisión del paso 4 del CU-07, en su orden: bloque libre, licencia, límite y mismo bloque
describe('validarCita', () => {
  const base = {
    hoy: MARTES, fecha: '2026-10-22', hora: 10, vencimientoLicencia: '2028-01-31',
    horasOcupadasDelAuto: [], citasDelCliente: [], esPropio: false,
  };

  test('R1: todo se cumple', () => {
    expect(validarCita(base)).toEqual({ valido: true });
  });

  test('R2: el bloque ya está ocupado (FA-1)', () => {
    expect(validarCita({ ...base, horasOcupadasDelAuto: [10] })).toEqual(
      { valido: false, motivo: 'ocupado', mensaje: 'Ese horario acaba de ocuparse; elige otro' });
  });

  test('R3: la licencia vence el día anterior a la cita (FE-1)', () => {
    expect(validarCita({ ...base, vencimientoLicencia: '2026-10-21' })).toEqual(
      { valido: false, motivo: 'licencia', mensaje: 'Tu licencia de conducir debe estar vigente el día de la prueba' });
  });

  test('una licencia que vence el mismo día de la cita sigue vigente', () => {
    expect(validarCita({ ...base, vencimientoLicencia: '2026-10-22' }).valido).toBe(true);
  });

  test('R4: ya tiene 2 citas programadas (FE-2)', () => {
    const citasDelCliente = [{ fecha: '2026-10-23', hora: 9 }, { fecha: '2026-10-24', hora: 9 }];
    expect(validarCita({ ...base, citasDelCliente })).toEqual(
      { valido: false, motivo: 'limite', mensaje: 'Ya tienes 2 pruebas de manejo programadas, el máximo permitido' });
  });

  test('con 1 cita programada todavía puede agendar otra', () => {
    expect(validarCita({ ...base, citasDelCliente: [{ fecha: '2026-10-23', hora: 9 }] }).valido).toBe(true);
  });

  test('las citas de días pasados no cuentan para el límite', () => {
    const citasDelCliente = [{ fecha: '2026-10-19', hora: 9 }, { fecha: '2026-10-23', hora: 9 }];
    expect(validarCita({ ...base, citasDelCliente }).valido).toBe(true);
  });

  test('R5: ya tiene otra cita en el mismo día y bloque (FA-2)', () => {
    expect(validarCita({ ...base, citasDelCliente: [{ fecha: '2026-10-22', hora: 10 }] })).toEqual(
      { valido: false, motivo: 'mismo_bloque', mensaje: 'Ya tienes una cita a esa hora; elige otro bloque' });
  });

  test('una cita a la misma hora pero otro día no choca', () => {
    expect(validarCita({ ...base, citasDelCliente: [{ fecha: '2026-10-23', hora: 10 }] }).valido).toBe(true);
  });

  test('el bloque ocupado se informa antes que la licencia vencida', () => {
    expect(validarCita({ ...base, horasOcupadasDelAuto: [10], vencimientoLicencia: '2020-01-01' }).motivo).toBe('ocupado');
  });

  test('la licencia vencida se informa antes que el límite de citas', () => {
    const citasDelCliente = [{ fecha: '2026-10-23', hora: 9 }, { fecha: '2026-10-24', hora: 9 }];
    expect(validarCita({ ...base, citasDelCliente, vencimientoLicencia: '2020-01-01' }).motivo).toBe('licencia');
  });

  test('no se agenda una prueba de un auto propio', () => {
    expect(validarCita({ ...base, esPropio: true })).toEqual(
      { valido: false, motivo: 'propio', mensaje: 'No puedes agendar una prueba de manejo de tu propio auto' });
  });
});
