// Pruebas de sistema (caja negra en el navegador). Levantan su propio servidor con una base de
// datos en memoria y la fecha fija del plan de pruebas, para que el resultado no cambie.
const { defineConfig, devices } = require('@playwright/test');

const PUERTO = 3100;

module.exports = defineConfig({
  testDir: './pruebas/sistema',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: 'es-PA',
    trace: 'on-first-retry',
  },
  // RNF-05: Chromium, Firefox y WebKit (motor de Safari), y un celular
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node --disable-warning=ExperimentalWarning src/servidor.js',
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PUERTO),
      AUTOBAHN_BD: ':memory:',
      AUTOBAHN_FECHA: '2026-10-20T10:00:00',
      SESION_SECRETO: 'secreto-de-las-pruebas-de-sistema',
    },
  },
});
