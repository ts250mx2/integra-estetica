import { NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';
import projectsPool, { ensureProjectsDatabase } from '@/lib/projects-db';
import { getProjectPool, getRequestPool, PROJECT_COOKIE } from '@/lib/dynamic-db';

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 1 semana
const PROJECT_MAX_AGE = 60 * 60 * 24 * 365; // el dispositivo queda ligado al proyecto

interface OwnerRow extends RowDataPacket {
  IdUsuario: number;
  Usuario: string;
  Passwd: string;
  IdProyecto: number;
  Proyecto: string;
}

interface DomainProjectRow extends RowDataPacket {
  IdProyecto: number;
  Proyecto: string;
  Dominio: string;
}

interface PosUserRow extends RowDataPacket {
  IdUsuario: number;
  Usuario: string;
  IdPuesto: number;
}

function setSessionCookies(response: NextResponse, projectId?: number) {
  response.cookies.set('ie-token', 'valid-token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE,
  });

  if (projectId) {
    response.cookies.set(PROJECT_COOKIE, String(projectId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: PROJECT_MAX_AGE,
    });
  }
}

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json({ message: 'Usuario y contraseña son requeridos' }, { status: 400 });
    }

    if (login.includes('@')) {
      await ensureProjectsDatabase();

      const identifier = String(login).trim().toLowerCase();
      const domainPart = identifier.split('@')[1] || '';

      // 1) Usuario de proyecto por dominio (ej. admin@mibarberia.hl):
      //    el dominio determina el proyecto y por lo tanto su base de datos,
      //    y el Login se valida contra la tblUsuarios de esa BD.
      if (domainPart) {
        const [projects] = await projectsPool.query<DomainProjectRow[]>(
          'SELECT IdProyecto, Proyecto, Dominio FROM tblProyectos WHERE Dominio = ? AND Status = 0',
          [domainPart]
        );

        if (projects.length > 0) {
          const project = projects[0];
          const projectPool = await getProjectPool(project.IdProyecto);

          const [users] = await projectPool.query<PosUserRow[]>(
            'SELECT IdUsuario, Usuario, IdPuesto FROM tblUsuarios WHERE Login = ? AND Password = ? AND Status = 1',
            [identifier, password]
          );

          const projectUser = users[0];
          if (!projectUser) {
            return NextResponse.json({ message: 'Usuario o contraseña incorrectos' }, { status: 401 });
          }

          const response = NextResponse.json({
            success: true,
            user: projectUser,
            project: { idProyecto: project.IdProyecto, nombre: project.Proyecto, dominio: project.Dominio },
          });
          setSessionCookies(response, project.IdProyecto);
          return response;
        }
      }

      // 2) Dueño de proyecto: inicia sesión con su correo registrado en
      //    BDEsteticaProjects; su login selecciona el proyecto del dispositivo.
      const [owners] = await projectsPool.query<OwnerRow[]>(
        `SELECT u.IdUsuario, u.Usuario, u.Passwd, p.IdProyecto, p.Proyecto
         FROM tblUsuarios u
         JOIN tblProyectosUsuarios pu ON pu.IdUsuario = u.IdUsuario
         JOIN tblProyectos p ON p.IdProyecto = pu.IdProyecto
         WHERE u.CorreoElectronico = ? AND u.Status = 0 AND p.Status = 0`,
        [identifier]
      );

      const owner = owners[0];
      if (!owner || owner.Passwd !== password) {
        return NextResponse.json({ message: 'Usuario o contraseña incorrectos' }, { status: 401 });
      }

      const response = NextResponse.json({
        success: true,
        user: { IdUsuario: owner.IdUsuario, Usuario: owner.Usuario, IdPuesto: 1 },
        project: { idProyecto: owner.IdProyecto, nombre: owner.Proyecto },
      });
      setSessionCookies(response, owner.IdProyecto);
      return response;
    }

    // 3) Usuario del POS sin dominio: valida contra la BD del proyecto activo en
    //    este dispositivo (cookie ie-project); sin cookie usa la BD base (modo clásico).
    const pool = await getRequestPool();
    const [rows] = await pool.query(
      'SELECT IdUsuario, Usuario, IdPuesto FROM tblUsuarios WHERE Login = ? AND Password = ? AND Status = 1',
      [login, password]
    );

    const user = (rows as RowDataPacket[])[0];
    if (!user) {
      return NextResponse.json({ message: 'Usuario o contraseña incorrectos' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user });
    setSessionCookies(response);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Error en el servidor' }, { status: 500 });
  }
}
