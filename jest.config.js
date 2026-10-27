// Jest corre las pruebas unitarias y de integracion; las de sistema (Playwright) van aparte.
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/pruebas'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/servidor.js'],
  coverageReporters: ['text', 'lcov'],
};
