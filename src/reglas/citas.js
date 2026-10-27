// RF-07 y RN-09: dias, bloques y validaciones de una prueba de manejo.
// Las fechas viajan como texto AAAA-MM-DD, que se ordena igual que el calendario.

const BLOQUES = [9, 10, 11, 12, 13, 14, 15, 16]; // hora de inicio de cada bloque de una hora
const DIAS_DE_ANTICIPACION = 14;
const MAXIMO_PROGRAMADAS = 2;
const DOMINGO = 0;

const MENSAJES = {
  fecha: 'Elige uno de los días habilitados',
  hora: 'Elige uno de los bloques libres',
  licenciaFormato: 'Escribe la fecha de vencimiento de tu licencia',
  propio: 'No puedes agendar una prueba de manejo de tu propio auto',
  ocupado: 'Ese horario acaba de ocuparse; elige otro',
  licencia: 'Tu licencia de conducir debe estar vigente el día de la prueba',
  limite: 'Ya tienes 2 pruebas de manejo programadas, el máximo permitido',
  mismo_bloque: 'Ya tienes una cita a esa hora; elige otro bloque',
};

function fechaIso(fecha) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

// Fecha valida del calendario (descarta, por ejemplo, el 30 de febrero)
function esFechaIso(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }
  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

// De lunes a sabado, desde manana hasta 14 dias despues
function diasHabilitados(hoy) {
  const dias = [];
  for (let i = 1; i <= DIAS_DE_ANTICIPACION; i++) {
    const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    if (dia.getDay() !== DOMINGO) {
      dias.push(fechaIso(dia));
    }
  }
  return dias;
}

// Formato y rangos de lo que eligio el cliente (pasos 2 y 3 del CU-07)
function validarSeleccion({ hoy, fecha, hora, vencimientoLicencia }) {
  const textoFecha = String(fecha ?? '');
  const textoHora = String(hora ?? '');
  const textoLicencia = String(vencimientoLicencia ?? '');
  const numeroHora = /^\d{1,2}$/.test(textoHora) ? Number(textoHora) : Number.NaN;
  const errores = {};

  if (!diasHabilitados(hoy).includes(textoFecha)) {
    errores.fecha = MENSAJES.fecha;
  }
  if (!BLOQUES.includes(numeroHora)) {
    errores.hora = MENSAJES.hora;
  }
  if (!esFechaIso(textoLicencia)) {
    errores.licencia = MENSAJES.licenciaFormato;
  }
  if (Object.keys(errores).length > 0) {
    return { valido: false, errores };
  }
  return { valido: true, datos: { fecha: textoFecha, hora: numeroHora, vencimientoLicencia: textoLicencia } };
}

// Paso 4 del CU-07, en su orden: bloque libre, licencia vigente, limite de citas y mismo bloque.
// citasDelCliente son sus citas programadas de cualquier auto; las de dias pasados no cuentan.
function validarCita({ hoy, fecha, hora, vencimientoLicencia, horasOcupadasDelAuto, citasDelCliente, esPropio }) {
  const rechazo = (motivo) => ({ valido: false, motivo, mensaje: MENSAJES[motivo] });
  if (esPropio) {
    return rechazo('propio');
  }
  if (horasOcupadasDelAuto.includes(hora)) {
    return rechazo('ocupado');
  }
  if (vencimientoLicencia < fecha) {
    return rechazo('licencia');
  }
  const hoyIso = fechaIso(hoy);
  const vigentes = citasDelCliente.filter((cita) => cita.fecha >= hoyIso);
  if (vigentes.length >= MAXIMO_PROGRAMADAS) {
    return rechazo('limite');
  }
  if (vigentes.some((cita) => cita.fecha === fecha && cita.hora === hora)) {
    return rechazo('mismo_bloque');
  }
  return { valido: true };
}

module.exports = {
  BLOQUES, DIAS_DE_ANTICIPACION, MAXIMO_PROGRAMADAS, MENSAJES, fechaIso, diasHabilitados, validarSeleccion,
  validarCita,
};
