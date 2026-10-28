// CU-02 en el navegador. En pantallas anchas el panel de filtros empieza abierto, y al elegir una marca la
// lista de modelos muestra solo los de esa marca (paso 2). Sin este script la búsqueda funciona igual, con
// un paso más: aplicar la marca para ver sus modelos.
const panel = document.querySelector('.panel-filtros');
if (panel && window.matchMedia('(min-width: 960px)').matches) {
  panel.open = true;
}

const marca = document.querySelector('#marca');
const modelo = document.querySelector('#modelo');

if (marca && modelo) {
  const modelos = JSON.parse(modelo.dataset.modelos);

  marca.addEventListener('change', () => {
    const elegido = modelo.value;
    const marcas = marca.value ? [marca.value] : Object.keys(modelos);
    modelo.replaceChildren(new Option('Todos los modelos', ''));
    for (const nombre of marcas) {
      const grupo = document.createElement('optgroup');
      grupo.label = nombre;
      // un modelo de otra marca deja de estar en la lista y la elección vuelve a "Todos los modelos"
      grupo.append(...modelos[nombre].map((m) => new Option(m, m, false, m === elegido)));
      modelo.append(grupo);
    }
  });
}
