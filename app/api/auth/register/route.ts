import { NextResponse } from 'next/server';
import crypto from 'crypto';
import projectsPool, { ensureProjectsDatabase } from '@/lib/projects-db';
import { DB_NAME_PREFIX, initializeProjectDatabase, toDbName } from '@/lib/db-init';
import { toDominio } from '@/lib/domain';
import { parseLogoDataUrl, saveLogo } from '@/lib/logo';
import { MAX_LOGO_BYTES, LOGO_RULES_MESSAGE, LOGO_SIZE_MESSAGE } from '@/lib/logo-shared';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USUARIO_ADMIN_REGEX = /^[a-zA-Z0-9._-]+$/;
const MIN_PASSWORD_LENGTH = 6;
const MIN_PHONE_LENGTH = 10;

interface RegisterInput {
  nombreProyecto: string;
  usuarioAdmin: string;
  nombreUsuario: string;
  correoElectronico: string;
  telefono: string;
  password: string;
  repetirPassword: string;
  /** Logo opcional como data URL (data:image/png;base64,...). */
  logoBase64?: string;
}

/** Valida el cuerpo del registro; devuelve mapa de errores por campo. */
function validate(body: Partial<RegisterInput>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!body.nombreProyecto?.trim()) {
    errors.nombreProyecto = 'Nombre del proyecto es requerido';
  } else if (toDbName(body.nombreProyecto) === DB_NAME_PREFIX || !toDominio(body.nombreProyecto)) {
    errors.nombreProyecto = 'El nombre del proyecto debe incluir letras o números';
  }
  if (!body.usuarioAdmin?.trim()) {
    errors.usuarioAdmin = 'Usuario es requerido';
  } else if (!USUARIO_ADMIN_REGEX.test(body.usuarioAdmin.trim())) {
    errors.usuarioAdmin = 'Usuario inválido: usa letras, números, punto, guión o guión bajo (sin espacios ni @)';
  }
  if (!body.nombreUsuario?.trim()) {
    errors.nombreUsuario = 'Nombre de usuario es requerido';
  }
  if (!body.correoElectronico || !EMAIL_REGEX.test(body.correoElectronico)) {
    errors.correoElectronico = 'Correo electrónico inválido';
  }
  if (!body.telefono || body.telefono.replace(/\D/g, '').length < MIN_PHONE_LENGTH) {
    errors.telefono = `Teléfono debe tener al menos ${MIN_PHONE_LENGTH} dígitos`;
  }
  if (!body.password || body.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (body.password !== body.repetirPassword) {
    errors.repetirPassword = 'Las contraseñas no coinciden';
  }
  if (body.logoBase64) {
    const parsed = parseLogoDataUrl(body.logoBase64);
    if (!parsed) {
      errors.logo = `Logo inválido: ${LOGO_RULES_MESSAGE.toLowerCase()}`;
    } else if (parsed.buffer.length > MAX_LOGO_BYTES) {
      errors.logo = LOGO_SIZE_MESSAGE;
    }
  }

  return errors;
}

