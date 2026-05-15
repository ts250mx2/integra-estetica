import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { Categoria, EsExtra } = await request.json();
    await pool.query('UPDATE tblCategorias SET Categoria = ?, EsExtra = ? WHERE IdCategoria = ?', [Categoria, EsExtra, id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Check if products exist in this category
    const [products] = await pool.query('SELECT IdProducto FROM tblProductos WHERE IdCategoria = ?', [id]);
    if ((products as any[]).length > 0) {
      return NextResponse.json({ message: 'No se puede eliminar una categoría con productos' }, { status: 400 });
    }
    await pool.query('DELETE FROM tblCategorias WHERE IdCategoria = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
