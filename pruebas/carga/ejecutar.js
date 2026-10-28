// RNF-01: prepara la base con 500 autos, levanta la app y corre la prueba de carga con k6 en Docker (no hace
// falta instalar k6). El resumen queda en informes/carga/resumen.json. Uso: npm run test:carga
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { RAIZ, levantarServidor } = require('../servidor-de-prueba');
const { prepararBase } = require('./preparar-base');

const K6 = 'grafana/k6:2.2.0';
const PUERTO = 3160;
const SALIDA = path.join(RAIZ, 'informes', 'carga');
const BD = path.join(SALIDA, 'autobahn-carga.db');

async function principal() {
  fs.mkdirSync(SALIDA, { recursive: true });
  console.log(`Base de la prueba de carga: ${prepararBase(BD)} autos`);
  const { detener } = await levantarServidor({ puerto: PUERTO, bd: BD });
  try {
    // k6 corre en un contenedor y llega a la app de esta computadora por host.docker.internal
    execFileSync('docker', [
      'run', '--rm', '--add-host=host.docker.internal:host-gateway',
      '-v', `${__dirname}:/scripts:ro`, '-v', `${SALIDA}:/informes`,
      K6, 'run', '-e', `BASE=http://host.docker.internal:${PUERTO}`,
      '--summary-export=/informes/resumen.json', '/scripts/busqueda.js',
    ], { stdio: 'inherit' });
  } catch (error) {
    // k6 sale con un código distinto de 0 si no se cumple un umbral (RNF-01)
    process.exitCode = error.status ?? 1;
  } finally {
    detener();
  }
}

principal();
