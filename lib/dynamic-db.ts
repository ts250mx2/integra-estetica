import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import { cookies } from 'next/headers';
import projectsPool from '@/lib/projects-db';
import basePool from '@/lib/base-db';

export const PROJECT_COOKIE = 'ie-project';

const PROJECT_POOL_CONNECTION_LIMIT = 5;

export interface ProjectRow extends RowDataPacket {
  IdProyecto: number;
  Proyecto: string;
  BaseDatos: string;
  Servidor: string;
  UsuarioBD: string;
  PasswordBD: string;
  UUID: string;
  Status: number;
}

// Cache de pools por proyecto para no crear un pool en cada request.
const projectPools = new Map<number, Pool>();

/** Lee el registro del proyecto en la BD maestra (BDEsteticaProjects). */
export async function getProjectRecord(projectId: number): Promise<ProjectRow> {
  const [rows] = await projectsPool.query<ProjectRow[]>(
    'SELECT * FROM tblProyectos WHERE IdProyecto = ? AND Status = 0',
    [projectId]
  );

  if (rows.length === 0) {
    throw new Error(`Proyecto ${projectId} no encontrado o inactivo`);
  }

  const project = rows[0];
  if (!project.BaseDatos || !project.Servidor || !project.UsuarioBD || !project.PasswordBD) {
    throw new Error(
      `El proyecto ${projectId} ("${project.Proyecto}") no tiene configuración de BD completa ` +
      '(BaseDatos, Servidor, UsuarioBD, PasswordBD en tblProyectos)'
    );
  }

  return project;
}

/** Devuelve (y cachea) el pool de conexiones a la BD del proyecto. */
export async function getProjectPool(projectId: number): Promise<Pool> {
  const cached = projectPools.get(projectId);
  if (cached) return cached;

  const project = await getProjectRecord(projectId);
  const pool = mysql.createPool({
    host: project.Servidor,
    user: project.UsuarioBD,
    password: project.PasswordBD,
    database: project.BaseDatos,
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: PROJECT_POOL_CONNECTION_LIMIT,
    queueLimit: 0,
  });

  projectPools.set(projectId, pool);
  return pool;
}

/** IdProyecto de la sesión actual (cookie ie-project), o null si no hay. */
export async function getRequestProjectId(): Promise<number | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PROJECT_COOKIE)?.value;
  if (!raw) return null;

  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Pool de la BD que corresponde al request actual:
 *  - con cookie ie-project → BD del proyecto (multiproyecto);
 *  - sin cookie → BD base (modo clásico, BDIntegraEsteticaBase).
 */
export async function getRequestPool(): Promise<Pool> {
  const projectId = await getRequestProjectId();
  if (projectId === null) return basePool;
  return getProjectPool(projectId);
}
