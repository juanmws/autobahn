// RNF-08 (identidad visual) y RNF-03 (contraste): la hoja de estilos y los SVG usan solo la paleta
// https://coolors.co/palette/cfdbd5-e8eddf-f5cb5c-242423-333533
const fs = require('node:fs');
const path = require('node:path');

const PUBLICO = path.join(__dirname, '..', '..', 'publico');
const hoja = fs.readFileSync(path.join(PUBLICO, 'css', 'estilos.css'), 'utf8');
const raiz = hoja.match(/:root\s*\{([^}]*)\}/)[1];
const resto = hoja.replace(/:root\s*\{[^}]*\}/, '');

const PALETA = {
  alabastro: '#E8EDDF', platino: '#CFDBD5', azafran: '#F5CB5C', grafito: '#333533', asfalto: '#242423',
};

// Contraste de WCAG 2.2 entre dos colores #RRGGBB
function contraste(a, b) {
  const luminancia = (hex) => {
    const [r, g, v] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * v;
  };
  const [clara, oscura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (clara + 0.05) / (oscura + 0.05);
}

describe('RNF-08: paleta', () => {
  test('la hoja define los cinco colores de la paleta con su nombre', () => {
    for (const [nombre, hex] of Object.entries(PALETA)) {
      expect(raiz).toMatch(new RegExp(`--${nombre}:\\s*${hex};`, 'i'));
    }
    const hexEnRaiz = raiz.match(/#[0-9a-f]{6}\b/gi).map((h) => h.toUpperCase());
    expect(new Set(hexEnRaiz)).toEqual(new Set(Object.values(PALETA)));
  });

  test('fuera de :root no hay colores escritos a mano, solo variables', () => {
    expect(resto.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
    expect(resto.match(/rgba?\(/gi)).toBeNull();
  });

  test('cada variable que se usa está definida en :root', () => {
    const definidas = new Set([...raiz.matchAll(/(--[a-z-]+):/g)].map((m) => m[1]));
    const usadas = new Set([...hoja.matchAll(/var\((--[a-z-]+)\)/g)].map((m) => m[1]));
    expect([...usadas].filter((v) => !definidas.has(v))).toEqual([]);
  });

  test.each(['icono.svg', 'silueta-auto.svg'])('%s usa solo colores de la paleta', (archivo) => {
    const svg = fs.readFileSync(path.join(PUBLICO, 'img', archivo), 'utf8');
    const colores = svg.match(/#[0-9a-f]{6}\b/gi).map((h) => h.toUpperCase());
    expect(colores.filter((c) => !Object.values(PALETA).includes(c))).toEqual([]);
  });

  // El azafrán sobre los fondos claros no llega a 1.4:1: como color de texto solo va sobre superficies oscuras
  test('el texto azafrán solo aparece en la cabecera, el letrero y el pie', () => {
    const reglas = hoja.split('}').map((r) => r.split('{'));
    const selectores = reglas
      .filter(([, declaraciones]) => /(^|[;\s])color:\s*var\(--azafran\)/.test(declaraciones ?? ''))
      .map(([selector]) => selector.trim());
    expect(selectores.filter((s) => !/\.(cabecera|letrero|pie)\b/.test(s))).toEqual([]);
  });
});

describe('RNF-03: contraste de los pares de texto', () => {
  test.each([
    ['asfalto', 'alabastro', 'texto del cuerpo'],
    ['asfalto', 'platino', 'texto sobre superficies secundarias'],
    ['alabastro', 'asfalto', 'botones, cabecera y etiquetas'],
    ['alabastro', 'grafito', 'letrero y pie'],
    ['asfalto', 'azafran', 'logotipo y bloque elegido'],
    ['azafran', 'grafito', 'acentos del letrero'],
  ])('%s sobre %s (%s) llega a 4.5:1', (texto, fondo) => {
    expect(contraste(PALETA[texto], PALETA[fondo])).toBeGreaterThanOrEqual(4.5);
  });

  test('el azafrán sobre el alabastro no alcanza ni 3:1, por eso no se usa como texto', () => {
    expect(contraste(PALETA.azafran, PALETA.alabastro)).toBeLessThan(3);
  });
});
