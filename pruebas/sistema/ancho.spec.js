// RNF-05: ninguna página se desplaza de lado en pantallas de 360 a 1920 píxeles. En los navegadores de
// escritorio se prueba cada ancho; el proyecto celular usa el suyo (Pixel 7).
// Se mide con clientWidth: con la emulación de celular, window.innerWidth crece con el contenido y esconde
// el desborde.
const { test, expect } = require('@playwright/test');

const ANCHOS = [360, 768, 1280, 1920];

const PUBLICAS = [
  '/', '/catalogo', '/catalogo?marca=BMW&condicion=usado&orden=precio_asc',
  '/catalogo?precioMin=60%2C000&precioMax=30%2C000', '/catalogo?marca=Porsche&transmision=manual',
  '/autos/2', '/autos/2/financiamiento?abono=5%2C500&plazo=60', '/iniciar-sesion', '/crear-cuenta', '/comparacion',
];
const DEL_CLIENTE = ['/mi-cuenta', '/vender', '/autos/2/oferta', '/autos/2/prueba-de-manejo?fecha=2026-10-22'];
const DEL_ADMINISTRADOR = ['/admin', '/admin/publicaciones', '/admin/publicaciones/AU-0036?accion=rechazar'];

async function revisarAnchos(page, testInfo, rutas) {
  const anchos = testInfo.project.name === 'celular' ? [null] : ANCHOS;
  for (const ancho of anchos) {
    if (ancho) {
      await page.setViewportSize({ width: ancho, height: 900 });
    }
    for (const ruta of rutas) {
      await page.goto(ruta);
      // sin redirección: si la sesión no llegara, se estaría revisando la página de inicio de sesión
      expect.soft(new URL(page.url()).pathname, `redirección desde ${ruta}`).toBe(ruta.split('?')[0]);
      const { contenido, visible } = await page.evaluate(() => ({
        contenido: document.documentElement.scrollWidth, visible: document.documentElement.clientWidth,
      }));
      expect.soft(contenido, `desborde en ${ruta} a ${ancho ?? 'celular'} px`).toBeLessThanOrEqual(visible);
    }
  }
}

const entrar = (page, correo, contrasena) =>
  page.request.post('/iniciar-sesion', { form: { correo, contrasena } });

test('páginas públicas, con dos autos en la comparación', async ({ page }, testInfo) => {
  // la barra de comparación aparece abajo en todas las páginas y /comparacion muestra la tabla
  await page.request.post('/comparacion', { form: { autoId: '2', volver: '/' } });
  await page.request.post('/comparacion', { form: { autoId: '11', volver: '/' } });
  await revisarAnchos(page, testInfo, PUBLICAS);
});

test('páginas del cliente', async ({ page }, testInfo) => {
  await entrar(page, 'cliente2@prueba.pa', 'Prueba#2026');
  await revisarAnchos(page, testInfo, DEL_CLIENTE);
});

test('páginas del administrador', async ({ page }, testInfo) => {
  await entrar(page, 'admin@autobahn.pa', 'Autobahn#2026');
  await revisarAnchos(page, testInfo, DEL_ADMINISTRADOR);
});
