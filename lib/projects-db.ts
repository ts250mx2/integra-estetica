import mysql from 'mysql2/promise';
import { requireEnv } from '@/lib/env';

const PROJECTS_DB_NAME = requireEnv('DB_NAME_PROJECTS');

// Pool a la BD maestra de proyectos (BDEsteticaProjects), donde se registran
// los proyectos (tblProyectos), sus dueños (tblUsuarios) y la relación
// entre ambos (tblProyectosUsuarios).
const projectsPool = mysql.createPool({
  host: requireEnv('DB_HOST_PROJECTS'),
  user: requireEnv('DB_USER_PROJECTS'),
  password: requireEnv('DB_PASSWORD_PROJECTS'),
  database: PROJECTS_DB_NAME,
  port: parseInt(process.env.DB_PORT_PROJECTS || '3306'),
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT_PROJECTS || '10'),
  queueLimit: 0,
  decimalNumbers: true,
});

let bootstrapPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  // La BD maestra puede no existir aún en el servidor: crearla sin
  // seleccionar base y luego asegurar sus tablas.
  const connection = await mysql.createConnection({
    host: requireEnv('DB_HOST_PROJECTS'),
    user: requireEnv('DB_USER_PROJECTS'),
    password: requireEnv('DB_PASSWORD_PROJECTS'),
    port: parseInt(process.env.DB_PORT_PROJECTS || '3306'),
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${PROJECTS_DB_NAME}\` DEFAULT CHARACTER SET utf8mb4`
    );
  } finally {
    await connection.end();
  }

  await projectsPool.query(`
    CREATE TABLE IF NOT EXISTS tblUsuarios (
      IdUsuario INT NOT NULL AUTO_INCREMENT,
      Usuario VARCHAR(150) NOT NULL,
      CorreoElectronico VARCHAR(255) NOT NULL,
      Telefono VARCHAR(30) DEFAULT NULL,
      Passwd VARCHAR(255) NOT NULL,
      FechaAct DATETIME DEFAULT NULL,
      Status INT NOT NULL DEFAULT 0,
      PRIMARY KEY (IdUsuario),
      UNIQUE KEY uq_correo (CorreoElectronico)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await projectsPool.query(`
    CREATE TABLE IF NOT EXISTS tblProyectos (
      IdProyecto INT NOT NULL AUTO_INCREMENT,
      Proyecto VARCHAR(255) NOT NULL,
      Dominio VARCHAR(150) DEFAULT NULL,
      BaseDatos VARCHAR(150) DEFAULT NULL,
      Servidor VARCHAR(150) DEFAULT NULL,
      UsuarioBD VARCHAR(150) DEFAULT NULL,
      PasswordBD VARCHAR(150) DEFAULT NULL,
      UUID VARCHAR(64) DEFAULT NULL,
      FechaAct DATETIME DEFAULT NULL,
      Status INT NOT NULL DEFAULT 0,
      PRIMARY KEY (IdProyecto)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Migración para instalaciones donde tblProyectos ya existía sin Dominio.
  const [columns] = await projectsPool.query('SHOW COLUMNS FROM tblProyectos') as [{ Field: string }[], unknown];
  if (!columns.some((col) => col.Field === 'Dominio')) {
    await projectsPool.query('ALTER TABLE tblProyectos ADD COLUMN Dominio VARCHAR(150) DEFAULT NULL AFTER Proyecto');
  }

  await projectsPool.query(`
    CREATE TABLE IF NOT EXISTS tblProyectosUsuarios (
      IdProyectoUsuario INT NOT NULL AUTO_INCREMENT,
      IdProyecto INT NOT NULL,
      IdUsuario INT NOT NULL,
      FechaAct DATETIME DEFAULT NULL,
      PRIMARY KEY (IdProyectoUsuario),
      KEY idx_proyecto (IdProyecto),
      KEY idx_usuario (IdUsuario)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/**
 * Asegura que BDEsteticaProjects y sus tablas maestras existan.
 * Idempotente y memoizada: corre una sola vez por proceso.
 */
export function ensureProjectsDatabase(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().catch((error) => {
      // Permite reintentar en el siguiente request si el bootstrap falló.
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

export default projectsPool;
