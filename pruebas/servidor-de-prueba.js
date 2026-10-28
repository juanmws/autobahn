// Levanta la app en un proceso aparte para las revisiones que la usan desde afuera (Lighthouse y la prueba
// de carga), con la fecha fija del plan de pruebas, y espera a que responda.
const { spawn } = require('node:child_process');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');

async function levantarServidor({ puerto, bd = ':memory:' }) {
  const base = `http://localhost:${puerto}`;
  const proceso = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'src/servidor.js'], {
    cwd: RAIZ,
    env: {
      ...process.env,
      PORT: String(puerto),
      AUTOBAHN_BD: bd,
      AUTOBAHN_FECHA: '2026-10-20T10:00:00',
      SESION_SECRETO: 'secreto-de-las-revisiones-externas',
      AUTOBAHN_SUBIDAS: 'test-results/subidas',
    },
    stdio: 'ignore',
  });
  for (let intento = 0; intento < 50; intento += 1) {
    try {
      if ((await fetch(base)).ok) {
        return { base, detener: () => proceso.kill() };
      }
    } catch {
      // todavía no escucha
    }
    await new Promise((resolver) => setTimeout(resolver, 200));
  }
  proceso.kill();
  throw new Error(`El servidor no respondió en ${base}`);
}

module.exports = { RAIZ, levantarServidor };
