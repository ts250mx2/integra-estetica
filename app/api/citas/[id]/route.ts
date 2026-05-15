import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const { IdCliente, Titulo, Descripcion, FechaCita, Duracion, Status } = await request.json();

    await pool.query(
      `UPDATE tblCitas SET 
        IdCliente = ?, Titulo = ?, Descripcion = ?, 
        FechaCita = ?, Duracion = ?, Status = ? 
       WHERE IdCita = ?`,
      [IdCliente, Titulo, Descripcion, FechaCita, Duracion, Status, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Citas PUT error:', error);
    return NextResponse.json({ message: 'Error al actualizar cita' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    // Status 3 = Cancelada
    await pool.query('UPDATE tblCitas SET Status = 3 WHERE IdCita = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Citas DELETE error:', error);
    return NextResponse.json({ message: 'Error al eliminar cita' }, { status: 500 });
  }
}
