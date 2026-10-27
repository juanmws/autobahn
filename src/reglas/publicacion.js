// RF-05, RN-01 y RN-06: validación de los datos y las fotos de un auto usado que publica un cliente.
const { MARCAS } = require('../consultas/autos');
const { leerMonto } = require('./financiamiento');

const ANTIGUEDAD_MAXIMA = 15; // años
const KILOMETRAJE = { minimo: 1, maximo: 300000 };
const PRECIO_CENTAVOS = { minimo: 200000, maximo: 30000000 }; // B/. 2,000.00 a B/. 300,000.00
const DESCRIPCION = { minimo: 20, maximo: 1000 };
const MAXIMO_FOTOS = 8;
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB
const TRANSMISIONES = ['automatica', 'manual'];
const COMBUSTIBLES = ['gasolina', 'diesel', 'hibrido', 'electrico'];

const LIMITES = {
  anio: ({ anioActual }) => ({ minimo: anioActual - ANTIGUEDAD_MAXIMA, maximo: anioActual }),
  kilometraje: KILOMETRAJE,
  precioCentavos: PRECIO_CENTAVOS,
  descripcion: DESCRIPCION,
  maximoFotos: MAXIMO_FOTOS,
  tamanoMaximo: TAMANO_MAXIMO,
};

const MENSAJES = {
  marca: 'Elige una de las cinco marcas de la lista',
  modelo: 'Escribe el modelo, de 1 a 60 caracteres',
  kilometraje: 'El kilometraje debe estar entre 1 y 300,000 km',
  precio: 'El precio debe estar entre B/. 2,000.00 y B/. 300,000.00',
  color: 'Escribe el color, de 1 a 40 caracteres',
  transmision: 'Elige la transmisión',
  combustible: 'Elige el combustible',
  motor: 'El motor puede tener como máximo 60 caracteres',
  descripcion: 'La descripción debe tener de 20 a 1,000 caracteres',
  sinFotos: 'Adjunta al menos una foto del auto',
  muchasFotos: 'Puedes subir como máximo 8 fotos',
};

// Un campo de texto del formulario; una lista (campo repetido a mano) cuenta como vacío
function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function entre(numero, { minimo, maximo }) {
  return Number.isInteger(numero) && numero >= minimo && numero <= maximo;
}

function validarDatos(entrada, { anioActual }) {
  const errores = {};
  const marca = texto(entrada.marca);
  const modelo = texto(entrada.modelo);
  const color = texto(entrada.color);
  const motor = texto(entrada.motor);
  const descripcion = texto(entrada.descripcion);
  const transmision = texto(entrada.transmision);
  const combustible = texto(entrada.combustible);

  const textoAnio = texto(entrada.anio);
  const anio = /^\d{4}$/.test(textoAnio) ? Number(textoAnio) : Number.NaN;
  const textoKm = texto(entrada.kilometraje);
  const kilometraje = /^(\d{1,3}(,\d{3})+|\d+)$/.test(textoKm) ? Number(textoKm.replaceAll(',', '')) : Number.NaN;
  const precioCentavos = leerMonto(texto(entrada.precio));
  const rangoAnio = LIMITES.anio({ anioActual });

  // cada regla con su campo; se informan todas las que fallen
  const reglas = [
    ['marca', MARCAS.includes(marca), MENSAJES.marca],
    ['modelo', modelo.length >= 1 && modelo.length <= 60, MENSAJES.modelo],
    ['anio', entre(anio, rangoAnio), `El año debe estar entre ${rangoAnio.minimo} y ${rangoAnio.maximo}`],
    ['kilometraje', entre(kilometraje, KILOMETRAJE), MENSAJES.kilometraje],
    ['precio', precioCentavos !== null && entre(precioCentavos, PRECIO_CENTAVOS), MENSAJES.precio],
    ['color', color.length >= 1 && color.length <= 40, MENSAJES.color],
    ['transmision', TRANSMISIONES.includes(transmision), MENSAJES.transmision],
    ['combustible', COMBUSTIBLES.includes(combustible), MENSAJES.combustible],
    ['motor', motor.length <= 60, MENSAJES.motor],
    ['descripcion', entre(descripcion.length, DESCRIPCION), MENSAJES.descripcion],
  ];
  for (const [campo, cumple, mensaje] of reglas) {
    if (!cumple) {
      errores[campo] = mensaje;
    }
  }

  if (Object.keys(errores).length > 0) {
    return { valido: false, errores };
  }
  return {
    valido: true,
    auto: { marca, modelo, anio, kilometraje, precioCentavos, color, transmision, combustible, motor, descripcion },
  };
}

// El tipo se decide por los primeros bytes del archivo, no por su nombre ni por lo que dice el navegador
function tipoDeImagen(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length >= png.length && png.every((byte, i) => buffer[i] === byte)) {
    return 'png';
  }
  return null;
}

// archivos: [{ originalname, size, buffer }]. Devuelve el primer problema que encuentre.
function validarFotos(archivos) {
  if (archivos.length === 0) {
    return { valido: false, errores: { fotos: MENSAJES.sinFotos } };
  }
  if (archivos.length > MAXIMO_FOTOS) {
    return { valido: false, errores: { fotos: MENSAJES.muchasFotos } };
  }
  const fotos = [];
  for (const archivo of archivos) {
    if (archivo.size > TAMANO_MAXIMO) {
      return { valido: false, errores: { fotos: `La foto ${archivo.originalname} pesa más de 5 MB` } };
    }
    const extension = tipoDeImagen(archivo.buffer);
    if (!extension) {
      return { valido: false, errores: { fotos: `La foto ${archivo.originalname} no es JPG ni PNG` } };
    }
    fotos.push({ buffer: archivo.buffer, extension });
  }
  return { valido: true, fotos };
}

module.exports = {
  LIMITES, MENSAJES, TRANSMISIONES, COMBUSTIBLES, validarDatos, validarFotos, tipoDeImagen,
};
