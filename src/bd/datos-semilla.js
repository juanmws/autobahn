// Datos de prueba de Autobahn: 1 administrador, 8 clientes y 40 autos (20 nuevos y 20 usados).
// Los precios estan en balboas. Las personas y los vehiculos son ficticios.

const CONTRASENA_CLIENTES = 'Prueba#2026';
const CONTRASENA_ADMINISTRADOR = 'Autobahn#2026';

const ADMINISTRADOR = {
  nombre: 'Laura', apellido: 'Batista', cedula: '8-800-1234', fecha_nacimiento: '1987-06-14',
  telefono: '61230000', correo: 'admin@autobahn.pa',
};

// cliente1@prueba.pa a cliente8@prueba.pa
const CLIENTES = [
  { nombre: 'Carlos', apellido: 'Pinto', cedula: '8-411-920', fecha_nacimiento: '1990-08-11', telefono: '61234501' },
  { nombre: 'Ana', apellido: 'Méndez', cedula: '8-245-1187', fecha_nacimiento: '1985-03-02', telefono: '61234502' },
  { nombre: 'Luis', apellido: 'Herrera', cedula: '4-150-388', fecha_nacimiento: '1979-05-02', telefono: '61234503' },
  { nombre: 'Rosa', apellido: 'Castillo', cedula: '3-702-215', fecha_nacimiento: '1992-01-09', telefono: '61234504' },
  { nombre: 'Jorge', apellido: 'Sánchez', cedula: '8-301-559', fecha_nacimiento: '1970-12-12', telefono: '61234505' },
  { nombre: 'Elena', apellido: 'Castro', cedula: '2-158-733', fecha_nacimiento: '1995-07-21', telefono: '61234506' },
  { nombre: 'Diego', apellido: 'Ríos', cedula: '8-956-2210', fecha_nacimiento: '2001-11-30', telefono: '61234507' },
  { nombre: 'Paola', apellido: 'Núñez', cedula: 'PE-12-345', fecha_nacimiento: '1988-04-17', telefono: '61234508' },
].map((c, i) => ({ ...c, correo: `cliente${i + 1}@prueba.pa` }));

const NUEVO = 'Auto nuevo del inventario de Autobahn, con garantía de fábrica. Disponible para prueba de manejo en el local de la Vía Ricardo J. Alfaro.';

