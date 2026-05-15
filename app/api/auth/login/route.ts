import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    const [rows] = await pool.query(
      'SELECT IdUsuario, Usuario, IdPuesto FROM tblUsuarios WHERE Login = ? AND Password = ? AND Status = 1',
      [login, password]
    );

    const user = (rows as any[])[0];

    if (!user) {
      return NextResponse.json({ message: 'Usuario o contraseña incorrectos' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user });
    response.cookies.set('ie-token', 'valid-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Error en el servidor' }, { status: 500 });
  }
}
