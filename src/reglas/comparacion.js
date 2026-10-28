// RF-03 y RN-04: lista de comparación de 2 a 3 autos distintos. Vive en la sesión del navegador y no
// cambia ningún dato (postcondición del CU-03).
const { leerBusqueda, enlaceDeBusqueda } = require('./busqueda');

const MINIMO = 2;
const MAXIMO = 3;

const MENSAJES = {
  lleno: 'Puedes comparar como máximo 3 autos. Quita uno para agregar otro',
  repetido: 'Este auto ya está en la comparación',
  faltaOtro: 'Agrega al menos otro auto para comparar',
};

// La lista guardada en la sesión; cualquier otra cosa empieza vacía
function leerLista(valor) {
  const valida = Array.isArray(valor) && valor.length <= MAXIMO && new Set(valor).size === valor.length
    && valor.every((id) => Number.isInteger(id) && id > 0);
  return valida ? valor : [];
}

// FA-3 antes que FA-2: si el auto ya está, eso explica mejor por qué no se agrega
function agregar(lista, autoId) {
  if (lista.includes(autoId)) {
    return { lista, motivo: 'repetido' };
  }
  if (lista.length >= MAXIMO) {
    return { lista, motivo: 'lleno' };
  }
  return { lista: [...lista, autoId], motivo: null };
}

function quitar(lista, autoId) {
  return lista.filter((id) => id !== autoId);
}

function puedeComparar(lista) {
  return lista.length >= MINIMO && lista.length <= MAXIMO;
}

// Paso 4: ids de los autos con el menor precio, el año más reciente y el menor kilometraje. Si todos
// tienen el mismo valor no se resalta ninguno, porque ninguno destaca.
function mejores(autos) {
  const resaltar = (valor, elegir) => {
    const valores = autos.map(valor);
    const mejor = elegir(...valores);
    return valores.every((v) => v === mejor) ? [] : autos.filter((a) => valor(a) === mejor).map((a) => a.id);
  };
  return {
    precio: resaltar((a) => a.precio_centavos, Math.min),
    anio: resaltar((a) => a.anio, Math.max),
    kilometraje: resaltar((a) => a.kilometraje, Math.min),
  };
}

// Después de agregar se vuelve a la página donde estaba el auto: su ficha, el catálogo con la misma
// búsqueda o el inicio. La dirección se arma de nuevo con partes conocidas y nunca se usa tal como llega,
// para que el formulario no sirva para mandar a nadie a otro sitio.
function rutaDeVuelta(volver) {
  const texto = typeof volver === 'string' ? volver : '';
  const ficha = /^\/autos\/(\d{1,9})$/.exec(texto);
  if (ficha) {
    return `/autos/${Number(ficha[1])}`;
  }
  const catalogo = /^\/catalogo(?:\?(.*))?$/.exec(texto);
  if (catalogo) {
    const parametros = Object.fromEntries(new URLSearchParams(catalogo[1] ?? ''));
    const pagina = /^\d+$/.test(parametros.pagina ?? '') ? Number(parametros.pagina) : 1;
    return enlaceDeBusqueda(leerBusqueda(parametros), pagina);
  }
  return '/';
}

module.exports = {
  MINIMO, MAXIMO, MENSAJES, leerLista, agregar, quitar, puedeComparar, mejores, rutaDeVuelta,
};