// [marca, modelo, precio, transmision, combustible, color, motor]
const NUEVOS = [
  ['Audi', 'A3 Sedán', 42900, 'automatica', 'gasolina', 'Blanco Glaciar', '1.5 TFSI, 150 hp'],
  ['Audi', 'Q3', 46500, 'automatica', 'gasolina', 'Blanco Glaciar', '1.5 TFSI, 150 hp'],
  ['Audi', 'Q5', 64900, 'automatica', 'hibrido', 'Blanco Glaciar', '2.0 TFSI híbrido ligero, 268 hp'],
  ['Audi', 'Q6 e-tron', 89900, 'automatica', 'electrico', 'Gris Manhattan', 'Eléctrico, 387 hp'],
  ['BMW', '118i', 39900, 'automatica', 'gasolina', 'Blanco Alpino', '1.5 turbo, 156 hp'],
  ['BMW', '320i', 54900, 'automatica', 'gasolina', 'Gris Skyscraper', '2.0 turbo, 184 hp'],
  ['BMW', 'X1 sDrive18i', 49900, 'automatica', 'gasolina', 'Blanco Alpino', '1.5 turbo, 156 hp'],
  ['BMW', 'X3 20 xDrive', 66500, 'automatica', 'hibrido', 'Blanco Alpino', '2.0 turbo híbrido ligero, 208 hp'],
  ['BMW', 'iX1 eDrive20', 58900, 'automatica', 'electrico', 'Blanco Alpino', 'Eléctrico, 204 hp'],
  ['Mercedes-Benz', 'A 200 Sedán', 41500, 'automatica', 'gasolina', 'Blanco Polar', '1.3 turbo, 163 hp'],
  ['Mercedes-Benz', 'C 200', 57900, 'automatica', 'hibrido', 'Plata Hightech', '1.5 turbo híbrido ligero, 204 hp'],
  ['Mercedes-Benz', 'GLA 200', 48900, 'automatica', 'gasolina', 'Blanco Polar', '1.3 turbo, 163 hp'],
  ['Mercedes-Benz', 'GLC 300 4MATIC', 72500, 'automatica', 'hibrido', 'Blanco Polar', '2.0 turbo híbrido ligero, 258 hp'],
  ['Porsche', 'Macan 4 Electric', 99500, 'automatica', 'electrico', 'Blanco Carrara', 'Eléctrico, 408 hp'],
  ['Porsche', 'Cayenne', 118000, 'automatica', 'gasolina', 'Blanco Carrara', '3.0 V6 turbo, 353 hp'],
  ['Porsche', '911 Carrera Cabriolet', 148000, 'automatica', 'gasolina', 'Gris Hielo', '3.0 biturbo, 394 hp'],
  ['Volkswagen', 'T-Cross', 27900, 'automatica', 'gasolina', 'Blanco Puro', '1.0 TSI, 116 hp'],
  ['Volkswagen', 'Taos', 33500, 'automatica', 'gasolina', 'Blanco Puro', '1.4 TSI, 150 hp'],
  ['Volkswagen', 'Tiguan', 39900, 'automatica', 'gasolina', 'Blanco Oryx', '2.0 TSI, 186 hp'],
  ['Volkswagen', 'Amarok', 52000, 'automatica', 'diesel', 'Azul Aurora', '3.0 V6 diésel, 240 hp'],
];

