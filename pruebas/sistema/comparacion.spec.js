// CU-03, flujo básico en el navegador: comparar tres autos (dos desde el catálogo y uno desde su ficha),
// ver los valores resaltados y quitar autos (FA-1) hasta volver al catálogo con el aviso.
// Autos: 2 (BMW 320i usado, B/. 27,500.00), 11 (BMW 320i nuevo, 2026, 0 km) y 32 (BMW 118i, B/. 22,500.00).
const { test, expect } = require('@playwright/test');

test('comparar tres autos y quitarlos', async ({ page }) => {
  await page.goto('/catalogo?marca=BMW&modelo=320i');
  const barra = page.getByRole('complementary', { name: 'Comparación de autos' });

  await page.getByRole('button', { name: 'Comparar el BMW 320i' }).first().click();
  await expect(barra).toContainText('1 de 3');
  await expect(barra).toContainText('Agrega otro auto para comparar');
  // vuelve al mismo catálogo filtrado
  await expect(page).toHaveURL(/marca=BMW&modelo=320i/);

  await page.getByRole('button', { name: 'Comparar el BMW 320i' }).click();
  await expect(barra).toContainText('2 de 3');

  await page.goto('/autos/32');
  await page.getByRole('button', { name: 'Comparar el BMW 118i' }).click();
  await expect(barra).toContainText('3 de 3');
  await barra.getByRole('link', { name: 'Ver comparación' }).click();

  await expect(page.getByRole('heading', { name: 'Comparar autos' })).toBeVisible();
  await expect(page.locator('thead th')).toHaveCount(3);
  await expect(page.locator('td.mejor')).toHaveCount(3);
  await expect(page.locator('td.mejor', { hasText: 'Menor precio' })).toContainText('B/. 22,500.00');
  // Con tres columnas la tabla se desplaza dentro de su caja y la página no se desborda (en el celular pasaba).
  // Se compara con clientWidth: con la emulación de celular, innerWidth crece con el contenido y lo oculta.
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth, visible: document.documentElement.clientWidth,
  }));
  expect(ancho).toBe(visible);

  // FA-1: con tres, quitar uno deja la tabla; con dos, vuelve al catálogo con el aviso
  await page.getByRole('button', { name: /^Quitar/ }).first().click();
  await expect(page.locator('thead th')).toHaveCount(2);
  await page.getByRole('button', { name: /^Quitar/ }).first().click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(barra).toContainText('Agrega al menos otro auto para comparar');
  await expect(barra).toContainText('1 de 3');
});
