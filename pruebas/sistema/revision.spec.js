// Prueba de aceptación del recorrido de un vendedor (E1, sección 1.3.1): se registra, publica su auto,
// un administrador lo aprueba (CU-06) y el auto queda Disponible en el catálogo.
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { crearCuentaNueva } = require('./ayudantes');

const FOTO = path.join(__dirname, '..', '..', 'publico', 'img', 'autos', 'usado-golf-gti.jpg');

test('un vendedor nuevo publica su auto y un administrador lo aprueba', async ({ browser }, testInfo) => {
  // cada navegador (y cada reintento) crea su propio vendedor: todos comparten el servidor
  const vendedor = await (await browser.newContext()).newPage();
  await crearCuentaNueva(vendedor, testInfo, { nombre: 'Marco', apellido: 'Vega', provincia: 7 });

  await vendedor.getByRole('link', { name: 'Vender mi auto' }).click();
  await vendedor.getByLabel('Marca').selectOption('Volkswagen');
  await vendedor.getByLabel('Modelo').fill('Golf GTI');
  await vendedor.getByLabel('Año').fill('2019');
  await vendedor.getByLabel('Kilometraje (km)').fill('52,000');
  await vendedor.getByLabel('Color').fill('Rojo Tornado');
  await vendedor.getByLabel('Precio (B/.)').fill('22,500');
  await vendedor.getByLabel('Transmisión').selectOption('manual');
  await vendedor.getByLabel('Combustible').selectOption('gasolina');
  await vendedor.getByLabel('Descripción').fill('Mantenimientos en agencia y llantas nuevas.');
  await vendedor.getByLabel(/^Fotos/).setInputFiles(FOTO);
  await vendedor.getByRole('button', { name: 'Enviar a revisión' }).click();
  const codigo = await vendedor.locator('.codigo-cita strong').innerText();

  const admin = await (await browser.newContext()).newPage();
  await admin.goto('/iniciar-sesion');
  await admin.getByLabel('Correo').fill('admin@autobahn.pa');
  await admin.getByLabel('Contraseña').fill('Autobahn#2026');
  await admin.getByRole('button', { name: 'Iniciar sesión' }).click();
  await admin.getByRole('link', { name: 'Panel' }).click();
  await admin.getByRole('link', { name: 'Revisar publicaciones' }).click();
  await admin.getByRole('link', { name: codigo }).click();
  await expect(admin.getByText('Marco Vega')).toBeVisible();
  await admin.getByRole('link', { name: 'Aprobar' }).click();
  await admin.getByRole('button', { name: 'Sí, aprobar' }).click();
  await expect(admin.getByRole('status')).toHaveText(`Publicación ${codigo} aprobada`);

  await vendedor.goto('/mi-cuenta');
  await expect(vendedor.getByRole('row', { name: new RegExp(codigo) })).toContainText('Disponible');
});
