// Prueba de humo del plan de pruebas (E1, seccion 1.3.5): si falla, se suspenden las demas pruebas.
const { test, expect } = require('@playwright/test');

test('iniciar sesión, buscar un auto en el catálogo y abrir su ficha', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.getByLabel('Correo').fill('cliente1@prueba.pa');
  await page.getByLabel('Contraseña').fill('Prueba#2026');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('Hola, Carlos')).toBeVisible();

  await page.getByRole('link', { name: 'Catálogo', exact: true }).click();
  // la cantidad exacta la prueban las de integración; aquí otras pruebas de sistema pueden aprobar autos
  await expect(page.getByText(/^\d+ autos disponibles$/)).toBeVisible();
  await expect(page.locator('.tarjeta-auto')).toHaveCount(12);

  const tarjeta = page.locator('.tarjeta-auto').first();
  const titulo = (await tarjeta.locator('.tarjeta-titulo').innerText()).trim();
  await tarjeta.getByRole('link', { name: /Ver detalle/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo);
  await expect(page.locator('.precio-grande')).toHaveText(/^B\/\. [\d,]+\.\d{2}$/);
});