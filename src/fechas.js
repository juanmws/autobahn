// Fechas como texto AAAA-MM-DD, en la hora local. Se ordenan igual que el calendario.

function fechaIso(fecha) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

// Fecha valida del calendario (descarta, por ejemplo, el 30 de febrero)
function esFechaIso(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }
  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

module.exports = { fechaIso, esFechaIso };
