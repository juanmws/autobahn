// Ayudantes de las pruebas de sistema. Todos los navegadores usan el mismo servidor a la vez, así que los
// datos que deben ser únicos (como la cédula) no pueden depender solo de la hora.
const crypto = require('node:crypto');

const TOMO_POR_NAVEGADOR = { chromium: 101, firefox: 102, webkit: 103, celular: 104 };

// Cédula válida y distinta para cada navegador y cada reintento: el tomo identifica al navegador y el
// asiento es aleatorio
function cedulaUnica(provincia, testInfo) {
  const tomo = TOMO_POR_NAVEGADOR[testInfo.project.name] ?? 199;
  return `${provincia}-${tomo}-${crypto.randomInt(1, 1000000)}`;
}

module.exports = { cedulaUnica };
