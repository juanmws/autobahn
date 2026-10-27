// Reloj del sistema. Las reglas que dependen del dia (año maximo de un auto usado, fechas de
// las citas) lo consultan a el y no a new Date(), para que las pruebas fijen la fecha.

const FORMATO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

function crearReloj(fechaFija) {
  if (fechaFija === undefined || fechaFija === null || fechaFija === '') {
    return {
      ahora: () => new Date(),
      anioActual: () => new Date().getFullYear(),
    };
  }

  // sin la hora, new Date() interpretaria la fecha en UTC; con la hora, en la hora local
  const texto = fechaFija.includes('T') ? fechaFija : `${fechaFija}T00:00:00`;
  const fija = new Date(texto);
  if (!FORMATO.test(fechaFija) || Number.isNaN(fija.getTime())) {
    throw new Error(`Fecha fija inválida: ${fechaFija}. Use AAAA-MM-DD o AAAA-MM-DDTHH:MM:SS`);
  }

  return {
    ahora: () => new Date(fija.getTime()),
    anioActual: () => fija.getFullYear(),
  };
}

// Fecha y hora local como se guardan en la base de datos: AAAA-MM-DDTHH:MM:SS
function marcaDeTiempo(fecha) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
    + `T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

module.exports = { crearReloj, marcaDeTiempo };
