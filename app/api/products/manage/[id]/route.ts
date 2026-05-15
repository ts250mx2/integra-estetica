import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const data = await request.json();
    await pool.query(
      'UPDATE tblProductos SET Producto = ?, Precio1 = ?, Precio2 = ?, Precio3 = ?, IdCategoria = ?, Status = ?, Multiple = ?, ArchivoImagen = ? WHERE IdProducto = ?',
      [data.Producto, data.Precio1, data.Precio2, data.Precio3, data.IdCategoria, data.Status, data.Multiple, data.ArchivoImagen, id]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    // Logical delete or check sales
    const [sales] = await pool.query('SELECT IdDetalleVenta FROM tblDetalleVentas WHERE IdProducto = ? LIMIT 1', [id]);
    if ((sales as any[]).length > 0) {
      await pool.query('UPDATE tblProductos SET Status = 0 WHERE IdProducto = ?', [id]);
    } else {
      await pool.query('DELETE FROM tblProductos WHERE IdProducto = ?', [id]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
