// CU-08, flujo básico en el navegador: un cliente nuevo oferta por el BMW 320i usado (auto 2, B/. 27,500.00),
// ve el porcentaje mientras escribe (paso 2) y encuentra la oferta en Mis ofertas.
const { test, expect } = require('@playwright/test');
const { crearCuentaNueva } = require('./ayudantes');

test('hacer una oferta por un auto usado desde su ficha', async ({ page }, testInfo) => {
  // un cliente nuevo en cada navegador y reintento: con uno fijo, la segunda vez saldría FE-1
  await crearCuentaNueva(page, testInfo, { nombre: 'Sofía', apellido: 'Arias', provincia: 9 });

  await page.goto('/autos/2');
  await page.getByRole('link', { name: 'Hacer oferta' }).click();
  await expect(page.getByText('Puedes ofrecer de B/. 22,000.00 a B/. 27,500.00')).toBeVisible();

  await page.getByLabel('Tu oferta (B/.)').fill('24,750');
  await expect(page.locator('#porcentaje-oferta')).toHaveText('90 % del precio');
  await page.getByLabel(/Mensaje para el vendedor/).fill('Puedo pagar de contado.');
  await page.getByRole('button', { name: 'Enviar oferta' }).click();

  await expect(page.getByRole('status')).toHaveText('Tu oferta de B/. 24,750.00 fue enviada al vendedor.');
  await expect(page.getByRole('row', { name: /BMW 320i 2019/ })).toContainText('Pendiente');
});
