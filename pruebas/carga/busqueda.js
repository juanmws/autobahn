// RNF-01 (script de k6): la búsqueda del catálogo, con cualquier combinación de filtros, responde en
// 2 segundos o menos en el 95 % de las solicitudes, con 500 autos en la base y 20 usuarios simultáneos.
// Cada usuario busca sin pausa entre una búsqueda y otra, que es más exigente que el uso real.
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    busqueda: { executor: 'constant-vus', vus: 20, duration: '1m' },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

const MARCAS = ['Audi', 'BMW', 'Mercedes-Benz', 'Porsche', 'Volkswagen'];
const ORDENES = ['recientes', 'precio_asc', 'precio_desc', 'anio_desc', 'km_asc'];
const KILOMETRAJES = ['10000', '30000', '60000', '100000', '150000'];

const elegir = (lista) => lista[Math.floor(Math.random() * lista.length)];
const aVeces = () => Math.random() < 0.4;
const entero = (minimo, maximo) => minimo + Math.floor(Math.random() * (maximo - minimo + 1));

// Una combinación al azar de filtros, siempre con los rangos en orden (una búsqueda válida)
function consultaAlAzar() {
  const filtros = {};
  if (aVeces()) {
    filtros.marca = elegir(MARCAS);
  }
  if (aVeces()) {
    filtros.condicion = elegir(['nuevo', 'usado']);
  }
  if (aVeces()) {
    const minimo = entero(10, 60) * 1000;
    filtros.precioMin = String(minimo);
    if (aVeces()) {
      filtros.precioMax = String(minimo + entero(5, 90) * 1000);
    }
  }
  if (aVeces()) {
    const desde = entero(2012, 2026);
    filtros.anioDesde = String(desde);
    if (aVeces()) {
      filtros.anioHasta = String(entero(desde, 2026));
    }
  }
  if (aVeces()) {
    filtros.kmMaximo = elegir(KILOMETRAJES);
  }
  if (aVeces()) {
    filtros.transmision = elegir(['automatica', 'manual']);
  }
  if (aVeces()) {
    filtros.combustible = elegir(['gasolina', 'diesel', 'hibrido', 'electrico']);
  }
  filtros.orden = elegir(ORDENES);
  filtros.pagina = String(entero(1, 3));
  return Object.entries(filtros).map(([clave, valor]) => `${clave}=${encodeURIComponent(valor)}`).join('&');
}

export default function () {
  const respuesta = http.get(`${__ENV.BASE}/catalogo?${consultaAlAzar()}`, { tags: { name: 'catalogo' } });
  check(respuesta, {
    'responde 200': (r) => r.status === 200,
    'muestra el total de autos': (r) => /\d+ autos? (disponibles?|encontrados?)/.test(r.body),
  });
}
