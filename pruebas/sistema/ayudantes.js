// Ayudantes de las pruebas de sistema. Todos los navegadores usan el mismo servidor a la vez, así que los
// datos que deben ser únicos (como la cédula) no pueden depender solo de la hora.
const crypto = require('node:crypto');
const { expect } = require('@playwright/test');

const TOMO_POR_NAVEGADOR = { chromium: 101, firefox: 102, webkit: 103, celular: 104 };

// Cédula válida y distinta para cada navegador y cada reintento: el tomo identifica al navegador y el
// asiento es aleatorio
function cedulaUnica(provincia, testInfo) {
  const tomo = TOMO_POR_NAVEGADOR[testInfo.project.name] ?? 199;
  return `${provincia}-${tomo}-${crypto.randomInt(1, 1000000)}`;
}

// Registra un cliente nuevo (CU-01) y deja su sesión iniciada en la página
async function crearCuentaNueva(page, testInfo, { nombre, apellido, provincia }) {
  const unico = `${testInfo.project.name}.${Date.now()}.${crypto.randomInt(1000000)}`;
  await page.goto('/crear-cuenta');
  await page.getByLabel('Nombre').fill(nombre);
  await page.getByLabel('Apellido').fill(apellido);
  await page.getByLabel('Cédula').fill(cedulaUnica(provincia, testInfo));
  await page.getByLabel('Fecha de nacimiento').fill('1990-03-03');
  await page.getByLabel('Celular').fill('6777-0000');
  await page.getByLabel('Correo').fill(`cliente.${unico}@prueba.pa`);
  await page.getByLabel('Contraseña', { exact: true }).fill('Clave#2026');
  await page.getByLabel('Confirma la contraseña').fill('Clave#2026');
  await page.getByLabel(/Acepto los términos de uso/).check();
  await page.getByRole('button', { name: 'Registrarme' }).click();
  await expect(page.getByText(`Hola, ${nombre}`)).toBeVisible();
}

module.exports = { cedulaUnica, crearCuentaNueva };
