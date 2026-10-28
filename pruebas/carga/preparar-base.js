// RNF-01: base de datos de la prueba de carga. Tiene los datos de prueba y autos generados hasta llegar a
// 500, todos a partir de los modelos de la semilla con otro año, kilometraje y precio. La secuencia de
// números es fija, así que cada corrida usa la misma base. Los autos generados no tienen fotos: el
// catálogo les muestra la silueta.
const fs = require('node:fs');
const { abrirBaseDeDatos } = require('../../src/bd/conexion');
const { sembrar } = require('../../src/bd/semilla');
const { marcaDeTiempo } = require('../../src/reloj');

const TOTAL = 500;
const CON_CONDICION_USADO = 0.5;

// Generador congruencial lineal: el mismo resultado en cada corrida
function crearAzar(semilla) {
  let estado = semilla;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado / 2147483648;
  };
}

function prepararBase(ruta) {
  for (const sufijo of ['', '-wal', '-shm']) {
    fs.rmSync(`${ruta}${sufijo}`, { force: true });
  }
  const db = abrirBaseDeDatos(ruta);
  sembrar(db);

  const azar = crearAzar(2026);
  const entero = (minimo, maximo) => minimo + Math.floor(azar() * (maximo - minimo + 1));
  const plantillas = db.prepare('SELECT * FROM autos').all();
  const clientes = db.prepare("SELECT id FROM usuarios WHERE rol = 'cliente'").all().map((u) => u.id);
  const insertar = db.prepare(`
    INSERT INTO autos (codigo, condicion, marca, modelo, anio, kilometraje, precio_centavos, transmision,
                       combustible, color, motor, descripcion, estado, vendedor_id, creado_en)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'disponible', ?, ?)`);

  db.exec('BEGIN');
  for (let numero = plantillas.length + 1; numero <= TOTAL; numero += 1) {
    const plantilla = plantillas[entero(0, plantillas.length - 1)];
    const usado = azar() < CON_CONDICION_USADO;
    const factor = usado ? 0.45 + azar() * 0.5 : 0.95 + azar() * 0.1;
    const publicado = new Date(2026, 9, 15, 9, 0, 0);
    publicado.setHours(publicado.getHours() - numero * 3);
    insertar.run(
      `AU-${String(numero).padStart(4, '0')}`,
      usado ? 'usado' : 'nuevo',
      plantilla.marca,
      plantilla.modelo,
      usado ? entero(2012, 2025) : 2026,
      usado ? entero(5, 160) * 1000 : 0,
      Math.round((plantilla.precio_centavos * factor) / 10000) * 10000,
      plantilla.transmision,
      plantilla.combustible,
      plantilla.color,
      plantilla.motor,
      plantilla.descripcion,
      usado ? clientes[entero(0, clientes.length - 1)] : null,
      marcaDeTiempo(publicado),
    );
  }
  db.exec('COMMIT');
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM autos').get();
  db.close();
  return total;
}

module.exports = { TOTAL, prepararBase };
