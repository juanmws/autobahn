// RNF-03: cada página obtiene 90 puntos o más en la categoría Accesibilidad de Lighthouse. Levanta su
// propio servidor con los datos de prueba, inicia sesión como cliente y como administrador para revisar
// también sus páginas, y deja los informes en informes/lighthouse/ como evidencia. Uso: npm run test:accesibilidad
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { RAIZ, levantarServidor } = require('../servidor-de-prueba');

const LIGHTHOUSE = 'lighthouse@13.5.0';
const MINIMO = 90;
const SALIDA = path.join(RAIZ, 'informes', 'lighthouse');

// [nombre del informe, ruta, sesión]
const PAGINAS = [
  ['inicio', '/', 'visitante'],
  ['catalogo', '/catalogo', 'visitante'],
  ['catalogo-filtros', '/catalogo?marca=BMW&condicion=usado&orden=precio_asc', 'visitante'],
  ['catalogo-error', '/catalogo?precioMin=60%2C000&precioMax=30%2C000', 'visitante'],
  ['ficha', '/autos/2', 'visitante'],
  ['financiamiento', '/autos/2/financiamiento?abono=5%2C500&plazo=60', 'visitante'],
  ['comparacion', '/comparacion', 'visitante'],
  ['iniciar-sesion', '/iniciar-sesion', 'nadie'],
  ['crear-cuenta', '/crear-cuenta', 'nadie'],
  ['mi-cuenta', '/mi-cuenta', 'cliente'],
  ['vender', '/vender', 'cliente'],
  ['prueba-de-manejo', '/autos/2/prueba-de-manejo?fecha=2026-10-22', 'cliente'],
  ['oferta', '/autos/2/oferta', 'cliente'],
  ['admin', '/admin', 'administrador'],
  ['revision-lista', '/admin/publicaciones', 'administrador'],
  ['revision-detalle', '/admin/publicaciones/AU-0036?accion=rechazar', 'administrador'],
];

// Envía un formulario y devuelve la cookie de sesión que responde el servidor (o la misma que se mandó)
async function enviar(base, ruta, datos, cookie = '') {
  const respuesta = await fetch(base + ruta, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams(datos),
  });
  return respuesta.headers.get('set-cookie')?.split(';')[0] ?? cookie;
}

async function sesiones(base) {
  let visitante = await enviar(base, '/comparacion', { autoId: '2', volver: '/' });
  visitante = await enviar(base, '/comparacion', { autoId: '11', volver: '/' }, visitante);
  return {
    nadie: '',
    visitante,
    cliente: await enviar(base, '/iniciar-sesion', { correo: 'cliente2@prueba.pa', contrasena: 'Prueba#2026' }),
    administrador: await enviar(base, '/iniciar-sesion', { correo: 'admin@autobahn.pa', contrasena: 'Autobahn#2026' }),
  };
}

function auditar(url, nombre, cookie) {
  const destino = path.join(SALIDA, nombre);
  const argumentos = [
    '--yes', LIGHTHOUSE, url, '--only-categories=accessibility', '--output=json', '--output=html',
    `--output-path=${destino}`, '--quiet', '--chrome-flags=--headless=new',
    // la página de un error de validación (FA-1) responde 422 a propósito y también se revisa
    '--ignore-status-code',
  ];
  if (cookie) {
    argumentos.push(`--extra-headers=${JSON.stringify({ Cookie: cookie })}`);
  }
  execFileSync('npx', argumentos, { stdio: 'inherit' });
  const informe = JSON.parse(fs.readFileSync(`${destino}.report.json`, 'utf8'));
  const fallas = Object.values(informe.audits)
    .filter((a) => a.scoreDisplayMode === 'binary' && a.score === 0)
    .map((a) => a.id);
  return { puntaje: Math.round(informe.categories.accessibility.score * 100), fallas, final: informe.finalDisplayedUrl };
}

async function principal() {
  fs.mkdirSync(SALIDA, { recursive: true });
  const { base, detener } = await levantarServidor({ puerto: 3150 });
  try {
    const cookies = await sesiones(base);
    const resultados = PAGINAS.map(([nombre, ruta, sesion]) => {
      const resultado = auditar(base + ruta, nombre, cookies[sesion]);
      return { ruta, ...resultado, redirigida: resultado.final !== base + ruta };
    });
    console.table(resultados.map(({ ruta, puntaje, fallas, redirigida }) => ({
      ruta, puntaje, fallas: fallas.join(', '), redirigida: redirigida ? 'sí' : '',
    })));
    const bajos = resultados.filter((r) => r.puntaje < MINIMO || r.redirigida);
    if (bajos.length > 0) {
      console.error(`RNF-03: ${bajos.length} página(s) por debajo de ${MINIMO} o redirigidas`);
      process.exitCode = 1;
    }
  } finally {
    detener();
  }
}

principal();
