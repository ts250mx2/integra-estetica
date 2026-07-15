import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [products] = await pool.query('SELECT p.*, c.Categoria FROM tblProductos p LEFT JOIN tblCategorias c ON p.IdCategoria = c.IdCategoria WHERE p.Status = 1');
    const [categories] = await pool.query('SELECT * FROM tblCategorias');
    return NextResponse.json({ products, categories });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json({ message: 'Error', error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const [maxId] = await pool.query('SELECT MAX(IdProducto) as maxId FROM tblProductos');
    const id = ((maxId as any[])[0].maxId || 0) + 1;
    
    await pool.query('INSERT INTO tblProductos SET ?, IdProducto = ?', [data, id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
