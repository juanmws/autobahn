# Autobahn

Marketplace web de autos nuevos y usados de marcas alemanas (Audi, BMW, Mercedes-Benz, Porsche y
Volkswagen) en Panamá, con local en la Vía Ricardo J. Alfaro, al lado de la UTP. Es el sistema
que se prueba en el proyecto final de Ingeniería de Software Aplicada III (grupo 1GS134).

La especificación está en `../E1/e1-autobahn.md` (requisitos y reglas de negocio) y
`../E1/datos_e1.py` (casos de uso). El plan de esta base está en `docs/plan-base.md`.

## Instalación

Requiere Node.js 22.13 o superior (la base de datos usa `node:sqlite`, que viene con Node; no hay
que instalar ningún servidor de base de datos).

```sh
npm install
npm start          # http://localhost:3000
```

La primera vez se crea `datos/autobahn.db` con los datos de prueba. Para volver a empezar:
`npm run bd:reiniciar`.

## Usuarios de prueba

| Rol | Correo | Contraseña |
|:--|:--|:--|
| Administrador | admin@autobahn.pa | Autobahn#2026 |
| Clientes | cliente1@prueba.pa a cliente8@prueba.pa | Prueba#2026 |

Los datos de prueba tienen 40 autos: 20 nuevos del inventario y 20 usados de los clientes
(16 Disponible, 3 En revisión y 1 Rechazada). El cliente 1 ya tiene 3 publicaciones activas, el
máximo de la RN-07, y el cliente 5 tiene una rechazada.

## Comandos

| Comando | Qué hace |
|:--|:--|
| `npm start` | Levanta el sistema en el puerto 3000 |
| `npm test` | Pruebas unitarias y de integración (Jest y Supertest) |
| `npm run test:cobertura` | Lo mismo, con el reporte de cobertura en `coverage/` |
| `npm run test:sistema` | Pruebas de sistema en el navegador (Playwright): Chromium, Firefox, WebKit y celular |
| `npm run test:sistema:sin-firefox` | Las mismas, sin Firefox (ver nota) |
| `npm run bd:reiniciar` | Borra la base local y la crea de nuevo con los datos de prueba |

La primera vez que se usan las pruebas de sistema hay que descargar los navegadores:
`npx playwright install`.

**Nota sobre Firefox en macOS 27.** El Firefox que descarga Playwright 1.64 no arranca en macOS 27
("Could not find profile folder"), aunque Chromium y WebKit sí. En GitHub Actions las pruebas
corren en Ubuntu, donde Firefox funciona. En una Mac con macOS 27 se usa `test:sistema:sin-firefox`.

## Variables de entorno

| Variable | Uso | Valor por defecto |
|:--|:--|:--|
| `PORT` | Puerto del servidor | 3000 |
| `AUTOBAHN_BD` | Archivo de la base de datos; `:memory:` para una base temporal | `datos/autobahn.db` |
| `AUTOBAHN_FECHA` | Fecha fija del sistema, `AAAA-MM-DDTHH:MM:SS` | la fecha real |
| `SESION_SECRETO` | Secreto de las cookies de sesión | uno nuevo en cada arranque |

Las pruebas fijan la fecha en el 20/10/2026 a las 10:00, porque las citas y el año de los autos
dependen del día.

## Estructura

```
src/
  app.js              crearApp({ db, reloj, secretoSesion }): la aplicación Express
  servidor.js         punto de entrada (npm start)
  reloj.js            fecha del sistema, fijable en las pruebas
  formato.js          precios B/., kilometraje y fechas dd/mm/aaaa (RNF-09)
  bd/                 esquema SQL, conexión y datos de prueba
  consultas/          consultas a la base de datos
  middleware/         sesión y control de acceso por rol (RNF-04)
  rutas/              páginas públicas, sesión, Mi cuenta y panel del administrador
  vistas/             plantillas EJS
publico/              hoja de estilos con la paleta (RNF-08) e imágenes
pruebas/
  unitarias/          Jest: formatos, reloj y base de datos
  integracion/        Jest y Supertest: rutas con la base de datos
  sistema/            Playwright: prueba de humo y ancho de pantalla
.github/workflows/    integración continua
docs/                 plan de la base
```

## Estado de las funcionalidades

La base incluye lo que necesitan todas las funcionalidades: catálogo de solo lectura con
paginación, ficha del auto, inicio y cierre de sesión, Mis publicaciones, panel del administrador
y control de acceso por rol. Las ocho funcionalidades se agregan una por una, cada una con sus
pruebas, en el orden de prioridad del plan de pruebas (Tabla 4 del E1):

| Orden | Funcionalidad | Estado |
|:--|:--|:--|
| 1 | RF-04. Calcular el financiamiento de un auto | Pendiente |
| 2 | RF-07. Agendar una prueba de manejo | Pendiente |
| 3 | RF-05. Publicar un auto usado | Pendiente |
| 4 | RF-01. Registrar una cuenta de cliente | Pendiente |
| 5 | RF-06. Revisar una publicación de auto usado | Pendiente |
| 6 | RF-08. Hacer una oferta por un auto usado | Pendiente |
| 7 | RF-02. Buscar autos con filtros | Pendiente (hoy el catálogo no tiene filtros) |
| 8 | RF-03. Comparar autos | Pendiente |

## GitHub y SonarQube Cloud

1. Subir el repositorio a GitHub. Para usar SonarQube Cloud gratis, el repositorio debe ser público.
2. El workflow `.github/workflows/pruebas.yml` corre las pruebas en cada push.
3. En https://sonarcloud.io, importar el repositorio con la cuenta de GitHub, desactivar el
   análisis automático (Administration, Analysis Method) y copiar el token.
4. En GitHub, guardar el token como secreto del repositorio con el nombre `SONAR_TOKEN`.
5. Confirmar que `sonar.organization` y `sonar.projectKey` de `sonar-project.properties`
   coinciden con los que muestra SonarQube Cloud.