export async function POST(request: Request) {
  let body: Partial<RegisterInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Cuerpo de la petición inválido' }, { status: 400 });
  }

  const errors = validate(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ success: false, message: 'Datos inválidos', errors }, { status: 400 });
  }

  const nombreProyecto = body.nombreProyecto!.trim();
  const nombreUsuario = body.nombreUsuario!.trim();
  const correoElectronico = body.correoElectronico!.trim().toLowerCase();
  const telefono = body.telefono!.trim();
  const password = body.password!;
  const dbName = toDbName(nombreProyecto);
  const dominio = toDominio(nombreProyecto);
  const usuarioAdmin = body.usuarioAdmin!.trim().toLowerCase();
  const adminLogin = `${usuarioAdmin}@${dominio}`;

  try {
    await ensureProjectsDatabase();
  } catch (error) {
    console.error('Register: error creando BD maestra de proyectos:', error);
    return NextResponse.json({ success: false, message: 'Error en el servidor' }, { status: 500 });
  }

  const connection = await projectsPool.getConnection();

  try {
    await connection.beginTransaction();

    // Correo o teléfono ya registrados
    const [existingUsers] = await connection.query(
      'SELECT IdUsuario FROM tblUsuarios WHERE CorreoElectronico = ? OR Telefono = ?',
      [correoElectronico, telefono]
    ) as [{ IdUsuario: number }[], unknown];

    if (existingUsers.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: 'El correo electrónico o teléfono ya están registrados' },
        { status: 409 }
      );
    }

    // Proyecto duplicado (mismo nombre, misma BD destino o mismo dominio)
    const [existingProjects] = await connection.query(
      'SELECT IdProyecto FROM tblProyectos WHERE Proyecto = ? OR BaseDatos = ? OR Dominio = ?',
      [nombreProyecto, dbName, dominio]
    ) as [{ IdProyecto: number }[], unknown];

    if (existingProjects.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        {
          success: false,
          message: `El dominio ${dominio} ya está en uso, elige otro nombre de proyecto`,
          errors: { nombreProyecto: `El dominio ${dominio} ya está en uso, elige otro nombre de proyecto` },
        },
        { status: 409 }
      );
    }

    const [userResult] = await connection.query(
      'INSERT INTO tblUsuarios (Usuario, CorreoElectronico, Telefono, Passwd, FechaAct, Status) VALUES (?, ?, ?, ?, NOW(), 0)',
      [nombreUsuario, correoElectronico, telefono, password]
    ) as [{ insertId: number }, unknown];

    const idUsuario = userResult.insertId;

    const dbHost = process.env.DB_HOST || 'integramembers.com';
    const dbUser = process.env.DB_USER || 'kyk';
    const dbPass = process.env.DB_PASSWORD || 'merkurio';
    const projectUuid = crypto.randomUUID();

    const [projectResult] = await connection.query(
      `INSERT INTO tblProyectos
        (Proyecto, Dominio, BaseDatos, Servidor, UsuarioBD, PasswordBD, UUID, FechaAct, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [nombreProyecto, dominio, dbName, dbHost, dbUser, dbPass, projectUuid]
    ) as [{ insertId: number }, unknown];

    const idProyecto = projectResult.insertId;

    await connection.query(
      'INSERT INTO tblProyectosUsuarios (IdProyecto, IdUsuario, FechaAct) VALUES (?, ?, NOW())',
      [idProyecto, idUsuario]
    );

    await connection.commit();

    // Guardar el logo (si se arrastró uno) antes de configurar el proyecto.
    let logoPath: string | null = null;
    if (body.logoBase64) {
      try {
        logoPath = await saveLogo(body.logoBase64);
      } catch (error) {
        console.error('Register: error guardando el logo:', error);
      }
    }

    // Crear la BD del proyecto como copia de BDIntegraEsteticaBase, dejar al
    // administrador (usuario@dominio) en su tblUsuarios y personalizar
    // tblConfigTicket con los datos del proyecto.
    let dbInitialized = true;
    try {
      await initializeProjectDatabase(
        dbName,
        {
          usuario: nombreUsuario,
          login: adminLogin,
          password,
        },
        {
          nombreProyecto,
          telefono,
          correoElectronico,
          logoPath,
        }
      );
    } catch (error) {
      dbInitialized = false;
      console.error(`Register: error inicializando BD "${dbName}":`, error);
    }

    return NextResponse.json({
      success: true,
      message: dbInitialized
        ? 'Registro exitoso'
        : 'Registro exitoso, pero la base de datos del proyecto quedó pendiente de crear',
      dbInitialized,
      login: adminLogin,
      user: { idUsuario, nombreUsuario, correoElectronico },
      proyecto: { idProyecto, nombreProyecto, dominio, baseDatos: dbName, uuid: projectUuid },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Register error:', error);
    return NextResponse.json({ success: false, message: 'Error en el servidor' }, { status: 500 });
  } finally {
    connection.release();
  }
}