// [marca, modelo, año, km, precio, transmision, combustible, color, motor, vendedor (1 a 8), estado, descripcion]
const USADOS = [
  ['BMW', '320i', 2019, 58000, 27500, 'automatica', 'gasolina', 'Plata Glaciar', '2.0 turbo, 184 hp', 1, 'disponible',
    'Un solo dueño, mantenimientos en agencia y llantas nuevas. Nunca chocado.'],
  ['Mercedes-Benz', 'C 180', 2017, 82000, 19800, 'automatica', 'gasolina', 'Plata Iridio', '1.6 turbo, 156 hp', 1, 'disponible',
    'Interior de cuero beige, cámara de retroceso y sensores. Revisado en agencia este año.'],
  ['Volkswagen', 'Golf GTI', 2018, 64500, 23900, 'manual', 'gasolina', 'Rojo Tornado', '2.0 TSI, 228 hp', 1, 'en_revision',
    'Versión GTI con transmisión manual de seis velocidades y rines originales de 18 pulgadas.'],
  ['Audi', 'A4', 2016, 97000, 15500, 'automatica', 'gasolina', 'Rojo Tango', '2.0 TFSI, 190 hp', 2, 'disponible',
    'Sedán cómodo para la ciudad, con techo solar y sistema de sonido Bang & Olufsen.'],
  ['Porsche', 'Cayenne Diesel', 2015, 120000, 32000, 'automatica', 'diesel', 'Negro Jet', '3.0 V6 diésel, 262 hp', 2, 'disponible',
    'Mantenimiento al día, suspensión neumática revisada y cuatro llantas nuevas.'],
  ['BMW', 'X5 xDrive40i', 2020, 61000, 48500, 'automatica', 'gasolina', 'Blanco Alpino', '3.0 turbo, 340 hp', 2, 'disponible',
    'Tercera fila de asientos, paquete M Sport y garantía extendida vigente hasta 2027.'],
  ['Volkswagen', 'Jetta', 2019, 75000, 13900, 'automatica', 'gasolina', 'Naranja Habanero', '1.4 TSI, 150 hp', 3, 'disponible',
    'Económico y espacioso, ideal para uso diario. Pintura original.'],
  ['Mercedes-Benz', 'GLA 200', 2020, 45000, 26900, 'automatica', 'gasolina', 'Blanco Polar', '1.3 turbo, 163 hp', 3, 'disponible',
    'Pantalla táctil con Apple CarPlay, luces LED y portón eléctrico.'],
  ['Audi', 'Q5', 2018, 88000, 24500, 'automatica', 'gasolina', 'Azul Navarra', '2.0 TFSI, 252 hp', 3, 'en_revision',
    'Tracción quattro, asientos calefactados y mantenimiento registrado en agencia.'],
  ['Volkswagen', 'Tiguan', 2021, 52000, 24900, 'automatica', 'gasolina', 'Blanco Puro', '2.0 TSI, 186 hp', 4, 'disponible',
    'Tres filas de asientos, cámara 360 y control de crucero adaptativo.'],
  ['BMW', 'X1 sDrive20i', 2017, 105000, 14800, 'automatica', 'gasolina', 'Blanco Alpino', '2.0 turbo, 192 hp', 4, 'disponible',
    'Correa y frenos cambiados recientemente. Se vende por viaje.'],
  ['Porsche', 'Macan S', 2019, 68000, 49900, 'automatica', 'gasolina', 'Blanco Carrara', '3.0 V6 biturbo, 354 hp', 5, 'disponible',
    'Paquete Sport Chrono, escape deportivo y llantas de 20 pulgadas.'],
  ['Mercedes-Benz', 'E 300', 2019, 71000, 33500, 'automatica', 'gasolina', 'Gris Selenita', '2.0 turbo, 245 hp', 5, 'disponible',
    'Sedán ejecutivo con asistente de estacionamiento y tapicería de cuero.'],
  ['Audi', 'A3', 2014, 142000, 9800, 'automatica', 'gasolina', 'Blanco Ibis', '1.4 TFSI, 125 hp', 5, 'rechazada',
    'Hatchback compacto, económico y con aire acondicionado recién reparado.'],
  ['Volkswagen', 'Amarok', 2022, 48000, 36900, 'automatica', 'diesel', 'Gris Indio', '3.0 V6 diésel, 258 hp', 6, 'disponible',
    'Doble cabina 4x4 con tapa de cama y gancho de remolque.'],
  ['BMW', '118i', 2021, 39000, 22500, 'automatica', 'gasolina', 'Blanco Alpino', '1.5 turbo, 140 hp', 6, 'disponible',
    'Poco kilometraje, garantía de agencia vigente y todos los manuales.'],
  ['Porsche', '911 Carrera', 2016, 54000, 79500, 'automatica', 'gasolina', 'Gris Ágata', '3.0 biturbo, 370 hp', 7, 'disponible',
    'Mantenimientos en Porsche Center, interior negro y escape deportivo.'],
  ['Audi', 'Q3', 2022, 31000, 31800, 'automatica', 'gasolina', 'Azul Turbo', '1.4 TFSI, 150 hp', 7, 'en_revision',
    'Como nuevo, con paquete S line y cargador inalámbrico.'],
  ['Mercedes-Benz', 'GLC 300', 2021, 58000, 41900, 'automatica', 'gasolina', 'Blanco Polar', '2.0 turbo, 255 hp', 8, 'disponible',
    'Techo panorámico, sonido Burmester y mantenimiento al día.'],
  ['Volkswagen', 'Polo', 2023, 18000, 15900, 'manual', 'gasolina', 'Rojo Sunset', '1.6 MSI, 110 hp', 8, 'disponible',
    'Primer dueño, muy poco uso y transmisión manual de cinco velocidades.'],
];

const MOTIVO_RECHAZO = 'El kilometraje del formulario no coincide con el del tablero visto en la inspección.';

module.exports = {
  CONTRASENA_CLIENTES, CONTRASENA_ADMINISTRADOR, ADMINISTRADOR, CLIENTES, NUEVO, NUEVOS, USADOS, MOTIVO_RECHAZO,
};
