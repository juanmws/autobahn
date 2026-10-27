// CU-05, pasos 3 y 4: cuenta los caracteres de la descripción y muestra miniaturas de las fotos
// elegidas. Es solo una ayuda: el servidor vuelve a validar todo.
const MAXIMO_FOTOS = 8;
const descripcion = document.querySelector('#descripcion');
const contador = document.querySelector('#contador-descripcion');
const fotos = document.querySelector('#fotos');
const miniaturas = document.querySelector('#miniaturas');

if (descripcion && contador) {
  const contar = () => {
    contador.textContent = `${descripcion.value.trim().length} de 1,000 caracteres (mínimo 20)`;
  };
  descripcion.addEventListener('input', contar);
  contar();
}

if (fotos && miniaturas) {
  const mostrarMiniaturas = () => {
    miniaturas.replaceChildren();
    const archivos = [...fotos.files];
    for (const archivo of archivos.slice(0, MAXIMO_FOTOS)) {
      const imagen = document.createElement('img');
      imagen.src = URL.createObjectURL(archivo);
      imagen.alt = `Vista previa de ${archivo.name}`;
      imagen.width = 160;
      imagen.height = 107;
      miniaturas.append(imagen);
    }
    if (archivos.length > MAXIMO_FOTOS) {
      const aviso = document.createElement('p');
      aviso.className = 'campo-error';
      aviso.textContent = 'Puedes subir como máximo 8 fotos';
      miniaturas.append(aviso);
    }
  };
  fotos.addEventListener('change', mostrarMiniaturas);
  mostrarMiniaturas();
}
