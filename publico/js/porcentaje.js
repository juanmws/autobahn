// Paso 2 del CU-04 (abono) y del CU-08 (oferta): mientras se escribe un monto, muestra qué porcentaje
// del precio representa. El formulario lleva el precio en data-precio-centavos y el campo, en
// data-porcentaje, el id del párrafo donde se muestra. Es solo una ayuda: las validaciones las hace el servidor.
const formulario = document.querySelector('[data-precio-centavos]');
const campo = formulario?.querySelector('[data-porcentaje]');

if (campo) {
  const precioCentavos = Number(formulario.dataset.precioCentavos);
  const ayuda = document.getElementById(campo.dataset.porcentaje);

  const mostrarPorcentaje = () => {
    const limpio = campo.value.trim().replace(/^B\/\.\s*/, '').replaceAll(',', '');
    const balboas = Number(limpio);
    if (limpio === '' || !Number.isFinite(balboas) || balboas < 0) {
      ayuda.textContent = '';
      return;
    }
    const porcentaje = Math.round(((balboas * 100 * 100) / precioCentavos) * 10) / 10;
    ayuda.textContent = `${Number.isInteger(porcentaje) ? porcentaje : porcentaje.toFixed(1)} % del precio`;
  };

  campo.addEventListener('input', mostrarPorcentaje);
  // el monto pudo escribirse antes de que este script terminara de cargar
  mostrarPorcentaje();
}
