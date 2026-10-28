// CU-02, flujo básico en el navegador: elegir la marca (y ver solo sus modelos), aplicar filtros, ordenar,
// pasar de página sin perder la búsqueda, ver el error de un rango al revés y limpiar los filtros.
const { test, expect } = require('@playwright/test');

// En el celular el panel empieza plegado; en pantallas anchas lo abre el script
async function abrirFiltros(page) {
  const panel = page.locator('.panel-filtros');
  if (!(await panel.evaluate((detalles) => detalles.open))) {
    await panel.locator('summary').click();
  }
}

test('buscar autos con filtros desde el catálogo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Catálogo', exact: true }).click();
  await expect(page.getByText(/^\d+ autos disponibles$/)).toBeVisible();
  await abrirFiltros(page);

  // paso 2: al elegir BMW, la lista de modelos solo tiene modelos BMW
  await page.getByLabel('Marca').selectOption('BMW');
  const modelos = page.locator('#modelo optgroup');
  await expect(modelos).toHaveCount(1);
  await expect(modelos).toHaveAttribute('label', 'BMW');
  await page.getByLabel('Modelo').selectOption('320i');

  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByText('2 autos encontrados')).toBeVisible();
  await expect(page.locator('.tarjeta-auto')).toHaveCount(2);

  // paso 4: ordenar sin perder los filtros
  await page.getByLabel('Ordenar por').selectOption('precio_asc');
  await page.getByRole('button', { name: 'Ordenar' }).click();
  await expect(page.getByText('2 autos encontrados')).toBeVisible();
  await expect(page.locator('.tarjeta-auto .precio')).toHaveText(['B/. 27,500.00', 'B/. 54,900.00']);

  // FA-1: un rango de precio al revés
  await abrirFiltros(page);
  await page.getByLabel('Mínimo', { exact: true }).fill('60,000');
  await page.getByLabel('Máximo', { exact: true }).fill('30,000');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.locator('#error-precio')).toHaveText('El valor mínimo no puede ser mayor que el máximo');

  // FA-3
  await page.getByRole('link', { name: 'Limpiar filtros' }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByText(/^\d+ autos disponibles$/)).toBeVisible();
});

test('FA-2: la segunda página conserva la condición y el orden', async ({ page }) => {
  await page.goto('/catalogo?condicion=nuevo&orden=precio_desc');
  await page.getByRole('link', { name: 'Siguiente' }).click();
  await expect(page).toHaveURL(/condicion=nuevo&orden=precio_desc&pagina=2/);
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  await expect(page.locator('.condicion-usado')).toHaveCount(0);
});
