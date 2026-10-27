// CU-04, flujo básico en el navegador: ficha, calculadora, porcentaje en vivo y resultado.
const { test, expect } = require('@playwright/test');

test('calcular la cuota de un auto usado desde su ficha', async ({ page }) => {
  await page.goto('/catalogo');
  // hay un 320i nuevo y uno usado en la primera página; se elige el usado por su año y kilometraje
  const tarjeta = page.locator('.tarjeta-auto').filter({ hasText: 'BMW 320i' }).filter({ hasText: '2019, 58,000 km' });
  await tarjeta.getByRole('link', { name: /Ver detalle/ }).click();
  await page.getByRole('link', { name: 'Calcular financiamiento' }).click();

  await expect(page.getByText('Abono mínimo: B/. 5,500.00 (20 % del precio)')).toBeVisible();
  await page.getByLabel('Abono (B/.)').fill('5500');
  await expect(page.locator('#porcentaje-abono')).toHaveText('20 % del precio');
  await page.getByLabel('Plazo').selectOption('60');
  await page.getByRole('button', { name: 'Calcular' }).click();

  await expect(page.getByRole('heading', { name: 'Resultado a 60 meses' })).toBeVisible();
  await expect(page.locator('.resultado .precio-grande')).toHaveText('B/. 451.36');
  await expect(page.getByText('Cálculo referencial; no constituye una aprobación de crédito')).toBeVisible();
});

test('muestra el porcentaje aunque el abono se escriba antes de que cargue el script', async ({ page }) => {
  // reproduce la carrera vista en Firefox en CI: el script llega tarde y el abono ya está escrito
  await page.route('**/js/financiamiento.js', async (ruta) => {
    await new Promise((listo) => setTimeout(listo, 800));
    await ruta.continue();
  });
  await page.goto('/autos/2/financiamiento', { waitUntil: 'commit' });
  await page.getByLabel('Abono (B/.)').fill('5500');
  await expect(page.locator('#porcentaje-abono')).toHaveText('20 % del precio');
});

test('un abono menor que el mínimo muestra el error junto al campo (FA-1)', async ({ page }) => {
  await page.goto('/autos/2/financiamiento?abono=100&plazo=60');
  await expect(page.locator('#error-abono')).toHaveText('El abono mínimo para este auto es de B/. 5,500.00 (20 % del precio)');
  await expect(page.getByLabel('Abono (B/.)')).toHaveAttribute('aria-invalid', 'true');
});
