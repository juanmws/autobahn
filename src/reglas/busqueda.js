// RF-02 y RN-03: filtros y orden del catálogo. Los filtros se combinan entre sí; en cada rango el mínimo
// no puede ser mayor que el máximo y, si lo es, no se aplica ningún filtro (FA-1). Un valor que no
// corresponde a ninguna opción (por ejemplo, una URL editada a mano) se ignora.
const { MARCAS } = require('../consultas/autos');
const { leerMonto } = require('./financiamiento');
const { LIMITES, TRANSMISIONES, COMBUSTIBLES } = require('./publicacion');

const CONDICIONES = ['nuevo', 'usado'];
const KILOMETRAJES = [10000, 30000, 60000, 100000, 150000]; // opciones del kilometraje máximo

const ORDENES = {
  recientes: 'Más recientes',
  precio_asc: 'Precio: de menor a mayor',
  precio_desc: 'Precio: de mayor a menor',
  anio_desc: 'Año más reciente',
  km_asc: 'Menor kilometraje',
};

const MENSAJES = {
  rango: 'El valor mínimo no puede ser mayor que el máximo',
  precio: 'Escribe el precio en balboas, por ejemplo 25,000',
};

const VACIOS = {
  marca: '', modelo: '', condicion: '', precioMin: '', precioMax: '', anioDesde: '', anioHasta: '',
  kmMaximo: '', transmision: '', combustible: '',
};

const entre = (opciones) => (texto) => (opciones.includes(texto) ? texto : undefined);
const leerAnio = (texto) => (/^\d{4}$/.test(texto) ? Number(texto) : undefined);
const leerKilometraje = (texto) =>
  (/^(\d+|\d{1,3}(,\d{3})+)$/.test(texto) ? Number(texto.replaceAll(',', '')) : undefined);

// Cada lector devuelve el valor del filtro, o undefined si el texto no sirve y se ignora
const LECTORES = {
  marca: entre(MARCAS),
  modelo: (texto) => texto || undefined,
  condicion: entre(CONDICIONES),
  anioDesde: leerAnio,
  anioHasta: leerAnio,
  kmMaximo: leerKilometraje,
  transmision: entre(TRANSMISIONES),
  combustible: entre(COMBUSTIBLES),
};

// Un parámetro repetido llega como lista: se trata como vacío
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

function leerBusqueda(consulta) {
  const valores = { ...VACIOS };
  const filtros = {};
  const errores = {};

  for (const [campo, leer] of Object.entries(LECTORES)) {
    const valor = leer(texto(consulta[campo]));
    if (valor !== undefined) {
      filtros[campo] = valor;
      valores[campo] = texto(consulta[campo]);
    }
  }

  // Un precio mal escrito sí es un error: el usuario lo escribe a mano
  for (const campo of ['precioMin', 'precioMax']) {
    valores[campo] = texto(consulta[campo]);
    if (valores[campo] !== '') {
      const centavos = leerMonto(valores[campo]);
      if (centavos === null) {
        errores.precio = MENSAJES.precio;
      } else {
        filtros[campo] = centavos;
      }
    }
  }
  if (!errores.precio && filtros.precioMin > filtros.precioMax) {
    errores.precio = MENSAJES.rango;
  }
  if (filtros.anioDesde > filtros.anioHasta) {
    errores.anio = MENSAJES.rango;
  }

  const valido = Object.keys(errores).length === 0;
  const aplicados = valido ? filtros : {};
  const orden = typeof consulta.orden === 'string' && Object.hasOwn(ORDENES, consulta.orden) ? consulta.orden : 'recientes';
  return { valido, filtros: aplicados, errores, valores, orden, hayFiltros: Object.keys(aplicados).length > 0 };
}

// Enlace a otra página de la misma búsqueda (FA-2): conserva los filtros escritos y el orden
function enlaceDeBusqueda({ valores, orden }, pagina) {
  const parametros = new URLSearchParams(Object.entries(valores).filter(([, valor]) => valor !== ''));
  if (orden !== 'recientes') {
    parametros.set('orden', orden);
  }
  if (pagina > 1) {
    parametros.set('pagina', String(pagina));
  }
  const consulta = parametros.toString();
  return consulta ? `/catalogo?${consulta}` : '/catalogo';
}

// Años del filtro: del actual hacia atrás, hasta la antigüedad máxima de un usado (RN-06)
function aniosDelFiltro(anioActual) {
  const { minimo, maximo } = LIMITES.anio({ anioActual });
  return Array.from({ length: maximo - minimo + 1 }, (_, i) => maximo - i);
}

module.exports = {
  CONDICIONES, KILOMETRAJES, ORDENES, MENSAJES, leerBusqueda, enlaceDeBusqueda, aniosDelFiltro,
};
