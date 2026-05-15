import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.Categoria 
      FROM tblProductos p 
      LEFT JOIN tblCategorias c ON p.IdCategoria = c.IdCategoria 
      ORDER BY p.Producto ASC
    `);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const [maxId] = await pool.query('SELECT MAX(IdProducto) as maxId FROM tblProductos');
    const id = ((maxId as any[])[0].maxId || 0) + 1;

    await pool.query(
      'INSERT INTO tblProductos (IdProducto, Producto, Precio1, Precio2, Precio3, IdCategoria, Status, Multiple, ArchivoImagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.Producto, data.Precio1, data.Precio2 || 0, data.Precio3 || 0, data.IdCategoria, 1, data.Multiple || 0, data.ArchivoImagen || null]
    );
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
