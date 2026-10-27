# Plan de implementación: base de Autobahn

> Se ejecutó tarea por tarea con pruebas primero (TDD) el 27/10/2026. Las casillas marcan el avance.

**Objetivo:** dejar funcionando la base del sistema sobre la que se construyen las ocho
funcionalidades: proyecto, base de datos con datos de prueba, interfaz con la paleta, catálogo y
ficha de solo lectura, sesión con roles, y la infraestructura de pruebas (Jest, Supertest,
Playwright, GitHub Actions y SonarQube Cloud).

**Arquitectura:** aplicación Express que genera las páginas en el servidor con EJS. `crearApp`
recibe la base de datos y el reloj, para que las pruebas usen una base en memoria y una fecha
fija. Los datos viven en SQLite (`node:sqlite`, sin compilación nativa). El dinero se guarda en
centavos enteros.

**Tecnología:** Node.js 22.13 o superior, Express 5, EJS 6, express-session, bcryptjs, Jest 30,
Supertest 7, Playwright 1.64.

**Especificación:** `../E1/e1-autobahn.md` (RF, RN y RNF) y `../E1/datos_e1.py` (casos de uso).

## Restricciones globales

- Marcas permitidas: Audi, BMW, Mercedes-Benz, Porsche y Volkswagen (RN-01).
- Estados de una publicación: En revisión, Disponible y Rechazada; solo las Disponible salen en el catálogo (RN-08).
- Catálogo: 12 autos por página, del más reciente al más antiguo (RN-03).
- Contraseñas con bcrypt de costo 10; consultas parametrizadas; 403 para quien no tenga el rol; sesión de 30 minutos de inactividad; errores sin detalles técnicos (RNF-04).
- Paleta: crema `#F7F1DE`, salvia `#B0BA99`, cobre `#9D6638`, café `#4E220F`. Cobre solo en acentos y textos de 18.66 px en negrita o más; botones con texto crema sobre café (RNF-08).
- Interfaz en español; precios `B/. 25,000.00`, fechas `dd/mm/aaaa`, horas de 24 horas (RNF-09).
- Se instala con `npm install` y se ejecuta con `npm start`, en Windows 11 y macOS (RNF-07).
- Nombres de archivos, funciones y variables en español.

## Foco de revisión

1. `?pagina=` inválida en el catálogo (texto, 0, negativa o mayor que el total): se muestra una página válida, nunca un error 500.
2. `/autos/:id` con un id no numérico o de un auto En revisión o Rechazado: 404, sin revelar que existe.
3. Correo con mayúsculas o espacios al iniciar sesión: se normaliza y la sesión inicia igual.
4. Error interno en una ruta: página 500 sin traza ni mensaje técnico.
5. Página del administrador sin sesión: redirige a iniciar sesión; con sesión de cliente: 403.

---

### Tarea 1: Proyecto, reloj y formatos

**Archivos:** `package.json`, `.gitignore`, `.nvmrc`, `jest.config.js`, `src/reloj.js`,
`src/formato.js`, `pruebas/unitarias/reloj.test.js`, `pruebas/unitarias/formato.test.js`.

**Produce:**
- `crearReloj(fechaFija?: string) -> { ahora(): Date, anioActual(): number }`. Sin fecha fija usa la hora real; `AUTOBAHN_FECHA` la fija en el servidor.
- `formatearPrecio(centavos) -> "B/. 25,000.00"`, `formatearKm(km) -> "35,000 km"`, `formatearFecha(Date | "AAAA-MM-DD") -> "dd/mm/aaaa"`, y las etiquetas `ETIQUETAS.condicion | transmision | combustible | estado`.

- [x] Pruebas: `formatearPrecio(2500000) === "B/. 25,000.00"`, `formatearPrecio(49240) === "B/. 492.40"`, `formatearKm(0) === "0 km"`, `formatearFecha("2026-10-20") === "20/10/2026"`, `crearReloj("2026-10-20T10:00:00").anioActual() === 2026`.
- [x] Verlas fallar, implementar y verlas pasar con `npm test`.

### Tarea 2: Base de datos y datos de prueba

**Archivos:** `src/bd/esquema.sql`, `src/bd/conexion.js`, `src/bd/datos-semilla.js`,
`src/bd/semilla.js`, `scripts/reiniciar-bd.js`, `pruebas/ayudantes.js`, `pruebas/unitarias/bd.test.js`.

