// CU-05, flujo básico en el navegador: menú, formulario, contador, miniaturas, envío y Mis publicaciones.
const path = require('node:path');
const { test, expect } = require('@playwright/test');

// Todos los navegadores usan el mismo servidor: cada uno publica con su propio cliente, que tiene
// 2 publicaciones activas de 3 permitidas.
const CLIENTE_POR_NAVEGADOR = { chromium: 4, firefox: 6, webkit: 7, celular: 8 };
const FOTO = path.join(__dirname, '..', '..', 'publico', 'img', 'autos', 'usado-polo.jpg');

test('publicar un auto usado con una foto', async ({ page }, testInfo) => {
  const cliente = CLIENTE_POR_NAVEGADOR[testInfo.project.name];
  await page.goto('/iniciar-sesion?volver=%2Fvender');
  await page.getByLabel('Correo').fill(`cliente${cliente}@prueba.pa`);
  await page.getByLabel('Contraseña').fill('Prueba#2026');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page.getByRole('heading', { name: 'Vender mi auto' })).toBeVisible();
  await page.getByLabel('Marca').selectOption('Volkswagen');
  await page.getByLabel('Modelo').fill('Polo');
  await page.getByLabel('Año').fill('2022');
  await page.getByLabel('Kilometraje (km)').fill('24,000');
  await page.getByLabel('Color').fill('Rojo Sunset');
  await page.getByLabel('Precio (B/.)').fill('14,900');
  await page.getByLabel('Transmisión').selectOption('manual');
  await page.getByLabel('Combustible').selectOption('gasolina');
  await page.getByLabel('Descripción').fill('Primer dueño, poco uso y todos los mantenimientos.');
  await expect(page.locator('#contador-descripcion')).toHaveText('50 de 1,000 caracteres (mínimo 20)');
  await page.getByLabel(/^Fotos/).setInputFiles(FOTO);
  await expect(page.locator('#miniaturas img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();

  await expect(page.getByRole('status')).toHaveText(
    'Tu auto fue enviado a revisión. Llévalo al local de Autobahn en la Vía Ricardo J. Alfaro para su inspección.');
  const codigo = await page.locator('.codigo-cita strong').innerText();
  expect(codigo).toMatch(/^AU-\d{4}$/);
  await page.getByRole('link', { name: 'Ver mis publicaciones' }).click();
  await expect(page.getByRole('cell', { name: codigo })).toBeVisible();
});
