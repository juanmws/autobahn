// Borra la base de datos local y las fotos subidas, y vuelve a crear la base con los datos de prueba:
// npm run bd:reiniciar
const fs = require('node:fs');
const path = require('node:path');
const { abrirBaseDeDatos } = require('../src/bd/conexion');
const { sembrar } = require('../src/bd/semilla');

const ruta = process.env.AUTOBAHN_BD || path.join(__dirname, '..', 'datos', 'autobahn.db');
const subidas = process.env.AUTOBAHN_SUBIDAS || path.join(__dirname, '..', 'datos', 'subidas');
for (const archivo of [ruta, `${ruta}-wal`, `${ruta}-shm`]) {
  fs.rmSync(archivo, { force: true });
}
fs.rmSync(subidas, { recursive: true, force: true });

const db = abrirBaseDeDatos(ruta);
sembrar(db);
const { autos } = db.prepare('SELECT COUNT(*) AS autos FROM autos').get();
const { usuarios } = db.prepare('SELECT COUNT(*) AS usuarios FROM usuarios').get();
db.close();
console.log(`Base de datos reiniciada en ${ruta}: ${autos} autos y ${usuarios} usuarios.`);