**Produce:**
- `abrirBaseDeDatos(ruta = ":memory:") -> DatabaseSync` con el esquema aplicado y `foreign_keys` activas.
- `sembrar(db) -> void`: 1 administrador, 8 clientes y 40 autos (20 nuevos del inventario y 20 usados: 16 Disponible, 3 En revisión, 1 Rechazada), sin pasar de 3 publicaciones activas por cliente (RN-07).
- `crearContexto({ fecha = "2026-10-20T10:00:00" }) -> { db, reloj, app }` en `pruebas/ayudantes.js`.
- Tablas: `usuarios`, `autos` (precio en centavos, `vendedor_id` nulo para los nuevos), `fotos`, `citas`, `ofertas`, con `CHECK` para marca, condición, estado, transmisión, combustible y rol.

- [x] Pruebas: 36 autos Disponible; ninguna marca fuera de RN-01 se puede insertar; la cédula y el correo son únicos; ningún cliente tiene más de 3 publicaciones activas; los hashes empiezan con `$2` y tienen costo 10.
- [x] Verlas fallar, implementar y verlas pasar.

### Tarea 3: Interfaz, inicio, catálogo y ficha

**Archivos:** `src/app.js`, `src/servidor.js`, `src/rutas/publicas.js`, `src/consultas/autos.js`,
`src/vistas/*.ejs`, `src/vistas/parciales/*.ejs`, `publico/css/estilos.css`,
`publico/img/silueta-auto.svg`, `pruebas/integracion/publicas.test.js`.

**Produce:**
- `crearApp({ db, reloj, secretoSesion }) -> express.Application`.
- `listarDisponibles(db, { pagina }) -> { autos, pagina, totalPaginas, total }` y `buscarDisponible(db, id) -> auto | undefined`.
- Rutas `GET /`, `GET /catalogo?pagina=N`, `GET /autos/:id`; 404 y 500 con páginas propias.

- [x] Pruebas: `/` responde 200 con "Autobahn"; `/catalogo` muestra 12 autos y "36 autos disponibles"; la página 3 muestra 12; `?pagina=abc`, `0`, `-1` y `99` responden 200; `/autos/<id de un auto En revisión>` y `/autos/abc` responden 404; la ficha muestra el precio con formato `B/.`; un error forzado responde 500 sin la palabra "Error:" ni rutas de archivos.
- [x] Verlas fallar, implementar y verlas pasar.

### Tarea 4: Sesión y roles

**Archivos:** `src/rutas/sesion.js`, `src/rutas/cuenta.js`, `src/middleware/autenticacion.js`,
vistas de inicio de sesión, Mi cuenta, panel del administrador y 403, `pruebas/integracion/sesion.test.js`.

**Produce:** `requiereSesion`, `requiereRol(rol)`; rutas `GET|POST /iniciar-sesion`,
`POST /cerrar-sesion`, `GET /mi-cuenta` (Mis publicaciones del cliente) y `GET /admin`
(publicaciones por revisar).

- [x] Pruebas: contraseña incorrecta responde 401 con "Correo o contraseña incorrectos."; `CLIENTE1@prueba.pa ` con espacios inicia sesión; la cookie es `HttpOnly` y `SameSite=Lax` y dura 30 minutos; `/admin` sin sesión redirige a `/iniciar-sesion`; con un cliente responde 403; con el administrador muestra "Publicaciones por revisar: 3"; `/mi-cuenta` de cliente1 lista sus 3 publicaciones; cerrar sesión vuelve al inicio.
- [x] Verlas fallar, implementar y verlas pasar.

### Tarea 5: Prueba de humo, integración continua y documentación

**Archivos:** `playwright.config.js`, `pruebas/sistema/humo.spec.js`,
`.github/workflows/pruebas.yml`, `sonar-project.properties`, `README.md`.

- [x] Prueba de humo del E1 (sección 1.3.5) en Playwright: iniciar sesión, buscar un auto en el catálogo y abrir su ficha, en Chromium, Firefox y WebKit.
- [x] Workflow que corre Jest con cobertura y Playwright en cada push y, si existe el secreto `SONAR_TOKEN`, el análisis de SonarQube Cloud.
- [x] README con instalación, comandos, usuarios de prueba, estructura y orden de los incrementos.
- [x] Verificación final: `npm test` (62 pruebas, 97 % de sentencias y 84 % de ramas) y las pruebas de sistema en Chromium, WebKit y celular pasan en limpio. Firefox no arranca en macOS 27 (problema del navegador de Playwright en esa versión del sistema); se valida en GitHub Actions.

## Después de la base

Cada funcionalidad se agrega como un incremento con sus pruebas, en el orden de prioridad del E1
(Tabla 4): RF-04, RF-07, RF-05, RF-01, RF-06, RF-08, RF-02 y RF-03.
