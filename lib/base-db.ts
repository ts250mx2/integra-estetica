import mysql from 'mysql2/promise';

// Pool a la BD base/plantilla (BDIntegraEsteticaBase). Se usa como fallback
// cuando no hay proyecto seleccionado (modo clásico de una sola estética)
// y como plantilla al crear la BD de un proyecto nuevo.
const basePool = mysql.createPool({
  host: process.env.DB_HOST || 'integramembers.com',
  user: process.env.DB_USER || 'kyk',
  password: process.env.DB_PASSWORD || 'merkurio',
  database: process.env.DB_NAME || 'BDIntegraEsteticaBase',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: 0,
});

export default basePool;
