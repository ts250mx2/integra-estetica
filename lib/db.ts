import { FieldPacket, Pool, PoolConnection, QueryOptions } from 'mysql2/promise';

type QueryValues = Parameters<Pool['query']>[1];
type ExecuteValues = Parameters<Pool['execute']>[1];
import { getRequestPool } from '@/lib/dynamic-db';

/**
 * Wrapper de BD consciente del proyecto activo.
 *
 * Mantiene la misma interfaz que el pool original (`pool.query(...)`), pero
 * cada llamada se resuelve contra la BD del proyecto indicado por la cookie
 * de sesión `ie-project`; sin cookie usa la BD base (BDIntegraEsteticaBase).
 *
 * Solo es válido dentro de un contexto de request (route handlers / server
 * actions), porque internamente lee cookies().
 */
const db = {
  async query(sql: string | QueryOptions, values?: QueryValues): Promise<[unknown, FieldPacket[]]> {
    const pool = await getRequestPool();
    return pool.query(sql as string, values);
  },

  async execute(sql: string | QueryOptions, values?: ExecuteValues): Promise<[unknown, FieldPacket[]]> {
    const pool = await getRequestPool();
    return pool.execute(sql as string, values);
  },

  async getConnection(): Promise<PoolConnection> {
    const pool = await getRequestPool();
    return pool.getConnection();
  },
};

export default db;
