// RF-06 y RN-08: ciclo de vida de una publicación de auto usado y motivo de rechazo.
// Una publicación nace En revisión y un administrador la pasa a Disponible o a Rechazada.

const ESTADOS = ['en_revision', 'disponible', 'rechazada'];
const TRANSICIONES = {
  en_revision: ['disponible', 'rechazada'],
  disponible: [],
  rechazada: [],
};
const MOTIVO = { minimo: 10, maximo: 300 };

const MENSAJES = {
  motivo: 'El motivo debe tener de 10 a 300 caracteres',
  yaRevisada: 'Esta publicación ya fue revisada',
  sinPendientes: 'No hay publicaciones por revisar',
};

function puedeCambiar(desde, hacia) {
  return (TRANSICIONES[desde] ?? []).includes(hacia);
}

// Estados desde los que se puede llegar a "hacia": la consulta que cambia el estado solo toca esos
function estadosOrigen(hacia) {
  return ESTADOS.filter((desde) => puedeCambiar(desde, hacia));
}

function validarMotivo(texto) {
  const motivo = typeof texto === 'string' ? texto.trim() : '';
  if (motivo.length < MOTIVO.minimo || motivo.length > MOTIVO.maximo) {
    return { valido: false, error: MENSAJES.motivo };
  }
  return { valido: true, motivo };
}

module.exports = { ESTADOS, TRANSICIONES, MENSAJES, puedeCambiar, estadosOrigen, validarMotivo };
