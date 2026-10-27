const bcrypt = require('bcryptjs');
const { abrirBaseDeDatos } = require('../../src/bd/conexion');
const { sembrar } = require('../../src/bd/semilla');

let db;

beforeAll(() => {
  db = abrirBaseDeDatos(':memory:');
  sembrar(db);
});

afterAll(() => db.close());

function contar(sql, ...parametros) {
  return db.prepare(sql).get(...parametros).n;
}

function insertarAuto(cambios = {}) {
  const auto = {
    codigo: 'AU-9999', condicion: 'nuevo', marca: 'BMW', modelo: 'X2', anio: 2026, kilometraje: 0,
    precio_centavos: 5000000, transmision: 'automatica', combustible: 'gasolina', color: 'Negro',
    motor: '2.0 turbo', descripcion: 'Auto de prueba para las restricciones.', estado: 'disponible',
    vendedor_id: null, creado_en: '2026-10-01T09:00:00', ...cambios,
  };
  const columnas = Object.keys(auto);
  db.prepare(`INSERT INTO autos (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`)
    .run(...Object.values(auto));
}

describe('datos de prueba', () => {
  test('hay 1 administrador y 8 clientes', () => {
    expect(contar("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'administrador'")).toBe(1);
    expect(contar("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'cliente'")).toBe(8);
  });

  test('hay 20 autos nuevos del inventario, sin vendedor', () => {
    expect(contar("SELECT COUNT(*) AS n FROM autos WHERE condicion = 'nuevo' AND vendedor_id IS NULL")).toBe(20);
  });

  test('hay 20 autos usados, cada uno con su vendedor', () => {
    expect(contar("SELECT COUNT(*) AS n FROM autos WHERE condicion = 'usado' AND vendedor_id IS NOT NULL")).toBe(20);
  });

  test('36 autos están Disponible, 3 En revisión y 1 Rechazada con su motivo', () => {
    expect(contar("SELECT COUNT(*) AS n FROM autos WHERE estado = 'disponible'")).toBe(36);
    expect(contar("SELECT COUNT(*) AS n FROM autos WHERE estado = 'en_revision'")).toBe(3);
    expect(contar("SELECT COUNT(*) AS n FROM autos WHERE estado = 'rechazada' AND length(motivo_rechazo) BETWEEN 10 AND 300")).toBe(1);
  });

  test('ningún cliente pasa de 3 publicaciones activas (RN-07)', () => {
    const maximo = db.prepare(`
      SELECT MAX(n) AS n FROM (
        SELECT COUNT(*) AS n FROM autos
        WHERE estado IN ('en_revision', 'disponible') AND vendedor_id IS NOT NULL
        GROUP BY vendedor_id)`).get().n;
    expect(maximo).toBe(3);
  });

  test('los autos usados cumplen los rangos de la RN-06 en 2026', () => {
    const fuera = contar(`
      SELECT COUNT(*) AS n FROM autos WHERE condicion = 'usado' AND NOT (
        anio BETWEEN 2011 AND 2026
        AND kilometraje BETWEEN 1 AND 300000
        AND precio_centavos BETWEEN 200000 AND 30000000
        AND length(descripcion) BETWEEN 20 AND 1000)`);
    expect(fuera).toBe(0);
  });

  test('las contraseñas se guardan con bcrypt de costo 10 (RNF-04)', () => {
    const usuarios = db.prepare('SELECT correo, hash_contrasena FROM usuarios').all();
    for (const { hash_contrasena: hash } of usuarios) {
      expect(hash.startsWith('$2')).toBe(true);
      expect(hash.split('$')[2]).toBe('10');
    }
    const cliente = usuarios.find((u) => u.correo === 'cliente1@prueba.pa');
    expect(bcrypt.compareSync('Prueba#2026', cliente.hash_contrasena)).toBe(true);
  });
});

describe('restricciones del esquema', () => {
  test('rechaza una marca que no es alemana (RN-01)', () => {
    expect(() => insertarAuto({ codigo: 'AU-9001', marca: 'Toyota' })).toThrow(/CHECK/);
  });

  test('rechaza un estado que no existe (RN-08)', () => {
    expect(() => insertarAuto({ codigo: 'AU-9002', estado: 'vendido' })).toThrow(/CHECK/);
  });

  test('un auto usado necesita vendedor y uno nuevo no lo lleva', () => {
    expect(() => insertarAuto({ codigo: 'AU-9003', condicion: 'usado' })).toThrow(/CHECK/);
    expect(() => insertarAuto({ codigo: 'AU-9004', vendedor_id: 2 })).toThrow(/CHECK/);
  });

  test('rechaza un vendedor que no existe', () => {
    expect(() => insertarAuto({ codigo: 'AU-9005', condicion: 'usado', vendedor_id: 999 })).toThrow(/FOREIGN KEY/);
  });

  test('no repite cédulas ni correos, sin importar mayúsculas', () => {
    const insertar = db.prepare(`
      INSERT INTO usuarios (rol, nombre, apellido, cedula, fecha_nacimiento, telefono, correo, hash_contrasena, creado_en)
      VALUES ('cliente', 'Prueba', 'Duplicada', ?, '1990-01-01', '61111111', ?, 'x', '2026-10-01T09:00:00')`);
    const { cedula } = db.prepare("SELECT cedula FROM usuarios WHERE correo = 'cliente1@prueba.pa'").get();
    expect(() => insertar.run(cedula, 'otro@prueba.pa')).toThrow(/UNIQUE/);
    expect(() => insertar.run('8-1-1', 'CLIENTE1@PRUEBA.PA')).toThrow(/UNIQUE/);
  });
});
