const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ESQUEMA = fs.readFileSync(path.join(__dirname, 'esquema.sql'), 'utf8');

// Abre (o crea) la base de datos y aplica el esquema. ":memory:" da una base vacia para pruebas.
function abrirBaseDeDatos(ruta = ':memory:') {
  if (ruta !== ':memory:') {
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
  }
  const db = new DatabaseSync(ruta);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(ESQUEMA);
  return db;
}

module.exports = { abrirBaseDeDatos };
