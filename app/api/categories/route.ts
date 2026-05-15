import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM tblCategorias ORDER BY Categoria ASC');
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { Categoria, EsExtra } = await request.json();
    const [maxId] = await pool.query('SELECT MAX(IdCategoria) as maxId FROM tblCategorias');
    const id = ((maxId as any[])[0].maxId || 0) + 1;

    await pool.query('INSERT INTO tblCategorias (IdCategoria, Categoria, EsExtra) VALUES (?, ?, ?)', [id, Categoria, EsExtra || 0]);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
