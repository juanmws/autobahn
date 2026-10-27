// CU-07, flujo básico en el navegador: ficha, día, bloque, licencia, resumen, confirmación y Mis citas.
const { test, expect } = require('@playwright/test');

// Todos los navegadores usan el mismo servidor: cada uno agenda con su propio cliente y en su propio
// día, y toma el primer bloque libre, para no chocar entre ellos ni con un reintento.
const POR_NAVEGADOR = { chromium: [2, 0], firefox: [3, 1], webkit: [4, 2], celular: [6, 3] };

test('agendar una prueba de manejo desde la ficha de un auto', async ({ page }, testInfo) => {
  const [cliente, dia] = POR_NAVEGADOR[testInfo.project.name];
  await page.goto('/iniciar-sesion');
  await page.getByLabel('Correo').fill(`cliente${cliente}@prueba.pa`);
  await page.getByLabel('Contraseña').fill('Prueba#2026');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText(/^Hola, /)).toBeVisible();

  await page.goto('/autos/1');
  await page.getByRole('link', { name: 'Agendar prueba de manejo' }).click();
  await expect(page.locator('.dia')).toHaveCount(12);
  await page.locator('.dia').nth(dia).click();
  await page.locator('input[name="hora"]:not([disabled])').first().check();
  await page.getByLabel('3. Fecha de vencimiento de tu licencia de conducir').fill('2028-01-31');
  await page.getByRole('button', { name: 'Ver resumen' }).click();

  await expect(page.getByRole('heading', { name: 'Revisa tu cita' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar cita' }).click();

  await expect(page.getByRole('heading', { name: 'Tu prueba de manejo quedó programada' })).toBeVisible();
  const codigo = await page.locator('.codigo-cita strong').innerText();
  expect(codigo).toMatch(/^PM-\d{4}$/);
  await page.getByRole('link', { name: 'Ver mis citas' }).click();
  await expect(page.getByRole('link', { name: codigo })).toBeVisible();
});
