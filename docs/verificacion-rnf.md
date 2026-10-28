# Verificación de los requisitos no funcionales

Resultados de las revisiones de los requisitos no funcionales del E1 (Tabla de requisitos no funcionales),
hechas el 28/10/2026 sobre `main` con las ocho funcionalidades. Cada revisión se puede repetir con el
comando indicado; los informes completos quedan en `informes/`, que no se sube al repositorio.

| Requisito | Cómo se verificó | Resultado |
|:--|:--|:--|
| RNF-01. Eficiencia de desempeño | `npm run test:carga`: k6 2.2.0 con 20 usuarios simultáneos durante 1 minuto, sin pausa entre búsquedas, contra una base de 500 autos | Cumple. El 95 % de las búsquedas respondió en 62.9 ms (límite: 2 s) |
| RNF-02. Usabilidad | Pruebas de integración: cada error de validación aparece junto a su campo, en español | Cumple en las pruebas automáticas; falta la revisión manual de los flujos |
| RNF-03. Accesibilidad | `npm run test:accesibilidad`: Lighthouse 13.5.0 en 16 páginas, y `pruebas/unitarias/paleta.test.js` para el contraste | Cumple. 100 de 100 en las 16 páginas; los pares de texto van de 8.00:1 a 13.03:1 |
| RNF-04. Seguridad | Pruebas de integración y SonarQube Cloud | Cumple, con un hallazgo abierto de SonarQube en la redirección después de iniciar sesión (ver abajo) |
| RNF-05. Compatibilidad | `pruebas/sistema/ancho.spec.js` en Chromium, Firefox, WebKit y celular | Cumple. Ninguna de las 17 páginas se desplaza de lado a 360, 768, 1280 ni 1920 px; falta la revisión en celulares reales y en Edge |
| RNF-06. Mantenibilidad | Quality Gate de SonarQube Cloud en cada pull request | Cumple en todos los pull requests |
| RNF-07. Portabilidad | Instalación con `npm install` y `npm start` | Cumple en macOS; falta probarlo en Windows 11 |
| RNF-08. Identidad visual | `pruebas/unitarias/paleta.test.js` | Cumple con la paleta nueva (cambio del 27/10/2026, ver "Cambios a los requisitos" en el README) |
| RNF-09. Idioma y formatos | Pruebas unitarias de `src/formato.js` e integración | Cumple |

## RNF-01. Prueba de carga

- Base: los 40 autos de prueba más 460 generados a partir de sus modelos (`pruebas/carga/preparar-base.js`),
  500 en total, 496 Disponible. La secuencia es fija: cada corrida usa la misma base.
- Carga: 20 usuarios virtuales durante 1 minuto. Cada uno pide el catálogo con una combinación al azar de
  filtros, orden y página, sin esperar entre una búsqueda y otra, que es más exigente que el uso real.
- Umbrales de k6: el percentil 95 de la duración por debajo de 2,000 ms, menos de 1 % de fallas y más de
  99 % de comprobaciones correctas (respuesta 200 y el total de autos en la página).

| Medida | Valor |
|:--|:--|
| Búsquedas | 27,031 (450 por segundo) |
| Fallas | 0 |
| Duración promedio | 44.0 ms |
| Mediana | 43.5 ms |
| Percentil 90 | 56.4 ms |
| Percentil 95 | 62.9 ms |
| Máxima | 121.0 ms |

La app y k6 corrieron en la misma computadora (una Mac con Apple Silicon, k6 en un contenedor de
OrbStack), así que la medida no incluye la red de un servidor real.

## RNF-03. Lighthouse

Lighthouse 13.5.0, categoría Accesibilidad, con la emulación de celular que trae por defecto. Las
páginas del cliente y del administrador se revisaron con su sesión iniciada.

| Página | Puntaje |
|:--|:--|
| Inicio | 100 |
| Catálogo, sin filtros, con filtros y con un rango al revés (FA-1) | 100 |
| Ficha de un auto | 100 |
| Financiamiento con resultado | 100 |
| Comparación de dos autos | 100 |
| Iniciar sesión y crear cuenta | 100 |
| Mi cuenta, Vender mi auto, prueba de manejo y oferta | 100 |
| Panel, lista de publicaciones por revisar y detalle con el motivo de rechazo | 100 |

La primera corrida dio 98 en las tres vistas del catálogo por el orden de los títulos (`heading-order`):
las tarjetas usan `h3` y el catálogo no tenía un `h2`. Se agregó "Resultados de la búsqueda" como `h2`
para lectores de pantalla.

## RNF-05. Ancho de pantalla

La prueba anterior medía con `window.innerWidth`, que en la emulación de celular crece con el contenido y
esconde el desborde. La nueva mide con `document.documentElement.clientWidth`, recorre 17 páginas
(públicas, del cliente y del administrador, con la barra de comparación visible) y revisa que ninguna se
redirija. Se comprobó que detecta un desborde real: sin el arreglo de `.envoltura-tabla` del RF-03, falla
en `/comparacion` a 360 px y en el celular.

## Pendientes para el E2

- RNF-02: revisión manual de los flujos básicos y alternativos (tres pantallas o menos).
- RNF-04: el hallazgo S5146 de SonarQube Cloud (redirección después de iniciar sesión, `src/rutas/sesion.js`)
  quedó abierto a propósito para registrarlo como defecto en la ejecución de pruebas.
- RNF-05: revisión en celulares reales y en Edge.
- RNF-07: instalación en Windows 11.
