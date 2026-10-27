// CU-04, paso 2: mientras se escribe el abono, muestra que porcentaje del precio representa.
// Es solo una ayuda: el calculo y las validaciones las hace el servidor.
const formulario = document.querySelector('[data-precio-centavos]');

if (formulario) {
  const precioCentavos = Number(formulario.dataset.precioCentavos);
  const abono = formulario.querySelector('#abono');
  const ayuda = formulario.querySelector('#porcentaje-abono');

  const mostrarPorcentaje = () => {
    const limpio = abono.value.trim().replace(/^B\/\.\s*/, '').replaceAll(',', '');
    const balboas = Number(limpio);
    if (limpio === '' || !Number.isFinite(balboas) || balboas < 0) {
      ayuda.textContent = '';
      return;
    }
    const porcentaje = Math.round(((balboas * 100 * 100) / precioCentavos) * 10) / 10;
    ayuda.textContent = `${Number.isInteger(porcentaje) ? porcentaje : porcentaje.toFixed(1)} % del precio`;
  };

  abono.addEventListener('input', mostrarPorcentaje);
  // el abono pudo escribirse antes de que este script terminara de cargar
  mostrarPorcentaje();
}
