import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, a.FechaApertura 
      FROM tblMovimientos m 
      LEFT JOIN tblAperturasCierres a ON m.IdApertura = a.IdApertura 
      ORDER BY m.FechaRetiro DESC
    `);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
