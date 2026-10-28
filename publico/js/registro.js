// CU-01, paso 2: la confirmación de la contraseña no se puede expresar con HTML; este script la marca
// como inválida mientras no coincida. Es solo una ayuda: el servidor vuelve a validar todo.
const contrasena = document.querySelector('#contrasena');
const confirmacion = document.querySelector('#confirmacion');

if (contrasena && confirmacion) {
  const comparar = () => {
    confirmacion.setCustomValidity(confirmacion.value === contrasena.value ? '' : 'Las contraseñas no coinciden');
  };
  contrasena.addEventListener('input', comparar);
  confirmacion.addEventListener('input', comparar);
  comparar();
}
