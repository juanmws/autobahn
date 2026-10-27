// Punto de entrada: npm start. Variables opcionales:
//   PORT            puerto (3000)
//   AUTOBAHN_BD     archivo de la base de datos (datos/autobahn.db; ":memory:" para una base temporal)
//   AUTOBAHN_FECHA  fecha fija del sistema, AAAA-MM-DDTHH:MM:SS (para pruebas)
//   SESION_SECRETO  secreto de las cookies de sesion (si falta, se genera uno al arrancar)
const crypto = require('node:crypto');
const path = require('node:path');
const { abrirBaseDeDatos } = require('./bd/conexion');
const { sembrar } = require('./bd/semilla');
const { crearReloj } = require('./reloj');
const { crearApp } = require('./app');

const rutaBd = process.env.AUTOBAHN_BD || path.join(__dirname, '..', 'datos', 'autobahn.db');
const db = abrirBaseDeDatos(rutaBd);
if (db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n === 0) {
  sembrar(db);
  console.log('Base de datos nueva: se cargaron los datos de prueba.');
}

const app = crearApp({
  db,
  reloj: crearReloj(process.env.AUTOBAHN_FECHA),
  secretoSesion: process.env.SESION_SECRETO || crypto.randomBytes(32).toString('hex'),
});

const puerto = Number(process.env.PORT) || 3000;
app.listen(puerto, () => {
  console.log(`Autobahn está corriendo en http://localhost:${puerto}`);
});
