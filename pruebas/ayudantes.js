// Contexto de prueba: base de datos en memoria con los datos de prueba, fecha fija y la app.
const { abrirBaseDeDatos } = require('../src/bd/conexion');
const { sembrar } = require('../src/bd/semilla');
const { crearReloj } = require('../src/reloj');
const { crearApp } = require('../src/app');

function crearContexto({ fecha = '2026-10-20T10:00:00', registrarError = () => {} } = {}) {
  const db = abrirBaseDeDatos(':memory:');
  sembrar(db);
  const reloj = crearReloj(fecha);
  const app = crearApp({ db, reloj, secretoSesion: 'secreto-de-pruebas', registrarError });
  return { db, reloj, app };
}

// ids de los autos que aparecen como tarjetas en una pagina
function idsDeTarjetas(html) {
  return [...html.matchAll(/class="tarjeta-auto" data-auto="(\d+)"/g)].map((m) => Number(m[1]));
}

module.exports = { crearContexto, idsDeTarjetas };
