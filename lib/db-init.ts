import mysql from 'mysql2/promise';
import { requireEnv } from '@/lib/env';

export const DB_NAME_PREFIX = 'HLC_';

/** Convierte el nombre del proyecto al nombre de su base de datos. */
export function toDbName(proyecto: string): string {
  const sanitized = proyecto.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  return `${DB_NAME_PREFIX}${sanitized}`;
}

export interface ProjectAdminUser {
  /** Nombre visible del usuario (ej. "Juan Pérez"). */
  usuario: string;
  /** Login completo con dominio (ej. "admin@mibarberia.hl"). */
  login: string;
  password: string;
}

export interface ProjectTicketConfig {
  /** Header1 del ticket y AppTitle: nombre del proyecto. */
  nombreProyecto: string;
  /** Header2 del ticket. */
  telefono: string;
  /** Header3 del ticket. */
  correoElectronico: string;
  /** Ruta pública del logo (ej. /uploads/logos/xxx.png), o null si no se subió. */
  logoPath: string | null;
}

/**
 * Crea la base de datos del proyecto como una copia de la BD plantilla
 * (BDIntegraEsteticaBase): mismas tablas (CREATE TABLE ... LIKE) y copia de
 * los catálogos iniciales (usuarios, categorías, productos y configuración
 * de ticket) para que el proyecto arranque listo para usarse. Si se recibe
 * `adminUser`, deja al usuario 1 de tblUsuarios con ese login@dominio y
 * contraseña como administrador del proyecto. Si se recibe `ticketConfig`,
 * personaliza tblConfigTicket con los datos del proyecto (headers, título
 * del sistema y logo).
 *
 * Idempotente: si la BD o las tablas ya existen no las sobreescribe, y los
 * catálogos solo se copian cuando están vacíos.
 */
export async function initializeProjectDatabase(
  dbName: string,
  adminUser?: ProjectAdminUser,
  ticketConfig?: ProjectTicketConfig
): Promise<void> {
  if (!dbName) throw new Error('Nombre de base de datos vacío');

  const templateDb = requireEnv('DB_NAME');
  const seedTables = ['tblUsuarios', 'tblCategorias', 'tblProductos', 'tblConfigTicket'];

  // Conexión al servidor sin seleccionar BD (la BD nueva aún no existe).
  const connection = await mysql.createConnection({
    host: requireEnv('DB_HOST'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4`
    );

    // Clonar el esquema de todas las tablas de la BD plantilla.
    const [tableRows] = await connection.query(
      `SHOW FULL TABLES FROM \`${templateDb}\` WHERE Table_type = 'BASE TABLE'`
    ) as [Record<string, string>[], unknown];

    const tableNames = tableRows.map((row) => Object.values(row)[0]);

    for (const table of tableNames) {
      await connection.query(
        `CREATE TABLE IF NOT EXISTS \`${dbName}\`.\`${table}\` LIKE \`${templateDb}\`.\`${table}\``
      );
    }

    // Copiar catálogos iniciales solo si la tabla destino está vacía.
    for (const table of seedTables) {
      if (!tableNames.includes(table)) continue;

      const [countRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM \`${dbName}\`.\`${table}\``
      ) as [{ total: number }[], unknown];

      if (countRows[0].total === 0) {
        await connection.query(
          `INSERT INTO \`${dbName}\`.\`${table}\` SELECT * FROM \`${templateDb}\`.\`${table}\``
        );
      }
    }

    // Usuario administrador del proyecto: su Login es usuario@dominio y con
    // él se entra al sistema (el login resuelve la BD a partir del dominio).
    if (adminUser) {
      const [adminRows] = await connection.query(
        `SELECT IdUsuario FROM \`${dbName}\`.tblUsuarios WHERE IdUsuario = 1`
      ) as [{ IdUsuario: number }[], unknown];

      if (adminRows.length > 0) {
        await connection.query(
          `UPDATE \`${dbName}\`.tblUsuarios
           SET Usuario = ?, Login = ?, Password = ?, IdPuesto = 1, Status = 1
           WHERE IdUsuario = 1`,
          [adminUser.usuario, adminUser.login, adminUser.password]
        );
      } else {
        await connection.query(
          `INSERT INTO \`${dbName}\`.tblUsuarios (IdUsuario, Usuario, IdPuesto, Login, Password, Status)
           VALUES (1, ?, 1, ?, ?, 1)`,
          [adminUser.usuario, adminUser.login, adminUser.password]
        );
      }
    }

    // Personalizar el ticket y el título del sistema con los datos del
    // proyecto: Header1 = proyecto, Header2 = teléfono, Header3 = correo,
    // AppTitle = proyecto, LogoPath = logo subido en el registro.
    if (ticketConfig) {
      const [configRows] = await connection.query(
        `SELECT Id FROM \`${dbName}\`.tblConfigTicket WHERE Id = 1`
      ) as [{ Id: number }[], unknown];

      if (configRows.length > 0) {
        await connection.query(
          `UPDATE \`${dbName}\`.tblConfigTicket
           SET Header1 = ?, Header2 = ?, Header3 = ?, AppTitle = ?, LogoPath = ?
           WHERE Id = 1`,
          [
            ticketConfig.nombreProyecto,
            ticketConfig.telefono,
            ticketConfig.correoElectronico,
            ticketConfig.nombreProyecto,
            ticketConfig.logoPath,
          ]
        );
      } else {
        await connection.query(
          `INSERT INTO \`${dbName}\`.tblConfigTicket
             (Id, Header1, Header2, Header3, Footer1, Footer2, RequireCustomerName, AppTitle, LogoPath)
           VALUES (1, ?, ?, ?, 'Gracias por su preferencia', '¡Vuelva pronto!', 1, ?, ?)`,
          [
            ticketConfig.nombreProyecto,
            ticketConfig.telefono,
            ticketConfig.correoElectronico,
            ticketConfig.nombreProyecto,
            ticketConfig.logoPath,
          ]
        );
      }
    }
  } finally {
    await connection.end();
  }
}
