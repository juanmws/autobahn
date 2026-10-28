// CU-01, flujo básico en el navegador: menú, formulario con su revisión al salir de cada campo,
// registro y bienvenida.
const { test, expect } = require('@playwright/test');
const { cedulaUnica } = require('./ayudantes');

test('crear una cuenta de cliente desde el menú', async ({ page }, testInfo) => {
  // cada navegador (y cada reintento) usa una cédula y un correo propios: comparten el servidor
  const unico = `${testInfo.project.name}.${Date.now()}`;

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear cuenta' }).click();
  await page.getByLabel('Nombre').fill('Laura');
  await page.getByLabel('Apellido').fill('Ríos');
  await page.getByLabel('Cédula').fill(cedulaUnica(8, testInfo));
  await page.getByLabel('Fecha de nacimiento').fill('1996-07-12');
  await page.getByLabel('Celular').fill('6555-0101');
  await page.getByLabel('Correo').fill(`laura.${unico}@prueba.pa`);

  // paso 2: una contraseña débil queda marcada al salir del campo
  const contrasena = page.getByLabel('Contraseña', { exact: true });
  await contrasena.fill('clave');
  await contrasena.blur();
  expect(await contrasena.evaluate((campo) => campo.matches(':user-invalid'))).toBe(true);
  await contrasena.fill('Clave#2026');
  await page.getByLabel('Confirma la contraseña').fill('Clave#2026');
  expect(await contrasena.evaluate((campo) => campo.matches(':valid'))).toBe(true);

  await page.getByLabel(/Acepto los términos de uso/).check();
  await page.getByRole('button', { name: 'Registrarme' }).click();

  await expect(page.getByRole('status')).toContainText('Bienvenido a Autobahn, Laura');
  await expect(page.getByText('Hola, Laura')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mi cuenta' })).toBeVisible();
});
